import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import { CHI2_TABLE, DF_DRILL_EXERCISES } from '../data/nasledovData';
import { MistakeItem, TrainerProgressState } from '../types/stats';
import { MathFormula } from './MathFormula';
import { RichTermText } from './RichTermText';

interface DfChi2LabProps {
  progress: TrainerProgressState;
  onOpenTerm: (termKey: string) => void;
  onDfDrillResult: (
    drillId: string,
    isCorrect: boolean,
    mistake?: Omit<MistakeItem, 'id' | 'createdAt'>
  ) => void;
}

export const DfChi2Lab: React.FC<DfChi2LabProps> = ({
  progress,
  onOpenTerm,
  onDfDrillResult,
}) => {
  const [mode, setMode] = useState<'norm' | 'cont'>('norm');
  const [k, setK] = useState(6);
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(4);
  const [empChi2, setEmpChi2] = useState(8.74);
  const [alpha, setAlpha] = useState<'0.05' | '0.01'>('0.05');

  const [drillDfInputs, setDrillDfInputs] = useState<Record<string, string>>({});
  const [drillConclusionInputs, setDrillConclusionInputs] = useState<
    Record<string, string>
  >({});
  const [drillFeedback, setDrillFeedback] = useState<
    Record<string, { ok: boolean; text: string }>
  >({});

  const df = useMemo(() => {
    const raw = mode === 'norm' ? k - 3 : (rows - 1) * (cols - 1);
    return Math.max(1, Math.min(15, raw));
  }, [mode, k, rows, cols]);

  const chiRow = useMemo(() => {
    return CHI2_TABLE.find((r) => r.df === df) || CHI2_TABLE[CHI2_TABLE.length - 1];
  }, [df]);

  const critVal = alpha === '0.05' ? chiRow.p05 : chiRow.p01;
  const isBelowCrit = empChi2 < critVal;

  // Build SVG path for a representative chi-square-like right-skewed curve
  const curveSvg = useMemo(() => {
    const width = 420;
    const height = 140;
    const maxVal = Math.max(critVal * 1.45, empChi2 * 1.15, 16);
    const toX = (v: number) => 20 + (Math.min(v, maxVal) / maxVal) * (width - 40);

    // Approximate unimodal chi-square shape peaked near max(0.5, df - 1.5)
    const peak = Math.max(0.8, df * 0.75);
    const points: { x: number; y: number; val: number }[] = [];
    const steps = 60;
    let maxDensity = 0.0001;
    const densities: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const val = (i / steps) * maxVal;
      const d =
        val <= 0.05
          ? 0
          : Math.pow(val, Math.min(df / 2 - 0.5, 4.5)) *
            Math.exp(-val / Math.max(1.5, peak / 2.2));
      densities.push(d);
      if (d > maxDensity) maxDensity = d;
    }

    for (let i = 0; i <= steps; i++) {
      const val = (i / steps) * maxVal;
      const normY = densities[i] / maxDensity;
      points.push({
        x: toX(val),
        y: height - 22 - normY * (height - 42),
        val,
      });
    }

    const linePath = points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const critX = toX(critVal);
    const empX = toX(empChi2);

    // Rejection shaded area (>= critVal)
    const rejectPts = points.filter((p) => p.val >= critVal);
    let rejectPath = '';
    if (rejectPts.length > 0) {
      rejectPath =
        `M ${critX.toFixed(1)} ${height - 22} ` +
        rejectPts.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
        ` L ${rejectPts[rejectPts.length - 1].x.toFixed(1)} ${height - 22} Z`;
    }

    return { width, height, linePath, rejectPath, critX, empX };
  }, [df, critVal, empChi2]);

  const handleCheckDrill = (idx: number) => {
    const ex = DF_DRILL_EXERCISES[idx];
    const enteredDf = parseInt(drillDfInputs[ex.id] || '', 10);
    const chosenConclusion = drillConclusionInputs[ex.id] || '';

    const dfOk = enteredDf === ex.correct_df;
    const concOk = !chosenConclusion || chosenConclusion === ex.conclusion;

    if (dfOk && chosenConclusion === ex.conclusion) {
      setDrillFeedback((prev) => ({
        ...prev,
        [ex.id]: { ok: true, text: `Верно! ${ex.explain}` },
      }));
      onDfDrillResult(ex.id, true);
    } else if (dfOk && !chosenConclusion) {
      setDrillFeedback((prev) => ({
        ...prev,
        [ex.id]: {
          ok: false,
          text: `Число df = ${ex.correct_df} верное! Теперь выберите итоговый статистический вывод ниже.`,
        },
      }));
    } else {
      setDrillFeedback((prev) => ({
        ...prev,
        [ex.id]: {
          ok: false,
          text: !dfOk
            ? `Пока неверно по df (${ex.type === 'normality' ? 'используйте df = k − 3' : 'используйте df = (r−1)(c−1)'}). Подсказка: ${ex.explain}`
            : `df = ${ex.correct_df} верное, но вывод неверный! ${ex.explain}`,
        },
      }));
      onDfDrillResult(ex.id, false, {
        kind: 'df',
        sourceLabel: `Лаборатория df · Кейс #${idx + 1}`,
        title: `Степени свободы (${ex.k_or_rc})`,
        prompt: ex.scenario,
        correctAnswer: `df = ${ex.correct_df} (${ex.conclusion})`,
        hint: ex.explain,
      });
    }
    void concOk;
  };

  return (
    <div className="space-y-6">
      {/* Intro comparison of the two df formulas */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] mb-1">
            <FlaskConical className="w-4 h-4" />
            <span>Интерактивная лаборатория · Приложение 4</span>
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">
            Степени свободы (df) и критерий χ² Пирсона
          </h2>
          <p className="text-sm text-[#475569] mt-1">
            По учебнику А. Д. Наследова{' '}
            <RichTermText
              text="[[степени свободы|степени свободы (df)]]"
              onOpenTerm={onOpenTerm}
            />{' '}
            — это количество свободно варьирующих элементов ряда за вычетом
            числа наложенных линейных связей. На экзамене нельзя путать две
            разные формулы:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
              Случай А · Проверка нормальности (Задание №4)
            </div>
            <div className="text-lg font-bold text-[#0F172A]">
              <MathFormula tex="df = k - 3" />
            </div>
            <p className="text-xs leading-relaxed text-[#475569]">
              где <MathFormula tex="k" /> — число интервалов. Вычитаем{' '}
              <strong>3</strong>, потому что по самой выборке зафиксированы 3
              параметра: объём выборки (<MathFormula tex="n" />), среднее (
              <MathFormula tex="\bar{x}" />) и стандартное отклонение (
              <MathFormula tex="\sigma" />).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
              Случай Б · Таблица сопряжённости r×c (Задание №6)
            </div>
            <div className="text-lg font-bold text-[#0F172A]">
              <MathFormula tex="df = (r - 1) \cdot (c - 1)" />
            </div>
            <p className="text-xs leading-relaxed text-[#475569]">
              где <MathFormula tex="r" /> — число строк,{' '}
              <MathFormula tex="c" /> — число столбцов. Например, для таблицы{' '}
              <MathFormula tex="4 \times 4" /> в Варианте 1:{' '}
              <MathFormula tex="df = 3 \times 3 = 9" />.
            </p>
          </div>
        </div>
      </div>

      {/* Two-Zone Sandbox Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Zone (60% / 7 cols): Interactive Visual Stage */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-bold text-[#0F172A]">
              {mode === 'norm'
                ? `Модель интервального ряда (k = ${k} → свободны ${k - 3})`
                : `Модель таблицы сопряжённости (${rows} × ${cols} → свободны ${(rows - 1) * (cols - 1)})`}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setMode('norm');
                  setK(6);
                  setEmpChi2(8.74);
                }}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] transition-colors cursor-pointer"
              >
                Пресет В1 (№4)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('norm');
                  setK(14);
                  setEmpChi2(6.27);
                }}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#F0F9FF] text-[#0369A1] hover:bg-[#E0F2FE] transition-colors cursor-pointer"
              >
                Пресет В3 (№4)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('cont');
                  setRows(4);
                  setCols(4);
                  setEmpChi2(22.5);
                }}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0] transition-colors cursor-pointer"
              >
                Пресет 4×4 (№6)
              </button>
            </div>
          </div>

          {/* Degrees of freedom structural visual */}
          {mode === 'norm' ? (
            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
              <div className="text-xs font-medium text-[#475569]">
                Визуализация связей: синие интервалы варьируют свободно, серые
                однозначно заданы оценками (n, x̄, σ)
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
                {Array.from({ length: k }).map((_, idx) => {
                  const isLocked = idx >= k - 3;
                  const lockLabels = ['n', 'x̄', 'σ'];
                  const lockLabel = isLocked
                    ? lockLabels[idx - (k - 3)]
                    : `#${idx + 1}`;
                  return (
                    <div
                      key={idx}
                      className={`h-11 rounded-md border flex flex-col items-center justify-center font-mono text-xs tabular-nums ${
                        isLocked
                          ? 'bg-[#E2E8F0] border-[#CBD5E1] text-[#475569]'
                          : 'bg-[#DBEAFE] border-[#93C5FD] text-[#1E3A8A] font-semibold'
                      }`}
                    >
                      <span>{lockLabel}</span>
                      <span className="text-[10px] opacity-80">
                        {isLocked ? 'связь' : 'своб.'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
              <div className="text-xs font-medium text-[#475569]">
                Матрица {rows}×{cols}: синие ячейки заполняются свободно,
                последние строка и столбец жёстко фиксируются суммами
              </div>
              <div
                className="grid gap-1.5 max-w-md"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: rows * cols }).map((_, idx) => {
                  const rIdx = Math.floor(idx / cols);
                  const cIdx = idx % cols;
                  const isFixed = rIdx === rows - 1 || cIdx === cols - 1;
                  return (
                    <div
                      key={idx}
                      className={`h-9 rounded border flex items-center justify-center font-mono text-xs tabular-nums ${
                        isFixed
                          ? 'bg-[#E2E8F0] border-[#CBD5E1] text-[#64748B]'
                          : 'bg-[#DBEAFE] border-[#93C5FD] text-[#1E3A8A] font-semibold'
                      }`}
                    >
                      {isFixed ? 'фикс' : `${rIdx + 1},${cIdx + 1}`}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chi2 Distribution SVG */}
          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[#0F172A]">
                Кривая распределения χ² при df = {df}
              </span>
              <span className="font-mono text-[#475569] tabular-nums">
                χ²_табл = {critVal.toFixed(2).replace('.', ',')} · χ²_эмп ={' '}
                {empChi2.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <svg
              viewBox={`0 0 ${curveSvg.width} ${curveSvg.height}`}
              className="w-full h-36 overflow-visible"
              aria-label="График критической области хи-квадрат"
            >
              {/* Baseline */}
              <line
                x1="20"
                y1={curveSvg.height - 22}
                x2={curveSvg.width - 20}
                y2={curveSvg.height - 22}
                stroke="#CBD5E1"
                strokeWidth="1.5"
              />
              {/* Rejection shaded region */}
              {curveSvg.rejectPath && (
                <path d={curveSvg.rejectPath} fill="#FECACA" opacity="0.7" />
              )}
              {/* Main curve */}
              <path
                d={curveSvg.linePath}
                fill="none"
                stroke="#1D4ED8"
                strokeWidth="2.2"
              />
              {/* Critical threshold vertical line */}
              <line
                x1={curveSvg.critX}
                y1="14"
                x2={curveSvg.critX}
                y2={curveSvg.height - 22}
                stroke="#D97706"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              <text
                x={curveSvg.critX}
                y="11"
                textAnchor="middle"
                className="fill-[#B45309] font-mono text-[10px] font-semibold"
              >
                χ²_табл={critVal}
              </text>
              {/* Empirical marker */}
              <line
                x1={curveSvg.empX}
                y1="26"
                x2={curveSvg.empX}
                y2={curveSvg.height - 22}
                stroke={isBelowCrit ? '#059669' : '#DC2626'}
                strokeWidth="2.5"
              />
              <circle
                cx={curveSvg.empX}
                cy={curveSvg.height - 22}
                r="4.5"
                fill={isBelowCrit ? '#059669' : '#DC2626'}
              />
              <text
                x={curveSvg.empX}
                y={curveSvg.height - 6}
                textAnchor="middle"
                className={`font-mono text-[10px] font-bold ${
                  isBelowCrit ? 'fill-[#059669]' : 'fill-[#DC2626]'
                }`}
              >
                χ²_эмп={empChi2}
              </text>
            </svg>
          </div>
        </div>

        {/* Right Zone (40% / 5 cols): Controls & Live Verdict */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
            <SlidersHorizontal className="w-4 h-4 text-[#1D4ED8]" />
            <span>Параметры симулятора</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">
                Тип статистической задачи
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'norm' | 'cont')}
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="norm">
                  Задание №4: Проверка нормальности (df = k − 3)
                </option>
                <option value="cont">
                  Задание №6: Таблица сопряжённости (df = (r−1)(c−1))
                </option>
              </select>
            </div>

            {mode === 'norm' ? (
              <div>
                <div className="flex justify-between text-xs font-medium text-[#334155] mb-1 tabular-nums">
                  <span>Число интервалов (k)</span>
                  <span className="font-mono font-bold">{k} интерв.</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={15}
                  value={k}
                  onChange={(e) => setK(Number(e.target.value))}
                  className="w-full accent-[#1D4ED8] cursor-pointer"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-xs font-medium text-[#334155] mb-1 tabular-nums">
                    <span>Строк (r)</span>
                    <span className="font-mono font-bold">{rows}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={6}
                    value={rows}
                    onChange={(e) => setRows(Number(e.target.value))}
                    className="w-full accent-[#0284C7] cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium text-[#334155] mb-1 tabular-nums">
                    <span>Столбцов (c)</span>
                    <span className="font-mono font-bold">{cols}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={6}
                    value={cols}
                    onChange={(e) => setCols(Number(e.target.value))}
                    className="w-full accent-[#0284C7] cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">
                  Эмпирический χ²
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="50"
                  value={empChi2}
                  onChange={(e) =>
                    setEmpChi2(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-full px-3 py-1.5 text-sm font-mono bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">
                  Уровень значимости
                </label>
                <select
                  value={alpha}
                  onChange={(e) => setAlpha(e.target.value as '0.05' | '0.01')}
                  className="w-full px-3 py-1.5 text-sm font-mono bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg tabular-nums"
                >
                  <option value="0.05">p = 0,05 (стандарт)</option>
                  <option value="0.01">p = 0,01 (строгий)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Calculation Result Box */}
          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-xs">
            <div className="font-bold text-sm text-[#1D4ED8]">
              <MathFormula
                tex={
                  mode === 'norm'
                    ? `df = ${k} - 3 = ${df}`
                    : `df = (${rows} - 1)(${cols} - 1) = ${df}`
                }
              />
            </div>
            <div className="text-[#334155] tabular-nums">
              Табличный порог (Приложение 4, <MathFormula tex={`p = ${alpha.replace('.', '{,}')}`} />):{' '}
              <strong className="font-mono">{critVal}</strong>
            </div>
            <div
              className={`p-3 rounded-lg border flex items-start gap-2 ${
                mode === 'norm'
                  ? isBelowCrit
                    ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#166534]'
                    : 'bg-[#FEE2E2] border-[#FCA5A5] text-[#991B1B]'
                  : isBelowCrit
                  ? 'bg-[#F1F5F9] border-[#CBD5E1] text-[#334155]'
                  : 'bg-[#DCFCE7] border-[#86EFAC] text-[#166534]'
              }`}
            >
              {mode === 'norm' ? (
                isBelowCrit ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )
              ) : isBelowCrit ? (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed font-medium">
                {mode === 'norm'
                  ? isBelowCrit
                    ? `● НОРМАЛЬНОСТЬ ПОДТВЕРЖДЕНА: ${empChi2} < ${critVal} (расхождения случайны, как в Варианте 3).`
                    : `▲ ОТКЛОНЕНИЕ ОТ НОРМЫ: ${empChi2} > ${critVal} — распределение НЕ соответствует нормальному закону (как в Варианте 1).`
                  : isBelowCrit
                  ? `○ НЕЗАВИСИМОСТЬ СОХРАНЯЕТСЯ: ${empChi2} < ${critVal} — статистически значимая связь не доказана.`
                  : `● СВЯЗЬ ЗНАЧИМА: ${empChi2} > ${critVal} — признаки связаны (как в таблице 4×4 Варианта 1).`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Practical Drills */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-[#0F172A]">
            Практический тренажёр по степеням свободы (5 ситуаций)
          </h3>
          <span className="text-xs font-mono text-[#64748B] tabular-nums">
            Решено:{' '}
            {
              DF_DRILL_EXERCISES.filter((d) => progress.solvedDfDrills[d.id])
                .length
            }{' '}
            / {DF_DRILL_EXERCISES.length}
          </span>
        </div>

        <div className="space-y-3">
          {DF_DRILL_EXERCISES.map((ex, idx) => {
            const fb = drillFeedback[ex.id];
            const solved = Boolean(progress.solvedDfDrills[ex.id]);
            return (
              <div
                key={ex.id}
                className={`p-4 rounded-lg border space-y-2.5 ${
                  solved
                    ? 'bg-[#F0FDF4]/50 border-[#BBF7D0]'
                    : 'bg-[#F8FAFC] border-[#E2E8F0]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#1D4ED8]">
                  <span>
                    Кейс #{idx + 1} · {ex.k_or_rc}
                  </span>
                  {solved && (
                    <span className="inline-flex items-center gap-1 text-[#059669]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Зачтено</span>
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#1E293B] leading-relaxed">
                  <RichTermText text={ex.scenario} onOpenTerm={onOpenTerm} />
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    value={drillDfInputs[ex.id] || ''}
                    onChange={(e) =>
                      setDrillDfInputs((prev) => ({
                        ...prev,
                        [ex.id]: e.target.value,
                      }))
                    }
                    placeholder="Число df..."
                    className="w-32 px-3 py-1.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg tabular-nums"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {ex.conclusionOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setDrillConclusionInputs((prev) => ({
                            ...prev,
                            [ex.id]: opt,
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          drillConclusionInputs[ex.id] === opt
                            ? 'bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8]'
                            : 'bg-white border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCheckDrill(idx)}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#1D4ED8] text-white hover:bg-[#1E40AF] transition-colors cursor-pointer"
                  >
                    Проверить df и вывод
                  </button>
                </div>
                {fb && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                      fb.ok
                        ? 'bg-[#DCFCE7] border border-[#86EFAC] text-[#166534]'
                        : 'bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B]'
                    }`}
                  >
                    {fb.ok ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">
                      <RichTermText text={fb.text} onOpenTerm={onOpenTerm} />
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Appendix 4 Chi2 Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3 overflow-x-auto">
        <div>
          <h3 className="text-lg font-bold text-[#0F172A]">
            Таблица критических значений χ² Пирсона (Приложение 4 учебника
            Наследова)
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Нажмите на любую строку таблицы, чтобы загрузить это число df в
            симулятор выше.
          </p>
        </div>
        <table className="w-full text-sm border-collapse tabular-nums">
          <thead>
            <tr className="bg-[#F8FAFC] border-y border-[#E2E8F0] text-xs font-semibold text-[#475569]">
              <th className="py-2.5 px-3 text-left">Степени свободы (df)</th>
              <th className="py-2.5 px-3 text-right">p = 0,05 (стандарт)</th>
              <th className="py-2.5 px-3 text-right">p = 0,01 (строгий)</th>
              <th className="py-2.5 px-3 text-left">
                Где встречается на экзамене
              </th>
            </tr>
          </thead>
          <tbody>
            {CHI2_TABLE.map((row) => {
              const isSelected = row.df === df;
              const isExamKey = row.df === 3 || row.df === 9 || row.df === 11;
              return (
                <tr
                  key={row.df}
                  onClick={() => {
                    if (mode === 'norm') setK(row.df + 3);
                  }}
                  className={`border-b border-[#E2E8F0] transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#EFF6FF] font-semibold text-[#1E3A8A]'
                      : isExamKey
                      ? 'bg-[#FFFBEB]/60 hover:bg-[#FEF3C7]/60'
                      : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  <td className="py-2 px-3 font-mono">df = {row.df}</td>
                  <td className="py-2 px-3 text-right font-mono font-semibold">
                    {row.p05.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">
                    {row.p01.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="py-2 px-3 text-xs text-[#475569]">
                    {row.note}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
