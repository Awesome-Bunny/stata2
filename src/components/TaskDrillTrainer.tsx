import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dices,
  Flame,
  HelpCircle,
  Layers,
  NotebookPen,
  Plus,
  Repeat,
  RotateCcw,
  Sigma,
  Sparkles,
  Table2,
  Target,
  Trash2,
  XCircle,
} from 'lucide-react';
import { FORMULAS_DATA } from '../data/formulasData';
import { CHI2_TABLE, TASKS_DATA, TEST_QUESTIONS_BANK } from '../data/nasledovData';
import { MistakeItem, TaskItem, TaskStep, TestQuestion } from '../types/stats';
import { generateSingleTask } from '../utils/taskGenerator';
import { generateTestQuestionByNum } from '../utils/testGenerator';
import { stableShuffle, validateStepAnswer } from '../utils/validation';
import { MathFormula } from './MathFormula';
import { RichTermText } from './RichTermText';

interface TaskDrillTrainerProps {
  initialTaskNum?: number;
  initialTaskSignal?: number;
  onOpenTerm: (key: string) => void;
  onOpenCalculator: () => void;
  onRegisterCalcTarget: (label: string, applyValue: (val: string) => void) => void;
  onOpenFormulasForTask?: (taskNum: number) => void;
  onRecordAttempt: (
    module: 'steps' | 'direct' | 'tests',
    isCorrect: boolean,
    isGenerated: boolean
  ) => void;
  onTestResult: (
    questionId: string,
    optionIdx: number,
    isCorrect: boolean,
    mistake?: Omit<MistakeItem, 'id' | 'createdAt'>
  ) => void;
}

interface TaskMeta {
  num: number;
  shortLabel: string;
  fullTitle: string;
  isTest: boolean;
}

const TASK_CATALOG: TaskMeta[] = [
  { num: 1, shortLabel: 'Тренд', fullTitle: 'Уравнение тренда и прогноз', isTest: false },
  { num: 2, shortLabel: 'η² влияние', fullTitle: 'Коэффициент детерминации η²', isTest: false },
  { num: 3, shortLabel: 'Δ выборки', fullTitle: 'Погрешность выборки (95,4% и 99,7%)', isTest: false },
  { num: 4, shortLabel: 'χ² норма', fullTitle: 'Проверка нормальности по χ² (df = k − 3)', isTest: false },
  { num: 5, shortLabel: '3σ / доля', fullTitle: 'Доля респондентов в интервале', isTest: false },
  { num: 6, shortLabel: 'Шкалы (6)', fullTitle: 'Выбор критерия и коэффициента связи', isTest: false },
  { num: 7, shortLabel: 'τ Кендалла', fullTitle: 'Вероятность по τ Кендалла (1 ± τ)/2', isTest: false },
  { num: 8, shortLabel: 'Метод (8)', fullTitle: 'ANOVA или ранговая корреляция', isTest: false },
  { num: 9, shortLabel: 'Регрессия', fullTitle: 'Линейная регрессия ŷ = a + b·x', isTest: false },
  { num: 10, shortLabel: 'Тест: n и Δ', fullTitle: 'Влияние объёма выборки на Δ и P', isTest: true },
  { num: 11, shortLabel: 'Тест: 2×2', fullTitle: 'Коэффициенты для дихотомических шкал', isTest: true },
  { num: 12, shortLabel: 'Тест: t / τ', fullTitle: 'Коэффициент доверия t и пределы τ', isTest: true },
  { num: 13, shortLabel: 'Тест: r / шк.', fullTitle: 'Пределы Пирсона и типы шкал', isTest: true },
];

const BANK_TEST_IDS_BY_NUM: Record<10 | 11 | 12 | 13, string[]> = {
  10: ['q10_both', 'q_models_sy', 'q_chi2_rule'],
  11: ['q11_both', 'q_df_bonus2', 'q_scales_anova_vs_chi'],
  12: ['q12_v1', 'q12_v3', 'q_kendall_trap'],
  13: ['q13_v1', 'q13_v3', 'q_df_bonus1', 'q_three_sigma_link'],
};

interface DrillTaskStats {
  solved: number;
  attempts: number;
  streak: number;
  bestStreak: number;
}

const DRILL_STATS_STORAGE_KEY = 'stat_task_drill_v1';

function loadDrillStats(): Record<number, DrillTaskStats> {
  try {
    const raw = localStorage.getItem(DRILL_STATS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<number, DrillTaskStats>;
  } catch {
    return {};
  }
}

interface DirectFieldSpec {
  key: string;
  label: string;
  placeholder: string;
  ans: string[];
  tolerance: number;
  isNumeric: boolean;
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

export const TaskDrillTrainer: React.FC<TaskDrillTrainerProps> = ({
  initialTaskNum = 1,
  initialTaskSignal = 0,
  onOpenTerm,
  onOpenCalculator,
  onRegisterCalcTarget,
  onOpenFormulasForTask,
  onRecordAttempt,
  onTestResult,
}) => {
  const [selectedNum, setSelectedNum] = useState<number>(initialTaskNum);
  const [calcSource, setCalcSource] = useState<'generated' | 'v1' | 'v3'>('generated');
  const [solveMode, setSolveMode] = useState<'steps' | 'direct'>('steps');
  const [testSource, setTestSource] = useState<'generated' | 'bank'>('generated');

  const [drillStats, setDrillStats] = useState<Record<number, DrillTaskStats>>(() =>
    loadDrillStats()
  );

  // Active calculation task (1-9)
  const [genTask, setGenTask] = useState<TaskItem>(() => generateSingleTask(1));
  const [stepInputs, setStepInputs] = useState<Record<string, string>>({});
  const [stepFeedback, setStepFeedback] = useState<
    Record<string, { status: 'ok' | 'err'; message: string }>
  >({});
  const [solvedStepsLocal, setSolvedStepsLocal] = useState<Record<string, boolean>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [taskCompletedRecorded, setTaskCompletedRecorded] = useState(false);

  // Direct mode state
  const [directInputs, setDirectInputs] = useState<Record<string, string>>({});
  const [directScratch, setDirectScratch] = useState<string[]>(['', '', '']);
  const [directResult, setDirectResult] = useState<{
    isCorrect: boolean;
    expectedDisplay: string;
    message: string;
  } | null>(null);
  const [showDirectSolution, setShowDirectSolution] = useState(false);

  // Cheat-sheet & chi2 table toggles
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [showChiTable, setShowChiTable] = useState(false);

  // Active test question (10-13)
  const [genTestQ, setGenTestQ] = useState<TestQuestion>(() =>
    generateTestQuestionByNum(10)
  );
  const [bankIndex, setBankIndex] = useState(0);
  const [pickedTestOption, setPickedTestOption] = useState<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(DRILL_STATS_STORAGE_KEY, JSON.stringify(drillStats));
    } catch {
      // ignore storage quota errors
    }
  }, [drillStats]);

  const resetLocalInputs = () => {
    setStepInputs({});
    setStepFeedback({});
    setSolvedStepsLocal({});
    setRevealedHints({});
    setTaskCompletedRecorded(false);
    setDirectInputs({});
    setDirectScratch(['', '', '']);
    setDirectResult(null);
    setShowDirectSolution(false);
    setPickedTestOption(null);
  };

  const selectTaskNumber = (num: number) => {
    setSelectedNum(num);
    resetLocalInputs();
    if (num <= 9) {
      setGenTask(generateSingleTask(num as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9));
    } else {
      setGenTestQ(generateTestQuestionByNum(num as 10 | 11 | 12 | 13));
      setBankIndex(0);
    }
  };

  useEffect(() => {
    if (initialTaskSignal > 0 && initialTaskNum >= 1 && initialTaskNum <= 13) {
      selectTaskNumber(initialTaskNum);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTaskSignal, initialTaskNum]);

  const activeMeta =
    TASK_CATALOG.find((t) => t.num === selectedNum) || TASK_CATALOG[0];

  const activeCalcTask: TaskItem | null = useMemo(() => {
    if (selectedNum > 9) return null;
    if (calcSource === 'v1') {
      return TASKS_DATA.v1.find((t) => t.num === selectedNum) || genTask;
    }
    if (calcSource === 'v3') {
      return TASKS_DATA.v3.find((t) => t.num === selectedNum) || genTask;
    }
    return genTask;
  }, [selectedNum, calcSource, genTask]);

  const bankQuestionsForNum: TestQuestion[] = useMemo(() => {
    if (selectedNum < 10) return [];
    const ids =
      BANK_TEST_IDS_BY_NUM[selectedNum as 10 | 11 | 12 | 13] || [];
    return ids
      .map((id) => TEST_QUESTIONS_BANK.find((q) => q.id === id))
      .filter((q): q is TestQuestion => Boolean(q));
  }, [selectedNum]);

  const activeTestQuestion: TestQuestion | null = useMemo(() => {
    if (selectedNum < 10) return null;
    if (testSource === 'bank' && bankQuestionsForNum.length > 0) {
      return bankQuestionsForNum[bankIndex % bankQuestionsForNum.length];
    }
    return genTestQ;
  }, [selectedNum, testSource, bankQuestionsForNum, bankIndex, genTestQ]);

  const relatedFormulas = useMemo(
    () =>
      FORMULAS_DATA.filter((f) => f.examTasks?.includes(selectedNum)),
    [selectedNum]
  );

  const currentStats: DrillTaskStats = drillStats[selectedNum] || {
    solved: 0,
    attempts: 0,
    streak: 0,
    bestStreak: 0,
  };

  const totalDrillSolved = useMemo(
    () => Object.values(drillStats).reduce((s, d) => s + d.solved, 0),
    [drillStats]
  );

  const bumpDrillStat = (isCorrect: boolean, countAsSolved: boolean) => {
    setDrillStats((prev) => {
      const cur = prev[selectedNum] || {
        solved: 0,
        attempts: 0,
        streak: 0,
        bestStreak: 0,
      };
      const nextStreak = isCorrect
        ? cur.streak + (countAsSolved ? 1 : 0)
        : 0;
      return {
        ...prev,
        [selectedNum]: {
          solved: cur.solved + (isCorrect && countAsSolved ? 1 : 0),
          attempts: cur.attempts + 1,
          streak: nextStreak,
          bestStreak: Math.max(cur.bestStreak, nextStreak),
        },
      };
    });
  };

  const handleNextVariant = () => {
    resetLocalInputs();
    if (selectedNum <= 9) {
      if (calcSource === 'generated') {
        let next = generateSingleTask(
          selectedNum as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
        );
        for (let attempt = 0; attempt < 4 && next.title === genTask.title; attempt++) {
          next = generateSingleTask(
            selectedNum as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
          );
        }
        setGenTask(next);
      } else {
        setCalcSource((prev) => (prev === 'v1' ? 'v3' : 'v1'));
      }
    } else {
      if (testSource === 'generated') {
        setGenTestQ(
          generateTestQuestionByNum(selectedNum as 10 | 11 | 12 | 13)
        );
      } else {
        setBankIndex((i) => i + 1);
      }
    }
  };

  const handleCheckStep = (
    task: TaskItem,
    step: TaskStep,
    overrideVal?: string
  ) => {
    const raw =
      overrideVal !== undefined ? overrideVal : stepInputs[step.id] ?? '';
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
      const nextSolved = { ...solvedStepsLocal, [step.id]: true };
      setSolvedStepsLocal(nextSolved);
      setStepFeedback((prev) => ({
        ...prev,
        [step.id]: {
          status: 'ok',
          message: `Верно! ${step.hint}`,
        },
      }));
      onRecordAttempt('steps', true, calcSource === 'generated');

      const allNowSolved = task.steps.every((s) => Boolean(nextSolved[s.id]));
      if (allNowSolved && !taskCompletedRecorded) {
        setTaskCompletedRecorded(true);
        bumpDrillStat(true, true);
      }
    } else {
      setStepFeedback((prev) => ({
        ...prev,
        [step.id]: {
          status: 'err',
          message:
            'Пока неверно. Проверьте формулу, знаки или откройте подсказку.',
        },
      }));
      onRecordAttempt('steps', false, calcSource === 'generated');
      bumpDrillStat(false, false);
    }
  };

  const handleCheckDirect = (task: TaskItem) => {
    const fields = getDirectFields(task);
    const hasMissing = fields.some((f) => !(directInputs[f.key] || '').trim());
    if (hasMissing) {
      setDirectResult({
        isCorrect: false,
        expectedDisplay: fields.map((f) => f.ans[0]).join(' / '),
        message: 'Заполните поле итогового ответа перед проверкой.',
      });
      return;
    }

    const allOk = fields.every((f) =>
      validateStepAnswer(directInputs[f.key] || '', f.ans, f.tolerance)
    );
    const expectedDisplay =
      fields.length === 2
        ? task.num === 4
          ? `χ²_табл = ${fields[0].ans[0]} · Вывод: ${fields[1].ans[0]}`
          : `Δ(95,4%) = ${fields[0].ans[0]} · Δ(99,7%) = ${fields[1].ans[0]}`
        : fields[0].ans[0];

    setDirectResult({
      isCorrect: allOk,
      expectedDisplay,
      message: allOk
        ? `Верно! Итоговый ответ: ${expectedDisplay}.`
        : `Неверно. Эталонный ответ: ${expectedDisplay}. Смотрите разбор шагов ниже.`,
    });
    if (!allOk) {
      setShowDirectSolution(true);
    }

    onRecordAttempt('direct', allOk, calcSource === 'generated');
    if (!taskCompletedRecorded) {
      bumpDrillStat(allOk, allOk);
      if (allOk) setTaskCompletedRecorded(true);
    } else if (!allOk) {
      bumpDrillStat(false, false);
    }
  };

  const handlePickTestOption = (q: TestQuestion, optIdx: number) => {
    if (pickedTestOption !== null) return;
    setPickedTestOption(optIdx);
    const opt = q.options[optIdx];
    onRecordAttempt('tests', opt.isCorrect, testSource === 'generated');
    bumpDrillStat(opt.isCorrect, opt.isCorrect);

    if (testSource === 'bank') {
      onTestResult(
        q.id,
        optIdx,
        opt.isCorrect,
        opt.isCorrect
          ? undefined
          : {
              kind: 'test',
              sourceLabel: `Зубрёжка №${selectedNum}`,
              title: `Задание №${selectedNum}`,
              prompt: q.question,
              correctAnswer: q.options.find((o) => o.isCorrect)?.text || '',
              hint: q.options.find((o) => o.isCorrect)?.explain || opt.explain,
            }
      );
    }
  };

  const resetCurrentTaskStats = () => {
    setDrillStats((prev) => {
      const next = { ...prev };
      delete next[selectedNum];
      return next;
    });
  };

  const v1OrV3Task5Note =
    selectedNum === 5 && calcSource !== 'generated'
      ? calcSource === 'v1'
        ? 'Справочно по заданию №4 Варианта 1: k = 6 интервалов, df = 3, χ²_эмп = 8,74 > χ²_табл = 7,81 (нормальность отвергнута).'
        : 'Справочно по заданию №4 Варианта 3: k = 14 интервалов, df = 11, χ²_эмп = 6,27 < χ²_табл = 19,68 (нормальность подтверждена).'
      : null;

  return (
    <div className="space-y-6">
      {/* Header & Task Strip (1–13) */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1D4ED8] mb-1">
              <Repeat className="w-4 h-4" />
              <span>Прицельная отработка одного номера · Задания №1–13</span>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Зубрёжка конкретного задания до автоматизма
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              Выберите любой номер экзамена №1–13, решайте бесконечные вариации
              чисел или эталоны билетов и держите формулу перед глазами.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#475569] tabular-nums shrink-0">
            <div className="px-3.5 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-[11px] text-[#64748B]">По №{selectedNum}</div>
              <div className="font-bold text-[#0F172A] text-sm">
                Решено: {currentStats.solved}
              </div>
            </div>
            <div className="px-3.5 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-[11px] text-[#64748B] flex items-center gap-1">
                <Flame className="w-3 h-3 text-[#D97706]" />
                <span>Серия / Рекорд</span>
              </div>
              <div className="font-bold text-[#1D4ED8] text-sm">
                {currentStats.streak} / {currentStats.bestStreak}
              </div>
            </div>
            <div className="px-3.5 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-[11px] text-[#64748B]">Всего в зубрёжке</div>
              <div className="font-bold text-[#059669] text-sm">
                {totalDrillSolved}
              </div>
            </div>
          </div>
        </div>

        {/* 13 Task Selector Buttons */}
        <div className="pt-3 border-t border-[#E2E8F0]">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13 gap-1.5">
            {TASK_CATALOG.map((item) => {
              const isSelected = selectedNum === item.num;
              const stat = drillStats[item.num];
              return (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => selectTaskNumber(item.num)}
                  title={item.fullTitle}
                  className={`px-2 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#334155] hover:bg-[#EFF6FF] hover:border-[#BFDBFE]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 tabular-nums">
                    <span className="text-xs font-bold">№{item.num}</span>
                    {stat && stat.solved > 0 && (
                      <span
                        className={`text-[10px] font-mono font-semibold ${
                          isSelected ? 'text-[#DBEAFE]' : 'text-[#059669]'
                        }`}
                      >
                        {stat.solved}
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[10px] truncate mt-0.5 ${
                      isSelected ? 'text-[#E0E7FF]' : 'text-[#64748B]'
                    }`}
                  >
                    {item.shortLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Drill Workspace */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
        {/* Toolbar inside selected task */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
              <span className="font-bold text-[#1D4ED8]">
                Задание №{selectedNum}
              </span>
              <span>·</span>
              <span>{activeMeta.isTest ? 'Тестовая часть' : 'Расчётно-аналитическая часть'}</span>
              {activeCalcTask && (
                <>
                  <span>·</span>
                  <span className="tabular-nums">{activeCalcTask.points}</span>
                </>
              )}
            </div>
            <h3 className="text-lg font-bold text-[#0F172A]">
              {activeCalcTask ? activeCalcTask.title : activeMeta.fullTitle}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedNum <= 9 ? (
              <>
                {/* Source toggle for 1–9 */}
                <div className="inline-flex rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-0.5">
                  {(
                    [
                      { id: 'generated', label: 'Генератор' },
                      { id: 'v1', label: 'Вариант 1' },
                      { id: 'v3', label: 'Вариант 3' },
                    ] as const
                  ).map((src) => (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => {
                        setCalcSource(src.id);
                        resetLocalInputs();
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        calcSource === src.id
                          ? 'bg-white text-[#0F172A] shadow-xs'
                          : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>

                {/* Mode toggle: По шагам / Только ответ */}
                <div className="inline-flex rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-0.5">
                  <button
                    type="button"
                    onClick={() => setSolveMode('steps')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      solveMode === 'steps'
                        ? 'bg-white text-[#1D4ED8] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>По шагам</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSolveMode('direct')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      solveMode === 'direct'
                        ? 'bg-white text-[#7C3AED] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Только ответ</span>
                  </button>
                </div>
              </>
            ) : (
              /* Source toggle for 10–13 */
              <div className="inline-flex rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setTestSource('generated');
                    setPickedTestOption(null);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    testSource === 'generated'
                      ? 'bg-white text-[#1D4ED8] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Новые сгенерированные</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTestSource('bank');
                    setPickedTestOption(null);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    testSource === 'bank'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Вопросы из билетов
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowCheatSheet((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                showCheatSheet
                  ? 'bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8]'
                  : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
              }`}
            >
              <Sigma className="w-3.5 h-3.5" />
              <span>{showCheatSheet ? 'Скрыть формулу' : 'Шпаргалка формул'}</span>
            </button>

            {selectedNum === 4 && (
              <button
                type="button"
                onClick={() => setShowChiTable((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  showChiTable
                    ? 'bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8]'
                    : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Таблица χ²</span>
              </button>
            )}

            {selectedNum <= 9 && (
              <button
                type="button"
                onClick={onOpenCalculator}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F8FAFC] text-[#1D4ED8] border border-[#CBD5E1] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Калькулятор</span>
              </button>
            )}

            {currentStats.attempts > 0 && (
              <button
                type="button"
                onClick={resetCurrentTaskStats}
                title={`Сбросить счётчик зубрёжки для №${selectedNum}`}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Formula Cheat Sheet Drawer */}
        {showCheatSheet && (
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#BFDBFE] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1D4ED8]">
                <Sigma className="w-4 h-4" />
                <span>Формулы и подсказки для задания №{selectedNum}</span>
              </div>
              {onOpenFormulasForTask && (
                <button
                  type="button"
                  onClick={() => onOpenFormulasForTask(selectedNum)}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                >
                  Открыть полный справочник формул →
                </button>
              )}
            </div>

            {relatedFormulas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {relatedFormulas.map((f) => (
                  <div
                    key={f.id}
                    className="p-3.5 rounded-lg bg-white border border-[#E2E8F0] space-y-2"
                  >
                    <div className="text-xs font-bold text-[#0F172A]">
                      {f.title}
                    </div>
                    <div className="overflow-x-auto py-1">
                      <MathFormula tex={f.formulaTex} displayMode />
                    </div>
                    <div className="text-xs text-[#475569]">
                      <strong className="text-[#059669]">Что ищем:</strong>{' '}
                      {f.whatWeFind}
                    </div>
                    <div className="text-[11px] text-[#64748B] flex flex-wrap gap-x-3 gap-y-1">
                      {f.variables.map((v, i) => (
                        <span key={i}>
                          <MathFormula
                            tex={v.symbol}
                            className="font-semibold text-[#1D4ED8]"
                          />{' '}
                          — {v.desc}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              activeCalcTask && (
                <div className="p-3 rounded-lg bg-white border border-[#E2E8F0]">
                  <MathFormula tex={activeCalcTask.formulaTex} displayMode />
                </div>
              )
            )}

            {activeCalcTask && (
              <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2 text-xs text-[#78350F]">
                <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Экзаменационная ловушка: </span>
                  <RichTermText text={activeCalcTask.trap} onOpenTerm={onOpenTerm} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chi2 Table Quick Reference for Task 4 */}
        {selectedNum === 4 && showChiTable && activeCalcTask && (
          <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] overflow-x-auto space-y-2">
            <div className="text-xs font-semibold text-[#334155]">
              Критические значения χ² Пирсона (Приложение 4). Нажмите на строку, чтобы подставить χ²_табл (p = 0,05):
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
                    onClick={() => {
                      const val = row.p05.toFixed(2).replace('.', ',');
                      if (solveMode === 'direct') {
                        setDirectInputs((prev) => ({ ...prev, chi2Crit: val }));
                      } else if (activeCalcTask.steps[1]) {
                        const sId = activeCalcTask.steps[1].id;
                        setStepInputs((prev) => ({ ...prev, [sId]: val }));
                      }
                    }}
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

        {/* Calculation Tasks 1–9 */}
        {selectedNum <= 9 && activeCalcTask && (
          <div className="space-y-4">
            <p className="text-[15px] leading-relaxed text-[#1E293B]">
              <RichTermText text={activeCalcTask.text} onOpenTerm={onOpenTerm} />
            </p>

            {v1OrV3Task5Note && (
              <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E3A8A]">
                {v1OrV3Task5Note}
              </div>
            )}

            {solveMode === 'steps' ? (
              <div className="space-y-3">
                {activeCalcTask.steps.map((step, sIdx) => {
                  const isSolved = Boolean(solvedStepsLocal[step.id]);
                  const currentVal = stepInputs[step.id] ?? '';
                  const fb = stepFeedback[step.id];
                  const showHint = Boolean(revealedHints[step.id]);

                  return (
                    <div
                      key={step.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        isSolved
                          ? 'bg-[#F0FDF4]/60 border-[#BBF7D0]'
                          : fb?.status === 'err'
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
                                setStepInputs((prev) => ({
                                  ...prev,
                                  [step.id]: choice,
                                }));
                                handleCheckStep(activeCalcTask, step, choice);
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
                              `Зубрёжка №${selectedNum} · Шаг ${sIdx + 1}`,
                              (val) =>
                                setStepInputs((prev) => ({
                                  ...prev,
                                  [step.id]: val,
                                }))
                            )
                          }
                          onChange={(e) =>
                            setStepInputs((prev) => ({
                              ...prev,
                              [step.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCheckStep(activeCalcTask, step);
                            }
                          }}
                          placeholder={step.placeholder || 'Введите ответ...'}
                          className="flex-1 min-w-[200px] px-3 py-2 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1D4ED8] tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => handleCheckStep(activeCalcTask, step)}
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
                          <span>{showHint ? 'Скрыть' : 'Подсказка'}</span>
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
                            <RichTermText text={fb.message} onOpenTerm={onOpenTerm} />
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
            ) : (
              /* Direct Mode (Только ответ) */
              <div className="space-y-4">
                {/* Scratchpad */}
                <div className="p-3 rounded-lg bg-white border border-dashed border-[#CBD5E1] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
                      <NotebookPen className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span>Черновик промежуточных чисел (не проверяется)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {directScratch.length < 6 && (
                        <button
                          type="button"
                          onClick={() => setDirectScratch((p) => [...p, ''])}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Ещё поле</span>
                        </button>
                      )}
                      {directScratch.some((v) => v.trim()) && (
                        <button
                          type="button"
                          onClick={() => setDirectScratch(['', '', ''])}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#64748B] hover:text-[#DC2626] cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Очистить</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {directScratch.map((val, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={val}
                        onFocus={() =>
                          onRegisterCalcTarget(
                            `Черновик №${selectedNum} · поле ${idx + 1}`,
                            (cVal) =>
                              setDirectScratch((prev) =>
                                prev.map((x, i) => (i === idx ? cVal : x))
                              )
                          )
                        }
                        onChange={(e) =>
                          setDirectScratch((prev) =>
                            prev.map((x, i) => (i === idx ? e.target.value : x))
                          )
                        }
                        placeholder={`Заметка ${idx + 1}`}
                        className="w-full px-2.5 py-1.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#7C3AED]"
                      />
                    ))}
                  </div>
                </div>

                {/* Final Answer Fields (No Extra Quick Choices) */}
                {(() => {
                  const fields = getDirectFields(activeCalcTask);
                  return (
                    <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                      <div
                        className={
                          fields.length === 2
                            ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                            : 'space-y-3'
                        }
                      >
                        {fields.map((field) => (
                          <div key={field.key} className="space-y-1.5">
                            <label className="block text-sm font-semibold text-[#0F172A]">
                              {field.label}
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={directInputs[field.key] || ''}
                                onFocus={() => {
                                  if (field.isNumeric) {
                                    onRegisterCalcTarget(
                                      `Зубрёжка №${selectedNum}`,
                                      (calcVal) =>
                                        setDirectInputs((prev) => ({
                                          ...prev,
                                          [field.key]: calcVal,
                                        }))
                                    );
                                  }
                                }}
                                onChange={(e) =>
                                  setDirectInputs((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCheckDirect(activeCalcTask);
                                  }
                                }}
                                placeholder={field.placeholder}
                                className="w-full max-w-sm px-3.5 py-2 rounded-lg bg-white border border-[#CBD5E1] text-sm font-mono text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                              />
                              {field.isNumeric && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onRegisterCalcTarget(
                                      `Зубрёжка №${selectedNum}`,
                                      (calcVal) =>
                                        setDirectInputs((prev) => ({
                                          ...prev,
                                          [field.key]: calcVal,
                                        }))
                                    );
                                    onOpenCalculator();
                                  }}
                                  title="Посчитать в калькуляторе"
                                  className="p-2 rounded-lg bg-white border border-[#CBD5E1] text-[#1D4ED8] hover:bg-[#EFF6FF] cursor-pointer shrink-0"
                                >
                                  <Calculator className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCheckDirect(activeCalcTask)}
                          className="px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Проверить ответ
                        </button>

                        {directResult && (
                          <button
                            type="button"
                            onClick={() => setShowDirectSolution((v) => !v)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#475569] hover:text-[#0F172A] cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>
                              {showDirectSolution
                                ? 'Скрыть разбор'
                                : 'Показать разбор'}
                            </span>
                            {showDirectSolution ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {directResult && (
                  <div
                    className={`p-3.5 rounded-lg border flex items-start gap-2.5 text-sm ${
                      directResult.isCorrect
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#065F46]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                    }`}
                  >
                    {directResult.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                    )}
                    <div className="leading-relaxed">
                      <RichTermText
                        text={directResult.message}
                        onOpenTerm={onOpenTerm}
                      />
                    </div>
                  </div>
                )}

                {directResult && showDirectSolution && (
                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#334155]">
                        Разбор решения
                      </span>
                      <MathFormula tex={activeCalcTask.formulaTex} />
                    </div>
                    <ul className="space-y-1 text-sm text-[#1E293B] list-disc pl-5">
                      {activeCalcTask.steps.map((s) => (
                        <li key={s.id}>
                          <span className="font-medium">
                            <RichTermText text={s.label} onOpenTerm={onOpenTerm} />
                          </span>{' '}
                          <span className="text-[#475569]">
                            — <RichTermText text={s.hint} onOpenTerm={onOpenTerm} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Test Tasks 10–13 */}
        {selectedNum >= 10 && activeTestQuestion && (
          <div className="space-y-4">
            <div className="text-xs text-[#64748B]">
              {activeTestQuestion.variants} · {activeTestQuestion.points} балла
            </div>
            <div className="text-base font-semibold text-[#0F172A] leading-relaxed">
              <RichTermText
                text={activeTestQuestion.question}
                onOpenTerm={onOpenTerm}
              />
            </div>

            <div className="space-y-2">
              {activeTestQuestion.options.map((opt, idx) => {
                const isPicked = pickedTestOption === idx;
                const revealed = pickedTestOption !== null;
                let style =
                  'bg-[#F8FAFC] border-[#CBD5E1] text-[#1E293B] hover:bg-[#EFF6FF] hover:border-[#93C5FD]';
                if (revealed) {
                  if (opt.isCorrect) {
                    style = 'bg-[#F0FDF4] border-[#16A34A] text-[#14532D] font-medium';
                  } else if (isPicked) {
                    style = 'bg-[#FEF2F2] border-[#DC2626] text-[#7F1D1D]';
                  } else {
                    style = 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]';
                  }
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={revealed}
                    onClick={() => handlePickTestOption(activeTestQuestion, idx)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors cursor-pointer disabled:cursor-default flex items-center justify-between gap-2 ${style}`}
                  >
                    <span>{opt.text}</span>
                    {revealed && opt.isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                    )}
                    {revealed && isPicked && !opt.isCorrect && (
                      <XCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {pickedTestOption !== null && (
              <div
                className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 leading-relaxed ${
                  activeTestQuestion.options[pickedTestOption]?.isCorrect
                    ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#166534]'
                    : 'bg-[#FEE2E2] border-[#FCA5A5] text-[#991B1B]'
                }`}
              >
                {activeTestQuestion.options[pickedTestOption]?.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div>
                  <RichTermText
                    text={
                      activeTestQuestion.options[pickedTestOption]?.explain || ''
                    }
                    onOpenTerm={onOpenTerm}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Action Row */}
        <div className="pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#64748B]">
            {selectedNum <= 9
              ? calcSource === 'generated'
                ? 'Нажмите «Следующий вариант», чтобы получить новые числа для №' +
                  selectedNum
                : `Режим эталона (${calcSource === 'v1' ? 'Вариант 1' : 'Вариант 3'}). Переключитесь на Генератор для бесконечных вариаций.`
              : testSource === 'generated'
              ? 'Каждый клик генерирует новый вариант тестового задания №' +
                selectedNum
              : `Вопрос ${(bankIndex % Math.max(1, bankQuestionsForNum.length)) + 1} из ${bankQuestionsForNum.length} в банке для №${selectedNum}`}
          </div>

          <button
            type="button"
            onClick={handleNextVariant}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#1D4ED8] text-white hover:bg-[#1E40AF] transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {selectedNum <= 9
                ? calcSource === 'generated'
                  ? `Следующий вариант №${selectedNum}`
                  : calcSource === 'v1'
                  ? `Переключить на Вариант 3 (№${selectedNum})`
                  : `Переключить на Вариант 1 (№${selectedNum})`
                : `Следующий вопрос №${selectedNum}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
