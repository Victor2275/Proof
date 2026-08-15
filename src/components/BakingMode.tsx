import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_URL, type Recipe, type Component } from '../lib/api';
import { saveLocalBakeLog } from '../lib/localDB';
import { X, ChevronLeft, ChevronRight, Check, Upload, Loader2, List, Link as LinkIcon, Mic, MicOff, Bluetooth, Video, VideoOff, PictureInPicture } from 'lucide-react';
import { renderWithTimers } from '../utils/timerParser';
import { scaleService, type WeightMeasurement } from '../lib/bluetoothScale';
import RecipeDrawer from './RecipeDrawer';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

export default function BakingMode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const wakeLock = useRef<any>(null);
  const [showIngredients, setShowIngredients] = useState(false);
  const [viewMode, setViewMode] = useState<'focus' | 'all'>('focus');
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});

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
          // React state closure issue: this might not have the latest viewMode, but we can just scroll anyway.
          window.scrollBy({ top: -500, behavior: 'smooth' });
        }
      },
      {
        command: ['down', 'scroll down'],
        callback: () => {
          window.scrollBy({ top: 500, behavior: 'smooth' });
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
        .then(setRecipe)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        console.log('Wake Lock error:', err.name, err.message);
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
      if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  const handlePrevStep = async () => {
    if (currentStepRef.current > 0) {
      setCurrentStep(prev => prev - 1);
      if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  useEffect(() => {
    if (!cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(t => t.stop());
         videoRef.current.srcObject = null;
      }
      return;
    }
    
    let stream: MediaStream | null = null;
    let animationFrame: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied for wave detection", err);
      }
    };

    const detectMotion = () => {
      if (!videoRef.current || !canvasRef.current || motionCooldown.current) {
        animationFrame = requestAnimationFrame(detectMotion);
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
      animationFrame = requestAnimationFrame(detectMotion);
    });

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
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

  if (loading) return <div className="fixed inset-0 z-50 bg-paper flex items-center justify-center">Loading...</div>;
  if (!recipe) return <div className="fixed inset-0 z-50 bg-paper flex items-center justify-center">Recipe not found.</div>;

  const isFinished = currentStep === recipe.instructions.length;
  const progress = (currentStep / recipe.instructions.length) * 100;
  
  const stepText = isFinished ? "You're done!" : recipe.instructions[currentStep];
  const smartIngredients = isFinished ? [] : getSmartIngredients(stepText);

  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col items-center">
      {/* Hidden Camera Elements for Motion Detection */}
      <video ref={videoRef} autoPlay playsInline muted className="opacity-0 pointer-events-none absolute w-px h-px" />
      <canvas ref={canvasRef} width="320" height="240" className="hidden" />

      {/* Progress Bar */}
      <div className="w-full h-2 bg-black/5 dark:bg-white/5 relative">
        <div className="absolute top-0 left-0 h-full bg-ink transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      
      {/* Top Header */}
      <div className="w-full flex justify-between items-center p-4 border-b border-border-subtle bg-paper/95 backdrop-blur-sm z-30 sticky top-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/recipe/${id}`)} className="p-2 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h1 className="font-bold uppercase tracking-wider text-sm truncate">{recipe.title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={connectScale} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${scaleConnected ? 'bg-blue-500/20 text-blue-600 border border-blue-500/50' : 'bg-black/5 dark:bg-white/5 border border-border-subtle hover:bg-black/10'}`}>
            <Bluetooth className={`w-3.5 h-3.5 ${scaleConnected ? 'animate-pulse' : ''}`} />
            {scaleWeight ? `${scaleWeight.weight}${scaleWeight.unit}` : (scaleConnected ? 'Connected' : 'Scale')}
          </button>
          
          <button 
            onClick={() => setShowIngredients(!showIngredients)}
            className={`px-5 py-1.5 rounded-full border transition-all font-bold uppercase tracking-widest text-sm flex items-center gap-2 ${showIngredients ? 'bg-ink text-paper border-ink' : 'border-border-subtle hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <List className="w-4 h-4" /> Ingredients
          </button>

          {browserSupportsSpeechRecognition && (
            <button 
              onClick={toggleMic}
              className={`p-2 rounded-full border transition-colors ${listening ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 text-ink-muted'}`}
              title="Toggle Voice Commands (Next, Back, Finish)"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => setCameraActive(!cameraActive)}
            className={`p-2 rounded-full border transition-colors ${cameraActive ? 'bg-ink text-paper border-ink animate-pulse' : 'border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 text-ink-muted'}`}
            title="Toggle Camera (Wave to Advance)"
          >
            {cameraActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
          
          {cameraActive && (
            <button 
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
              className="p-2 rounded-full border border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 text-ink-muted transition-colors"
              title="View Camera (Picture-in-Picture)"
            >
              <PictureInPicture className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => setViewMode(prev => prev === 'focus' ? 'all' : 'focus')}
            className="px-4 py-1.5 rounded-full border border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold uppercase tracking-wide"
          >
            {viewMode === 'focus' ? 'Show All Steps' : 'Focus Mode'}
          </button>
          <span className="font-bold text-ink-muted uppercase tracking-wider text-sm hidden sm:inline">
            {viewMode === 'all' ? 'All Steps' : (isFinished ? 'Finished' : `Step ${currentStep + 1} of ${recipe.instructions.length}`)}
          </span>
        </div>

        <button onClick={() => navigate(`/recipe/${id}`)} className="p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <div 
        className="flex-1 flex flex-col items-center w-full max-w-4xl px-8 md:px-12 pb-20 relative overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {viewMode === 'focus' ? (
          <div className="w-full flex-1 flex flex-col justify-center items-center">
            <div className="text-3xl md:text-5xl font-medium leading-relaxed md:leading-normal text-center transition-all duration-300">
              {isFinished ? stepText : renderWithTimers(stepText, `Step ${currentStep + 1}`)}
            </div>
            
            {!isFinished && recipe.instructionLinks && recipe.instructionLinks.find(l => l.stepIndex === currentStep) && (
              <div className="mt-8 flex justify-center">
                {recipe.instructionLinks.filter(l => l.stepIndex === currentStep).map((link, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setOpenSubRecipeId(link.recipeId)}
                    className="flex items-center gap-2 px-6 py-3 bg-black/5 dark:bg-white/5 border border-border-subtle rounded-full font-bold uppercase tracking-widest text-sm hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" /> Open Sub-Recipe: {link.recipeTitle}
                  </button>
                ))}
              </div>
            )}

            {!isFinished && smartIngredients.length > 0 && (
              <div className="mt-12 bg-black/5 dark:bg-white/5 p-6 rounded-xl border border-border-subtle w-full max-w-2xl">
                <h4 className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-4 border-b border-border-subtle pb-2">Matched Ingredients</h4>
                <ul className="space-y-3">
                  {smartIngredients.map((ing, idx) => (
                    <li key={idx} className="flex justify-between font-mono text-sm md:text-base">
                      <span>{ing.name}</span>
                      <span className="font-bold">{ing.quantity} {ing.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isFinished && (
              <button onClick={() => setShowFinishModal(true)} className="mt-12 bg-ink text-paper px-10 py-4 rounded-xl font-bold text-xl hover:opacity-90 transition-opacity shadow-lg flex items-center gap-3">
                <Check className="w-6 h-6" /> Finish Recipe
              </button>
            )}
          </div>
        ) : (
          <div className="w-full py-8 space-y-12">
            {recipe.instructions.map((step, idx) => {
              const links = recipe.instructionLinks ? recipe.instructionLinks.filter(l => l.stepIndex === idx) : [];
              return (
                <div key={idx} className="flex gap-6 flex-col sm:flex-row">
                  <div className="flex gap-6 flex-1">
                    <span className="text-3xl font-black text-ink-muted/30">{idx + 1}.</span>
                    <div className="text-2xl md:text-3xl font-medium leading-relaxed">{renderWithTimers(step, `Step ${idx+1}`)}</div>
                  </div>
                  {links.length > 0 && (
                    <div className="sm:ml-12 mt-4 sm:mt-0 flex flex-col gap-2 justify-start items-start">
                      {links.map((link, lidx) => (
                        <button
                          key={lidx}
                          onClick={() => setOpenSubRecipeId(link.recipeId)}
                          className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 border border-border-subtle rounded-full font-bold uppercase tracking-wider text-xs hover:bg-black/10 dark:hover:bg-white/10 transition-colors whitespace-nowrap"
                        >
                          <LinkIcon className="w-4 h-4" /> {link.recipeTitle}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            <div className="pt-12 border-t border-border-subtle flex justify-center">
              <button onClick={() => setShowFinishModal(true)} className="bg-ink text-paper px-10 py-4 rounded-xl font-bold text-xl hover:opacity-90 transition-opacity shadow-lg flex items-center gap-3">
                <Check className="w-6 h-6" /> Finish Recipe
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Arrows (Only in Focus Mode) */}
      {viewMode === 'focus' && (
        <>
          <button 
            onClick={handlePrevStep}
            disabled={currentStep === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-0 transition-all"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <button 
            onClick={handleNextStep}
            disabled={currentStep === recipe.instructions.length}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-0 transition-all"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Ingredients Sidebar Overlay */}
      {showIngredients && (
        <div className="absolute left-0 top-0 bottom-0 w-80 bg-paper border-r border-border-subtle shadow-2xl z-20 flex flex-col animate-in slide-in-from-left">
          <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-black/5 dark:bg-white/5">
            <h2 className="font-bold uppercase tracking-wider">All Ingredients</h2>
            <button onClick={() => setShowIngredients(false)}><X className="w-5 h-5 text-ink-muted hover:text-ink" /></button>
          </div>
          <ul className="flex-1 overflow-y-auto p-6 space-y-4">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  checked={!!checkedIngredients[i]}
                  onChange={() => setCheckedIngredients(prev => ({...prev, [i]: !prev[i]}))}
                  className="mt-1 w-5 h-5 rounded border-gray-300"
                />
                <div className={`flex flex-col ${checkedIngredients[i] ? 'opacity-50 line-through' : ''}`}>
                  <span className="font-bold">{ing.quantity} {ing.unit}</span>
                  <span className="text-sm">{ing.name}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Finish Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper rounded-2xl w-full max-w-xl shadow-2xl border border-border-subtle flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border-subtle flex justify-between items-center">
              <h2 className="text-2xl font-bold">Log Bake</h2>
              <button onClick={() => setShowFinishModal(false)}><X className="w-6 h-6 hover:opacity-70" /></button>
            </div>
            
            <form onSubmit={handleFinishSubmit} className="p-6 space-y-6 overflow-y-auto">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold">Bake Notes</label>
                  {browserSupportsSpeechRecognition && (
                    <button 
                      type="button"
                      onClick={toggleDictation}
                      className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors ${isDictating ? 'bg-red-500/20 text-red-500 border border-red-500/50 animate-pulse' : 'bg-black/5 dark:bg-white/5 border border-border-subtle hover:bg-black/10'}`}
                    >
                      {isDictating ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                      {isDictating ? 'Listening...' : 'Dictate'}
                    </button>
                  )}
                </div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full border border-border-subtle rounded-md p-3 bg-black/5 dark:bg-white/5 focus:ring-1 focus:ring-ink focus:outline-none resize-none" placeholder="How did it turn out? What would you change next time?"></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Photos</label>
                <div className="border-2 border-dashed border-border-subtle rounded-lg p-8 flex flex-col items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      setImageFiles(prev => [...prev, ...files.map(f => ({ file: f, label: '' }))]);
                    }} 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  <Upload className="w-8 h-8 text-ink-muted mb-2" />
                  <span className="text-sm font-medium text-ink-muted">
                    Upload Photos
                  </span>
                </div>
                {imageFiles.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {imageFiles.map((img, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-2 rounded-md border border-border-subtle">
                        <div className="w-12 h-12 bg-black/10 dark:bg-white/10 rounded overflow-hidden flex-shrink-0">
                          <img src={URL.createObjectURL(img.file)} alt="preview" className="w-full h-full object-cover" />
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
                          className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-1 outline-none"
                        />
                        <button type="button" onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== idx))} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={savingLog} className="w-full bg-ink text-paper font-bold text-lg py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                {savingLog ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Log & Finish'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Voice Help Modal */}
      {showVoiceHelp && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper rounded-2xl w-full max-w-sm shadow-2xl border border-border-subtle p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold uppercase tracking-wider">Voice Commands</h2>
              <button onClick={() => setShowVoiceHelp(false)}><X className="w-5 h-5 text-ink-muted hover:text-ink" /></button>
            </div>
            <ul className="space-y-3 text-sm">
              <li><strong className="text-ink">"Next" / "Back"</strong> - Navigate steps</li>
              <li><strong className="text-ink">"Read"</strong> - Reads current step aloud</li>
              <li><strong className="text-ink">"Ingredients"</strong> - Reads ingredients for current step</li>
              <li><strong className="text-ink">"Start timer"</strong> - Starts the first timer found in the step</li>
              <li><strong className="text-ink">"Quiet"</strong> - Stops any ringing alarms</li>
              <li><strong className="text-ink">"Show all"</strong> - Toggles Focus Mode / Show All</li>
              <li><strong className="text-ink">"Up" / "Down"</strong> - Scrolls the page</li>
              <li><strong className="text-ink">"Finish"</strong> - Opens the Bake Log modal</li>
              <li><strong className="text-ink">"Close"</strong> - Closes open popups</li>
            </ul>
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
