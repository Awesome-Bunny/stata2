import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Dices,
  Layers,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { getLocalDateKey } from '../hooks/useTrainerProgress';
import { AppTab, TrainerProgressState } from '../types/stats';

interface ProgressAnalyticsViewProps {
  progress: TrainerProgressState;
  onNavigateTab: (tab: AppTab) => void;
  onOpenGeneratedTicket?: (ticketId: string, targetTab: 'trainer' | 'direct') => void;
  onCreateNewGeneratedTicket?: (targetTab: 'trainer' | 'direct') => void;
}

interface DailyChartDatum {
  dateKey: string;
  label: string;
  solved: number;
  attempts: number;
  correct: number;
  accuracy: number | null;
}

function buildDateWindow(
  dailyStats: TrainerProgressState['dailyStats'],
  daysCount: number
): DailyChartDatum[] {
  const result: DailyChartDatum[] = [];
  const now = new Date();

  for (let offset = daysCount - 1; offset >= 0; offset--) {
    const d = new Date(now);
    d.setDate(now.getDate() - offset);
    const key = getLocalDateKey(d.getTime());
    const entry = dailyStats[key];
    const attempts = entry?.attempts || 0;
    const correct = entry?.correct || 0;
    const solved = entry?.solved || 0;
    const accuracy =
      attempts > 0 ? Math.round((correct / attempts) * 100) : null;

    result.push({
      dateKey: key,
      label: d.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
      }),
      solved,
      attempts,
      correct,
      accuracy,
    });
  }

  return result;
}

export const ProgressAnalyticsView: React.FC<ProgressAnalyticsViewProps> = ({
  progress,
  onNavigateTab,
  onOpenGeneratedTicket,
  onCreateNewGeneratedTicket,
}) => {
  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(14);

  const dailyData = useMemo(
    () => buildDateWindow(progress.dailyStats, windowDays),
    [progress.dailyStats, windowDays]
  );

  const todayKey = getLocalDateKey();
  const todayStats = progress.dailyStats[todayKey] || {
    solved: 0,
    attempts: 0,
    correct: 0,
  };

  const totals = useMemo(() => {
    const entries = Object.values(progress.dailyStats);
    const totalAttempts = entries.reduce((sum, e) => sum + e.attempts, 0);
    const totalCorrect = entries.reduce((sum, e) => sum + e.correct, 0);
    const totalSolved = entries.reduce((sum, e) => sum + e.solved, 0);
    const overallAccuracy =
      totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    const activeDays = entries.filter((e) => e.attempts > 0).length;

    const avgExamPct =
      progress.examHistory.length > 0
        ? Math.round(
            progress.examHistory.reduce(
              (acc, ex) =>
                acc + (ex.earnedPoints / Math.max(1, ex.maxPoints)) * 100,
              0
            ) / progress.examHistory.length
          )
        : null;

    return {
      totalAttempts,
      totalCorrect,
      totalSolved,
      overallAccuracy,
      activeDays,
      avgExamPct,
    };
  }, [progress.dailyStats, progress.examHistory]);

  const moduleBreakdown = useMemo(() => {
    const rows = [
      {
        key: 'steps',
        name: 'Шаги №1–9',
        color: '#1D4ED8',
        stats: progress.moduleStats.steps,
      },
      {
        key: 'direct',
        name: 'Без шагов',
        color: '#7C3AED',
        stats: progress.moduleStats.direct,
      },
      {
        key: 'tests',
        name: 'Тесты №10–13',
        color: '#0284C7',
        stats: progress.moduleStats.tests,
      },
      {
        key: 'df',
        name: 'Лаборатория df',
        color: '#059669',
        stats: progress.moduleStats.df,
      },
      {
        key: 'exam',
        name: 'Экзамены',
        color: '#D97706',
        stats: progress.moduleStats.exam,
      },
      {
        key: 'generated',
        name: 'Генератор',
        color: '#0D9488',
        stats: progress.moduleStats.generated || { attempts: 0, correct: 0 },
      },
    ];

    return rows.map((r) => {
      const accuracy =
        r.stats.attempts > 0
          ? Math.round((r.stats.correct / r.stats.attempts) * 100)
          : 0;
      return {
        name: r.name,
        color: r.color,
        accuracy,
        attempts: r.stats.attempts,
        correct: r.stats.correct,
      };
    });
  }, [progress.moduleStats]);

  const savedTicketsSummary = useMemo(() => {
    return progress.savedGeneratedTickets.map((ticket) => {
      const solvedCalcCount = ticket.tasks.filter((task) => {
        const solvedBySteps = task.steps.every((s) =>
          Boolean(progress.solvedSteps[s.id])
        );
        const solvedDirect = Boolean(progress.solvedDirect[task.id]);
        return solvedBySteps || solvedDirect;
      }).length;

      const solvedTestsCount = ticket.tests.filter((q) => {
        const testKey = q.id.startsWith('gen_')
          ? q.id
          : `${ticket.seedLabel}_${q.id}`;
        return Boolean(progress.answeredTests[testKey]?.isCorrect);
      }).length;

      const linkedExam = progress.examHistory.find(
        (ex) => ex.generatedTicketId === ticket.id
      );

      const solvedTotalInTicket = solvedCalcCount + solvedTestsCount;
      const totalInTicket = ticket.tasks.length + ticket.tests.length;
      const completionPct =
        totalInTicket > 0
          ? Math.round((solvedTotalInTicket / totalInTicket) * 100)
          : 0;

      return {
        ticket,
        solvedCalcCount,
        solvedTestsCount,
        solvedTotalInTicket,
        totalInTicket,
        completionPct,
        linkedExam,
      };
    });
  }, [
    progress.savedGeneratedTickets,
    progress.solvedSteps,
    progress.solvedDirect,
    progress.answeredTests,
    progress.examHistory,
  ]);

  const examTrendData = useMemo(() => {
    return [...progress.examHistory]
      .reverse()
      .map((ex, idx) => ({
        name: `#${idx + 1}`,
        date: new Date(ex.timestamp).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
        }),
        variant: ex.variantLabel,
        scorePct: Math.round(
          (ex.earnedPoints / Math.max(1, ex.maxPoints)) * 100
        ),
        earned: ex.earnedPoints,
        max: ex.maxPoints,
      }));
  }, [progress.examHistory]);

  const hasAnyActivity = totals.totalAttempts > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Аналитика подготовки · Recharts</span>
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">
            Прогресс по дням и точность решений
          </h2>
          <p className="text-sm text-[#475569] mt-1">
            Статистика обновляется в реальном времени при проверке каждого шага
            заданий №1–9, тестовых вопросов №10–13, кейсов df и пробных
            экзаменов.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {([7, 14, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setWindowDays(days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer tabular-nums ${
                windowDays === days
                  ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                  : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:bg-[#F1F5F9]'
              }`}
            >
              {days} дней
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Всего решено задач</span>
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] tabular-nums">
            {totals.totalSolved}
          </div>
          <div className="text-xs text-[#64748B] tabular-nums">
            Активных дней: {totals.activeDays}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Точность ответов</span>
            <Target className="w-4 h-4 text-[#1D4ED8]" />
          </div>
          <div className="text-2xl font-bold text-[#1D4ED8] tabular-nums">
            {hasAnyActivity ? `${totals.overallAccuracy}%` : '—'}
          </div>
          <div className="text-xs text-[#64748B] tabular-nums">
            {totals.totalCorrect} верных из {totals.totalAttempts} попыток
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Решено сегодня</span>
            <TrendingUp className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] tabular-nums">
            {todayStats.solved}
          </div>
          <div className="text-xs text-[#64748B] tabular-nums">
            {todayStats.attempts > 0
              ? `Точность сегодня: ${Math.round((todayStats.correct / todayStats.attempts) * 100)}%`
              : 'Сегодня ещё не было попыток'}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Средний итог экзамена</span>
            <Award className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] tabular-nums">
            {totals.avgExamPct !== null ? `${totals.avgExamPct}%` : '—'}
          </div>
          <div className="text-xs text-[#64748B] tabular-nums">
            Сдано попыток: {progress.examHistory.length}
          </div>
        </div>
      </div>

      {/* Empty activity callout (non-blocking, chart stays rendered underneath) */}
      {!hasAnyActivity && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-[#1E3A8A]">
              Пока нет записанных попыток — начните с любого задания
            </div>
            <p className="text-xs text-[#1E40AF]">
              Как только вы проверите первый шаг в тренажёре или ответите на
              тестовый вопрос, на графиках появятся столбцы и линия точности.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('trainer')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#1D4ED8] text-white hover:bg-[#1E40AF] transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>К заданиям №1–9</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('exam')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-[#93C5FD] text-[#1D4ED8] hover:bg-[#DBEAFE] transition-colors cursor-pointer"
            >
              <Timer className="w-3.5 h-3.5" />
              <span>К экзамену</span>
            </button>
          </div>
        </div>
      )}

      {/* Main ComposedChart: Solved tasks per day + Accuracy % */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Количество решённых задач по дням и процент правильных ответов
            </h3>
            <p className="text-xs text-[#64748B]">
              Столбцы — количество впервые решённых задач за день (левая шкала);
              линия — точность ответов в % (правая шкала).
            </p>
          </div>
        </div>

        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={dailyData}
              margin={{ top: 12, right: 16, left: -12, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#475569' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 12, fill: '#059669' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const row = payload[0].payload as DailyChartDatum;
                  return (
                    <div className="bg-white border border-[#CBD5E1] rounded-lg shadow-md px-3.5 py-2.5 text-xs space-y-1 tabular-nums">
                      <div className="font-bold text-[#0F172A]">
                        Дата: {row.label} ({row.dateKey})
                      </div>
                      <div className="text-[#1D4ED8] font-medium">
                        Решено задач: <strong>{row.solved}</strong>
                      </div>
                      <div className="text-[#475569]">
                        Всего попыток: {row.attempts} (верно: {row.correct})
                      </div>
                      <div className="text-[#059669] font-semibold">
                        Точность:{' '}
                        {row.accuracy !== null ? `${row.accuracy}%` : 'нет данных'}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              />
              <Bar
                yAxisId="left"
                dataKey="solved"
                name="Решённых задач"
                fill="#1D4ED8"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="accuracy"
                name="Правильных ответов (%)"
                stroke="#059669"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#FFFFFF' }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom 2-column analytics grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Accuracy by module */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Точность по разделам тренажёра (%)
            </h3>
            <p className="text-xs text-[#64748B]">
              Доля верных ответов с первой/повторной проверки в каждом модуле
            </p>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={moduleBreakdown}
                margin={{ top: 10, right: 16, left: -12, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 12, fill: '#475569' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const item = payload[0].payload as (typeof moduleBreakdown)[number];
                    return (
                      <div className="bg-white border border-[#CBD5E1] rounded-lg shadow-md px-3 py-2 text-xs space-y-0.5 tabular-nums">
                        <div className="font-bold text-[#0F172A]">{item.name}</div>
                        <div className="text-[#1D4ED8] font-semibold">
                          Точность: {item.attempts > 0 ? `${item.accuracy}%` : '—'}
                        </div>
                        <div className="text-[#475569]">
                          Верно {item.correct} из {item.attempts} попыток
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="accuracy"
                  name="Точность (%)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                >
                  {moduleBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Exam attempts score trend */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Динамика результатов пробных экзаменов (%)
              </h3>
              <p className="text-xs text-[#64748B]">
                Процент набранных баллов от попытки к попытке
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('exam')}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] transition-colors shrink-0 cursor-pointer"
            >
              Новый экзамен
            </button>
          </div>

          {examTrendData.length === 0 ? (
            <div className="h-64 rounded-lg bg-[#F8FAFC] border border-dashed border-[#CBD5E1] flex flex-col items-center justify-center p-6 text-center space-y-2">
              <Timer className="w-7 h-7 text-[#64748B]" />
              <div className="text-sm font-semibold text-[#334155]">
                Экзамены на время ещё не сдавались
              </div>
              <p className="text-xs text-[#64748B] max-w-xs">
                Пройдите хотя бы один пробный билет во вкладке «Экзамен на
                время», чтобы увидеть кривую роста баллов.
              </p>
            </div>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={examTrendData}
                  margin={{ top: 10, right: 16, left: -12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#475569' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fontSize: 12, fill: '#475569' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0)
                        return null;
                      const item = payload[0].payload as (typeof examTrendData)[number];
                      return (
                        <div className="bg-white border border-[#CBD5E1] rounded-lg shadow-md px-3 py-2 text-xs space-y-0.5 tabular-nums">
                          <div className="font-bold text-[#0F172A]">
                            Попытка {item.name} ({item.date})
                          </div>
                          <div className="text-[#475569]">{item.variant}</div>
                          <div className="text-[#D97706] font-semibold">
                            Результат: {item.earned} / {item.max} баллов (
                            {item.scorePct}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="scorePct"
                    name="Балл (%)"
                    stroke="#D97706"
                    strokeWidth={2.5}
                    dot={{
                      r: 4,
                      fill: '#D97706',
                      strokeWidth: 2,
                      stroke: '#FFFFFF',
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Saved Generated Tickets Archive & Analytics */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0D9488] mb-1">
              <Dices className="w-4 h-4" />
              <span>Сохранённые сгенерированные билеты</span>
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">
              История и статистика по сгенерированным вариантам (
              {progress.savedGeneratedTickets.length})
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Все сгенерированные билеты автоматически сохраняются, а решённые
              задачи и тесты в них идут в общую и дневную статистику.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {(() => {
              const genStats = progress.moduleStats.generated || {
                attempts: 0,
                correct: 0,
              };
              const genAcc =
                genStats.attempts > 0
                  ? Math.round((genStats.correct / genStats.attempts) * 100)
                  : null;
              return (
                <div className="px-3 py-1.5 rounded-lg bg-[#F0FDFA] border border-[#99F6E4] text-xs font-semibold text-[#0F766E] tabular-nums">
                  Попыток в генераторе: {genStats.attempts}
                  {genAcc !== null ? ` · Точность ${genAcc}%` : ''}
                </div>
              );
            })()}
            {onCreateNewGeneratedTicket && (
              <button
                type="button"
                onClick={() => onCreateNewGeneratedTicket('direct')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1D4ED8] text-white hover:bg-[#1E40AF] transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Создать новый билет</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {savedTicketsSummary.map(
            ({
              ticket,
              solvedCalcCount,
              solvedTestsCount,
              solvedTotalInTicket,
              totalInTicket,
              completionPct,
              linkedExam,
            }) => {
              const isCurrent = ticket.id === progress.activeGeneratedTicketId;
              const originLabel =
                ticket.origin === 'exam'
                  ? 'Экзамен'
                  : ticket.origin === 'direct'
                  ? 'Без шагов'
                  : 'По шагам';

              return (
                <div
                  key={ticket.id}
                  className={`p-4 rounded-xl border space-y-3 transition-colors ${
                    isCurrent
                      ? 'bg-[#F8FAFC] border-[#93C5FD]'
                      : 'bg-white border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#0F172A]">
                          {ticket.seedLabel}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded bg-[#DBEAFE] text-[#1D4ED8] text-[10px] font-bold uppercase">
                            Активный
                          </span>
                        )}
                        <span className="text-[11px] text-[#64748B]">
                          {originLabel} · {ticket.generatedAt}
                        </span>
                      </div>
                      <div className="text-xs text-[#475569] mt-1 tabular-nums">
                        Задачи №1–9: <strong>{solvedCalcCount}</strong> /{' '}
                        {ticket.tasks.length} · Тесты №10–13:{' '}
                        <strong>{solvedTestsCount}</strong> /{' '}
                        {ticket.tests.length}
                      </div>
                      {linkedExam && (
                        <div className="text-xs text-[#D97706] font-semibold mt-0.5 tabular-nums">
                          Экзамен сдан: {linkedExam.earnedPoints} /{' '}
                          {linkedExam.maxPoints} баллов (
                          {Math.round(
                            (linkedExam.earnedPoints /
                              Math.max(1, linkedExam.maxPoints)) *
                              100
                          )}
                          %)
                        </div>
                      )}
                    </div>

                    <span className="text-sm font-bold text-[#059669] tabular-nums shrink-0">
                      {solvedTotalInTicket}/{totalInTicket}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#059669] transition-all duration-300"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>

                  {onOpenGeneratedTicket && (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenGeneratedTicket(ticket.id, 'trainer')
                        }
                        className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] transition-colors cursor-pointer"
                      >
                        Открыть «По шагам»
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenGeneratedTicket(ticket.id, 'direct')
                        }
                        className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#F5F3FF] text-[#6D28D9] hover:bg-[#EDE9FE] transition-colors cursor-pointer"
                      >
                        Открыть «Без шагов»
                      </button>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
};
