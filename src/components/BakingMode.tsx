import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Link as LinkIcon, MoreHorizontal, PencilLine, Timer as TimerIcon, X } from 'lucide-react';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import type { BakeLog, Component, Recipe, StepNote } from '../lib/types';
import { repo } from '../lib/repo';
import { useRecipeBakeLogs } from '../lib/queries';
import { friendlyAmountText, ingredientParts } from '../lib/quantities';
import { cleanText, methodSteps } from '../lib/recipeText';
import { bakePhases } from '../lib/method';
import { scaleService, type WeightMeasurement } from '../lib/bluetoothScale';
import { haptic } from '../lib/haptics';
import { voiceCommandsEnabled, waveToAdvanceEnabled } from '../lib/settings';
import { addActiveBakeNote, clearActiveBake, getActiveBake, startActiveBake } from '../lib/activeBake';
import { useActiveBake } from '../lib/useActiveBake';
import { ingredientsForStep, scaleTargetGrams } from '../lib/stepIngredients';
import { findTimers, startTimer } from '../lib/stepTimers';
import { formatTimerClock, getRunningTimers, OPEN_TIMERS_EVENT, subscribeRunningTimers } from '../lib/timerBus';
import RecipeDrawer from './RecipeDrawer';
import LogBakeSheet from './LogBakeSheet';
import StepText from './StepText';
import { Button, IconButton, MarginNote, Menu, MenuItem, Readout, Sheet, StepRow, TextArea, cn, useToast } from './ui';

/*
 * Baking mode: one step at a time, at arm's length (changes 87–97).
 *
 * One baker, a phone propped against the mixer, hands in the dough. The step
 * is set in the reading face, large, in the top third; under it, what this
 * step needs, its timer as one big press, and — pencilled — what the last
 * bake noted about this very step. Along the foot: a Note button that files a
 * thought against this step, Back, and a wide Next. The last Next asks "How
 * did it go?" and opens the bake log with the step notes already filed.
 *
 * The head is four things: leave, the recipe, "3 of 12", and ⋯ for the rest
 * (every ingredient, every step, the scale, voice, the camera). Under it, a
 * thin line of the bake's named phases: where you are, and a way to jump.
 *
 * Kept from before, all of it: swipe, the arrow keys, voice commands, wave to
 * advance, the Bluetooth scale, the screen kept awake, haptics. On a wide
 * screen the step's ingredients, timers, last note and a quick note sit in a
 * column beside it instead of under it.
 */

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const EMPTY_LOGS: BakeLog[] = [];

export default function BakingMode() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const askedStep = Number(searchParams.get('step')) || 0;
  const navigate = useNavigate();
  const toast = useToast();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [position, setPosition] = useState(0);
  const [view, setView] = useState<'focus' | 'all'>('focus');
  const [sheet, setSheet] = useState<null | 'ingredients' | 'note' | 'voice' | 'finish' | 'log'>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [notice, setNotice] = useState('');
  const [subRecipeId, setSubRecipeId] = useState<string | null>(null);
  const [scaleConnected, setScaleConnected] = useState(false);
  const [scaleWeight, setScaleWeight] = useState<WeightMeasurement | null>(null);
  const [cameraActive, setCameraActive] = useState(waveToAdvanceEnabled);
  const [voiceSetting] = useState(voiceCommandsEnabled);
  const [waveSetting] = useState(waveToAdvanceEnabled);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timers = useSyncExternalStore(subscribeRunningTimers, getRunningTimers, getRunningTimers);
  const active = useActiveBake();
  const { data: bakes = EMPTY_LOGS } = useRecipeBakeLogs(id);

  const steps = useMemo(() => methodSteps(recipe?.instructions), [recipe]);
  const phases = useMemo(() => bakePhases(recipe?.instructions), [recipe]);
  const step = steps[position];
  const last = position >= steps.length - 1;
  const notesThisBake: StepNote[] = active && active.recipeId === id ? active.notes ?? [] : [];
  const lastBake = bakes[0];

  /* ── Loading, and resuming a bake left running ─────────────────────── */
  useEffect(() => {
    if (!id) return;
    repo
      .getRecipe(id)
      .then((r) => {
        setRecipe(r);
        const running = getActiveBake();
        if (r && running?.recipeId === id) {
          const at = methodSteps(r.instructions).findIndex((s) => s.index >= running.stepIndex);
          if (at > 0) setPosition(at);
        }
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, [id]);

  /*
   * A timer's notification opens baking mode at its step (`?step=4`, the
   * printed number). It wins over a resumed position, and works while baking
   * mode is already open. The address is cleared once read, so the same
   * step's next notification still moves the page.
   */
  useEffect(() => {
    if (!askedStep || steps.length === 0) return;
    const at = steps.findIndex((s) => s.number === askedStep);
    if (at >= 0) setPosition(at);
    setSearchParams({}, { replace: true });
  }, [askedStep, steps, setSearchParams]);

  // The rest of the app (the pill, the cookbook) learns which step this is.
  useEffect(() => {
    if (id && recipe && step) startActiveBake(id, recipe.title, step.index);
  }, [id, recipe, step]);

  /* ── The screen stays awake; the scale lets go on the way out ───────── */
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock
      ?.request('screen')
      .then((lock) => {
        wakeLock.current = lock;
      })
      .catch(() => undefined);
    return () => {
      void wakeLock.current?.release().catch(() => undefined);
      scaleService.disconnect();
    };
  }, []);

  /* ── Moving between steps ──────────────────────────────────────────── */
  const positionRef = useRef(position);
  positionRef.current = position;
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const next = () => {
    if (positionRef.current >= stepsRef.current.length - 1) {
      setSheet('log');
      return;
    }
    haptic('light');
    setPosition((p) => p + 1);
    contentRef.current?.scrollTo?.({ top: 0 });
  };
  const back = () => {
    if (positionRef.current === 0) return;
    haptic('light');
    setPosition((p) => p - 1);
    contentRef.current?.scrollTo?.({ top: 0 });
  };
  const goTo = (index: number) => {
    const at = stepsRef.current.findIndex((s) => s.index === index);
    if (at === -1) return;
    haptic('selection');
    setPosition(at);
    setView('focus');
  };

  /* ── Voice ─────────────────────────────────────────────────────────── */
  const stepIngredients = (s = step): Component[] => (recipe && s ? ingredientsForStep(s.text, recipe.ingredients) : []);
  const speak = (text: string) => window.speechSynthesis?.speak(new SpeechSynthesisUtterance(text));
  const { listening, browserSupportsSpeechRecognition } = useSpeechRecognition({
    commands: [
      { command: ['next', 'next step', 'forward'], callback: () => next() },
      { command: ['back', 'previous', 'previous step'], callback: () => back() },
      { command: ['finish', 'done', 'complete'], callback: () => setSheet('finish') },
      { command: ['read', 'repeat', 'read step', 'read that'], callback: () => step && speak(step.text) },
      {
        command: ['ingredients', 'read ingredients', 'what do i need'],
        callback: () => {
          const needs = stepIngredients();
          speak(
            needs.length
              ? `You need: ${needs.map((i) => `${friendlyAmountText(i.quantity, i.unit)} ${ingredientParts(cleanText(i.name)).name}`).join(', ')}`
              : 'No particular ingredients for this step.',
          );
        },
      },
      {
        command: ['start timer', 'start'],
        callback: () => {
          const t = step ? findTimers(step.text)[0] : undefined;
          if (t) {
            startTimer(t.seconds, `Step ${step!.number} · ${t.label}`, { from: { recipeId: id!, step: step!.number } });
            speak('Timer started.');
          } else {
            speak("I didn't find a time in this step.");
          }
        },
      },
      { command: ['quiet', 'quite', 'stop timer', 'stop'], callback: () => window.dispatchEvent(new Event('stop-alarms')) },
      { command: ['show all', 'focus mode', 'toggle view'], callback: () => setView((v) => (v === 'focus' ? 'all' : 'focus')) },
      { command: ['up', 'scroll up'], callback: () => contentRef.current?.scrollBy({ top: -500, behavior: 'smooth' }) },
      { command: ['down', 'scroll down'], callback: () => contentRef.current?.scrollBy({ top: 500, behavior: 'smooth' }) },
      { command: ['help', 'voice commands'], callback: () => setSheet('voice') },
      { command: ['close'], callback: () => setSheet(null) },
    ],
  });
  const toggleMic = () => {
    if (listening) SpeechRecognition.stopListening();
    else void SpeechRecognition.startListening({ continuous: true });
  };

  /* ── Wave to advance: a hand across the camera is Next ─────────────── */
  useEffect(() => {
    if (!cameraActive) return;
    let alive = true;
    let stream: MediaStream | null = null;
    let frame = 0;
    let previous: ImageData | null = null;
    let coolingUntil = 0;
    const video = videoRef.current;

    const detect = () => {
      if (!alive) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (video && canvas && ctx && video.readyState === video.HAVE_ENOUGH_DATA && Date.now() > coolingUntil) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (previous) {
          let changed = 0;
          for (let i = 0; i < current.data.length; i += 16) {
            const diff =
              Math.abs(current.data[i] - previous.data[i]) +
              Math.abs(current.data[i + 1] - previous.data[i + 1]) +
              Math.abs(current.data[i + 2] - previous.data[i + 2]);
            if (diff > 50) changed++;
          }
          // A hand across the lens changes more than an eighth of the picture.
          if (changed / (current.data.length / 16) > 0.15) {
            coolingUntil = Date.now() + 2000;
            previous = null;
            next();
            frame = requestAnimationFrame(detect);
            return;
          }
        }
        previous = current;
      }
      frame = requestAnimationFrame(detect);
    };

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } })
      .then((s) => {
        if (!alive) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video) video.srcObject = s;
        frame = requestAnimationFrame(detect);
      })
      .catch(() => setNotice("The camera isn't available, so waving won't turn the page. Next still works."));

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
    // `next` reads refs; the camera follows the toggle alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive]);

  /* ── The Bluetooth scale ───────────────────────────────────────────── */
  const connectScale = async () => {
    try {
      await scaleService.connect();
      setScaleConnected(true);
      scaleService.onWeightChange(setScaleWeight);
      scaleService.onDisconnect(() => {
        setScaleConnected(false);
        setScaleWeight(null);
      });
    } catch {
      setNotice("The scale didn't connect. Check Bluetooth is on and this site may use it, then try again.");
    }
  };
  const scaleTarget = scaleTargetGrams(stepIngredients()) ?? 0;
  useEffect(() => {
    // Within 5% of what the step weighs: on to the next one.
    if (scaleWeight && scaleTarget > 0 && scaleWeight.weight >= scaleTarget * 0.95) next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleWeight]);

  /* ── Keys and swipes ───────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // An open sheet owns the keyboard.
      if (sheet || subRecipeId) return;
      if (e.key === 'Escape') navigate(`/recipe/${id}`);
      if (view !== 'focus') return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, subRecipeId, view, id]);

  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const moved = touchX.current - e.changedTouches[0].clientX;
    touchX.current = null;
    if (moved > 60) next();
    else if (moved < -60) back();
  };

  /* ── Notes ─────────────────────────────────────────────────────────── */
  const saveNote = (text: string) => {
    const words = text.trim();
    if (!words || !id || !step) return false;
    addActiveBakeNote(id, { stepIndex: step.index, text: words, at: new Date().toISOString() });
    haptic('light');
    toast.show({ message: `Noted on step ${step.number}` });
    return true;
  };

  const leave = () => navigate(`/recipe/${id}`);
  const stopBake = () => {
    clearActiveBake(id);
    navigate(`/recipe/${id}`);
  };

  if (loading) return <div className="fixed inset-0 z-50 bg-paper" />;

  if (!recipe) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
        <p className="font-title text-2xl text-ink">
          {loadFailed ? "Couldn't open this recipe on this device" : 'This recipe is not in the cookbook'}
        </p>
        <p className="max-w-prose text-ink-2">
          {loadFailed
            ? 'Go back and open it again. If it keeps happening, reload the app.'
            : 'It may have been deleted. Your bakes of it are still in Bakes.'}
        </p>
        <Button onClick={() => navigate('/')}>Back to the cookbook</Button>
      </div>
    );
  }

  const needs = stepIngredients();
  const stepTimer = step ? findTimers(step.text)[0] : undefined;
  const runningForStep = stepTimer ? timers.find((t) => t.name === `Step ${step!.number} · ${stepTimer.label}`) : undefined;
  const lastOnStep = step ? lastBake?.stepNotes?.filter((n) => n.stepIndex === step.index).at(-1) : undefined;
  const mineOnStep = step ? notesThisBake.filter((n) => n.stepIndex === step.index) : [];
  const links = step ? (recipe.instructionLinks ?? []).filter((l) => l.stepIndex === step.index) : [];

  const youNeed = needs.length ? (
    <section aria-labelledby="you-need" className="flex flex-col gap-1">
      <h2 id="you-need" className="ui-label">
        You need
      </h2>
      <ul className="flex flex-col">
        {needs.map((ing, i) => (
          <li key={i} className="flex items-baseline gap-3 border-b border-rule py-1.5 text-[1.0625rem] last:border-0">
            <span className="w-20 shrink-0 font-sans font-semibold tabular-nums text-ink">{friendlyAmountText(ing.quantity, ing.unit)}</span>
            <span className="font-prose min-w-0 text-ink">{ingredientParts(cleanText(ing.name)).name}</span>
          </li>
        ))}
      </ul>
      {scaleConnected && scaleTarget > 0 ? (
        <div className="mt-2 flex items-end gap-6">
          <Readout label="On the scale" value={scaleWeight ? scaleWeight.weight : '—'} unit={scaleWeight ? scaleWeight.unit : 'g'} size="lg" />
          <Readout label="Target" value={scaleTarget} unit="g" size="md" />
        </div>
      ) : null}
    </section>
  ) : null;

  const timerChip = stepTimer ? (
    <button
      type="button"
      onClick={() => {
        if (runningForStep) window.dispatchEvent(new Event(OPEN_TIMERS_EVENT));
        else {
          haptic('medium');
          startTimer(stepTimer.seconds, `Step ${step!.number} · ${stepTimer.label}`, { from: { recipeId: id!, step: step!.number } });
        }
      }}
      className="pressable inline-flex min-h-16 items-center gap-3 self-start rounded-full bg-butter pl-5 pr-6 font-sans text-on-butter"
    >
      <TimerIcon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
      {runningForStep ? (
        <>
          <span className="text-[1.625rem] font-semibold tabular-nums">{formatTimerClock(runningForStep.remainingMs).replace(/^-/, '−')}</span>{' '}
          <span className="text-sm">of {stepTimer.label}</span>
        </>
      ) : (
        <span className="text-xl font-semibold">Start {stepTimer.label}</span>
      )}
    </button>
  ) : null;

  const lastTime = lastOnStep ? (
    <div className="flex flex-col gap-1.5 rounded-key bg-paper-sunk px-4 py-3.5">
      <span className="text-xs font-semibold text-pencil">Last time on this step · {shortDate(lastOnStep.at)}</span>
      <span className="font-prose hand text-[1.0625rem] italic leading-snug text-ink-2">“{lastOnStep.text}”</span>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper text-ink">
      <video ref={videoRef} autoPlay playsInline muted className="pointer-events-none absolute h-px w-px opacity-0" />
      <canvas ref={canvasRef} width="320" height="240" className="hidden" />

      {notice ? (
        <div role="alert" className="flex shrink-0 items-start gap-2 border-b border-fault px-4 py-2 text-sm text-fault pt-safe md:pt-2">
          <span className="flex-1">{notice}</span>
          <IconButton label="Dismiss" icon={<X className="h-4 w-4" aria-hidden="true" />} onClick={() => setNotice('')} className="-my-2" />
        </div>
      ) : null}

      <header className="shrink-0 px-1 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-1">
          <IconButton label="Leave baking mode" onClick={leave} icon={<X className="h-[22px] w-[22px]" strokeWidth={1.7} aria-hidden="true" />} />
          <h1 className="font-title min-w-0 flex-1 truncate text-lg">{recipe.title}</h1>
          <span className="px-1 text-sm tabular-nums text-ink-muted" aria-live="polite">
            {step ? `${step.number} of ${steps.length}` : ''}
          </span>
          <Menu
            label="Baking options"
            align="right"
            trigger={(props) => (
              <button
                type="button"
                {...props}
                aria-label="Ingredients, all steps, scale and voice"
                className="pressable inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-paper-sunk"
              >
                <MoreHorizontal className="h-[22px] w-[22px]" aria-hidden="true" />
              </button>
            )}
          >
            <MenuItem onSelect={() => setSheet('ingredients')}>All ingredients</MenuItem>
            <MenuItem onSelect={() => setView((v) => (v === 'focus' ? 'all' : 'focus'))}>
              {view === 'focus' ? 'All steps' : 'One step at a time'}
            </MenuItem>
            <MenuItem onSelect={connectScale}>{scaleConnected ? 'Scale connected' : 'Connect a Bluetooth scale'}</MenuItem>
            {voiceSetting && browserSupportsSpeechRecognition ? (
              <MenuItem onSelect={toggleMic}>{listening ? 'Stop listening' : 'Listen for voice commands'}</MenuItem>
            ) : null}
            {voiceSetting && browserSupportsSpeechRecognition ? <MenuItem onSelect={() => setSheet('voice')}>Voice commands</MenuItem> : null}
            {waveSetting ? (
              <MenuItem onSelect={() => setCameraActive((v) => !v)}>{cameraActive ? 'Stop wave to advance' : 'Wave to advance'}</MenuItem>
            ) : null}
            <MenuItem onSelect={() => setSheet('log')}>Finish and log</MenuItem>
            <MenuItem onSelect={stopBake}>Stop without logging</MenuItem>
          </Menu>
        </div>
        <div className="px-4 pb-2">
          <StepRow
            phases={phases}
            activeStep={step?.index}
            onSelect={(phase) => phase.stepIndices[0] !== undefined && goTo(phase.stepIndices[0])}
            label={`${recipe.title}: jump to a part of the bake`}
          />
        </div>
        {timers.length ? (
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2" aria-label="Running timers">
            {timers.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => window.dispatchEvent(new Event(OPEN_TIMERS_EVENT))}
                className={cn(
                  'pressable inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-butter px-3 text-sm tabular-nums text-on-butter',
                  t.remainingMs < 0 && 'font-semibold',
                )}
              >
                {t.name.replace(/^Step \d+ · /, '')} · {formatTimerClock(t.remainingMs).replace(/^-/, '−')}
                {t.running ? '' : ' · paused'}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          ref={contentRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="min-w-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-8"
        >
          {view === 'focus' && step ? (
            <div className="mx-auto flex max-w-2xl flex-col gap-6 pt-6 sm:pt-10">
              {position === 0 && lastBake?.nextTime ? (
                <MarginNote lead="Next time, you said">{lastBake.nextTime}</MarginNote>
              ) : null}
              {step.heading ? <p className="font-title text-xl italic text-ink-2">{step.heading}</p> : null}
              <p className="font-prose text-[1.75rem] leading-[1.3] sm:text-[2rem]">
                <StepText text={step.text} name={`Step ${step.number}`} from={id ? { recipeId: id, step: step.number } : undefined} />
              </p>
              {links.length ? (
                <div className="flex flex-wrap gap-2">
                  {links.map((link) => (
                    <Button key={link.recipeId} onClick={() => setSubRecipeId(link.recipeId)} icon={<LinkIcon className="h-4 w-4" aria-hidden="true" />}>
                      {link.recipeTitle}
                    </Button>
                  ))}
                </div>
              ) : null}
              {timerChip}
              <div className="flex flex-col gap-6 lg:hidden">
                {youNeed}
                {lastTime}
              </div>
              {mineOnStep.map((n) => (
                <MarginNote key={n.at} lead="Noted">
                  {n.text}
                </MarginNote>
              ))}
            </div>
          ) : (
            <ol className="mx-auto flex max-w-2xl flex-col py-6">
              {steps.map((s, i) => (
                <li key={s.index} className="flex flex-col">
                  {s.heading && s.heading !== steps[i - 1]?.heading ? (
                    <p className="font-title mt-4 text-lg italic text-ink-2">{s.heading}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => goTo(s.index)}
                    aria-current={i === position ? 'step' : undefined}
                    className={cn(
                      'pressable -mx-2 flex gap-3 rounded-key px-2 py-3 text-left hover:bg-paper-sunk',
                      i === position && 'bg-butter text-on-butter',
                    )}
                  >
                    <span className="font-title w-6 shrink-0 text-lg text-ink-muted">{s.number}</span>
                    <span className="font-prose text-lg leading-relaxed">{s.text}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* On a wide screen: the step's ingredients, its last note and a quick note, beside it. */}
        {view === 'focus' && step ? (
          <aside aria-label="This step" className="hidden w-80 shrink-0 flex-col gap-6 overflow-y-auto border-l border-rule px-6 py-10 lg:flex">
            {youNeed ?? <p className="text-sm text-ink-muted">Nothing to weigh out for this step.</p>}
            {lastTime}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (saveNote(quickNote)) setQuickNote('');
              }}
              className="flex flex-col gap-2"
            >
              <TextArea label="A note on this step" rows={3} value={quickNote} onChange={(e) => setQuickNote(e.target.value)} prose />
              <Button type="submit" size="sm" className="self-start" disabled={!quickNote.trim()}>
                Save the note
              </Button>
            </form>
          </aside>
        ) : null}
      </div>

      {/* The transport: one bar at every width, in the thumb's reach. */}
      <footer className="shrink-0 border-t border-rule px-3 py-3 pb-safe">
        <div className="mx-auto flex max-w-2xl items-stretch gap-2.5">
          <button
            type="button"
            onClick={() => {
              setNoteDraft('');
              setSheet('note');
            }}
            aria-label={step ? `Note on step ${step.number}` : 'Note'}
            className="pressable flex min-h-16 w-[3.75rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-control border border-rule-strong text-xs text-ink hover:bg-paper-sunk lg:hidden"
          >
            <PencilLine className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
            Note
          </button>
          {/* On step one there is nowhere to go back to; the button keeps its place but goes. */}
          <Button size="lg" className={cn('min-h-16 w-24 shrink-0 text-[1.0625rem]', position === 0 && 'invisible')} onClick={back} aria-hidden={position === 0 || undefined} tabIndex={position === 0 ? -1 : undefined}>
            Back
          </Button>
          <Button size="lg" variant="primary" className="min-h-16 flex-1 text-[1.1875rem]" onClick={next}>
            {last ? 'How did it go?' : 'Next →'}
          </Button>
        </div>
      </footer>

      <Sheet open={sheet === 'ingredients'} onClose={() => setSheet(null)} title="All ingredients" placement="bottom" detents flush>
        <ul className="divide-y divide-rule px-4">
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={!!checked[i]}
                  onChange={() => setChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
                  className="h-5 w-5 shrink-0 accent-ink"
                />
                <span className={cn('flex min-w-0 flex-1 items-baseline gap-3', checked[i] && 'text-ink-muted line-through')}>
                  <span className="w-20 shrink-0 font-sans text-sm font-semibold tabular-nums">{friendlyAmountText(ing.quantity, ing.unit)}</span>
                  <span className="font-prose min-w-0">{ingredientParts(cleanText(ing.name)).name}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet
        open={sheet === 'note'}
        onClose={() => setSheet(null)}
        title={step ? `A note on step ${step.number}` : 'A note'}
        placement="bottom"
        size="md"
        initialFocus={noteRef}
        footer={
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!noteDraft.trim()}
            onClick={() => {
              if (saveNote(noteDraft)) setSheet(null);
            }}
          >
            Save the note
          </Button>
        }
      >
        <TextArea
          label="What you noticed"
          hideLabel
          rows={3}
          prose
          ref={noteRef}
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Crust pale at 10 min. Give it 12."
        />
        <p className="pt-2 text-sm text-ink-muted">Filed with this bake, against this step. Next time it shows here.</p>
      </Sheet>

      <Sheet
        open={sheet === 'finish'}
        onClose={() => setSheet(null)}
        title="Finish the bake?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="lg" onClick={() => setSheet(null)}>
              Keep baking
            </Button>
            <Button variant="primary" size="lg" onClick={() => setSheet('log')}>
              Finish
            </Button>
          </>
        }
      >
        <p>Finish and log how this one went?</p>
      </Sheet>

      <LogBakeSheet
        open={sheet === 'log'}
        onClose={() => setSheet(null)}
        recipe={recipe}
        stepNotes={notesThisBake}
        onSaved={(log) => {
          clearActiveBake(id);
          navigate(`/recipe/${id}?logged=${log._id}`);
        }}
      />

      <Sheet open={sheet === 'voice'} onClose={() => setSheet(null)} title="Voice commands" size="sm" flush>
        <dl className="flex flex-col divide-y divide-rule px-4 py-2 text-sm">
          {[
            ['“Next” / “Back”', 'Move between steps'],
            ['“Read”', 'Reads the step aloud'],
            ['“Ingredients”', 'Reads what this step needs'],
            ['“Start timer”', "Starts the step's timer"],
            ['“Quiet”', 'Stops a ringing timer'],
            ['“Show all”', 'All steps, or one at a time'],
            ['“Up” / “Down”', 'Scrolls the page'],
            ['“Finish”', 'Logs the bake'],
            ['“Close”', 'Closes what is open'],
          ].map(([command, effect]) => (
            <div key={command} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="font-medium text-ink">{command}</dt>
              <dd className="text-right text-ink-2">{effect}</dd>
            </div>
          ))}
        </dl>
      </Sheet>

      <RecipeDrawer isOpen={!!subRecipeId} onClose={() => setSubRecipeId(null)} recipeId={subRecipeId ?? ''} />
    </div>
  );
}
