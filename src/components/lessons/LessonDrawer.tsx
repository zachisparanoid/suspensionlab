/**
 * Right-side guided-lessons drawer. On desktop there is no backdrop, so the
 * learner can keep adjusting parameters while reading — checkpoints react
 * live. On small screens a dimming backdrop closes the drawer on tap.
 */
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  AudioWaveform,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Cog,
  Gem,
  GraduationCap,
  MoveDiagonal,
  Scale,
  Trophy,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Lesson } from '../../types';
import { getLesson, LESSONS } from '../../data/lessons';
import { useLessonStore } from '../../store/useLessonStore';
import { IconButton } from '../common/IconButton';
import { toast } from '../common/Toast';
import { PANEL_EASE } from '../layout/Panel';
import { LessonStep, useCheckpointPass } from './LessonStep';

/** lesson.icon (string name in lessons.ts) → lucide component. */
const LESSON_ICONS: Record<string, LucideIcon> = {
  Coil: Cog,
  AudioWaveform,
  Activity,
  Scale,
  MoveDiagonal,
  Trophy,
  Gem,
};

function LessonList() {
  const startLesson = useLessonStore((s) => s.startLesson);
  const progress = useLessonStore((s) => s.progress);

  return (
    <div>
      <p className="mb-3 text-[12.5px] text-ink-2">
        Six hands-on lessons. Starting one loads a matching preset.
      </p>
      <div className="flex flex-col gap-2">
        {LESSONS.map((l) => {
          const Icon = LESSON_ICONS[l.icon] ?? BookOpen;
          const best = progress[l.id] ?? -1;
          const done = best >= l.steps.length - 1;
          const started = best >= 0;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => startLesson(l.id)}
              className="w-full rounded-lg border border-edge bg-surface-2/60 p-3 text-left transition-colors duration-150 hover:border-accent/40"
              aria-label={`Start lesson: ${l.title}`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className="shrink-0 text-accent" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink">{l.title}</div>
                  <div className="text-[12px] text-ink-3">{l.subtitle}</div>
                </div>
                {done ? (
                  <CheckCircle2
                    size={16}
                    className="shrink-0 text-accent-2"
                    aria-label="Lesson complete"
                  />
                ) : started ? (
                  <span className="mono shrink-0 text-[12px] text-ink-2" aria-label={`${best + 1} of ${l.steps.length} steps complete`}>
                    {best + 1}/{l.steps.length}
                  </span>
                ) : (
                  <ChevronRight size={16} className="shrink-0 text-ink-3" aria-hidden="true" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LessonFooter({ lesson }: { lesson: Lesson }) {
  const stepIndex = useLessonStore((s) => s.stepIndex);
  const progress = useLessonStore((s) => s.progress);
  const prevStep = useLessonStore((s) => s.prevStep);
  const nextStep = useLessonStore((s) => s.nextStep);
  const markStepComplete = useLessonStore((s) => s.markStepComplete);
  const exitLesson = useLessonStore((s) => s.exitLesson);
  const passed = useCheckpointPass(lesson, stepIndex);

  const best = progress[lesson.id] ?? -1;
  const maxReachable = Math.min(best + 1, lesson.steps.length - 1);
  const isLast = stepIndex >= lesson.steps.length - 1;

  const onNext = () => {
    if (!passed) return;
    markStepComplete();
    if (isLast) {
      exitLesson();
      toast('Lesson complete — nice work!');
    } else {
      nextStep();
    }
  };

  return (
    <footer className="flex items-center gap-2 border-t border-edge p-4">
      <div className="flex gap-1.5" role="group" aria-label="Lesson steps">
        {lesson.steps.map((s, i) => {
          const reachable = i <= maxReachable;
          return (
            <button
              key={i}
              type="button"
              disabled={!reachable}
              onClick={() => {
                if (reachable) useLessonStore.setState({ stepIndex: i });
              }}
              aria-label={`Step ${i + 1} of ${lesson.steps.length}: ${s.title}`}
              aria-current={i === stepIndex ? 'step' : undefined}
              title={reachable ? s.title : 'Complete earlier steps first'}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === stepIndex ? 'w-6' : 'w-3'
              } ${i <= stepIndex ? 'bg-accent' : 'bg-edge'} ${
                reachable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
              }`}
            />
          );
        })}
      </div>
      <button
        type="button"
        onClick={prevStep}
        disabled={stepIndex === 0}
        className="ml-auto rounded-lg border border-edge px-3 py-1.5 text-[12.5px] text-ink-2 transition-colors duration-150 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!passed}
        aria-disabled={!passed}
        title={passed ? undefined : 'Satisfy the checkpoint to continue'}
        className="rounded-lg border border-accent/40 bg-accent/20 px-4 py-1.5 text-[12.5px] font-medium text-accent transition-colors duration-150 hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isLast ? 'Finish' : 'Next'}
      </button>
    </footer>
  );
}

export function LessonDrawer() {
  const drawerOpen = useLessonStore((s) => s.drawerOpen);
  const activeLessonId = useLessonStore((s) => s.activeLessonId);
  const stepIndex = useLessonStore((s) => s.stepIndex);
  const closeDrawer = useLessonStore((s) => s.closeDrawer);
  const exitLesson = useLessonStore((s) => s.exitLesson);

  const activeLesson = activeLessonId ? getLesson(activeLessonId) : undefined;

  return (
    <AnimatePresence>
      {drawerOpen && (
        <motion.div
          key="lesson-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: PANEL_EASE }}
          className="fixed inset-0 z-[55] bg-black/40 lg:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}
      {drawerOpen && (
        <motion.aside
          key="lesson-drawer"
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ duration: 0.22, ease: PANEL_EASE }}
          className="fixed right-0 top-0 z-[60] flex h-full w-[380px] max-w-[92vw] flex-col border-l border-edge bg-surface shadow-panel"
          role="complementary"
          aria-label="Guided lessons"
        >
          <header className="flex items-center gap-2 border-b border-edge p-4">
            <GraduationCap size={16} className="shrink-0 text-accent" aria-hidden="true" />
            <h2 className="section-title">Guided Lessons</h2>
            <IconButton label="Close lessons" size="sm" className="ml-auto" onClick={closeDrawer}>
              <X size={14} />
            </IconButton>
          </header>

          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            {activeLesson ? (
              <>
                <button
                  type="button"
                  onClick={exitLesson}
                  className="mb-3 flex items-center gap-1.5 text-[12.5px] text-ink-2 transition-colors duration-150 hover:text-ink"
                  aria-label={`Back to lesson list (currently in ${activeLesson.title})`}
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  {activeLesson.title}
                </button>
                <LessonStep lesson={activeLesson} stepIndex={stepIndex} />
              </>
            ) : (
              <LessonList />
            )}
          </div>

          {activeLesson && <LessonFooter lesson={activeLesson} />}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
