import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Dices,
  HelpCircle,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { TASKS_DATA } from '../data/nasledovData';
import {
  GeneratedTicket,
  MistakeItem,
  TaskItem,
  TaskStep,
  TrainerProgressState,
  VariantSource,
} from '../types/stats';
import { stableShuffle, validateStepAnswer } from '../utils/validation';
import { MathFormula } from './MathFormula';
import { RichTermText } from './RichTermText';

interface StepTrainerProps {
  progress: TrainerProgressState;
  generatedTicket: GeneratedTicket;
  forceGeneratedSignal?: number;
  onRegenerateTicket: () => void;
  onSelectGeneratedTicket: (ticketId: string) => void;
  onOpenTerm: (key: string) => void;
  onOpenCalculator: () => void;
  onRegisterCalcTarget: (label: string, applyValue: (val: string) => void) => void;
  onStepResult: (
    stepId: string,
    value: string,
    isCorrect: boolean,
    mistake?: Omit<MistakeItem, 'id' | 'createdAt'>
  ) => void;
  onTestResult: (
    questionId: string,
    optionIdx: number,
    isCorrect: boolean,
    mistake?: Omit<MistakeItem, 'id' | 'createdAt'>
  ) => void;
}

export const StepTrainer: React.FC<StepTrainerProps> = ({
  progress,
  generatedTicket,
  forceGeneratedSignal,
  onRegenerateTicket,
  onSelectGeneratedTicket,
  onOpenTerm,
  onOpenCalculator,
  onRegisterCalcTarget,
  onStepResult,
  onTestResult,
}) => {
  const [variant, setVariant] = useState<VariantSource>('v1');

  useEffect(() => {
    if (forceGeneratedSignal && forceGeneratedSignal > 0) {
      setVariant('generated');
    }
  }, [forceGeneratedSignal]);
  const [onlyMistakes, setOnlyMistakes] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [stepFeedback, setStepFeedback] = useState<
    Record<string, { status: 'ok' | 'err'; message: string }>
  >({});

  const tasks: TaskItem[] = useMemo(() => {
    if (variant === 'v1') return TASKS_DATA.v1;
    if (variant === 'v3') return TASKS_DATA.v3;
    return generatedTicket.tasks;
  }, [variant, generatedTicket]);

  const variantLabel =
    variant === 'v1'
      ? 'Вариант 1'
      : variant === 'v3'
      ? 'Вариант 3'
      : `Генератор (${generatedTicket.seedLabel})`;

  const mistakeCount = Object.keys(progress.mistakes).length;

  const displayedTasks = useMemo(() => {
    if (!onlyMistakes) return tasks;
    return tasks.filter((t) =>
      t.steps.some((s) => Boolean(progress.mistakes[s.id]))
    );
  }, [tasks, onlyMistakes, progress.mistakes]);

  const totalStepsInView = tasks.reduce((acc, t) => acc + t.steps.length, 0);
  const solvedStepsInView = tasks.reduce(
    (acc, t) =>
      acc + t.steps.filter((s) => Boolean(progress.solvedSteps[s.id])).length,
    0
  );

  const handleCheckStep = (task: TaskItem, step: TaskStep, overrideVal?: string) => {
    const raw =
      overrideVal !== undefined
        ? overrideVal
        : inputs[step.id] ?? progress.stepAttempts[step.id]?.value ?? '';
    if (!raw.trim()) {
      setStepFeedback((prev) => ({
        ...prev,
        [step.id]: {
          status: 'err',
          message: 'Введите ответ или выберите вариант перед проверкой.',
        },
      }));
      return;
    }

    const isOk = validateStepAnswer(
      raw,
      step.ans,
      step.numericTolerance ?? 0.02
    );

    if (isOk) {
      setStepFeedback((prev) => ({
        ...prev,
        [step.id]: {
          status: 'ok',
          message: `Верно! ${step.hint}`,
        },
      }));
      onStepResult(step.id, raw, true);
    } else {
      setStepFeedback((prev) => ({
        ...prev,
        [step.id]: {
          status: 'err',
          message:
            'Пока неверно. Проверьте формулу, единицы (σ vs σ²) или откройте подсказку.',
        },
      }));
      onStepResult(step.id, raw, false, {
        kind: 'step',
        sourceLabel: `${variantLabel} · №${task.num}`,
        title: task.title,
        prompt: step.label,
        correctAnswer: step.ans[0],
        hint: step.hint,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] mb-1">
              Алгоритмы расчётов и шкал · Задания №1–9
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Пошаговый тренажёр с разбором ловушек
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              Нажимайте на любой синий термин в условии, чтобы открыть его
              определение и формулу по А. Д. Наследову.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setVariant('v1')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                variant === 'v1'
                  ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                  : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
              }`}
            >
              Вариант 1
            </button>
            <button
              type="button"
              onClick={() => setVariant('v3')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                variant === 'v3'
                  ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                  : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
              }`}
            >
              Вариант 3
            </button>
            <button
              type="button"
              onClick={() => setVariant('generated')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                variant === 'generated'
                  ? 'bg-[#0284C7] text-white border-[#0284C7]'
                  : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
              }`}
            >
              <Dices className="w-4 h-4" />
              <span>Генератор новых чисел</span>
            </button>
          </div>
        </div>

        {/* Sub-bar: Progress & Generator/Mistakes */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-3 text-xs text-[#475569] tabular-nums">
            <span className="font-semibold text-[#0F172A]">
              Освоено шагов: {solvedStepsInView} из {totalStepsInView}
            </span>
            <div className="w-32 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#059669] transition-all duration-300"
                style={{
                  width: `${
                    totalStepsInView > 0
                      ? Math.round((solvedStepsInView / totalStepsInView) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            {variant === 'generated' && (
              <span className="text-[#0369A1] font-medium">
                · {generatedTicket.seedLabel} (создан в {generatedTicket.generatedAt})
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {variant === 'generated' && progress.savedGeneratedTickets.length > 1 && (
              <select
                value={generatedTicket.id}
                onChange={(e) => {
                  onSelectGeneratedTicket(e.target.value);
                  setStepFeedback({});
                  setRevealedHints({});
                }}
                aria-label="Выбрать сохранённый сгенерированный билет"
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] focus:outline-none focus:border-[#1D4ED8] cursor-pointer"
              >
                {progress.savedGeneratedTickets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.seedLabel} ({t.generatedAt})
                  </option>
                ))}
              </select>
            )}

            {variant === 'generated' && (
              <button
                type="button"
                onClick={() => {
                  onRegenerateTicket();
                  setStepFeedback({});
                  setRevealedHints({});
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] hover:bg-[#DBEAFE] transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Новый билет</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenCalculator}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F8FAFC] text-[#1D4ED8] border border-[#CBD5E1] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Калькулятор</span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyMistakes((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                onlyMistakes
                  ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                  : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:bg-[#F1F5F9]'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                Отработка ошибок в этом варианте ({mistakeCount} всего)
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty state if mistake filter has no matches in active variant */}
      {onlyMistakes && displayedTasks.length === 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-[#059669] mx-auto" />
          <div className="text-base font-semibold text-[#0F172A]">
            В текущем варианте нет невыполненных ошибок
          </div>
          <p className="text-sm text-[#64748B]">
            Отключите фильтр ошибок или переключитесь на другой вариант / вкладку
            тестов.
          </p>
        </div>
      )}

      {/* Task Cards */}
      <div className="space-y-5">
        {displayedTasks.map((task) => {
          const allSolved = task.steps.every(
            (s) => Boolean(progress.solvedSteps[s.id])
          );
          return (
            <section
              key={task.id}
              className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-[#64748B]">
                <div className="flex flex-wrap items-center gap-2 tabular-nums">
                  <span className="font-semibold text-[#1D4ED8]">
                    Задание №{task.num}
                  </span>
                  <span>·</span>
                  <span>{task.points}</span>
                  <span>·</span>
                  <span className="text-[#334155]">
                    <MathFormula tex={task.formulaTex} />
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenCalculator}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1D4ED8] hover:underline cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Калькулятор</span>
                  </button>
                  {allSolved ? (
                    <span className="inline-flex items-center gap-1 text-[#059669] font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Выполнено полностью</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#B45309]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Экзаменационная ловушка внутри</span>
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-[#0F172A]">{task.title}</h3>

              <p className="text-[15px] leading-relaxed text-[#1E293B]">
                <RichTermText text={task.text} onOpenTerm={onOpenTerm} />
              </p>

              {/* Trap Callout */}
              <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <div className="text-sm leading-relaxed text-[#78350F]">
                  <span className="font-semibold">На что обратить внимание: </span>
                  <RichTermText text={task.trap} onOpenTerm={onOpenTerm} />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3 pt-1">
                {task.steps.map((step, sIdx) => {
                  const isSolved = Boolean(progress.solvedSteps[step.id]);
                  const hasMistake = Boolean(progress.mistakes[step.id]);
                  const currentVal =
                    inputs[step.id] ??
                    progress.stepAttempts[step.id]?.value ??
                    '';
                  const fb = stepFeedback[step.id];
                  const showHint = Boolean(revealedHints[step.id]);

                  return (
                    <div
                      key={step.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        isSolved
                          ? 'bg-[#F0FDF4]/60 border-[#BBF7D0]'
                          : hasMistake
                          ? 'bg-[#FEF2F2]/50 border-[#FECACA]'
                          : 'bg-[#F8FAFC] border-[#E2E8F0]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="text-sm font-semibold text-[#0F172A]">
                          <RichTermText text={step.label} onOpenTerm={onOpenTerm} />
                        </div>
                        {isSolved && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Зачтено</span>
                          </span>
                        )}
                      </div>

                      {step.quickChoices && step.quickChoices.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2.5">
                          {(step.quickChoices.length >= 3
                            ? stableShuffle(step.quickChoices, step.id)
                            : step.quickChoices
                          ).map((choice) => (
                            <button
                              key={choice}
                              type="button"
                              onClick={() => {
                                setInputs((prev) => ({
                                  ...prev,
                                  [step.id]: choice,
                                }));
                                handleCheckStep(task, step, choice);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                currentVal === choice
                                  ? 'bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8]'
                                  : 'bg-white border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
                              }`}
                            >
                              {choice}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={currentVal}
                          onFocus={() =>
                            onRegisterCalcTarget(
                              `№${task.num} · Шаг ${sIdx + 1}`,
                              (val) =>
                                setInputs((prev) => ({
                                  ...prev,
                                  [step.id]: val,
                                }))
                            )
                          }
                          onChange={(e) =>
                            setInputs((prev) => ({
                              ...prev,
                              [step.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCheckStep(task, step);
                          }}
                          placeholder={step.placeholder || 'Введите ответ...'}
                          className="flex-1 min-w-[200px] px-3 py-2 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1D4ED8] tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => handleCheckStep(task, step)}
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#1D4ED8] text-white hover:bg-[#1E40AF] transition-colors cursor-pointer"
                        >
                          Проверить шаг
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedHints((prev) => ({
                              ...prev,
                              [step.id]: !prev[step.id],
                            }))
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white text-[#475569] border border-[#CBD5E1] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                        >
                          <HelpCircle className="w-4 h-4" />
                          <span>{showHint ? 'Скрыть решение' : 'Подсказка'}</span>
                        </button>
                      </div>

                      {fb && (
                        <div
                          className={`mt-2.5 p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                            fb.status === 'ok'
                              ? 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]'
                              : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]'
                          }`}
                        >
                          {fb.status === 'ok' ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          )}
                          <span className="leading-relaxed">
                            <RichTermText
                              text={fb.message}
                              onOpenTerm={onOpenTerm}
                            />
                          </span>
                        </div>
                      )}

                      {showHint && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E3A8A] leading-relaxed">
                          <span className="font-semibold">Алгоритм шага: </span>
                          <RichTermText text={step.hint} onOpenTerm={onOpenTerm} />{' '}
                          <span className="font-mono font-semibold text-[#1D4ED8]">
                            (Эталон: {step.ans[0]})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Generated Tests #10-13 when in Generator mode */}
      {variant === 'generated' && !onlyMistakes && (
        <div className="space-y-4 pt-2">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0284C7] mb-1">
              Тестовая часть сгенерированного билета · Задания №10–13
            </div>
            <h3 className="text-lg font-bold text-[#0F172A]">
              4 контрольных тестовых вопроса для {generatedTicket.seedLabel}
            </h3>
          </div>

          {generatedTicket.tests.map((q, qIdx) => {
            const testKey = q.id.startsWith('gen_')
              ? q.id
              : `${generatedTicket.seedLabel}_${q.id}`;
            const ansState = progress.answeredTests[testKey];
            return (
              <div
                key={testKey}
                className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3"
              >
                <div className="text-xs font-medium text-[#64748B]">
                  {q.variants} · {q.points} балла
                </div>
                <h4 className="text-base font-bold text-[#0F172A]">
                  {qIdx + 10}. <RichTermText text={q.question} onOpenTerm={onOpenTerm} />
                </h4>
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isPicked = ansState?.optionIdx === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() =>
                          onTestResult(
                            testKey,
                            optIdx,
                            opt.isCorrect,
                            opt.isCorrect
                              ? undefined
                              : {
                                  kind: 'test',
                                  sourceLabel: q.variants,
                                  title: `Тест №${10 + qIdx}`,
                                  prompt: q.question,
                                  correctAnswer:
                                    q.options.find((o) => o.isCorrect)?.text ||
                                    '',
                                  hint:
                                    q.options.find((o) => o.isCorrect)
                                      ?.explain || opt.explain,
                                }
                          )
                        }
                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors cursor-pointer ${
                          isPicked
                            ? opt.isCorrect
                              ? 'bg-[#F0FDF4] border-[#16A34A] text-[#14532D] font-medium'
                              : 'bg-[#FEF2F2] border-[#DC2626] text-[#7F1D1D]'
                            : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
                {ansState !== undefined && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                      ansState.isCorrect
                        ? 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]'
                        : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]'
                    }`}
                  >
                    {ansState.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">
                      <RichTermText
                        text={q.options[ansState.optionIdx]?.explain || ''}
                        onOpenTerm={onOpenTerm}
                      />
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
