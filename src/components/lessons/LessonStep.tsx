/**
 * One lesson step: title + markdown body + (optionally) a live checkpoint
 * card that evaluates its predicate against the current params/derived on
 * every store change. Also exports `useCheckpointPass` so the drawer footer
 * can gate the Next button on the same live result.
 */
import { CheckCircle2, Circle } from 'lucide-react';
import type { Lesson } from '../../types';
import { useDerived, useParams } from '../../store/useConfigStore';
import { MarkdownLite } from '../ai/MarkdownLite';

/**
 * Live checkpoint evaluation for a lesson step. Returns true when the step
 * has no checkpoint (read-only steps auto-pass) or when the predicate holds
 * for the current params/derived.
 */
export function useCheckpointPass(lesson: Lesson, stepIndex: number): boolean {
  const params = useParams();
  const derived = useDerived();
  const step = stepIndex >= 0 && stepIndex < lesson.steps.length ? lesson.steps[stepIndex] : undefined;
  if (!step || !step.checkpoint) return true;
  return step.checkpoint.predicate(params, derived);
}

interface LessonStepProps {
  lesson: Lesson;
  stepIndex: number;
}

export function LessonStep({ lesson, stepIndex }: LessonStepProps) {
  const passed = useCheckpointPass(lesson, stepIndex);
  const step = stepIndex >= 0 && stepIndex < lesson.steps.length ? lesson.steps[stepIndex] : undefined;
  if (!step) return null;

  return (
    <div>
      <h3 className="mb-2 text-[15px] font-semibold text-ink">{step.title}</h3>
      <MarkdownLite text={step.body} />

      {step.checkpoint && (
        <div
          className={`mt-4 rounded-lg border bg-surface-2 p-3 transition-colors duration-300 ${
            passed ? 'border-accent-2/60' : 'border-edge'
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <span className="section-title">Checkpoint</span>
            {passed ? (
              <CheckCircle2 size={15} className="ml-auto shrink-0 text-accent-2" aria-hidden="true" />
            ) : (
              <Circle size={15} className="ml-auto shrink-0 text-ink-3" aria-hidden="true" />
            )}
          </div>
          <p className="mt-1.5 text-[13px] text-ink-2">{step.checkpoint.description}</p>
          <p className={`mt-1 text-[12px] ${passed ? 'text-accent-2' : 'text-ink-3'}`}>
            {passed ? 'Passed — nice.' : 'Keep adjusting…'}
          </p>
        </div>
      )}
    </div>
  );
}
