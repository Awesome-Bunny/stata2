import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dices,
  Eye,
  NotebookPen,
  Plus,
  RotateCcw,
  Sparkles,
  Table2,
  Target,
  Trash2,
  XCircle,
} from 'lucide-react';
import { CHI2_TABLE, TASKS_DATA, TEST_QUESTIONS_BANK } from '../data/nasledovData';
import {
  GeneratedTicket,
  MistakeItem,
  TaskItem,
  TestQuestion,
  TrainerProgressState,
  VariantSource,
} from '../types/stats';
import { stableIndexOrder, validateStepAnswer } from '../utils/validation';
import { MathFormula } from './MathFormula';
import { RichTermText } from './RichTermText';

interface DirectTrainerProps {
  progress: TrainerProgressState;
  generatedTicket: GeneratedTicket;
  forceGeneratedSignal?: number;
  onRegenerateTicket: () => void;
  onSelectGeneratedTicket: (ticketId: string) => void;
  onOpenTerm: (key: string) => void;
  onOpenCalculator: () => void;
  onRegisterCalcTarget: (label: string, applyValue: (val: string) => void) => void;
  onDirectResult: (
    taskId: string,
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

interface DirectFieldSpec {
  key: string;
  label: string;
  placeholder: string;
  ans: string[];
  tolerance: number;
  isNumeric: boolean;
}

interface DirectTaskResult {
  isCorrect: boolean;
  expectedDisplay: string;
  message: string;
}

function getDirectFields(task: TaskItem): DirectFieldSpec[] {
  const lastStep = task.steps[task.steps.length - 1];

  if (task.num === 1) {
    return [
      {
        key: 'main',
        label: 'Итоговый прогноз показателя (руб.):',
        placeholder: 'Введите сумму в рублях',
        ans: lastStep.ans,
        tolerance: lastStep.numericTolerance ?? 0.5,
        isNumeric: true,
      },
    ];
  }

  if (task.num === 2) {
    return [
      {
        key: 'main',
        label: 'Доля влияния фактора η² (%):',
        placeholder: 'Введите число в %',
        ans: lastStep.ans,
        tolerance: lastStep.numericTolerance ?? 0.05,
        isNumeric: true,
      },
    ];
  }

  if (task.num === 3 && task.steps.length >= 3) {
    return [
      {
        key: 'd95',
        label: 'Погрешность Δ для 95,4% (t = 2):',
        placeholder: 'Введите десятичное число',
        ans: task.steps[1].ans,
        tolerance: task.steps[1].numericTolerance ?? 0.02,
        isNumeric: true,
      },
      {
        key: 'd99',
        label: 'Погрешность Δ для 99,7% (t = 3):',
        placeholder: 'Введите десятичное число',
        ans: task.steps[2].ans,
        tolerance: task.steps[2].numericTolerance ?? 0.02,
        isNumeric: true,
      },
    ];
  }

  if (task.num === 4) {
    return [
      {
        key: 'chi2Crit',
        label: 'Табличное значение χ²_табл (при p = 0,05):',
        placeholder: 'Введите χ²_табл',
        ans: task.steps[1]?.ans || [],
        tolerance: task.steps[1]?.numericTolerance ?? 0.02,
        isNumeric: true,
      },
      {
        key: 'main',
        label: 'Итоговый вывод о соответствии нормальному закону:',
        placeholder: 'соответствует / не соответствует',
        ans: lastStep.ans,
        tolerance: 0.02,
        isNumeric: false,
      },
    ];
  }

  if (task.num === 5) {
    return [
      {
        key: 'main',
        label: 'Доля респондентов (%) или вывод о невозможности оценки:',
        placeholder: 'Введите % или слово «невозможно»',
        ans: lastStep.ans,
        tolerance: lastStep.numericTolerance ?? 0.15,
        isNumeric: true,
      },
    ];
  }

  if (task.num === 6 || task.num === 8) {
    return [
      {
        key: 'main',
        label:
          task.num === 6
            ? 'Критерий / коэффициент для оценки связи:'
            : 'Подходящий метод анализа или коэффициент:',
        placeholder:
          task.num === 6
            ? 'Введите название критерия или коэффициента'
            : 'Введите название метода или коэффициента',
        ans: lastStep.ans,
        tolerance: 0.02,
        isNumeric: false,
      },
    ];
  }

  if (task.num === 7) {
    return [
      {
        key: 'main',
        label: 'Итоговая вероятность (доля от 0 до 1 или %):',
        placeholder: 'Введите долю или %',
        ans: lastStep.ans,
        tolerance: lastStep.numericTolerance ?? 0.02,
        isNumeric: true,
      },
    ];
  }

  return [
    {
      key: 'main',
      label: 'Итоговый ответ:',
      placeholder: 'Введите итоговое значение',
      ans: lastStep.ans,
      tolerance: lastStep.numericTolerance ?? 0.02,
      isNumeric: true,
    },
  ];
}

const SCRATCHPAD_STORAGE_KEY = 'stat_direct_scratchpad_v1';
const DEFAULT_SCRATCH_COUNT = 3;

function loadScratchpads(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(SCRATCHPAD_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const result: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (Array.isArray(val)) {
        result[key] = val.map((item) => (typeof item === 'string' ? item : ''));
      }
    }
    return result;
  } catch {
    return {};
  }
}

export const DirectTrainer: React.FC<DirectTrainerProps> = ({
  progress,
  generatedTicket,
  forceGeneratedSignal,
  onRegenerateTicket,
  onSelectGeneratedTicket,
  onOpenTerm,
  onOpenCalculator,
  onRegisterCalcTarget,
  onDirectResult,
  onTestResult,
}) => {
  const [variant, setVariant] = useState<VariantSource>('generated');
  const [sectionFilter, setSectionFilter] = useState<'all' | 'calc' | 'tests'>('all');
  const [inputs, setInputs] = useState<Record<string, Record<string, string>>>({});
  const [scratchpads, setScratchpads] = useState<Record<string, string[]>>(() =>
    loadScratchpads()
  );
  const [results, setResults] = useState<Record<string, DirectTaskResult>>({});
  const [revealedFormulas, setRevealedFormulas] = useState<Record<string, boolean>>({});
  const [revealedChiTable, setRevealedChiTable] = useState<Record<string, boolean>>({});
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({});
  const [sessionTests, setSessionTests] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      localStorage.setItem(SCRATCHPAD_STORAGE_KEY, JSON.stringify(scratchpads));
    } catch {
      // ignore quota errors
    }
  }, [scratchpads]);

  useEffect(() => {
    if (forceGeneratedSignal && forceGeneratedSignal > 0) {
      setVariant('generated');
    }
  }, [forceGeneratedSignal]);

  const tasks: TaskItem[] = useMemo(() => {
    if (variant === 'v1') return TASKS_DATA.v1;
    if (variant === 'v3') return TASKS_DATA.v3;
    return generatedTicket.tasks;
  }, [variant, generatedTicket]);

  const variantTests: TestQuestion[] = useMemo(() => {
    if (variant === 'v1') {
      const ids = ['q10_both', 'q11_both', 'q12_v1', 'q13_v1'];
      return TEST_QUESTIONS_BANK.filter((q) => ids.includes(q.id));
    }
    if (variant === 'v3') {
      const ids = ['q10_both', 'q11_both', 'q12_v3', 'q13_v3'];
      return TEST_QUESTIONS_BANK.filter((q) => ids.includes(q.id));
    }
    return generatedTicket.tests;
  }, [variant, generatedTicket]);

  const variantLabel =
    variant === 'v1'
      ? 'Вариант 1'
      : variant === 'v3'
      ? 'Вариант 3'
      : `Генератор (${generatedTicket.seedLabel})`;

  const solvedTasksCount = useMemo(
    () =>
      tasks.filter(
        (t) => results[t.id]?.isCorrect || Boolean(progress.solvedDirect[t.id])
      ).length,
    [tasks, results, progress.solvedDirect]
  );

  const solvedTestsCount = useMemo(
    () =>
      variantTests.filter((q) => {
        const pickedIdx =
          sessionTests[q.id] ??
          (variant === 'generated'
            ? progress.answeredTests[q.id]?.optionIdx
            : undefined);
        return pickedIdx !== undefined && Boolean(q.options[pickedIdx]?.isCorrect);
      }).length,
    [variantTests, sessionTests, variant, progress.answeredTests]
  );

  const setFieldValue = (taskId: string, fieldKey: string, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || {}),
        [fieldKey]: value,
      },
    }));
  };

  const getScratchFields = (taskId: string): string[] => {
    const existing = scratchpads[taskId];
    if (existing && existing.length > 0) return existing;
    return Array.from({ length: DEFAULT_SCRATCH_COUNT }, () => '');
  };

  const setScratchValue = (taskId: string, index: number, value: string) => {
    setScratchpads((prev) => {
      const current =
        prev[taskId] && prev[taskId].length > 0
          ? [...prev[taskId]]
          : Array.from({ length: DEFAULT_SCRATCH_COUNT }, () => '');
      current[index] = value;
      return { ...prev, [taskId]: current };
    });
  };

  const addScratchField = (taskId: string) => {
    setScratchpads((prev) => {
      const current =
        prev[taskId] && prev[taskId].length > 0
          ? [...prev[taskId]]
          : Array.from({ length: DEFAULT_SCRATCH_COUNT }, () => '');
      if (current.length >= 8) return prev;
      return { ...prev, [taskId]: [...current, ''] };
    });
  };

  const clearScratchTask = (taskId: string) => {
    setScratchpads((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  const evaluateTask = (
    task: TaskItem,
    overrideFields?: Record<string, string>
  ) => {
    const fields = getDirectFields(task);
    const taskInputs = overrideFields ?? inputs[task.id] ?? {};

    const hasMissing = fields.some((f) => !(taskInputs[f.key] || '').trim());
    if (hasMissing) {
      setResults((prev) => ({
        ...prev,
        [task.id]: {
          isCorrect: false,
          expectedDisplay: fields.map((f) => f.ans[0]).join(' / '),
          message: 'Заполните поле итогового ответа перед проверкой.',
        },
      }));
      return;
    }

    const fieldChecks = fields.map((f) => ({
      field: f,
      ok: validateStepAnswer(taskInputs[f.key] || '', f.ans, f.tolerance),
    }));

    const allOk = fieldChecks.every((c) => c.ok);
    const expectedDisplay =
      fields.length === 2
        ? task.num === 4
          ? `χ²_табл = ${fields[0].ans[0]} · Вывод: ${fields[1].ans[0]}`
          : `Δ(95,4%) = ${fields[0].ans[0]} · Δ(99,7%) = ${fields[1].ans[0]}`
        : fields[0].ans[0];

    setResults((prev) => ({
      ...prev,
      [task.id]: {
        isCorrect: allOk,
        expectedDisplay,
        message: allOk
          ? `Верно! Итоговый ответ: ${expectedDisplay}.`
          : `Неверно. Эталонный ответ: ${expectedDisplay}. Откройте разбор ниже, чтобы увидеть пошаговый расчёт и ловушку.`,
      },
    }));

    setExpandedSolutions((prev) => ({
      ...prev,
      [task.id]: !allOk,
    }));

    onDirectResult(
      task.id,
      allOk,
      allOk
        ? undefined
        : {
            kind: 'step',
            sourceLabel: `Без шагов (${variantLabel}) · №${task.num}`,
            title: task.title,
            prompt:
              fields.length === 1
                ? fields[0].label
                : task.num === 4
                ? 'χ²_табл и вывод о нормальности'
                : 'Погрешность выборки Δ (95,4% и 99,7%)',
            correctAnswer: expectedDisplay,
            hint: `${task.steps.map((s) => s.hint).join(' ')} | Ловушка: ${task.trap}`,
          }
    );
  };

  const handleCheckAllFilled = () => {
    for (const task of tasks) {
      const fields = getDirectFields(task);
      const taskInputs = inputs[task.id] || {};
      const anyFilled = fields.some((f) => (taskInputs[f.key] || '').trim().length > 0);
      if (anyFilled) {
        evaluateTask(task, taskInputs);
      }
    }
  };

  const handleClearCurrent = () => {
    const taskIds = new Set(tasks.map((t) => t.id));
    const testIds = new Set(variantTests.map((q) => q.id));

    setInputs((prev) => {
      const next = { ...prev };
      for (const id of taskIds) delete next[id];
      return next;
    });
    setScratchpads((prev) => {
      const next = { ...prev };
      for (const id of taskIds) delete next[id];
      return next;
    });
    setResults((prev) => {
      const next = { ...prev };
      for (const id of taskIds) delete next[id];
      return next;
    });
    setExpandedSolutions((prev) => {
      const next = { ...prev };
      for (const id of taskIds) delete next[id];
      return next;
    });
    setSessionTests((prev) => {
      const next = { ...prev };
      for (const id of testIds) delete next[id];
      return next;
    });
  };

  const handleRegenerate = () => {
    setVariant('generated');
    onRegenerateTicket();
    setInputs({});
    setResults({});
    setRevealedFormulas({});
    setExpandedSolutions({});
    setSessionTests({});
  };

  const totalItemsInFilter =
    sectionFilter === 'all'
      ? tasks.length + variantTests.length
      : sectionFilter === 'calc'
      ? tasks.length
      : variantTests.length;

  const solvedItemsInFilter =
    sectionFilter === 'all'
      ? solvedTasksCount + solvedTestsCount
      : sectionFilter === 'calc'
      ? solvedTasksCount
      : solvedTestsCount;

  return (
    <div className="space-y-6">
      {/* Top Control Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#7C3AED] mb-1">
              <Target className="w-4 h-4" />
              <span>Самостоятельный режим · Только проверка ответа</span>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Тренажёр без шагов (генератор вариантов + калькулятор)
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              Пошаговые подсказки и формулы скрыты до проверки — считайте сами во
              встроенном калькуляторе и вставляйте результат прямо в ответ. Нажатие
              на любой термин открывает словарь Наследова.
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
                  ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                  : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
              }`}
            >
              <Dices className="w-4 h-4" />
              <span>Генератор вариантов</span>
            </button>
          </div>
        </div>

        {/* Sub-bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-[#E2E8F0]">
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#475569] tabular-nums">
            <span className="font-semibold text-[#0F172A]">
              Решено верно: {solvedItemsInFilter} из {totalItemsInFilter}
            </span>
            <div className="w-28 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#059669] transition-all duration-300"
                style={{
                  width: `${
                    totalItemsInFilter > 0
                      ? Math.round((solvedItemsInFilter / totalItemsInFilter) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            {variant === 'generated' && (
              <span className="text-[#6D28D9] font-medium">
                · {generatedTicket.seedLabel} (создан в {generatedTicket.generatedAt})
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-0.5">
              {(
                [
                  { id: 'all', label: 'Все №1–13' },
                  { id: 'calc', label: 'Задачи №1–9' },
                  { id: 'tests', label: 'Тесты №10–13' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSectionFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    sectionFilter === tab.id
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {variant === 'generated' && progress.savedGeneratedTickets.length > 1 && (
              <select
                value={generatedTicket.id}
                onChange={(e) => {
                  onSelectGeneratedTicket(e.target.value);
                  setSessionTests({});
                }}
                aria-label="Выбрать сохранённый сгенерированный билет"
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] focus:outline-none focus:border-[#7C3AED] cursor-pointer"
              >
                {progress.savedGeneratedTickets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.seedLabel} ({t.generatedAt})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleRegenerate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE] hover:bg-[#EDE9FE] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Новый вариант</span>
            </button>

            <button
              type="button"
              onClick={onOpenCalculator}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] hover:bg-[#DBEAFE] transition-colors cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Калькулятор</span>
            </button>

            {sectionFilter !== 'tests' && (
              <button
                type="button"
                onClick={handleCheckAllFilled}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#059669] text-white hover:bg-[#047857] transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Проверить заполненные</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClearCurrent}
              title="Очистить ответы текущего варианта"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Сбросить</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tasks 1–9 (Direct Answer Mode — NO Steps) */}
      {sectionFilter !== 'tests' && (
        <div className="space-y-4">
          {tasks.map((task) => {
            const fields = getDirectFields(task);
            const taskInputs = inputs[task.id] || {};
            const res = results[task.id];
            const showFormula = Boolean(revealedFormulas[task.id]);
            const showChiTable = Boolean(revealedChiTable[task.id]);
            const showSolution = Boolean(expandedSolutions[task.id]);
            const wasPreviouslySolved = Boolean(progress.solvedDirect[task.id]);
            const hasCalcFormula = task.num !== 6 && task.num !== 8;

            return (
              <section
                key={task.id}
                className={`bg-white border rounded-xl p-6 space-y-4 transition-colors ${
                  res
                    ? res.isCorrect
                      ? 'border-[#86EFAC]'
                      : 'border-[#FCA5A5]'
                    : 'border-[#E2E8F0]'
                }`}
              >
                {/* Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-[#64748B]">
                  <div className="flex flex-wrap items-center gap-2 tabular-nums">
                    <span className="font-semibold text-[#7C3AED]">
                      Задание №{task.num}
                    </span>
                    <span>·</span>
                    <span>{task.points}</span>
                    {wasPreviouslySolved && !res && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-[#059669] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Решалось верно</span>
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {task.num === 4 && (
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedChiTable((prev) => ({
                            ...prev,
                            [task.id]: !prev[task.id],
                          }))
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#475569] hover:text-[#0F172A] cursor-pointer"
                      >
                        <Table2 className="w-3.5 h-3.5" />
                        <span>
                          {showChiTable ? 'Скрыть таблицу χ²' : 'Таблица χ² (Прил. 4)'}
                        </span>
                      </button>
                    )}

                    {hasCalcFormula && (
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedFormulas((prev) => ({
                            ...prev,
                            [task.id]: !prev[task.id],
                          }))
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#475569] hover:text-[#0F172A] cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{showFormula ? 'Скрыть формулу' : 'Формула'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={onOpenCalculator}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Калькулятор</span>
                    </button>
                  </div>
                </div>

                <p className="text-[15px] leading-relaxed text-[#1E293B]">
                  <RichTermText text={task.text} onOpenTerm={onOpenTerm} />
                </p>

                {hasCalcFormula && showFormula && (
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#475569]">
                      Рабочая формула:
                    </span>
                    <div className="text-[#0F172A]">
                      <MathFormula tex={task.formulaTex} />
                    </div>
                  </div>
                )}

                {task.num === 4 && showChiTable && (
                  <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] overflow-x-auto space-y-2">
                    <div className="text-xs font-semibold text-[#334155]">
                      Критические значения χ² Пирсона (Приложение 4 учебника Наследова)
                    </div>
                    <table className="w-full text-xs border-collapse tabular-nums">
                      <thead>
                        <tr className="border-y border-[#E2E8F0] text-[#475569]">
                          <th className="py-1.5 px-2 text-left">df</th>
                          <th className="py-1.5 px-2 text-right">p = 0,05</th>
                          <th className="py-1.5 px-2 text-right">p = 0,01</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CHI2_TABLE.map((row) => (
                          <tr
                            key={row.df}
                            onClick={() =>
                              setFieldValue(
                                task.id,
                                'chi2Crit',
                                row.p05.toFixed(2).replace('.', ',')
                              )
                            }
                            title="Нажмите, чтобы подставить χ²_табл (p = 0,05)"
                            className="border-b border-[#E2E8F0] hover:bg-[#EFF6FF] cursor-pointer transition-colors"
                          >
                            <td className="py-1 px-2 font-mono">df = {row.df}</td>
                            <td className="py-1 px-2 text-right font-mono font-semibold text-[#1D4ED8]">
                              {row.p05.toFixed(2).replace('.', ',')}
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-[#475569]">
                              {row.p01.toFixed(2).replace('.', ',')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Empty Scratchpad Fields for Intermediate Numbers */}
                {(() => {
                  const scratchValues = getScratchFields(task.id);
                  const hasScratchContent =
                    scratchValues.some((v) => v.trim().length > 0) ||
                    scratchValues.length > DEFAULT_SCRATCH_COUNT;

                  return (
                    <div className="p-3 rounded-lg bg-white border border-dashed border-[#CBD5E1] space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
                          <NotebookPen className="w-3.5 h-3.5 text-[#7C3AED]" />
                          <span>
                            Поля для запоминания чисел (черновик, не проверяются)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {scratchValues.length < 8 && (
                            <button
                              type="button"
                              onClick={() => addScratchField(task.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] cursor-pointer transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Ещё поле</span>
                            </button>
                          )}
                          {hasScratchContent && (
                            <button
                              type="button"
                              onClick={() => clearScratchTask(task.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer transition-colors"
                              title="Очистить черновик"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Очистить</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {scratchValues.map((scratchVal, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-1">
                            <input
                              type="text"
                              value={scratchVal}
                              onFocus={() =>
                                onRegisterCalcTarget(
                                  `Черновик №${task.num} · поле ${sIdx + 1}`,
                                  (calcVal) => setScratchValue(task.id, sIdx, calcVal)
                                )
                              }
                              onChange={(e) =>
                                setScratchValue(task.id, sIdx, e.target.value)
                              }
                              placeholder={`Число / заметка ${sIdx + 1}`}
                              aria-label={`Черновик ${sIdx + 1} для задания ${task.num}`}
                              className="w-full px-2.5 py-1.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#7C3AED]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                onRegisterCalcTarget(
                                  `Черновик №${task.num} · поле ${sIdx + 1}`,
                                  (calcVal) => setScratchValue(task.id, sIdx, calcVal)
                                );
                                onOpenCalculator();
                              }}
                              title="Посчитать в калькуляторе и запомнить сюда"
                              className="p-1.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#1D4ED8] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] cursor-pointer shrink-0 transition-colors"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Final Answer Inputs (No Steps, No Extra Quick Choices) */}
                <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                  <div
                    className={
                      fields.length === 2
                        ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                        : 'space-y-3'
                    }
                  >
                    {fields.map((field) => {
                      const val = taskInputs[field.key] || '';
                      return (
                        <div key={field.key} className="space-y-2">
                          <label className="block text-sm font-semibold text-[#0F172A]">
                            {field.label}
                          </label>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={val}
                              onFocus={() => {
                                if (field.isNumeric) {
                                  onRegisterCalcTarget(
                                    fields.length === 2
                                      ? task.num === 4
                                        ? `Без шагов №4 (χ²_табл)`
                                        : `Без шагов №${task.num} (${field.key === 'd95' ? '95,4%' : '99,7%'})`
                                      : `Без шагов №${task.num}`,
                                    (calcVal) =>
                                      setFieldValue(task.id, field.key, calcVal)
                                  );
                                }
                              }}
                              onChange={(e) =>
                                setFieldValue(task.id, field.key, e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  evaluateTask(task);
                                }
                              }}
                              placeholder={field.placeholder}
                              className="w-full max-w-sm px-3.5 py-2 rounded-lg bg-white border border-[#CBD5E1] text-sm font-mono text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/25 focus:border-[#7C3AED]"
                            />
                            {field.isNumeric && (
                              <button
                                type="button"
                                onClick={() => {
                                  onRegisterCalcTarget(
                                    fields.length === 2
                                      ? task.num === 4
                                        ? `Без шагов №4 (χ²_табл)`
                                        : `Без шагов №${task.num} (${field.key === 'd95' ? '95,4%' : '99,7%'})`
                                      : `Без шагов №${task.num}`,
                                    (calcVal) =>
                                      setFieldValue(task.id, field.key, calcVal)
                                  );
                                  onOpenCalculator();
                                }}
                                title="Посчитать в калькуляторе и вставить сюда"
                                className="p-2 rounded-lg bg-white border border-[#CBD5E1] text-[#1D4ED8] hover:bg-[#EFF6FF] transition-colors cursor-pointer shrink-0"
                              >
                                <Calculator className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => evaluateTask(task)}
                      className="px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Проверить ответ
                    </button>

                    {res && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSolutions((prev) => ({
                            ...prev,
                            [task.id]: !prev[task.id],
                          }))
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#475569] hover:text-[#0F172A] cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>
                          {showSolution
                            ? 'Скрыть разбор решения'
                            : 'Показать разбор решения'}
                        </span>
                        {showSolution ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Result Banner */}
                {res && (
                  <div
                    className={`p-3.5 rounded-lg border flex items-start gap-2.5 text-sm ${
                      res.isCorrect
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#065F46]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                    }`}
                  >
                    {res.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                    )}
                    <div className="leading-relaxed">
                      <RichTermText text={res.message} onOpenTerm={onOpenTerm} />
                    </div>
                  </div>
                )}

                {/* Revealed Step Breakdown & Trap AFTER Check */}
                {res && showSolution && (
                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#334155]">
                        Разбор алгоритма решения
                      </span>
                      <div className="text-sm text-[#0F172A]">
                        <MathFormula tex={task.formulaTex} />
                      </div>
                    </div>

                    <ul className="space-y-1.5 text-sm text-[#1E293B] list-disc pl-5">
                      {task.steps.map((s) => (
                        <li key={s.id} className="leading-relaxed">
                          <span className="font-medium">
                            <RichTermText text={s.label} onOpenTerm={onOpenTerm} />
                          </span>{' '}
                          <span className="text-[#475569]">
                            — <RichTermText text={s.hint} onOpenTerm={onOpenTerm} />
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2 text-xs leading-relaxed text-[#78350F]">
                      <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Экзаменационная ловушка: </span>
                        <RichTermText text={task.trap} onOpenTerm={onOpenTerm} />
                      </div>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Tests 10–13 for Selected / Generated Variant */}
      {sectionFilter !== 'calc' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Тестовая часть варианта (№10–13)
              </h3>
              <p className="text-xs text-[#64748B]">
                Мгновенная проверка с объяснением верного пункта и подвохов
              </p>
            </div>
            <span className="text-xs font-semibold text-[#1D4ED8] tabular-nums">
              Верно в блоке: {solvedTestsCount} / {variantTests.length}
            </span>
          </div>

          {variantTests.map((q, idx) => {
            const picked =
              sessionTests[q.id] ??
              (variant === 'generated'
                ? progress.answeredTests[q.id]?.optionIdx
                : undefined);
            const isAnswered = picked !== undefined;
            const pickedOption = isAnswered ? q.options[picked] : null;

            return (
              <section
                key={q.id}
                className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-[#64748B]">
                  <span className="text-[#7C3AED] font-semibold">
                    Задание №{10 + idx} · {q.variants}
                  </span>
                  <span className="tabular-nums">{q.points} балла</span>
                </div>

                <h4 className="text-base font-bold text-[#0F172A] leading-snug">
                  <RichTermText text={q.question} onOpenTerm={onOpenTerm} />
                </h4>

                <div className="space-y-2">
                  {(variant === 'generated'
                    ? q.options.map((_, i) => i)
                    : stableIndexOrder(q.options.length, q.id)
                  ).map((origOptIdx, displayIdx) => {
                    const opt = q.options[origOptIdx];
                    const isPicked = picked === origOptIdx;
                    let cardStyle =
                      'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A] hover:bg-[#EFF6FF] hover:border-[#93C5FD]';

                    if (isAnswered) {
                      if (opt.isCorrect) {
                        cardStyle =
                          'bg-[#F0FDF4] border-[#86EFAC] text-[#065F46]';
                      } else if (isPicked) {
                        cardStyle =
                          'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]';
                      } else {
                        cardStyle =
                          'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] opacity-80';
                      }
                    }

                    return (
                      <button
                        key={origOptIdx}
                        type="button"
                        onClick={() => {
                          setSessionTests((prev) => ({
                            ...prev,
                            [q.id]: origOptIdx,
                          }));
                          onTestResult(
                            q.id,
                            origOptIdx,
                            opt.isCorrect,
                            opt.isCorrect
                              ? undefined
                              : {
                                  kind: 'test',
                                  sourceLabel: `${variantLabel} · №${10 + idx}`,
                                  title: q.question.slice(0, 90),
                                  prompt: q.question,
                                  correctAnswer:
                                    q.options.find((o) => o.isCorrect)?.text ||
                                    '',
                                  hint: opt.explain,
                                }
                          );
                        }}
                        className={`w-full text-left p-3.5 rounded-lg border transition-colors flex items-start gap-3 cursor-pointer ${cardStyle}`}
                      >
                        <span className="font-mono text-xs font-bold mt-0.5 shrink-0">
                          {String.fromCharCode(65 + displayIdx)}.
                        </span>
                        <span className="text-sm leading-relaxed flex-1">
                          <RichTermText text={opt.text} onOpenTerm={onOpenTerm} />
                        </span>
                        {isAnswered && opt.isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                        )}
                        {isAnswered && isPicked && !opt.isCorrect && (
                          <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {isAnswered && pickedOption && (
                  <div
                    className={`p-3.5 rounded-lg border text-sm leading-relaxed flex items-start gap-2.5 ${
                      pickedOption.isCorrect
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#065F46]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                    }`}
                  >
                    {pickedOption.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <RichTermText
                        text={pickedOption.explain}
                        onOpenTerm={onOpenTerm}
                      />
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
