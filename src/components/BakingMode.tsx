import { useState, useEffect, useRef, useMemo, useSyncExternalStore } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_URL, type Recipe, type Component } from '../lib/api';
import { saveLocalBakeLog } from '../lib/localDB';
import { X, Check, Upload, Loader2, List, Link as LinkIcon, Mic, MicOff, Bluetooth, Video, VideoOff, PictureInPicture } from 'lucide-react';
import { renderWithTimers } from '../utils/timerParser';
import { scaleService, type WeightMeasurement } from '../lib/bluetoothScale';
import RecipeDrawer from './RecipeDrawer';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { hapticsEnabled, voiceCommandsEnabled, waveToAdvanceEnabled } from '../lib/settings';
import { getActiveBake, startActiveBake, clearActiveBake } from '../lib/activeBake';
import { derivePhases, type Phase } from '../lib/phases';
import { subscribeRunningTimers, getRunningTimers, formatTimerClock } from '../lib/timerBus';
import { Button, Panel, SegmentReadout, Skeleton, StepRow, cn } from './ui';

/*
 * Baking Mode — the surface the whole product exists for.
 *
 * One baker, a phone propped at arm's length, hands covered in flour. Every
 * decision here is made for that scene rather than for a screenshot: the step
 * is the largest type in the app, the controls are wide enough to hit without
 * looking, and nothing floats over the instruction.
 *
 * The step row is the navigation. Elsewhere in Proof it is an instrument that
 * reports the shape of a bake; here its keys are live — the running phase is
 * the one red thing on screen, and tapping "Shape" jumps to the first step of
 * shaping. That is the whole reason the row exists: a baker who walks back into
 * the kitchen mid-bulk wants the phase, not instruction seventeen.
 *
 * Timers dock in the header as segment readouts rather than floating over the
 * step, because the floating stack sits exactly where the instruction is.
 */

export default function BakingMode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const wakeLock = useRef<any>(null);
  // Baking Mode is a fixed overlay, so the window itself never scrolls — the
  // step content is its own scroll container and the voice scroll commands need it.
  const contentRef = useRef<HTMLDivElement>(null);
  const [showIngredients, setShowIngredients] = useState(false);
  const [viewMode, setViewMode] = useState<'focus' | 'all'>('focus');
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});

  // Settings
  const [waveToAdvanceSetting] = useState(waveToAdvanceEnabled);
  const [voiceCommandsSetting] = useState(voiceCommandsEnabled);

  // Motion Detection State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastImageData = useRef<ImageData | null>(null);
  const motionCooldown = useRef(false);
  const [cameraActive, setCameraActive] = useState(() => localStorage.getItem('waveToAdvance') === 'true');

  // Sub-recipe Drawer State
  const [openSubRecipeId, setOpenSubRecipeId] = useState<string | null>(null);

  // Finish Modal State
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);

  // Bluetooth Scale State
  const [scaleConnected, setScaleConnected] = useState(false);
  const [scaleWeight, setScaleWeight] = useState<WeightMeasurement | null>(null);

  const [notes, setNotes] = useState('');
  const [imageFiles, setImageFiles] = useState<{file: File, label: string}[]>([]);
  const [savingLog, setSavingLog] = useState(false);
  const [isDictating, setIsDictating] = useState(false);

  /*
   * The timers, read from the manager that owns them. `useSyncExternalStore`
   * rather than a subscribe-into-state effect so the header cannot render one
   * tick behind the stack a baker is watching.
   */
  const timers = useSyncExternalStore(subscribeRunningTimers, getRunningTimers, getRunningTimers);

  const phases = useMemo(() => derivePhases(recipe?.instructions), [recipe]);

  // Voice Commands
  const { listening, browserSupportsSpeechRecognition, transcript, resetTranscript } = useSpeechRecognition({
    commands: [
      {
        command: ['next', 'next step', 'forward'],
        callback: () => handleNextStep()
      },
      {
        command: ['back', 'previous', 'previous step'],
        callback: () => handlePrevStep()
      },
      {
        command: ['finish', 'done', 'complete'],
        callback: () => {
          if (window.confirm("Are you sure you want to finish the recipe and log this bake?")) {
            setShowFinishModal(true);
          }
        }
      },
      {
        command: ['read', 'repeat', 'read step', 'read that'],
        callback: () => {
          if (recipe && recipe.instructions[currentStep]) {
            const msg = new SpeechSynthesisUtterance(recipe.instructions[currentStep]);
            window.speechSynthesis.speak(msg);
          }
        }
      },
      {
        command: ['ingredients', 'read ingredients', 'what do i need'],
        callback: () => {
          if (recipe && recipe.instructions[currentStep]) {
            const ings = getSmartIngredients(recipe.instructions[currentStep]);
            if (ings.length > 0) {
              const text = "You need: " + ings.map(i => `${i.quantity} ${i.unit} of ${i.name}`).join(", ");
              const msg = new SpeechSynthesisUtterance(text);
              window.speechSynthesis.speak(msg);
            } else {
              window.speechSynthesis.speak(new SpeechSynthesisUtterance("No specific ingredients required for this step."));
            }
          }
        }
      },
      {
        command: ['start timer', 'start'],
        callback: () => {
          if (recipe && recipe.instructions[currentStep]) {
            const step = recipe.instructions[currentStep];
            // Naive timer parsing for voice: find first "X min" or "X hour"
            const minMatch = step.match(/(\d+)\s*(?:min|minute)/i);
            const hrMatch = step.match(/(\d+)\s*(?:hr|hour)/i);
            let totalSecs = 0;
            if (minMatch) totalSecs += parseInt(minMatch[1]) * 60;
            if (hrMatch) totalSecs += parseInt(hrMatch[1]) * 3600;
            if (totalSecs > 0) {
              window.dispatchEvent(new CustomEvent('add-timer', { detail: { durationSecs: totalSecs, name: 'Voice Timer', forceStart: true } }));
              window.speechSynthesis.speak(new SpeechSynthesisUtterance("Timer started."));
            } else {
              window.speechSynthesis.speak(new SpeechSynthesisUtterance("I didn't find a timer in this step."));
            }
          }
        }
      },
      {
        command: ['quiet', 'quite', 'stop timer', 'stop'],
        callback: () => {
          window.dispatchEvent(new Event('stop-alarms'));
        }
      },
      {
        command: ['show all', 'focus mode', 'toggle view'],
        callback: () => {
          setViewMode(prev => prev === 'focus' ? 'all' : 'focus');
        }
      },
      {
        command: ['up', 'scroll up'],
        callback: () => {
          contentRef.current?.scrollBy({ top: -500, behavior: 'smooth' });
        }
      },
      {
        command: ['down', 'scroll down'],
        callback: () => {
          contentRef.current?.scrollBy({ top: 500, behavior: 'smooth' });
        }
      },
      {
        command: ['help', 'voice commands'],
        callback: () => setShowVoiceHelp(true)
      },
      {
        command: ['close'],
        callback: () => {
          setShowVoiceHelp(false);
          setShowFinishModal(false);
        }
      }
    ]
  });

  const toggleMic = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({ continuous: true });
    }
  };

  const toggleDictation = () => {
    if (isDictating) {
      SpeechRecognition.stopListening();
      setIsDictating(false);

      // Parse context-aware ingredients
      if (recipe) {
        let newNotes = notes;
        recipe.ingredients.forEach(ing => {
          if (ing.name.length > 2) {
            const regex = new RegExp(`\\b${ing.name}\\b`, 'gi');
            newNotes = newNotes.replace(regex, `**${ing.name}**`);
          }
        });
        setNotes(newNotes);
      }
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
      setIsDictating(true);
    }
  };

  useEffect(() => {
    if (isDictating && transcript) {
      setNotes(prev => {
        const base = prev.replace(/ \(Dictating: .*\)/, '');
        return `${base} (Dictating: ${transcript})`;
      });
    }
  }, [transcript, isDictating]);

  useEffect(() => {
    if (id) {
      api.getRecipe(id)
        .then((r) => {
          setRecipe(r);
          // Resume rather than restart: if this recipe is already the active
          // bake (opened from the dashboard's RESUME control, or the tab was
          // simply closed mid-bake), pick the step back up instead of
          // silently rewinding to the first instruction.
          const existing = getActiveBake();
          if (existing?.recipeId === id) setCurrentStep(existing.stepIndex);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  // Announce this bake to the rest of the app (the dashboard's lit row, and any
  // future consumer) whenever the recipe is known and the step advances.
  // `startActiveBake` is itself resume-aware — it only touches `startedAt`
  // when the active recipe actually changes — so a single call here covers
  // both "first step of a fresh bake" and "step N of a bake already running."
  // A baker works one loaf at a time on one device: opening Baking Mode for a
  // different recipe supersedes whatever was previously flagged as running.
  useEffect(() => {
    if (!id || !recipe) return;
    if (currentStep >= recipe.instructions.length) {
      clearActiveBake(id);
      return;
    }
    startActiveBake(id, recipe.title, currentStep);
  }, [id, recipe, currentStep]);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        console.warn('Wake Lock error:', err.name, err.message);
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock.current) {
        wakeLock.current.release();
      }
      scaleService.disconnect();
    };
  }, []);

  const connectScale = async () => {
    try {
      await scaleService.connect();
      setScaleConnected(true);
      scaleService.onWeightChange((measurement) => {
        setScaleWeight(measurement);
      });
      scaleService.onDisconnect(() => {
        setScaleConnected(false);
        setScaleWeight(null);
      });
    } catch (err) {
      alert('Failed to connect to scale. Ensure Bluetooth is enabled and the site has permissions.');
    }
  };

  const currentStepRef = useRef(currentStep);
  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);

  const handleNextStep = async () => {
    if (recipe && currentStepRef.current < recipe.instructions.length) {
      setCurrentStep(prev => prev + 1);
      if (Capacitor.isNativePlatform() && hapticsEnabled()) await Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  const handlePrevStep = async () => {
    if (currentStepRef.current > 0) {
      setCurrentStep(prev => prev - 1);
      if (Capacitor.isNativePlatform() && hapticsEnabled()) await Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  /*
   * Jumping by phase. The row's keys are the coarse navigation a baker actually
   * thinks in, so a key lands on the first step of its phase — never in the
   * middle of one, which would be a jump nobody could predict from the label.
   */
  const handleSelectPhase = async (phase: Phase) => {
    const target = phase.stepIndices[0];
    if (target === undefined) return;
    setCurrentStep(target);
    setViewMode('focus');
    if (Capacitor.isNativePlatform() && hapticsEnabled()) await Haptics.impact({ style: ImpactStyle.Light });
  };

  useEffect(() => {
    let isActive = true;
    let stream: MediaStream | null = null;
    let animationFrame: number;

    if (!cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
         const oldStream = videoRef.current.srcObject as MediaStream;
         oldStream.getTracks().forEach(t => t.stop());
         videoRef.current.srcObject = null;
      }
      return;
    }

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } });
        if (!isActive) {
          mediaStream.getTracks().forEach(t => t.stop());
          return;
        }
        stream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied for wave detection", err);
      }
    };

    const detectMotion = () => {
      if (!isActive || !videoRef.current || !canvasRef.current || motionCooldown.current) {
        if (isActive) animationFrame = requestAnimationFrame(detectMotion);
        return;
      }

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        animationFrame = requestAnimationFrame(detectMotion);
        return;
      }

      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const currentImageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (lastImageData.current) {
        let diffPixels = 0;
        const threshold = 50;
        const length = currentImageData.data.length;

        // Downsample check for performance (every 4th pixel)
        for (let i = 0; i < length; i += 16) {
          const rDiff = Math.abs(currentImageData.data[i] - lastImageData.current.data[i]);
          const gDiff = Math.abs(currentImageData.data[i+1] - lastImageData.current.data[i+1]);
          const bDiff = Math.abs(currentImageData.data[i+2] - lastImageData.current.data[i+2]);
          if (rDiff + gDiff + bDiff > threshold) {
            diffPixels++;
          }
        }

        const totalCheckedPixels = length / 16;
        if (diffPixels / totalCheckedPixels > 0.15) { // 15% of image changed
          motionCooldown.current = true;
          handleNextStep();
          setTimeout(() => {
            motionCooldown.current = false;
            lastImageData.current = null;
          }, 2000); // 2 second cooldown
        }
      }

      lastImageData.current = currentImageData;
      animationFrame = requestAnimationFrame(detectMotion);
    };

    startCamera().then(() => {
      if (isActive) animationFrame = requestAnimationFrame(detectMotion);
    });

    return () => {
      isActive = false;
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (videoRef.current && videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      cancelAnimationFrame(animationFrame);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive]);

  const getSmartIngredients = (stepText: string): Component[] => {
    if (!recipe) return [];
    const textLower = stepText.toLowerCase();
    return recipe.ingredients.filter(ing => {
      const ingNameLower = ing.name.toLowerCase();
      const words = ingNameLower.split(' ').filter(w => w.length > 2);
      return words.some(w => textLower.includes(w));
    });
  };

  useEffect(() => {
    if (scaleWeight && recipe && currentStep < recipe.instructions.length) {
      const stepText = recipe.instructions[currentStep];
      const smartIngs = getSmartIngredients(stepText);
      const targetWeight = smartIngs.reduce((sum, ing) => sum + (ing.quantity || 0), 0);

      if (targetWeight > 0) {
        // Assume grams for simplicity for the generic implementation
        // Auto-advance if weight is within 5% of target
        const threshold = targetWeight * 0.95;
        if (scaleWeight.weight >= threshold) {
          handleNextStep();
        }
      }
    }
  }, [scaleWeight, currentStep, recipe]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showFinishModal) return;
      if (e.key === 'Escape') navigate(`/recipe/${id}`);

      if (viewMode === 'focus') {
        if (e.key === 'ArrowRight') handleNextStep();
        if (e.key === 'ArrowLeft') handlePrevStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, recipe, navigate, id, showFinishModal, viewMode]);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) handleNextStep(); // Swipe left -> Next
    else if (distance < -50) handlePrevStep(); // Swipe right -> Prev
    touchStartX.current = null;
    touchEndX.current = null;
  };


  const handleFinishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLog(true);
    try {
      let newLogId: string | null = null;
      if (!localStorage.getItem('adminToken')) {
        const savedLog = await saveLocalBakeLog({ recipeId: id!, notes, imageUrls: [], images: [] }, imageFiles);
        newLogId = savedLog._id || null;
      } else {
        const uploadedImages: {url: string, label: string}[] = [];
        const imageUrls: string[] = [];
        if (imageFiles.length > 0) {
          const uploadPromises = imageFiles.map(async (item) => {
            const formData = new FormData();
            formData.append('image', item.file);
            const uploadRes = await fetch(`${API_URL.replace('/api', '/api/upload')}`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
              body: formData
            });
            if (!uploadRes.ok) throw new Error('Image upload failed');
            const { imageUrl } = await uploadRes.json();
            return { url: imageUrl, label: item.label };
          });
          const results = await Promise.all(uploadPromises);
          uploadedImages.push(...results);
          imageUrls.push(...results.map(r => r.url));
        }

        const res = await fetch(`${API_URL.replace('/api', '')}/api/bakelogs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({
            recipeId: id,
            notes,
            imageUrls,
            images: uploadedImages
          })
        });
        if (!res.ok) throw new Error('Failed to log bake');
        const createdLog = await res.json();
        newLogId = createdLog._id;
      }

      if (newLogId) {
        navigate(`/recipe/${id}?makeId=${newLogId}&export=instagram`);
      } else {
        navigate(`/recipe/${id}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save bake log');
    } finally {
      setSavingLog(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-ground">
        <div className="border-b border-rule bg-panel faceplate px-3 py-3">
          <Skeleton className="h-4 w-40" />
          <div className="mt-3 flex w-full gap-px" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 max-w-20 flex-1 rounded-key bg-key-unlit" />
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-4 px-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ground px-6 text-center">
        <span className="label-silkscreen text-ink-muted">No recipe loaded</span>
        <Button onClick={() => navigate('/')}>Back to cookbook</Button>
      </div>
    );
  }

  const isFinished = currentStep === recipe.instructions.length;
  const stepText = isFinished ? "You're done!" : recipe.instructions[currentStep];
  const smartIngredients = isFinished ? [] : getSmartIngredients(stepText);
  const currentPhase = isFinished
    ? null
    : phases.find((phase) => phase.stepIndices.includes(currentStep)) ?? null;
  // The scale's target for this step: the sum of what the step actually calls
  // for. Shown only when there is something to weigh, so the readout never sits
  // there reporting a target of zero.
  const scaleTarget = smartIngredients.reduce((sum, ing) => sum + (ing.quantity || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ground">
      {/* Hidden Camera Elements for Motion Detection */}
      <video ref={videoRef} autoPlay playsInline muted className="opacity-0 pointer-events-none absolute w-px h-px" />
      <canvas ref={canvasRef} width="320" height="240" className="hidden" />

      {/*
        The machine's head: what is baking, the controls that change how it is
        driven, and the row itself. It is `shrink-0` so the step below it gets
        every remaining pixel — on a 390px phone in landscape that is the whole
        difference between two lines of instruction and four.
      */}
      <header className="shrink-0 border-b border-rule bg-panel faceplate">
        <div className="flex items-center gap-2 px-2 py-2 sm:px-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/recipe/${id}`)}
            aria-label="Leave baking mode"
            icon={<X className="h-4 w-4" />}
          />
          <h1 className="label-silkscreen min-w-0 flex-1 truncate text-ink">{recipe.title}</h1>

          {/* Controls scroll rather than wrap: the head must stay one bar tall,
            * and a second row of chrome is a second row stolen from the step. */}
          <div className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto">
            <Button
              size="sm"
              engaged={scaleConnected}
              onClick={connectScale}
              icon={<Bluetooth className="h-3.5 w-3.5" />}
              title={scaleConnected ? 'Scale connected' : 'Connect a Bluetooth scale'}
            >
              <span className="hidden sm:inline">{scaleConnected ? 'Connected' : 'Scale'}</span>
            </Button>

            <Button
              size="sm"
              engaged={showIngredients}
              onClick={() => setShowIngredients(!showIngredients)}
              icon={<List className="h-3.5 w-3.5" />}
            >
              <span className="hidden sm:inline">Ingredients</span>
            </Button>

            {voiceCommandsSetting && browserSupportsSpeechRecognition && (
              <Button
                size="sm"
                engaged={listening}
                onClick={toggleMic}
                title="Toggle Voice Commands (Next, Back, Finish)"
                aria-label="Toggle voice commands"
                icon={<Mic className="h-3.5 w-3.5" />}
              />
            )}

            {waveToAdvanceSetting && (
              <>
                <Button
                  size="sm"
                  engaged={cameraActive}
                  onClick={() => setCameraActive(!cameraActive)}
                  title="Toggle Camera (Wave to Advance)"
                  aria-label="Toggle wave to advance"
                  icon={cameraActive ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                />

                {cameraActive && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (videoRef.current) {
                        try {
                          if (document.pictureInPictureElement) {
                            await document.exitPictureInPicture();
                          } else {
                            await videoRef.current.requestPictureInPicture();
                          }
                        } catch (err) {
                          console.error("PiP failed", err);
                        }
                      }
                    }}
                    title="View Camera (Picture-in-Picture)"
                    aria-label="View camera picture in picture"
                    icon={<PictureInPicture className="h-3.5 w-3.5" />}
                  />
                )}
              </>
            )}

            <Button size="sm" onClick={() => setViewMode(prev => prev === 'focus' ? 'all' : 'focus')}>
              {viewMode === 'focus' ? 'Show All' : 'Focus Mode'}
            </Button>
          </div>
        </div>

        {/*
          The row, live. Keys are controls here and nowhere else in the app:
          the running phase is red, the phases behind it are bone, and tapping
          one jumps to where that phase begins.
        */}
        <div className="border-t border-rule px-2 py-3 sm:px-3">
          <StepRow
            phases={phases}
            activeStep={isFinished ? undefined : currentStep}
            onSelect={handleSelectPhase}
            label={`${recipe.title} phases — jump to a phase`}
          />
        </div>

        {/*
          Running timers, docked. A timer is an instrument value, so it reads on
          segments; it turns signal red once it runs past its end, which is the
          one moment a timer is the thing happening now.
        */}
        {timers.length > 0 && (
          <div
            className="no-scrollbar flex items-end gap-5 overflow-x-auto border-t border-rule px-3 py-2"
            aria-label="Running timers"
          >
            {timers.map((timer) => (
              <SegmentReadout
                key={timer.id}
                label={timer.running ? timer.name : `${timer.name} · paused`}
                value={formatTimerClock(timer.remainingMs)}
                size="sm"
                tone={timer.remainingMs < 0 ? 'signal' : 'ink'}
                className="shrink-0"
              />
            ))}
          </div>
        )}
      </header>

      {/* Main Content */}
      <div
        ref={contentRef}
        className="relative flex w-full flex-1 flex-col items-center overflow-y-auto px-5 pb-6 sm:px-8"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex w-full max-w-3xl flex-1 flex-col">
          {viewMode === 'focus' ? (
            <div className="flex w-full flex-1 flex-col justify-center gap-8 py-8">
              {!isFinished && (
                <div className="flex items-baseline gap-3">
                  {/* Below `sm` the row prints its own "LEVAIN — NOW" caption,
                    * because the keys have no room for labels there. Repeating
                    * the phase here would say it twice on the narrowest screen. */}
                  {currentPhase ? (
                    <span className="label-silkscreen hidden text-signal sm:inline">
                      {currentPhase.label}
                    </span>
                  ) : null}
                  {/* A step index is a count, not an instrument value, so it is
                    * set in tabular mono rather than spent on segments. */}
                  <span className="font-mono text-xs tabular-nums text-ink-muted">
                    STEP {String(currentStep + 1).padStart(2, '0')} / {String(recipe.instructions.length).padStart(2, '0')}
                  </span>
                </div>
              )}

              <div className="text-2xl leading-snug text-ink sm:text-4xl sm:leading-tight">
                {isFinished ? (
                  <span className="font-faceplate">Bake complete.</span>
                ) : (
                  renderWithTimers(stepText, `Step ${currentStep + 1}`)
                )}
              </div>

              {!isFinished && recipe.instructionLinks && recipe.instructionLinks.find(l => l.stepIndex === currentStep) && (
                <div className="flex flex-wrap gap-2">
                  {recipe.instructionLinks.filter(l => l.stepIndex === currentStep).map((link, idx) => (
                    <Button
                      key={idx}
                      onClick={() => setOpenSubRecipeId(link.recipeId)}
                      icon={<LinkIcon className="h-4 w-4" />}
                    >
                      {link.recipeTitle}
                    </Button>
                  ))}
                </div>
              )}

              {/* What this step calls for, and — only when a scale is actually
                * connected — how close the bowl is to it. */}
              {!isFinished && (smartIngredients.length > 0 || (scaleConnected && scaleTarget > 0)) && (
                <Panel title="This step needs" className="w-full">
                  <ul className="flex flex-col divide-y divide-rule">
                    {smartIngredients.map((ing, idx) => (
                      <li key={idx} className="flex items-baseline justify-between gap-4 py-2">
                        <span className="min-w-0 truncate text-ink">{ing.name}</span>
                        <span className="shrink-0 font-mono text-sm tabular-nums text-ink">
                          {ing.quantity} {ing.unit}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {scaleConnected && scaleTarget > 0 && (
                    <div className="mt-4 flex items-end gap-6 border-t border-rule pt-4">
                      <SegmentReadout
                        label="On scale"
                        value={scaleWeight ? scaleWeight.weight : '---'}
                        unit={scaleWeight ? scaleWeight.unit : 'G'}
                        size="lg"
                        tone={
                          scaleWeight && scaleWeight.weight >= scaleTarget * 0.95 ? 'signal' : 'ink'
                        }
                      />
                      <SegmentReadout label="Target" value={scaleTarget} unit="G" size="md" tone="ink" />
                    </div>
                  )}
                </Panel>
              )}

              {isFinished && (
                <div className="flex flex-col items-start gap-4">
                  <p className="max-w-prose text-ink-muted">
                    Every phase is done. Log what happened while it is still fresh — notes now are
                    what make the next one better.
                  </p>
                  <Button variant="primary" size="lg" onClick={() => setShowFinishModal(true)} icon={<Check className="h-5 w-5" />}>
                    Finish Recipe
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /*
             * Show All: the whole method under the same phase headings the row
             * draws, so the two readings of the recipe never disagree. Every
             * step is a control — tapping one drops back into focus there.
             */
            <div className="flex w-full flex-col gap-8 py-8">
              {phases.map((phase) => (
                <div key={phase.id} className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-rule pb-2">
                    <span
                      className={cn(
                        'h-2.5 w-2.5 shrink-0 rounded-key',
                        phase.stepIndices.includes(currentStep) ? 'bg-signal' : 'bg-key-unlit',
                      )}
                      aria-hidden="true"
                    />
                    <h2 className="label-silkscreen">{phase.label}</h2>
                  </div>

                  {phase.stepIndices.map((stepIndex) => {
                    const links = recipe.instructionLinks
                      ? recipe.instructionLinks.filter(l => l.stepIndex === stepIndex)
                      : [];
                    return (
                      <div key={stepIndex} className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={() => { setCurrentStep(stepIndex); setViewMode('focus'); }}
                          className={cn(
                            'flex w-full gap-4 rounded-key border border-transparent p-2 text-left transition-colors hover:border-rule',
                            stepIndex === currentStep && 'border-signal',
                          )}
                        >
                          <span className="shrink-0 font-mono text-sm tabular-nums text-ink-muted">
                            {String(stepIndex + 1).padStart(2, '0')}
                          </span>
                          <span className="text-lg leading-relaxed text-ink sm:text-xl">
                            {recipe.instructions[stepIndex]}
                          </span>
                        </button>

                        {links.length > 0 && (
                          <div className="flex flex-wrap gap-2 pl-10">
                            {links.map((link, lidx) => (
                              <Button
                                key={lidx}
                                size="sm"
                                onClick={() => setOpenSubRecipeId(link.recipeId)}
                                icon={<LinkIcon className="h-3.5 w-3.5" />}
                              >
                                {link.recipeTitle}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              <div className="flex justify-center border-t border-rule pt-8">
                <Button variant="primary" size="lg" onClick={() => setShowFinishModal(true)} icon={<Check className="h-5 w-5" />}>
                  Finish Recipe
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/*
        The transport. One bar at every width rather than desktop arrows that
        float beside the step and a separate mobile bar — the controls belong in
        the same place whichever device is propped against the mixer, and a
        floating arrow on a phone sat on top of the ingredient quantities.
      */}
      {!isFinished && (
        <div className="shrink-0 border-t border-rule bg-panel faceplate px-3 py-3 pb-safe">
          <div className="mx-auto flex max-w-3xl items-stretch gap-3">
            <Button
              size="lg"
              className="flex-1"
              onClick={handlePrevStep}
              disabled={currentStep === 0}
            >
              Back
            </Button>
            <Button
              size="lg"
              engaged
              className="flex-[2]"
              onClick={handleNextStep}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Ingredients sheet — the full list, over the step rather than beside it. */}
      {showIngredients && (
        <>
          <div
            className="scrim absolute inset-0 z-20"
            onClick={() => setShowIngredients(false)}
            aria-hidden="true"
          />
          <aside className="absolute bottom-0 left-0 right-0 top-auto z-30 flex max-h-[80%] flex-col border-t border-rule bg-panel faceplate sm:right-auto sm:top-0 sm:max-h-none sm:w-96 sm:border-r sm:border-t-0">
            <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
              <h2 className="label-silkscreen">All ingredients</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowIngredients(false)}
                aria-label="Close ingredients"
                icon={<X className="h-4 w-4" />}
              />
            </div>
            <ul className="flex-1 divide-y divide-rule overflow-y-auto px-4 pb-safe">
              {recipe.ingredients.map((ing, i) => (
                <li key={i}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!checkedIngredients[i]}
                      onChange={() => setCheckedIngredients(prev => ({...prev, [i]: !prev[i]}))}
                      className="h-5 w-5 shrink-0 accent-[var(--signal)]"
                    />
                    <span className={cn('flex min-w-0 flex-1 items-baseline justify-between gap-3', checkedIngredients[i] && 'opacity-40 line-through')}>
                      <span className="min-w-0 truncate text-ink">{ing.name}</span>
                      <span className="shrink-0 font-mono text-sm tabular-nums text-ink-muted">
                        {ing.quantity} {ing.unit}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </aside>
        </>
      )}

      {/* Finish Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="scrim absolute inset-0" onClick={() => setShowFinishModal(false)} aria-hidden="true" />
          <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-panel border border-rule bg-panel faceplate">
            <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
              <h2 className="label-silkscreen">Log bake</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFinishModal(false)}
                aria-label="Close bake log"
                icon={<X className="h-4 w-4" />}
              />
            </div>

            <form onSubmit={handleFinishSubmit} className="flex flex-col gap-6 overflow-y-auto p-4 pb-safe">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="bake-notes" className="label-silkscreen">Bake notes</label>
                  {browserSupportsSpeechRecognition && (
                    <Button
                      size="sm"
                      engaged={isDictating}
                      onClick={toggleDictation}
                      icon={isDictating ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                    >
                      {isDictating ? 'Listening' : 'Dictate'}
                    </Button>
                  )}
                </div>
                <textarea
                  id="bake-notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-control border border-rule bg-panel-sunk p-3 text-ink focus:border-ink focus:outline-none"
                  placeholder="How did it turn out? What would you change next time?"
                />
              </div>

              <div className="flex flex-col gap-3">
                <span className="label-silkscreen">Photos</span>
                <div className="relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-control border border-dashed border-rule bg-panel-sunk p-6 transition-colors hover:border-ink-muted">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    aria-label="Upload photos"
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      setImageFiles(prev => [...prev, ...files.map(f => ({ file: f, label: '' }))]);
                    }}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  <Upload className="h-6 w-6 text-ink-muted" />
                  <span className="label-silkscreen">Add photos</span>
                </div>

                {imageFiles.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {imageFiles.map((img, idx) => (
                      <li key={idx} className="flex items-center gap-3 rounded-control border border-rule bg-panel-sunk p-2">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-key bg-key-unlit">
                          <img src={URL.createObjectURL(img.file)} alt="" className="h-full w-full object-cover" />
                        </div>
                        <input
                          type="text"
                          value={img.label}
                          onChange={e => {
                            const newFiles = [...imageFiles];
                            newFiles[idx].label = e.target.value;
                            setImageFiles(newFiles);
                          }}
                          placeholder="Label (e.g. Before Bake)"
                          aria-label={`Label for photo ${idx + 1}`}
                          className="min-w-0 flex-1 border-none bg-transparent p-1 text-sm text-ink outline-none"
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== idx))}
                          aria-label={`Remove photo ${idx + 1}`}
                          icon={<X className="h-4 w-4" />}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button type="submit" variant="primary" size="lg" busy={savingLog} className="w-full">
                {savingLog ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save log & finish'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Voice Help Modal */}
      {showVoiceHelp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="scrim absolute inset-0" onClick={() => setShowVoiceHelp(false)} aria-hidden="true" />
          <div className="relative w-full max-w-sm rounded-panel border border-rule bg-panel faceplate">
            <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
              <h2 className="label-silkscreen">Voice Commands</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVoiceHelp(false)}
                aria-label="Close voice commands"
                icon={<X className="h-4 w-4" />}
              />
            </div>
            <dl className="flex flex-col divide-y divide-rule px-4 py-2 text-sm">
              {[
                ['"Next" / "Back"', 'Navigate steps'],
                ['"Read"', 'Reads the current step aloud'],
                ['"Ingredients"', 'Reads what this step needs'],
                ['"Start timer"', 'Starts the first timer in the step'],
                ['"Quiet"', 'Stops any ringing alarms'],
                ['"Show all"', 'Toggles Focus Mode'],
                ['"Up" / "Down"', 'Scrolls the page'],
                ['"Finish"', 'Opens the bake log'],
                ['"Close"', 'Closes open panels'],
              ].map(([command, effect]) => (
                <div key={command} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="font-mono text-xs text-ink">{command}</dt>
                  <dd className="text-right text-ink-muted">{effect}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {/* Recipe Drawer Overlay */}
      <RecipeDrawer
        isOpen={!!openSubRecipeId}
        onClose={() => setOpenSubRecipeId(null)}
        recipeId={openSubRecipeId || ''}
      />

    </div>
  );
}
