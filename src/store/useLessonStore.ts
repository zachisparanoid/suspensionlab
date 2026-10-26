/**
 * Lesson drawer state + progress persistence.
 * Progress = per-lesson highest completed step index (−1 = untouched).
 */
import { create } from 'zustand';
import { getLesson, LESSONS } from '../data/lessons';
import { useConfigStore } from './useConfigStore';
import { KEYS, readJson, writeJson } from './storage';

type ProgressMap = Record<string, number>;

interface LessonState {
  drawerOpen: boolean;
  activeLessonId: string | null;
  stepIndex: number;
  /** lessonId → highest step index completed. */
  progress: ProgressMap;

  openDrawer: () => void;
  closeDrawer: () => void;
  startLesson: (id: string) => void;
  exitLesson: () => void;
  nextStep: () => void;
  prevStep: () => void;
  markStepComplete: () => void;
}

const initialProgress = readJson<ProgressMap>(KEYS.lessonProgress, {});

export const useLessonStore = create<LessonState>((set, get) => ({
  drawerOpen: false,
  activeLessonId: null,
  stepIndex: 0,
  progress: typeof initialProgress === 'object' && initialProgress ? initialProgress : {},

  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),

  startLesson: (id) => {
    const lesson = getLesson(id);
    if (!lesson) return;
    if (lesson.startPresetId) {
      useConfigStore.getState().loadPreset(lesson.startPresetId);
    }
    set({ activeLessonId: id, stepIndex: 0, drawerOpen: true });
  },

  exitLesson: () => set({ activeLessonId: null, stepIndex: 0 }),

  nextStep: () => {
    const { activeLessonId, stepIndex } = get();
    const lesson = activeLessonId ? getLesson(activeLessonId) : null;
    if (!lesson) return;
    if (stepIndex < lesson.steps.length - 1) {
      set({ stepIndex: stepIndex + 1 });
    }
  },

  prevStep: () => {
    const { stepIndex } = get();
    if (stepIndex > 0) set({ stepIndex: stepIndex - 1 });
  },

  markStepComplete: () => {
    const { activeLessonId, stepIndex, progress } = get();
    if (!activeLessonId) return;
    const best = progress[activeLessonId] ?? -1;
    if (stepIndex > best) {
      const next = { ...progress, [activeLessonId]: stepIndex };
      set({ progress: next });
      writeJson(KEYS.lessonProgress, next);
    }
  },
}));

/** % of all lessons fully completed — for the header badge. */
export function lessonCompletionPct(progress: ProgressMap): number {
  const done = LESSONS.filter((l) => (progress[l.id] ?? -1) >= l.steps.length - 1).length;
  return Math.round((done / LESSONS.length) * 100);
}
