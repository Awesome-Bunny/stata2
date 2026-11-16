import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';

type TimeDrillMode =
  | 'mixed'
  | 'even_only'
  | 'odd_only'
  | 'inverse_year'
  | 'series_fill';

type ChallengeKind = 'find_t' | 'find_year' | 'fill_series';

interface TimeChallenge {
  id: string;
  kind: ChallengeKind;
  startYear: number;
  endYear: number;
  years: number[];
  isEven: boolean;
  showExplicitList: boolean;
  targetYear?: number;
  targetT?: number;
  expectedT?: number;
  expectedYear?: number;
  expectedSeries?: number[];
}

interface TimeDrillStats {
  attempts: number;
  correct: number;
  streak: number;
  bestStreak: number;
}

interface TimeParamTrainerProps {
  onRecordAttempt?: (isCorrect: boolean) => void;
}

const STORAGE_KEY = 'stat_time_param_drill_v1';

function loadStats(): TimeDrillStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: 0, correct: 0, streak: 0, bestStreak: 0 };
    const parsed = JSON.parse(raw) as Partial<TimeDrillStats>;
    return {
      attempts: Number(parsed.attempts) || 0,
      correct: Number(parsed.correct) || 0,
      streak: Number(parsed.streak) || 0,
      bestStreak: Number(parsed.bestStreak) || 0,
    };
  } catch {
    return { attempts: 0, correct: 0, streak: 0, bestStreak: 0 };
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function computeTForYear(
  startYear: number,
  endYear: number,
  year: number
): number {
  const n = endYear - startYear + 1;
  if (n % 2 === 1) {
    const mid = (startYear + endYear) / 2;
    return year - mid;
  }
  return 2 * year - (startYear + endYear);
}

function computeYearForT(
  startYear: number,
  endYear: number,
  t: number
): number {
  const n = endYear - startYear + 1;
  if (n % 2 === 1) {
    return (startYear + endYear) / 2 + t;
  }
  return (startYear + endYear + t) / 2;
}

function parseIntegerInput(raw: string): number | null {
  const normalized = raw
    .trim()
    .replace(/\u2212/g, '-')
    .replace(/\s+/g, '');
  if (!normalized || !/^[+-]?\d+$/.test(normalized)) return null;
  const num = Number(normalized);
  return Number.isSafeInteger(num) ? num : null;
}

function formatSigned(num: number): string {
  if (num > 0) return `+${num}`;
  return String(num);
}

function generateChallenge(mode: TimeDrillMode): TimeChallenge {
  const id = Math.random().toString(36).slice(2, 9);

  let kind: ChallengeKind;
  if (mode === 'inverse_year') {
    kind = 'find_year';
  } else if (mode === 'series_fill') {
    kind = 'fill_series';
  } else if (mode === 'mixed') {
    const r = Math.random();
    if (r < 0.58) kind = 'find_t';
    else if (r < 0.8) kind = 'find_year';
    else kind = 'fill_series';
  } else {
    kind = 'find_t';
  }

  let isEven: boolean;
  if (mode === 'even_only') {
    isEven = true;
  } else if (mode === 'odd_only') {
    isEven = false;
  } else {
    isEven = Math.random() > 0.45;
  }

  const lengthChoices =
    kind === 'fill_series'
      ? isEven
        ? [4, 6]
        : [3, 5, 7]
      : isEven
      ? [4, 6, 8]
      : [3, 5, 7, 9];

  const n = pickRandom(lengthChoices);
  const startYear = pickRandom([2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020]);
  const endYear = startYear + n - 1;
  const years = Array.from({ length: n }, (_, i) => startYear + i);
  const showExplicitList = Math.random() < 0.35;

  if (kind === 'fill_series') {
    const expectedSeries = years.map((y) => computeTForYear(startYear, endYear, y));
    return {
      id,
      kind,
      startYear,
      endYear,
      years,
      isEven,
      showExplicitList: true,
      expectedSeries,
    };
  }

  if (kind === 'find_year') {
    const offset = pickRandom([-2, -1, 0, 1, 2, 3, 4, 5, 6]);
    const candidateYear =
      Math.random() > 0.35
        ? endYear + pickRandom([1, 2, 3, 4, 5, 6])
        : Math.max(startYear, Math.min(endYear, startYear + Math.abs(offset)));
    const targetT = computeTForYear(startYear, endYear, candidateYear);
    const expectedYear = computeYearForT(startYear, endYear, targetT);
    return {
      id,
      kind,
      startYear,
      endYear,
      years,
      isEven,
      showExplicitList,
      targetT,
      expectedYear,
    };
  }

  // kind === 'find_t'
  const useFuture = Math.random() > 0.22;
  const targetYear = useFuture
    ? endYear + pickRandom([1, 2, 3, 4, 5, 6])
    : pickRandom(years);
  const expectedT = computeTForYear(startYear, endYear, targetYear);

  return {
    id,
    kind,
    startYear,
    endYear,
    years,
    isEven,
    showExplicitList,
    targetYear,
    expectedT,
  };
}

export const TimeParamTrainer: React.FC<TimeParamTrainerProps> = ({
  onRecordAttempt,
}) => {
  const [mode, setMode] = useState<TimeDrillMode>('mixed');
  const [challenge, setChallenge] = useState<TimeChallenge>(() =>
    generateChallenge('mixed')
  );
  const [singleInput, setSingleInput] = useState('');
  const [seriesInputs, setSeriesInputs] = useState<string[]>([]);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    message: string;
    isValidationError?: boolean;
  } | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [stats, setStats] = useState<TimeDrillStats>(loadStats);

  const singleInputRef = useRef<HTMLInputElement | null>(null);
  const firstSeriesInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // ignore storage quota errors
    }
  }, [stats]);

  useEffect(() => {
    setSeriesInputs(
      challenge.kind === 'fill_series'
        ? Array.from({ length: challenge.years.length }, () => '')
        : []
    );
    setSingleInput('');
    setResult(null);
    setShowBreakdown(false);
    const timer = window.setTimeout(() => {
      if (challenge.kind === 'fill_series') {
        firstSeriesInputRef.current?.focus();
      } else {
        singleInputRef.current?.focus();
      }
    }, 10);
    return () => window.clearTimeout(timer);
  }, [challenge]);

  const loadNext = (nextMode: TimeDrillMode = mode) => {
    setChallenge(generateChallenge(nextMode));
  };

  const handleModeChange = (nextMode: TimeDrillMode) => {
    setMode(nextMode);
    loadNext(nextMode);
  };

  const recordOutcome = (isOk: boolean) => {
    setStats((prev) => {
      const nextStreak = isOk ? prev.streak + 1 : 0;
      return {
        attempts: prev.attempts + 1,
        correct: prev.correct + (isOk ? 1 : 0),
        streak: nextStreak,
        bestStreak: Math.max(prev.bestStreak, nextStreak),
      };
    });
    onRecordAttempt?.(isOk);
  };

  const handleCheck = () => {
    if (result !== null && !result.isValidationError) {
      loadNext();
      return;
    }

    if (challenge.kind === 'fill_series') {
      const expected = challenge.expectedSeries || [];
      const parsed = seriesInputs.map(parseIntegerInput);
      if (parsed.some((v) => v === null)) {
        setResult({
          isCorrect: false,
          message: 'Заполните целым числом значение t для каждого года ряда.',
          isValidationError: true,
        });
        return;
      }
      const isOk = expected.every((exp, i) => parsed[i] === exp);
      setResult({
        isCorrect: isOk,
        message: isOk
          ? `Верно! Ряд значений t: ${expected.map(formatSigned).join(', ')}.`
          : `Неверно. Правильные значения t: ${expected
              .map(formatSigned)
              .join(', ')}.`,
      });
      recordOutcome(isOk);
      return;
    }

    const parsedVal = parseIntegerInput(singleInput);
    if (parsedVal === null) {
      setResult({
        isCorrect: false,
        message: 'Введите целое число.',
        isValidationError: true,
      });
      return;
    }

    if (challenge.kind === 'find_year') {
      const exp = challenge.expectedYear!;
      const isOk = parsedVal === exp;
      setResult({
        isCorrect: isOk,
        message: isOk
          ? `Верно! Значению t = ${formatSigned(challenge.targetT!)} соответствует ${exp} год.`
          : `Неверно. Правильный ответ: ${exp} год.`,
      });
      recordOutcome(isOk);
      return;
    }

    // kind === 'find_t'
    const exp = challenge.expectedT!;
    const isOk = parsedVal === exp;
    setResult({
      isCorrect: isOk,
      message: isOk
        ? `Верно! Для ${challenge.targetYear} года параметр t = ${formatSigned(exp)}.`
        : `Неверно. Правильный ответ: t = ${formatSigned(exp)}.`,
    });
    recordOutcome(isOk);
  };

  const accuracyPct = useMemo(() => {
    if (stats.attempts === 0) return '—';
    return `${Math.round((stats.correct / stats.attempts) * 100)}%`;
  }, [stats]);

  const breakdownRows = useMemo(() => {
    const rows = challenge.years.map((y) => ({
      year: y,
      t: computeTForYear(challenge.startYear, challenge.endYear, y),
      isTarget:
        y === challenge.targetYear || y === challenge.expectedYear,
    }));
    const targetY =
      challenge.targetYear ?? challenge.expectedYear ?? challenge.endYear;
    if (targetY > challenge.endYear) {
      for (let y = challenge.endYear + 1; y <= targetY; y++) {
        rows.push({
          year: y,
          t: computeTForYear(challenge.startYear, challenge.endYear, y),
          isTarget: y === targetY,
        });
      }
    }
    return rows;
  }, [challenge]);

  const modeTabs: { id: TimeDrillMode; label: string }[] = [
    { id: 'mixed', label: 'Все типы' },
    { id: 'even_only', label: 'Чётный ряд' },
    { id: 'odd_only', label: 'Нечётный ряд' },
    { id: 'inverse_year', label: 'Найти год по t' },
    { id: 'series_fill', label: 'Разметить весь ряд' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1D4ED8] mb-1">
              <Clock className="w-4 h-4" />
              <span>Задание №1 · Только параметр времени t</span>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Тренажёр параметра времени t (без подсказок)
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              Самостоятельно определяйте чётность периода, центр отсчёта и шаг
              времени. Подсказки и формулы скрыты до проверки ответа.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#475569] tabular-nums shrink-0">
            <div className="px-3.5 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-[11px] text-[#64748B]">Верно / Всего</div>
              <div className="font-bold text-[#0F172A] text-sm">
                {stats.correct} / {stats.attempts}
              </div>
            </div>
            <div className="px-3.5 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-[11px] text-[#64748B]">Точность</div>
              <div className="font-bold text-[#059669] text-sm">
                {accuracyPct}
              </div>
            </div>
            <div className="px-3.5 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-[11px] text-[#64748B] flex items-center gap-1">
                <Flame className="w-3 h-3 text-[#D97706]" />
                <span>Серия / Рекорд</span>
              </div>
              <div className="font-bold text-[#1D4ED8] text-sm">
                {stats.streak} / {stats.bestStreak}
              </div>
            </div>
            {stats.attempts > 0 && (
              <button
                type="button"
                onClick={() =>
                  setStats({ attempts: 0, correct: 0, streak: 0, bestStreak: 0 })
                }
                title="Сбросить статистику тренажёра времени t"
                className="p-2 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mode Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[#E2E8F0]">
          {modeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleModeChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                mode === tab.id
                  ? 'bg-[#1D4ED8] text-white'
                  : 'bg-[#F8FAFC] text-[#334155] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Hint-Free Practice Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
        <div className="text-xs font-medium text-[#64748B] tabular-nums">
          {challenge.kind === 'fill_series'
            ? 'Расстановка значений t для всего ряда'
            : challenge.kind === 'find_year'
            ? 'Обратная задача · определение года по t'
            : 'Определение параметра времени t'}
        </div>

        {/* Problem Statement (strictly hint-free) */}
        <div className="space-y-3">
          {challenge.kind === 'find_t' && (
            <p className="text-base sm:text-lg font-medium text-[#0F172A] leading-relaxed tabular-nums">
              {challenge.showExplicitList ? (
                <>
                  Дан временной ряд показателей за годы:{' '}
                  <span className="font-mono font-bold">
                    {challenge.years.join(', ')}
                  </span>
                  . Найдите параметр времени{' '}
                  <span className="font-mono font-bold">t</span> для{' '}
                  <span className="font-bold text-[#1D4ED8]">
                    {challenge.targetYear} года
                  </span>
                  .
                </>
              ) : (
                <>
                  Дана динамика показателя за период{' '}
                  <span className="font-mono font-bold">
                    {challenge.startYear}–{challenge.endYear} гг.
                  </span>{' '}
                  Найдите параметр времени{' '}
                  <span className="font-mono font-bold">t</span> для{' '}
                  <span className="font-bold text-[#1D4ED8]">
                    {challenge.targetYear} года
                  </span>
                  .
                </>
              )}
            </p>
          )}

          {challenge.kind === 'find_year' && (
            <p className="text-base sm:text-lg font-medium text-[#0F172A] leading-relaxed tabular-nums">
              Дана динамика показателя за период{' '}
              <span className="font-mono font-bold">
                {challenge.startYear}–{challenge.endYear} гг.
              </span>{' '}
              Какому году соответствует параметр времени{' '}
              <span className="font-mono font-bold text-[#1D4ED8]">
                t = {formatSigned(challenge.targetT!)}
              </span>
              ?
            </p>
          )}

          {challenge.kind === 'fill_series' && (
            <p className="text-base sm:text-lg font-medium text-[#0F172A] leading-relaxed">
              Укажите центрированный параметр времени{' '}
              <span className="font-mono font-bold">t</span> для каждого года
              временного ряда:
            </p>
          )}
        </div>

        {/* Inputs */}
        {challenge.kind === 'fill_series' ? (
          <div className="overflow-x-auto">
            <div className="inline-grid auto-cols-fr grid-flow-col gap-2 min-w-full sm:min-w-0">
              {challenge.years.map((year, idx) => {
                const expected = challenge.expectedSeries?.[idx];
                const parsed = parseIntegerInput(seriesInputs[idx] || '');
                const cellState =
                  result && !result.isValidationError
                    ? parsed === expected
                      ? 'border-[#16A34A] bg-[#F0FDF4]'
                      : 'border-[#DC2626] bg-[#FEF2F2]'
                    : 'border-[#CBD5E1] bg-white';
                return (
                  <div
                    key={year}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                  >
                    <span className="text-xs font-mono font-bold text-[#0F172A] tabular-nums">
                      {year}
                    </span>
                    <input
                      ref={idx === 0 ? firstSeriesInputRef : undefined}
                      type="text"
                      inputMode="text"
                      value={seriesInputs[idx] || ''}
                      disabled={result !== null && !result.isValidationError}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSeriesInputs((prev) =>
                          prev.map((x, i) => (i === idx ? val : x))
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCheck();
                      }}
                      placeholder="t"
                      aria-label={`Параметр t для ${year} года`}
                      className={`w-16 text-center px-2 py-1.5 rounded-md border text-sm font-mono font-semibold text-[#0F172A] focus:outline-none focus:border-[#1D4ED8] tabular-nums ${cellState}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="time-param-input"
              className="text-sm font-semibold text-[#334155]"
            >
              {challenge.kind === 'find_year' ? 'Год =' : 't ='}
            </label>
            <input
              id="time-param-input"
              ref={singleInputRef}
              type="text"
              inputMode="text"
              value={singleInput}
              disabled={result !== null && !result.isValidationError}
              onChange={(e) => setSingleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCheck();
              }}
              placeholder={
                challenge.kind === 'find_year' ? 'Например: 2024' : 'Число'
              }
              className="w-44 px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-base font-mono font-semibold text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#1D4ED8] tabular-nums"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {result === null || result.isValidationError ? (
            <button
              type="button"
              onClick={handleCheck}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#1D4ED8] text-white hover:bg-[#1E40AF] transition-colors cursor-pointer"
            >
              Проверить
            </button>
          ) : (
            <button
              type="button"
              onClick={() => loadNext()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#1D4ED8] text-white hover:bg-[#1E40AF] transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Следующая задача</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadNext()}
            className="px-3.5 py-2.5 rounded-lg text-xs font-medium bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          >
            Пропустить
          </button>

          <span className="text-xs text-[#94A3B8] hidden sm:inline">
            Enter — проверить / дальше
          </span>
        </div>

        {/* Result Banner (ONLY after submission) */}
        {result && (
          <div className="space-y-3">
            <div
              className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 text-sm ${
                result.isCorrect
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#065F46]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {result.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                )}
                <span className="font-medium tabular-nums">
                  {result.message}
                </span>
              </div>

              {!result.isValidationError && (
                  <button
                    type="button"
                    onClick={() => setShowBreakdown((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-semibold underline shrink-0 cursor-pointer"
                  >
                    <span>
                      {showBreakdown ? 'Скрыть расклад' : 'Расклад по годам'}
                    </span>
                    {showBreakdown ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
            </div>

            {showBreakdown && (
              <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
                <div className="text-xs text-[#475569]">
                  В ряду{' '}
                  <strong className="text-[#0F172A]">
                    {challenge.years.length}
                  </strong>{' '}
                  {challenge.years.length >= 5
                    ? 'лет'
                    : 'года'}{' '}
                  ({challenge.isEven ? 'чётное → шаг 2' : 'нечётное → шаг 1'}):
                </div>
                <div className="flex flex-wrap gap-1.5 tabular-nums">
                  {breakdownRows.map((row) => (
                    <div
                      key={row.year}
                      className={`px-2.5 py-1.5 rounded-md border text-xs font-mono ${
                        row.isTarget
                          ? 'bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8] font-bold'
                          : row.year > challenge.endYear
                          ? 'bg-white border-dashed border-[#CBD5E1] text-[#334155]'
                          : 'bg-white border-[#E2E8F0] text-[#334155]'
                      }`}
                    >
                      {row.year}: {formatSigned(row.t)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
