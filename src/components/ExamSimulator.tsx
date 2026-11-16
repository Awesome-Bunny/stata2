import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Calculator,
  CheckCircle2,
  Clock,
  Lock,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Shuffle,
  Timer,
  XCircle,
} from 'lucide-react';
import { TASKS_DATA, TEST_QUESTIONS_BANK } from '../data/nasledovData';
import {
  ExamAttempt,
  GeneratedTicket,
  MistakeItem,
  TaskItem,
  TestQuestion,
  TrainerProgressState,
  VariantSource,
} from '../types/stats';
import { getDirectFields } from '../utils/directFields';
import {
  stableIndexOrder,
  stableShuffle,
  validateStepAnswer,
} from '../utils/validation';
import { RichTermText } from './RichTermText';

export type ExamFormat = 'steps' | 'strict';

interface ExamSimulatorProps {
  progress: TrainerProgressState;
  onCreateGeneratedTicket: () => GeneratedTicket;
  onOpenTerm: (termKey: string) => void;
  onOpenCalculator: () => void;
  onRegisterCalcTarget: (label: string, applyValue: (val: string) => void) => void;
  onRecordExam: (attempt: ExamAttempt) => void;
  onAddMistakes: (items: MistakeItem[]) => void;
  onStrictLockChange?: (locked: boolean) => void;
}

type ExamTicketEntry =
  | { kind: 'task'; task: TaskItem }
  | { kind: 'test'; question: TestQuestion; origTestNum: number };

interface ActiveTicket {
  label: string;
  generatedTicketId?: string;
  isGenerated: boolean;
  format: ExamFormat;
  isShuffled: boolean;
  tasks: TaskItem[];
  tests: TestQuestion[];
  entries: ExamTicketEntry[];
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getExamTaskDisplayText(task: TaskItem, isShuffled: boolean): string {
  if (isShuffled && task.examTextShuffled) {
    return task.examTextShuffled;
  }
  return task.examText || task.text;
}

function buildTicket(
  source: VariantSource,
  format: ExamFormat,
  isShuffled: boolean,
  createGeneratedTicket: () => GeneratedTicket
): ActiveTicket {
  let label = '';
  let generatedTicketId: string | undefined;
  let isGenerated = false;
  let tasks: TaskItem[] = [];
  let tests: TestQuestion[] = [];

  if (source === 'v1') {
    const v1TestIds = ['q10_both', 'q11_both', 'q12_v1', 'q13_v1'];
    label = 'Вариант 1';
    tasks = TASKS_DATA.v1;
    tests = TEST_QUESTIONS_BANK.filter((q) => v1TestIds.includes(q.id));
  } else if (source === 'v3') {
    const v3TestIds = ['q10_both', 'q11_both', 'q12_v3', 'q13_v3'];
    label = 'Вариант 3';
    tasks = TASKS_DATA.v3;
    tests = TEST_QUESTIONS_BANK.filter((q) => v3TestIds.includes(q.id));
  } else {
    const gen = createGeneratedTicket();
    label = `Сгенерированный ${gen.seedLabel}`;
    generatedTicketId = gen.id;
    isGenerated = true;
    tasks = gen.tasks;
    tests = gen.tests;
  }

  const rawEntries: ExamTicketEntry[] = [
    ...tasks.map((task): ExamTicketEntry => ({ kind: 'task', task })),
    ...tests.map(
      (question, idx): ExamTicketEntry => ({
        kind: 'test',
        question,
        origTestNum: 10 + idx,
      })
    ),
  ];

  const entries = isShuffled ? shuffleArray(rawEntries) : rawEntries;

  return {
    label,
    generatedTicketId,
    isGenerated,
    format,
    isShuffled,
    tasks,
    tests,
    entries,
  };
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const ExamSimulator: React.FC<ExamSimulatorProps> = ({
  progress,
  onCreateGeneratedTicket,
  onOpenTerm,
  onOpenCalculator,
  onRegisterCalcTarget,
  onRecordExam,
  onAddMistakes,
  onStrictLockChange,
}) => {
  const [phase, setPhase] = useState<'setup' | 'running' | 'review'>('setup');
  const [selectedSource, setSelectedSource] = useState<VariantSource>('generated');
  const [selectedFormat, setSelectedFormat] = useState<ExamFormat>('steps');
  const [shuffleOrder, setShuffleOrder] = useState<boolean>(true);
  const [minutesLimit, setMinutesLimit] = useState<number>(45);

  const [ticket, setTicket] = useState<ActiveTicket | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(45 * 60);
  const [paused, setPaused] = useState(false);
  const [confirmAbort, setConfirmAbort] = useState(false);

  const [stepAnswers, setStepAnswers] = useState<Record<string, string>>({});
  const [directAnswers, setDirectAnswers] = useState<Record<string, string>>({});
  const [testAnswers, setTestAnswers] = useState<Record<string, number>>({});
  const [lastAttempt, setLastAttempt] = useState<ExamAttempt | null>(null);

  useEffect(() => {
    onStrictLockChange?.(phase === 'running' && ticket?.format === 'strict');
  }, [phase, ticket, onStrictLockChange]);

  useEffect(() => {
    return () => {
      onStrictLockChange?.(false);
    };
  }, [onStrictLockChange]);

  const finalizeExam = useCallback(() => {
    if (!ticket) return;

    let earnedPoints = 0;
    let maxPoints = 0;
    let correctTasks = 0;
    const totalCount = ticket.tasks.length + ticket.tests.length;
    const newMistakes: MistakeItem[] = [];

    for (const task of ticket.tasks) {
      maxPoints += task.pointsNum;

      if (ticket.format === 'strict') {
        const fields = getDirectFields(task, true);
        const allFieldsRight = fields.every((f) =>
          validateStepAnswer(
            directAnswers[`${task.id}_${f.key}`] || '',
            f.ans,
            f.tolerance
          )
        );
        if (allFieldsRight) {
          earnedPoints += task.pointsNum;
          correctTasks += 1;
        } else {
          const expectedDisplay = fields
            .map((f) => (fields.length > 1 ? `${f.label} ${f.ans[0]}` : f.ans[0]))
            .join(' · ');
          const lastStep = task.steps[task.steps.length - 1];
          newMistakes.push({
            id: `exam_strict_${task.id}`,
            kind: 'step',
            sourceLabel: `Строгий экзамен (${ticket.label}) · №${task.num}`,
            title: task.title,
            prompt: fields.map((f) => f.label).join(' / '),
            correctAnswer: expectedDisplay,
            hint: `${lastStep.hint} | Ловушка: ${task.trap}`,
            createdAt: Date.now(),
          });
        }
      } else {
        const allStepsRight = task.steps.every((s) =>
          validateStepAnswer(
            stepAnswers[s.id] || '',
            s.ans,
            s.numericTolerance ?? 0.02
          )
        );
        if (allStepsRight) {
          earnedPoints += task.pointsNum;
          correctTasks += 1;
        } else {
          const failedStep =
            task.steps.find(
              (s) =>
                !validateStepAnswer(
                  stepAnswers[s.id] || '',
                  s.ans,
                  s.numericTolerance ?? 0.02
                )
            ) || task.steps[0];
          newMistakes.push({
            id: failedStep.id,
            kind: 'step',
            sourceLabel: `Экзамен (${ticket.label}) · №${task.num}`,
            title: task.title,
            prompt: failedStep.label,
            correctAnswer: failedStep.ans[0],
            hint: `${failedStep.hint} | Ловушка: ${task.trap}`,
            createdAt: Date.now(),
          });
        }
      }
    }

    ticket.tests.forEach((q, idx) => {
      maxPoints += q.points;
      const pickedIdx = testAnswers[q.id];
      const isRight =
        pickedIdx !== undefined && Boolean(q.options[pickedIdx]?.isCorrect);
      if (isRight) {
        earnedPoints += q.points;
        correctTasks += 1;
      } else {
        const correctOpt = q.options.find((o) => o.isCorrect);
        newMistakes.push({
          id: q.id,
          kind: 'test',
          sourceLabel: `${
            ticket.format === 'strict' ? 'Строгий экзамен' : 'Экзамен'
          } (${ticket.label}) · №${10 + idx}`,
          title: `Тест №${10 + idx}`,
          prompt: q.question,
          correctAnswer: correctOpt?.text || '',
          hint: correctOpt?.explain || '',
          createdAt: Date.now(),
        });
      }
    });

    const timeLimitSeconds = minutesLimit * 60;
    const durationSeconds = Math.max(1, timeLimitSeconds - secondsLeft);

    const flags: string[] = [];
    if (ticket.format === 'strict') flags.push('Без шагов и справочника');
    if (ticket.isShuffled) flags.push('В разнобой');

    const attempt: ExamAttempt = {
      id: `exam_${Date.now()}`,
      timestamp: Date.now(),
      variantLabel:
        flags.length > 0 ? `${ticket.label} · ${flags.join(' · ')}` : ticket.label,
      generatedTicketId: ticket.generatedTicketId,
      isGenerated: ticket.isGenerated,
      durationSeconds,
      timeLimitSeconds,
      earnedPoints,
      maxPoints,
      correctCount: correctTasks,
      totalCount,
    };

    onRecordExam(attempt);
    if (newMistakes.length > 0) {
      onAddMistakes(newMistakes);
    }
    setLastAttempt(attempt);
    setConfirmAbort(false);
    setPhase('review');
  }, [
    ticket,
    stepAnswers,
    directAnswers,
    testAnswers,
    minutesLimit,
    secondsLeft,
    onRecordExam,
    onAddMistakes,
  ]);

  useEffect(() => {
    if (phase !== 'running' || paused) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, paused]);

  useEffect(() => {
    if (phase === 'running' && secondsLeft === 0) {
      finalizeExam();
    }
  }, [phase, secondsLeft, finalizeExam]);

  const startExam = () => {
    const newTicket = buildTicket(
      selectedSource,
      selectedFormat,
      shuffleOrder,
      onCreateGeneratedTicket
    );
    setTicket(newTicket);
    setStepAnswers({});
    setDirectAnswers({});
    setTestAnswers({});
    setSecondsLeft(minutesLimit * 60);
    setPaused(false);
    setConfirmAbort(false);
    setLastAttempt(null);
    setPhase('running');
  };

  const abortExam = () => {
    setConfirmAbort(false);
    setPaused(false);
    setTicket(null);
    setPhase('setup');
  };

  const answeredProgressCount = useMemo(() => {
    if (!ticket) return 0;
    let c = 0;
    for (const t of ticket.tasks) {
      if (ticket.format === 'strict') {
        const fields = getDirectFields(t, true);
        if (
          fields.every(
            (f) => (directAnswers[`${t.id}_${f.key}`] || '').trim().length > 0
          )
        ) {
          c += 1;
        }
      } else {
        if (t.steps.every((s) => (stepAnswers[s.id] || '').trim().length > 0)) {
          c += 1;
        }
      }
    }
    for (const q of ticket.tests) {
      if (testAnswers[q.id] !== undefined) c += 1;
    }
    return c;
  }, [ticket, stepAnswers, directAnswers, testAnswers]);

  if (phase === 'setup') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] mb-1">
              <Timer className="w-4 h-4" />
              <span>Симуляция экзамена на время</span>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Полный пробный билет (Задания №1–13)
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              Во время экзамена подсказки и предупреждения о ловушках скрыты.
              После завершения вы получите оценку в баллах, разбор каждого
              ответа и автоматическое добавление промахов в очередь «Отработка
              ошибок».
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 1. Ticket Source */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                1. Выберите билет
              </div>
              <div className="space-y-2">
                {[
                  {
                    id: 'generated',
                    title: 'Случайный новый билет (рекомендуется)',
                    desc: 'Новые числа в заданиях №1–9 и случайная четвёрка тестов №10–13',
                  },
                  {
                    id: 'v1',
                    title: 'Вариант 1',
                    desc: 'Линейный тренд, df=3, χ²=8,74, +τ Кендалла, таблица 4×4',
                  },
                  {
                    id: 'v3',
                    title: 'Вариант 3 (из текстового файла)',
                    desc: 'Параболический тренд, df=11, 68,3% (1σ), −τ Кендалла',
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedSource(opt.id as VariantSource)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedSource === opt.id
                        ? 'bg-[#EFF6FF] border-[#1D4ED8]'
                        : 'bg-white border-[#CBD5E1] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[#0F172A]">
                      {opt.title}
                    </div>
                    <div className="text-xs text-[#64748B] mt-0.5">
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Exam Format & Order */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                2. Формат и порядок
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('steps')}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedFormat === 'steps'
                      ? 'bg-[#EFF6FF] border-[#1D4ED8]'
                      : 'bg-white border-[#CBD5E1] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <div className="text-sm font-semibold text-[#0F172A]">
                    Стандартный (по шагам)
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">
                    Задания разбиты на микро-шаги с промежуточными полями,
                    термины в тексте можно открыть в словаре.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('strict')}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedFormat === 'strict'
                      ? 'bg-[#FEF2F2] border-[#DC2626]'
                      : 'bg-white border-[#CBD5E1] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-[#0F172A]">
                    <Lock className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                    <span>Без подсказок, шагов и справочника</span>
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">
                    Только текст условия и чистое поле «Ответ» (без каких-либо
                    подсказок в полях ввода, без названий-спойлеров и при
                    полной блокировке «Словаря» и справочных вкладок).
                  </div>
                </button>

                <div className="pt-1 border-t border-[#E2E8F0]">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                    Порядок вопросов
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShuffleOrder(true)}
                      className={`inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        shuffleOrder
                          ? 'bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8]'
                          : 'bg-white border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>В разнобой</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShuffleOrder(false)}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        !shuffleOrder
                          ? 'bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8]'
                          : 'bg-white border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      По порядку (1–13)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Time Limit & Start */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  3. Ограничение времени
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinutesLimit(m)}
                      className={`py-2.5 rounded-lg border text-sm font-mono font-semibold tabular-nums transition-colors cursor-pointer ${
                        minutesLimit === m
                          ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                          : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {m} мин
                    </button>
                  ))}
                </div>
                <div className="text-xs text-[#64748B] leading-relaxed">
                  В билете 9 расчётных/аналитических заданий (по 2–4 балла) и 4
                  тестовых вопроса (по 2 балла). Всего 13 заданий.
                </div>
                {selectedFormat === 'strict' && (
                  <div className="p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      В строгом режиме кнопка «Словарь», вкладки «Формулы» /
                      «Сравнение» / «Степени df» и клики по терминам отключены,
                      а в полях ответа нет никаких текстовых подсказок.
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={startExam}
                className={`w-full py-3 rounded-lg text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  selectedFormat === 'strict'
                    ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                    : 'bg-[#1D4ED8] hover:bg-[#1E40AF]'
                }`}
              >
                {selectedFormat === 'strict' ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>
                  {selectedFormat === 'strict'
                    ? 'Начать строгий экзамен'
                    : 'Начать экзамен'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Past Exam History */}
        {progress.examHistory.length > 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3 overflow-x-auto">
            <h3 className="text-base font-bold text-[#0F172A]">
              История ваших попыток экзамена
            </h3>
            <table className="w-full text-sm border-collapse tabular-nums">
              <thead>
                <tr className="bg-[#F8FAFC] border-y border-[#E2E8F0] text-xs font-semibold text-[#475569]">
                  <th className="py-2 px-3 text-left">Дата и время</th>
                  <th className="py-2 px-3 text-left">Билет</th>
                  <th className="py-2 px-3 text-right">Затрачено</th>
                  <th className="py-2 px-3 text-right">Верно заданий</th>
                  <th className="py-2 px-3 text-right">Баллы</th>
                </tr>
              </thead>
              <tbody>
                {progress.examHistory.map((h) => (
                  <tr key={h.id} className="border-b border-[#E2E8F0]">
                    <td className="py-2 px-3 text-xs text-[#64748B]">
                      {new Date(h.timestamp).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 px-3 font-medium text-[#0F172A]">
                      {h.variantLabel}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-[#475569]">
                      {formatClock(h.durationSeconds)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {h.correctCount} / {h.totalCount}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#1D4ED8]">
                      {h.earnedPoints} / {h.maxPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'running' && ticket) {
    const isUrgent = secondsLeft <= 300;
    const isStrict = ticket.format === 'strict';
    const totalItems = ticket.entries.length;

    return (
      <div className="space-y-5">
        {/* Sticky Timer Bar */}
        <div className="sticky top-[68px] z-30 bg-white/95 backdrop-blur border border-[#CBD5E1] rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-base font-bold tabular-nums border ${
                isUrgent
                  ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                  : 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatClock(secondsLeft)}</span>
            </div>
            <div className="text-xs text-[#475569]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#0F172A]">
                  {ticket.label}
                </span>
                {isStrict && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] font-semibold">
                    <Lock className="w-3 h-3" />
                    <span>Без шагов и справочника</span>
                  </span>
                )}
                {ticket.isShuffled && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] font-semibold">
                    <Shuffle className="w-3 h-3" />
                    <span>В разнобой</span>
                  </span>
                )}
              </div>
              <div className="tabular-nums">
                Заполнено заданий: {answeredProgressCount} из {totalItems}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenCalculator}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] hover:bg-[#DBEAFE] cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Калькулятор</span>
            </button>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
            >
              {paused ? (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Продолжить</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Пауза</span>
                </>
              )}
            </button>

            {confirmAbort ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs">
                <span className="text-[#991B1B] font-medium">Выйти без сохранения?</span>
                <button
                  type="button"
                  onClick={abortExam}
                  className="px-2 py-0.5 rounded bg-[#DC2626] text-white font-semibold cursor-pointer"
                >
                  Да
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAbort(false)}
                  className="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#334155] font-medium cursor-pointer"
                >
                  Нет
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmAbort(true)}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#DC2626] hover:border-[#FECACA] transition-colors cursor-pointer"
              >
                Прервать
              </button>
            )}

            <button
              type="button"
              onClick={finalizeExam}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#059669] text-white hover:bg-[#047857] transition-colors cursor-pointer"
            >
              Завершить и сдать билет
            </button>
          </div>
        </div>

        {isStrict && (
          <div className="px-4 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              Строгий режим экзамена: подсказки в полях ответа, шаги, кнопки
              быстрого выбора, названия-спойлеры, словарь терминов и справочные
              вкладки отключены до сдачи билета.
            </span>
          </div>
        )}

        {paused && (
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 text-sm text-[#78350F] flex items-center justify-between">
            <span>Таймер поставлен на паузу.</span>
            <button
              type="button"
              onClick={() => setPaused(false)}
              className="px-3 py-1 rounded bg-[#D97706] text-white text-xs font-semibold cursor-pointer"
            >
              Возобновить
            </button>
          </div>
        )}

        {/* Unified Exam Entries (Tasks 1–9 and Tests 10–13, shuffled or ordered) */}
        <div className="space-y-4">
          {ticket.entries.map((entry, idx) => {
            const displayPosition = idx + 1;

            if (entry.kind === 'task') {
              const { task } = entry;
              const strictFields = isStrict ? getDirectFields(task, true) : [];
              const displayText = getExamTaskDisplayText(task, ticket.isShuffled);

              return (
                <section
                  key={task.id}
                  className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3"
                >
                  <div className="text-xs font-medium text-[#64748B] tabular-nums">
                    {ticket.isShuffled || isStrict
                      ? `Вопрос ${displayPosition} из ${totalItems} · ${task.points}`
                      : `Задание №${task.num} · ${task.points}`}
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    {isStrict
                      ? `Вопрос ${displayPosition}`
                      : ticket.isShuffled
                      ? `Вопрос ${displayPosition} · Задание №${task.num}`
                      : `Задание №${task.num}`}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#1E293B]">
                    <RichTermText
                      text={displayText}
                      onOpenTerm={onOpenTerm}
                      disableTerms={isStrict}
                    />
                  </p>

                  {isStrict ? (
                    <div
                      className={
                        strictFields.length === 2
                          ? 'grid grid-cols-1 md:grid-cols-2 gap-3 pt-1'
                          : 'pt-1'
                      }
                    >
                      {strictFields.map((field) => {
                        const fieldKey = `${task.id}_${field.key}`;
                        return (
                          <div
                            key={field.key}
                            className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5"
                          >
                            <label className="block text-xs font-semibold text-[#334155]">
                              {field.label}
                            </label>
                            <input
                              type="text"
                              value={directAnswers[fieldKey] || ''}
                              onFocus={() => {
                                if (field.isNumeric) {
                                  onRegisterCalcTarget(
                                    `Вопрос ${displayPosition}`,
                                    (val) =>
                                      setDirectAnswers((prev) => ({
                                        ...prev,
                                        [fieldKey]: val,
                                      }))
                                  );
                                }
                              }}
                              onChange={(e) =>
                                setDirectAnswers((prev) => ({
                                  ...prev,
                                  [fieldKey]: e.target.value,
                                }))
                              }
                              placeholder={field.placeholder}
                              className="w-full sm:w-80 px-3 py-1.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg tabular-nums focus:outline-none focus:border-[#1D4ED8]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-1">
                      {task.steps.map((s, sIdx) => (
                        <div
                          key={s.id}
                          className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2"
                        >
                          <div className="text-xs font-semibold text-[#334155]">
                            <RichTermText text={s.label} onOpenTerm={onOpenTerm} />
                          </div>
                          {s.quickChoices && (
                            <div className="flex flex-wrap gap-1.5">
                              {(s.quickChoices.length >= 3
                                ? stableShuffle(s.quickChoices, s.id)
                                : s.quickChoices
                              ).map((ch) => (
                                <button
                                  key={ch}
                                  type="button"
                                  onClick={() =>
                                    setStepAnswers((prev) => ({
                                      ...prev,
                                      [s.id]: ch,
                                    }))
                                  }
                                  className={`px-3 py-1 rounded text-xs font-medium border cursor-pointer ${
                                    stepAnswers[s.id] === ch
                                      ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                                      : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                                  }`}
                                >
                                  {ch}
                                </button>
                              ))}
                            </div>
                          )}
                          <input
                            type="text"
                            value={stepAnswers[s.id] || ''}
                            onFocus={() =>
                              onRegisterCalcTarget(
                                `Вопрос ${displayPosition} · Шаг ${sIdx + 1}`,
                                (val) =>
                                  setStepAnswers((prev) => ({
                                    ...prev,
                                    [s.id]: val,
                                  }))
                              )
                            }
                            onChange={(e) =>
                              setStepAnswers((prev) => ({
                                ...prev,
                                [s.id]: e.target.value,
                              }))
                            }
                            placeholder={s.placeholder || 'Ваш ответ...'}
                            className="w-full sm:w-80 px-3 py-1.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg tabular-nums"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            }

            // Test Question Entry
            const { question: q, origTestNum } = entry;
            return (
              <section
                key={q.id}
                className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3"
              >
                <div className="text-xs font-medium text-[#64748B] tabular-nums">
                  {ticket.isShuffled || isStrict
                    ? `Вопрос ${displayPosition} из ${totalItems} (Тест) · ${q.points} балла`
                    : `Задание №${origTestNum} (Тест) · ${q.points} балла`}
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  <RichTermText
                    text={q.examQuestion || q.question}
                    onOpenTerm={onOpenTerm}
                    disableTerms={isStrict}
                  />
                </h3>
                <div className="space-y-2">
                  {(ticket.isGenerated
                    ? q.options.map((_, i) => i)
                    : stableIndexOrder(q.options.length, q.id)
                  ).map((origOptIdx) => {
                    const opt = q.options[origOptIdx];
                    const picked = testAnswers[q.id] === origOptIdx;
                    return (
                      <button
                        key={origOptIdx}
                        type="button"
                        onClick={() =>
                          setTestAnswers((prev) => ({
                            ...prev,
                            [q.id]: origOptIdx,
                          }))
                        }
                        className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer ${
                          picked
                            ? 'bg-[#EFF6FF] border-[#1D4ED8] text-[#1E3A8A] font-medium'
                            : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  // Review screen
  if (phase === 'review' && ticket && lastAttempt) {
    const pct = Math.round(
      (lastAttempt.earnedPoints / Math.max(1, lastAttempt.maxPoints)) * 100
    );
    const isStrict = ticket.format === 'strict';

    return (
      <div className="space-y-6">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
              <Award className="w-4 h-4" />
              <span>Результаты экзамена · {lastAttempt.variantLabel}</span>
            </div>
            <h2 className="text-2xl font-bold text-[#0F172A] tabular-nums">
              Набрано {lastAttempt.earnedPoints} из {lastAttempt.maxPoints}{' '}
              баллов ({pct}%)
            </h2>
            <p className="text-sm text-[#475569] tabular-nums">
              Верно выполнено заданий: {lastAttempt.correctCount} из{' '}
              {lastAttempt.totalCount} · Время:{' '}
              {formatClock(lastAttempt.durationSeconds)}. Все неверные задания
              автоматически добавлены в очередь «Отработка ошибок».
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPhase('setup')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-[#1E40AF] transition-colors shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Пройти новый экзамен</span>
          </button>
        </div>

        {/* Breakdown in the same order the student took it */}
        <div className="space-y-3">
          {ticket.entries.map((entry, idx) => {
            if (entry.kind === 'task') {
              const { task } = entry;
              const strictFields = isStrict ? getDirectFields(task, true) : [];
              const allRight = isStrict
                ? strictFields.every((f) =>
                    validateStepAnswer(
                      directAnswers[`${task.id}_${f.key}`] || '',
                      f.ans,
                      f.tolerance
                    )
                  )
                : task.steps.every((s) =>
                    validateStepAnswer(
                      stepAnswers[s.id] || '',
                      s.ans,
                      s.numericTolerance ?? 0.02
                    )
                  );

              return (
                <div
                  key={task.id}
                  className={`bg-white border rounded-xl p-5 space-y-2.5 ${
                    allRight ? 'border-[#BBF7D0]' : 'border-[#FECACA]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-[#0F172A]">
                      {ticket.isShuffled ? `Вопрос ${idx + 1} · ` : ''}
                      {task.title}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums shrink-0 ${
                        allRight ? 'text-[#059669]' : 'text-[#DC2626]'
                      }`}
                    >
                      {allRight ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>+{task.points}</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>0 / {task.points}</span>
                        </>
                      )}
                    </span>
                  </div>

                  {isStrict ? (
                    <div className="space-y-2">
                      <div className="space-y-1.5">
                        {strictFields.map((f) => {
                          const rawVal = directAnswers[`${task.id}_${f.key}`] || '';
                          const userVal = rawVal.trim() || '—';
                          const ok = validateStepAnswer(rawVal, f.ans, f.tolerance);
                          return (
                            <div
                              key={f.key}
                              className="text-xs p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 tabular-nums"
                            >
                              <span className="text-[#334155] font-medium">
                                {f.label}
                              </span>
                              <span className="font-mono">
                                Ваш ответ:{' '}
                                <strong
                                  className={
                                    ok ? 'text-[#059669]' : 'text-[#DC2626]'
                                  }
                                >
                                  {userVal}
                                </strong>{' '}
                                {!ok && (
                                  <span className="text-[#1D4ED8]">
                                    (Эталон: {f.ans[0]})
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {!allRight && (
                        <div className="p-2.5 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E3A8A] space-y-1">
                          <div className="font-semibold">
                            Алгоритм решения по шагам:
                          </div>
                          {task.steps.map((s) => (
                            <div key={s.id} className="leading-relaxed">
                              <RichTermText text={s.label} onOpenTerm={onOpenTerm} />{' '}
                              <span className="font-mono font-semibold text-[#1D4ED8]">
                                → {s.ans[0]}
                              </span>{' '}
                              (<RichTermText text={s.hint} onOpenTerm={onOpenTerm} />)
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {task.steps.map((s) => {
                        const userVal = stepAnswers[s.id] || '—';
                        const ok = validateStepAnswer(
                          stepAnswers[s.id] || '',
                          s.ans,
                          s.numericTolerance ?? 0.02
                        );
                        return (
                          <div
                            key={s.id}
                            className="text-xs p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 tabular-nums"
                          >
                            <span className="text-[#334155]">
                              <RichTermText text={s.label} onOpenTerm={onOpenTerm} />
                            </span>
                            <span className="font-mono">
                              Ваш ответ:{' '}
                              <strong
                                className={
                                  ok ? 'text-[#059669]' : 'text-[#DC2626]'
                                }
                              >
                                {userVal}
                              </strong>{' '}
                              {!ok && (
                                <span className="text-[#1D4ED8]">
                                  (Эталон: {s.ans[0]})
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!allRight && (
                    <div className="p-2.5 rounded bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#78350F] flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                      <span>
                        <RichTermText text={task.trap} onOpenTerm={onOpenTerm} />
                      </span>
                    </div>
                  )}
                </div>
              );
            }

            const { question: q, origTestNum } = entry;
            const pickedIdx = testAnswers[q.id];
            const ok =
              pickedIdx !== undefined && Boolean(q.options[pickedIdx]?.isCorrect);
            const correctOpt = q.options.find((o) => o.isCorrect);
            return (
              <div
                key={q.id}
                className={`bg-white border rounded-xl p-5 space-y-2 ${
                  ok ? 'border-[#BBF7D0]' : 'border-[#FECACA]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-[#0F172A]">
                    {ticket.isShuffled ? `Вопрос ${idx + 1} · ` : ''}
                    Задание №{origTestNum}.{' '}
                    <RichTermText text={q.question} onOpenTerm={onOpenTerm} />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums shrink-0 ${
                      ok ? 'text-[#059669]' : 'text-[#DC2626]'
                    }`}
                  >
                    {ok ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>+{q.points} балла</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>0 / {q.points} балла</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="text-xs text-[#475569]">
                  Ваш выбор:{' '}
                  <strong>
                    {pickedIdx !== undefined
                      ? q.options[pickedIdx]?.text
                      : 'Ответ не выбран'}
                  </strong>
                </div>
                {!ok && correctOpt && (
                  <div className="p-2.5 rounded bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#166534]">
                    <strong>Верный ответ:</strong> {correctOpt.text} —{' '}
                    <RichTermText
                      text={correctOpt.explain}
                      onOpenTerm={onOpenTerm}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};
