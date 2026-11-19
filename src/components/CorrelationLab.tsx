import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  GitBranch,
  Layers,
  RotateCcw,
  Shuffle,
  Sliders,
  Target,
  XCircle,
} from 'lucide-react';
import { MathFormula } from './MathFormula';
import { RichTermText } from './RichTermText';

type CorrelationLabMode = 'quadrants' | 'kendall' | 'ladder' | 'blitz';

interface CorrelationLabProps {
  onOpenTerm: (termKey: string) => void;
  onRecordAttempt?: (isCorrect: boolean) => void;
}

interface Point2D {
  id: number;
  x: number; // 0..100
  y: number; // 0..100
}

interface ScatterMission {
  id: string;
  title: string;
  goal: string;
  why: string;
  check: (stats: ScatterStats, points: Point2D[]) => boolean;
}

interface ScatterStats {
  n: number;
  meanX: number;
  meanY: number;
  r: number;
  r2Pct: number;
  slope: number;
  intercept: number;
  spearman: number;
  kendall: number;
  greenWeight: number;
  redWeight: number;
}

// ---------- MATH HELPERS ----------

function averageRanks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && Math.abs(indexed[j + 1].v - indexed[i].v) < 1e-9) {
      j++;
    }
    const avgRank = (i + 1 + (j + 1)) / 2;
    for (let k = i; k <= j; k++) {
      ranks[indexed[k].i] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

function pearsonOfArrays(xs: number[], ys: number[]): {
  r: number;
  meanX: number;
  meanY: number;
  slope: number;
  intercept: number;
  greenWeight: number;
  redWeight: number;
} {
  const n = xs.length;
  if (n < 2) {
    return {
      r: 0,
      meanX: 50,
      meanY: 50,
      slope: 0,
      intercept: 50,
      greenWeight: 0,
      redWeight: 0,
    };
  }
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  let greenWeight = 0;
  let redWeight = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    const prod = dx * dy;
    sxy += prod;
    if (prod >= 0) greenWeight += prod;
    else redWeight += Math.abs(prod);
  }

  const denom = Math.sqrt(sxx * syy);
  const r = denom > 1e-9 ? Math.max(-1, Math.min(1, sxy / denom)) : 0;
  const slope = sxx > 1e-9 ? sxy / sxx : 0;
  const intercept = meanY - slope * meanX;
  return { r, meanX, meanY, slope, intercept, greenWeight, redWeight };
}

function kendallTauOfArrays(xs: number[], ys: number[]): {
  tau: number;
  P: number;
  Q: number;
  totalPairs: number;
} {
  const n = xs.length;
  let P = 0;
  let Q = 0;
  let tx = 0;
  let ty = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = xs[i] - xs[j];
      const dy = ys[i] - ys[j];
      if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
        continue;
      } else if (Math.abs(dx) < 1e-9) {
        tx++;
      } else if (Math.abs(dy) < 1e-9) {
        ty++;
      } else if (dx * dy > 0) {
        P++;
      } else {
        Q++;
      }
    }
  }
  const denom = Math.sqrt((P + Q + tx) * (P + Q + ty));
  const tau = denom > 1e-9 ? (P - Q) / denom : 0;
  return { tau, P, Q, totalPairs: (n * (n - 1)) / 2 };
}

function computeScatterStats(points: Point2D[]): ScatterStats {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const pearson = pearsonOfArrays(xs, ys);
  const rx = averageRanks(xs);
  const ry = averageRanks(ys);
  const spearman = pearsonOfArrays(rx, ry).r;
  const kendall = kendallTauOfArrays(xs, ys).tau;

  return {
    n: points.length,
    meanX: pearson.meanX,
    meanY: pearson.meanY,
    r: pearson.r,
    r2Pct: Math.round(pearson.r * pearson.r * 100),
    slope: pearson.slope,
    intercept: pearson.intercept,
    spearman,
    kendall,
    greenWeight: pearson.greenWeight,
    redWeight: pearson.redWeight,
  };
}

function formatRuSigned(num: number, decimals = 2): string {
  const rounded = Number(num.toFixed(decimals));
  const safe = Math.abs(rounded) < 1e-6 ? 0 : rounded;
  const sign = safe > 0 ? '+' : '';
  return `${sign}${safe.toFixed(decimals).replace('.', ',')}`;
}

function formatRu(num: number, decimals = 2): string {
  const rounded = Number(num.toFixed(decimals));
  const safe = Math.abs(rounded) < 1e-6 ? 0 : rounded;
  return safe.toFixed(decimals).replace('.', ',');
}

// ---------- PRESETS FOR MODE 1 (PEARSON QUADRANTS) ----------

const SCATTER_PRESETS: Record<string, { label: string; points: Point2D[] }> = {
  direct: {
    label: 'Прямая связь',
    points: [
      { id: 1, x: 14, y: 18 },
      { id: 2, x: 22, y: 29 },
      { id: 3, x: 31, y: 34 },
      { id: 4, x: 38, y: 49 },
      { id: 5, x: 48, y: 51 },
      { id: 6, x: 58, y: 63 },
      { id: 7, x: 67, y: 69 },
      { id: 8, x: 76, y: 74 },
      { id: 9, x: 84, y: 86 },
      { id: 10, x: 91, y: 88 },
    ],
  },
  inverse: {
    label: 'Обратная связь',
    points: [
      { id: 1, x: 12, y: 86 },
      { id: 2, x: 20, y: 79 },
      { id: 3, x: 30, y: 71 },
      { id: 4, x: 40, y: 60 },
      { id: 5, x: 49, y: 54 },
      { id: 6, x: 57, y: 43 },
      { id: 7, x: 68, y: 37 },
      { id: 8, x: 77, y: 26 },
      { id: 9, x: 85, y: 20 },
      { id: 10, x: 92, y: 13 },
    ],
  },
  parabola: {
    label: 'Парабола (r ≈ 0!)',
    points: [
      { id: 1, x: 12, y: 86 },
      { id: 2, x: 20, y: 64 },
      { id: 3, x: 29, y: 44 },
      { id: 4, x: 38, y: 28 },
      { id: 5, x: 47, y: 18 },
      { id: 6, x: 54, y: 18 },
      { id: 7, x: 63, y: 28 },
      { id: 8, x: 72, y: 44 },
      { id: 9, x: 81, y: 64 },
      { id: 10, x: 89, y: 86 },
    ],
  },
  outlier: {
    label: 'Один выброс',
    points: [
      { id: 1, x: 12, y: 16 },
      { id: 2, x: 19, y: 24 },
      { id: 3, x: 26, y: 31 },
      { id: 4, x: 34, y: 40 },
      { id: 5, x: 41, y: 49 },
      { id: 6, x: 49, y: 58 },
      { id: 7, x: 56, y: 67 },
      { id: 8, x: 63, y: 75 },
      { id: 9, x: 70, y: 84 },
      { id: 10, x: 92, y: 10 },
    ],
  },
  noise: {
    label: 'Облако без связи',
    points: [
      { id: 1, x: 15, y: 72 },
      { id: 2, x: 24, y: 28 },
      { id: 3, x: 31, y: 82 },
      { id: 4, x: 39, y: 44 },
      { id: 5, x: 48, y: 18 },
      { id: 6, x: 53, y: 79 },
      { id: 7, x: 64, y: 31 },
      { id: 8, x: 72, y: 66 },
      { id: 9, x: 81, y: 22 },
      { id: 10, x: 88, y: 55 },
    ],
  },
};

const SCATTER_MISSIONS: ScatterMission[] = [
  {
    id: 'm_direct',
    title: 'Миссия 1. Соберите сильную прямую связь (r от +0,75 до +0,95)',
    goal: 'Перетащите точки так, чтобы большинство оказалось в зелёных диагональных квадрантах.',
    why: 'При прямой связи значения x и y растут вместе, поэтому произведения (x − x̄)(y − ȳ) положительны и r лежит строго в пределах от 0 до +1.',
    check: (st) => st.r >= 0.75 && st.r <= 0.95,
  },
  {
    id: 'm_inverse',
    title: 'Миссия 2. Переверните связь в обратную (r ≤ −0,75)',
    goal: 'Сместите точки в верхний левый и нижний правый (красные) квадранты.',
    why: 'Когда при росте X признак Y падает, отклонения имеют разные знаки — преобладают красные прямоугольники и r уходит в зону от −1 до 0.',
    check: (st) => st.r <= -0.75,
  },
  {
    id: 'm_outlier',
    title: 'Миссия 3. Сломайте Пирсона выбросом (ρ Спирмена ≥ 0,65, но r Пирсона ≤ 0,25)',
    goal: 'Оставьте 9 точек по восходящей диагонали и утащите 1 точку далеко в нижний правый угол.',
    why: 'Пирсон умножает реальные расстояния — одна далёкая точка создаёт гигантский красный прямоугольник и обрушивает r. А Спирмен считает только ранги (места 1..10), поэтому почти не портится!',
    check: (st) => st.spearman >= 0.65 && st.r <= 0.25,
  },
  {
    id: 'm_parabola',
    title: 'Миссия 4. Связь без линейности (|r| ≤ 0,15 при чёткой U-дуге)',
    goal: 'Выложите точки симметричной дугой (или проверьте пресет «Парабола») — посмотрите на r.',
    why: 'Зелёные и красные квадранты слева и справа полностью уравновешивают друг друга! Пирсон видит r ≈ 0, потому что измеряет ТОЛЬКО прямую линейную связь.',
    check: (st, pts) => {
      if (Math.abs(st.r) > 0.15) return false;
      const leftY = pts.filter((p) => p.x < 35).reduce((s, p) => s + p.y, 0);
      const midY = pts.filter((p) => p.x >= 35 && p.x <= 65).reduce((s, p) => s + p.y, 0);
      const rightY = pts.filter((p) => p.x > 65).reduce((s, p) => s + p.y, 0);
      const leftC = pts.filter((p) => p.x < 35).length || 1;
      const midC = pts.filter((p) => p.x >= 35 && p.x <= 65).length || 1;
      const rightC = pts.filter((p) => p.x > 65).length || 1;
      return Math.abs(leftY / leftC - midY / midC) > 25 && Math.abs(rightY / rightC - midY / midC) > 25;
    },
  },
];

// ---------- DATA FOR MODE 2 (KENDALL PAIRS) ----------

interface KendallPerson {
  id: number;
  label: string;
  incomeRank: number; // fixed 1..5
  incomeLabel: string;
}

const KENDALL_PEOPLE: KendallPerson[] = [
  { id: 1, label: 'Респондент А', incomeRank: 1, incomeLabel: '45 тыс. ₽' },
  { id: 2, label: 'Респондент Б', incomeRank: 2, incomeLabel: '70 тыс. ₽' },
  { id: 3, label: 'Респондент В', incomeRank: 3, incomeLabel: '105 тыс. ₽' },
  { id: 4, label: 'Респондент Г', incomeRank: 4, incomeLabel: '160 тыс. ₽' },
  { id: 5, label: 'Респондент Д', incomeRank: 5, incomeLabel: '240 тыс. ₽' },
];

// rightOrder[pos] = personId (pos 0..4 corresponds to expense rank 1..5 from low to high)
const KENDALL_PRESETS: { label: string; order: number[]; note: string }[] = [
  { label: 'τ = +1,0 (идеал)', order: [1, 2, 3, 4, 5], note: '0 перекрёстков' },
  { label: 'τ = +0,4 (Вариант 1)', order: [1, 3, 5, 2, 4], note: '7 согл., 3 инверс.' },
  { label: 'τ = +0,2 (Вариант 3: №7 / №6)', order: [2, 1, 4, 5, 3], note: '6 согл., 4 инверс.' },
  { label: 'τ = −0,6', order: [4, 5, 3, 1, 2], note: '2 согл., 8 инверс.' },
  { label: 'τ = −1,0 (инверсия)', order: [5, 4, 3, 2, 1], note: 'все 10 перекрёстков' },
];

const KENDALL_TARGET_GOALS = [-0.6, -0.2, 0.2, 0.4, 0.6, 0.8];

// ---------- DATA FOR MODE 3 (SCALE LADDER) ----------

interface LadderRow {
  id: number;
  x: number; // Доход (тыс. ₽)
  y: number; // Удовлетворённость (1..10)
}

const LADDER_DATASETS: Record<
  string,
  { label: string; desc: string; rows: LadderRow[] }
> = {
  linear: {
    label: 'Сильная прямая связь',
    desc: 'Доход и удовлетворённость растут почти линейно',
    rows: [
      { id: 1, x: 32, y: 2.1 },
      { id: 2, x: 40, y: 2.8 },
      { id: 3, x: 48, y: 3.4 },
      { id: 4, x: 56, y: 4.2 },
      { id: 5, x: 64, y: 4.9 },
      { id: 6, x: 75, y: 5.7 },
      { id: 7, x: 86, y: 6.4 },
      { id: 8, x: 98, y: 7.0 },
      { id: 9, x: 112, y: 7.6 },
      { id: 10, x: 128, y: 8.3 },
      { id: 11, x: 145, y: 8.9 },
      { id: 12, x: 164, y: 9.5 },
    ],
  },
  outlier: {
    label: 'С резким выбросом',
    desc: '11 человек по прямой, 12-й миллионер почти не доволен',
    rows: [
      { id: 1, x: 30, y: 2.0 },
      { id: 2, x: 38, y: 2.9 },
      { id: 3, x: 46, y: 3.7 },
      { id: 4, x: 54, y: 4.5 },
      { id: 5, x: 62, y: 5.3 },
      { id: 6, x: 70, y: 6.1 },
      { id: 7, x: 78, y: 6.9 },
      { id: 8, x: 86, y: 7.7 },
      { id: 9, x: 94, y: 8.4 },
      { id: 10, x: 102, y: 9.0 },
      { id: 11, x: 110, y: 9.6 },
      { id: 12, x: 260, y: 1.5 },
    ],
  },
  parabola: {
    label: 'U-образная (нелинейная)',
    desc: 'Очень низкие и очень высокие доходы дают высокую оценку',
    rows: [
      { id: 1, x: 25, y: 9.2 },
      { id: 2, x: 36, y: 7.5 },
      { id: 3, x: 48, y: 5.6 },
      { id: 4, x: 60, y: 3.8 },
      { id: 5, x: 72, y: 2.3 },
      { id: 6, x: 84, y: 1.8 },
      { id: 7, x: 96, y: 2.1 },
      { id: 8, x: 108, y: 3.5 },
      { id: 9, x: 120, y: 5.4 },
      { id: 10, x: 132, y: 7.1 },
      { id: 11, x: 144, y: 8.6 },
      { id: 12, x: 156, y: 9.4 },
    ],
  },
  random: {
    label: 'Независимые признаки',
    desc: 'Связь отсутствует на любом уровне шкалы',
    rows: [
      { id: 1, x: 30, y: 7.8 },
      { id: 2, x: 42, y: 2.4 },
      { id: 3, x: 54, y: 8.9 },
      { id: 4, x: 66, y: 4.1 },
      { id: 5, x: 78, y: 6.7 },
      { id: 6, x: 90, y: 1.9 },
      { id: 7, x: 102, y: 8.1 },
      { id: 8, x: 114, y: 3.2 },
      { id: 9, x: 126, y: 6.0 },
      { id: 10, x: 138, y: 2.7 },
      { id: 11, x: 150, y: 5.1 },
      { id: 12, x: 162, y: 4.8 },
    ],
  },
};

function binTo4Categories(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((v) => {
    const idx = sorted.indexOf(v);
    return Math.min(3, Math.floor((idx * 4) / values.length));
  });
}

function binTo2Categories(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const median = (sorted[Math.floor(sorted.length / 2) - 1] + sorted[Math.floor(sorted.length / 2)]) / 2;
  return values.map((v) => (v <= median ? 0 : 1));
}

// ---------- DATA FOR MODE 4 (INTUITION BLITZ) ----------

interface BlitzItem {
  id: string;
  question: string;
  options: { text: string; isCorrect: boolean; explain: string }[];
  formulaTex?: string;
}

function generateDynamicBlitzDeck(): BlitzItem[] {
  const tauOptions = [0.2, 0.4, 0.6, -0.4, -0.6];
  const tau = tauOptions[Math.floor(Math.random() * tauOptions.length)];
  const askIncrease = Math.random() > 0.5;
  const pInc = Number(((1 + tau) / 2).toFixed(2));
  const pDec = Number(((1 - tau) / 2).toFixed(2));
  const rightProb = askIncrease ? pInc : pDec;
  const wrongProb = askIncrease ? pDec : pInc;

  const rVals = [0.4, 0.5, 0.6, 0.7, 0.8];
  const rSample = rVals[Math.floor(Math.random() * rVals.length)];
  const r2Pct = Math.round(rSample * rSample * 100);

  const items: BlitzItem[] = [
    {
      id: 'b_tau_dynamic',
      question: `Рассчитан [[тау кендалла|коэффициент Кендалла]] $\\tau = ${formatRu(tau, 1)}$. Если случайно выбрать пару людей и у второго доход выше, какова вероятность, что его доля трат ${askIncrease ? 'тоже увеличится' : 'уменьшится'}?`,
      formulaTex: askIncrease ? 'P = \\frac{1 + \\tau}{2}' : 'Q = \\frac{1 - \\tau}{2}',
      options: [
        {
          text: `${Math.round(rightProb * 100)}% (${formatRu(rightProb, 2)})`,
          isCorrect: true,
          explain: `Верно! $\\tau = p - q$, а $p + q = 1$. Для вопроса «${askIncrease ? 'увеличится' : 'уменьшится'}» считаем $\\frac{1 ${askIncrease ? '+' : '−'} (${formatRu(tau, 1)})}{2} = ${formatRu(rightProb, 2)}$.`,
        },
        {
          text: `${Math.round(wrongProb * 100)}% (${formatRu(wrongProb, 2)})`,
          isCorrect: false,
          explain: `Перепутан знак! ${formatRu(wrongProb, 2)} — это вероятность ${askIncrease ? 'инверсии (уменьшения)' : 'совпадения (увеличения)'}.`,
        },
        {
          text: `${Math.round(Math.abs(tau) * 100)}% (${formatRu(Math.abs(tau), 2)})`,
          isCorrect: false,
          explain: `Ловушка: $|\\tau|$ — это перевес одного типа пар над другим ($p - q$), а не сама вероятность пары!`,
        },
      ],
    },
    {
      id: 'b_r_vs_r2',
      question: `Между двумя метрическими переменными линейная корреляция $r = ${formatRu(rSample, 1)}$. Какой процент разброса $Y$ реально объясняется переменной $X$?`,
      formulaTex: 'R^2 = r^2 \\cdot 100\\%',
      options: [
        {
          text: `${r2Pct}%`,
          isCorrect: true,
          explain: `Верно! Долю объяснённой дисперсии показывает квадрат корреляции $r^2 = ${formatRu(rSample, 1)}^2 = ${r2Pct}\\%$, а не сам коэффициент $r$.`,
        },
        {
          text: `${Math.round(rSample * 100)}%`,
          isCorrect: false,
          explain: `Типичная иллюзия: сам коэффициент $r = ${formatRu(rSample, 1)}$ нельзя читать как «${Math.round(rSample * 100)}% влияния» — для процентов $r$ всегда возводят в квадрат ($r^2$).`,
        },
        {
          text: `${Math.round((1 - rSample * rSample) * 100)}%`,
          isCorrect: false,
          explain: `Это как раз НЕобъяснённая (остаточная) доля разброса $1 - r^2$.`,
        },
      ],
    },
    {
      id: 'b_direct_bounds',
      question:
        'Две метрические переменные связаны ПРЯМОЙ связью (при росте одной растёт и другая). В каких пределах может лежать [[коэффициент корреляции пирсона|коэффициент Пирсона]] $r$?',
      formulaTex: 'r > 0 \\;\\Longrightarrow\\; r \\in [0;\\, +1]',
      options: [
        {
          text: 'От 0 до +1',
          isCorrect: true,
          explain:
            'Верно! Зелёные диагональные квадранты перевешивают, знак всегда положительный. От −1 до +1 — это общий диапазон с учётом обратной связи.',
        },
        {
          text: 'От −1 до +1',
          isCorrect: false,
          explain:
            'Ловушка №13! Отрицательная часть [−1; 0) отвечает за ОБРАТНУЮ связь, а в вопросе явно указана ПРЯМАЯ.',
        },
        {
          text: 'От 0 до бесконечности',
          isCorrect: false,
          explain:
            'Так изменяется χ², а корреляция Пирсона нормирована единицей.',
        },
      ],
    },
    {
      id: 'b_parabola',
      question:
        'Точки на графике образуют идеальную симметричную параболу ($Y = (X - 5)^2$). Что покажет линейный коэффициент Пирсона $r$?',
      formulaTex: 'r \\approx 0',
      options: [
        {
          text: 'Около 0 (не увидит связь)',
          isCorrect: true,
          explain:
            'Верно! Левая убывающая ветвь (красные квадранты) и правая возрастающая (зелёные квадранты) взаимно гасят друг друга — Пирсон ловит только прямую линию.',
        },
        {
          text: '+1,0 (связь же стопроцентная!)',
          isCorrect: false,
          explain:
            'Связь действительно детерминированная, но НЕЛИНЕЙНАЯ. Прямая линия регрессии проходит горизонтально, и $r = 0$.',
        },
        {
          text: '−1,0',
          isCorrect: false,
          explain:
            'У симметричной параболы нет единого направления наклона.',
        },
      ],
    },
    {
      id: 'b_outlier',
      question:
        'В выборке 19 человек идут чётко по прямой вверх, а у 20-го человека огромный доход и низкая оценка (резкий выброс). Какой коэффициент «сломается» сильнее?',
      options: [
        {
          text: 'r Пирсона (упадёт из-за умножения расстояний)',
          isCorrect: true,
          explain:
            'Верно! Пирсон умножает реальные отклонения $(x_i - \\bar{x})(y_i - \\bar{y})$, а выброс создаёт гигантский красный прямоугольник. Спирмен и Кендалл смотрят только на ранги, поэтому устойчивы.',
        },
        {
          text: 'ρ Спирмена (ранги сломаются сильнее)',
          isCorrect: false,
          explain:
            'Наоборот: для Спирмена этот миллионер — просто место №20 вместо №19, разрыв в рублях стирается.',
        },
        {
          text: 'Оба упадут абсолютно одинаково',
          isCorrect: false,
          explain:
            'Метрический коэффициент чувствителен к выбросам, ранговые — робастны (устойчивы).',
        },
      ],
    },
    {
      id: 'b_ladder_2x2',
      question:
        'Мы сжали две переменные до ответов «Да / Нет» и получили таблицу $2 \\times 2$, где все люди легли строго на главную диагональ ($b = 0$, $c = 0$). Чему равен коэффициент ассоциации Юла $Q$?',
      formulaTex: 'Q = \\frac{ad - bc}{ad + bc}',
      options: [
        {
          text: '+1',
          isCorrect: true,
          explain:
            'Верно! Подставьте $b = 0, c = 0$: $Q = \\frac{ad - 0}{ad + 0} = +1$. Полное совпадение бинарных признаков!',
        },
        {
          text: '0',
          isCorrect: false,
          explain:
            'Ноль получается, когда диагонали равны ($ad = bc$), то есть когда связи нет.',
        },
        {
          text: '0,5',
          isCorrect: false,
          explain:
            'При $b = 0$ и $c = 0$ числитель и знаменатель формулы Юла равны $ad$.',
        },
      ],
    },
  ];

  return items;
}

// ---------- COMPONENT ----------

export const CorrelationLab: React.FC<CorrelationLabProps> = ({
  onOpenTerm,
  onRecordAttempt,
}) => {
  const [mode, setMode] = useState<CorrelationLabMode>('quadrants');

  // --- Mode 1: Pearson Quadrants state ---
  const [points, setPoints] = useState<Point2D[]>(SCATTER_PRESETS.direct.points);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [showRectangles, setShowRectangles] = useState<boolean>(true);
  const [missionIdx, setMissionIdx] = useState<number>(0);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const scatterStats = useMemo(() => computeScatterStats(points), [points]);
  const activeMission = SCATTER_MISSIONS[missionIdx];
  const missionDone = useMemo(
    () => activeMission.check(scatterStats, points),
    [activeMission, scatterStats, points]
  );

  // SVG coordinate mapping (viewBox 540 x 380, padding 44)
  const SVG_W = 540;
  const SVG_H = 380;
  const PAD = 44;
  const PLOT_W = SVG_W - PAD * 2;
  const PLOT_H = SVG_H - PAD * 2;
  const toSvgX = (x: number) => PAD + (x / 100) * PLOT_W;
  const toSvgY = (y: number) => PAD + ((100 - y) / 100) * PLOT_H;

  const updatePointFromPointer = (clientX: number, clientY: number, pointId: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * SVG_W;
    const svgY = ((clientY - rect.top) / rect.height) * SVG_H;
    const normX = Math.max(4, Math.min(96, ((svgX - PAD) / PLOT_W) * 100));
    const normY = Math.max(4, Math.min(96, 100 - ((svgY - PAD) / PLOT_H) * 100));
    setPoints((prev) =>
      prev.map((p) =>
        p.id === pointId ? { ...p, x: Math.round(normX), y: Math.round(normY) } : p
      )
    );
  };

  // --- Mode 2: Kendall Pairs state ---
  const [rightOrder, setRightOrder] = useState<number[]>([1, 3, 5, 2, 4]); // defaults to tau = +0.4!
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [hoverPersonId, setHoverPersonId] = useState<number | null>(null);
  const [kendallGoal, setKendallGoal] = useState<number | null>(0.4);

  const kendallData = useMemo(() => {
    // rightOrder[pos] = personId => personId has expenseRank = pos + 1
    const expenseByPerson = new Map<number, number>();
    rightOrder.forEach((pid, pos) => expenseByPerson.set(pid, pos + 1));

    const pairs: {
      a: number;
      b: number;
      isConcordant: boolean;
    }[] = [];
    let P = 0;
    let Q = 0;
    for (let i = 1; i <= 5; i++) {
      for (let j = i + 1; j <= 5; j++) {
        const expI = expenseByPerson.get(i)!;
        const expJ = expenseByPerson.get(j)!;
        const isConcordant = expI < expJ;
        if (isConcordant) P++;
        else Q++;
        pairs.push({ a: i, b: j, isConcordant });
      }
    }
    const tau = (P - Q) / 10;
    const pInc = (1 + tau) / 2;
    const qDec = (1 - tau) / 2;
    return { expenseByPerson, pairs, P, Q, tau, pInc, qDec };
  }, [rightOrder]);

  const swapRightSlots = (idxA: number, idxB: number) => {
    if (idxA === idxB || idxA < 0 || idxB < 0 || idxA > 4 || idxB > 4) return;
    setRightOrder((prev) => {
      const next = [...prev];
      [next[idxA], next[idxB]] = [next[idxB], next[idxA]];
      return next;
    });
    setSelectedSlot(null);
  };

  const handleSlotClick = (idx: number) => {
    if (selectedSlot === null) {
      setSelectedSlot(idx);
    } else if (selectedSlot === idx) {
      setSelectedSlot(null);
    } else {
      swapRightSlots(selectedSlot, idx);
    }
  };

  // --- Mode 3: Scale Degradation Ladder state ---
  const [ladderDatasetKey, setLadderDatasetKey] = useState<string>('linear');
  const [ladderLevel, setLadderLevel] = useState<1 | 2 | 3 | 4>(1);

  const ladderStats = useMemo(() => {
    const ds = LADDER_DATASETS[ladderDatasetKey];
    const xs = ds.rows.map((r) => r.x);
    const ys = ds.rows.map((r) => r.y);
    const n = ds.rows.length;

    const pearson = pearsonOfArrays(xs, ys).r;
    const rx = averageRanks(xs);
    const ry = averageRanks(ys);
    const spearman = pearsonOfArrays(rx, ry).r;
    const kendall = kendallTauOfArrays(xs, ys).tau;

    // Level 3: 4x4 table
    const xCat4 = binTo4Categories(xs);
    const yCat4 = binTo4Categories(ys);
    const matrix4 = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      matrix4[yCat4[i]][xCat4[i]]++;
    }
    const rowSums4 = matrix4.map((row) => row.reduce((s, v) => s + v, 0));
    const colSums4 = [0, 1, 2, 3].map((c) => matrix4.reduce((s, r) => s + r[c], 0));
    let chi2_4 = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const expected = (rowSums4[r] * colSums4[c]) / n;
        if (expected > 0) {
          chi2_4 += ((matrix4[r][c] - expected) ** 2) / expected;
        }
      }
    }
    const cramerV4 = Math.sqrt(chi2_4 / (n * 3));
    const pearsonC4 = Math.sqrt(chi2_4 / (chi2_4 + n));

    // Level 4: 2x2 table (0=Низкий, 1=Высокий)
    const xBin = binTo2Categories(xs);
    const yBin = binTo2Categories(ys);
    let a = 0;
    let b = 0;
    let c = 0;
    let d = 0;
    for (let i = 0; i < n; i++) {
      // rows = X (0 low, 1 high), cols = Y (0 low, 1 high)
      if (xBin[i] === 0 && yBin[i] === 0) a++;
      else if (xBin[i] === 0 && yBin[i] === 1) b++;
      else if (xBin[i] === 1 && yBin[i] === 0) c++;
      else d++;
    }
    const yuleDen = a * d + b * c;
    const yuleQ = yuleDen > 0 ? (a * d - b * c) / yuleDen : 0;
    const phiDen = Math.sqrt((a + b) * (c + d) * (a + c) * (b + d));
    const phi = phiDen > 0 ? (a * d - b * c) / phiDen : 0;

    return {
      ds,
      rx,
      ry,
      pearson,
      spearman,
      kendall,
      matrix4,
      chi2_4,
      cramerV4,
      pearsonC4,
      a,
      b,
      c,
      d,
      yuleQ,
      phi,
    };
  }, [ladderDatasetKey]);

  // --- Mode 4: Intuition Blitz state ---
  const [blitzDeck, setBlitzDeck] = useState<BlitzItem[]>(() =>
    generateDynamicBlitzDeck()
  );
  const [blitzIdx, setBlitzIdx] = useState<number>(0);
  const [blitzPicked, setBlitzPicked] = useState<number | null>(null);
  const [blitzScore, setBlitzScore] = useState<{ right: number; total: number }>({
    right: 0,
    total: 0,
  });

  const currentBlitz = blitzDeck[blitzIdx];

  const handleBlitzPick = (optIdx: number) => {
    if (blitzPicked !== null) return;
    setBlitzPicked(optIdx);
    const ok = Boolean(currentBlitz.options[optIdx]?.isCorrect);
    setBlitzScore((prev) => ({
      right: prev.right + (ok ? 1 : 0),
      total: prev.total + 1,
    }));
    onRecordAttempt?.(ok);
  };

  const nextBlitzQuestion = () => {
    setBlitzPicked(null);
    if (blitzIdx + 1 < blitzDeck.length) {
      setBlitzIdx((i) => i + 1);
    } else {
      setBlitzDeck(generateDynamicBlitzDeck());
      setBlitzIdx(0);
    }
  };

  const modeTabs: { id: CorrelationLabMode; label: string; icon: typeof Activity }[] = [
    { id: 'quadrants', label: '1. Квадранты Пирсона', icon: Sliders },
    { id: 'kendall', label: '2. Пары Кендалла (1 ± τ)/2', icon: GitBranch },
    { id: 'ladder', label: '3. Лестница шкал', icon: Layers },
    { id: 'blitz', label: '4. Детектор интуиции', icon: Target },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Mode Selector */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1D4ED8] mb-1">
              <Activity className="w-4 h-4" />
              <span>Интерактивная лаборатория понимания · без зубрёжки</span>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Корреляция: от квадрантов Пирсона до перекрёстков Кендалла и шкал
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              Двигайте точки, переставляйте пары и сжимайте шкалы данных, чтобы увидеть глазами,
              откуда берутся знаки, пределы и формулы коэффициентов связи.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[#E2E8F0]">
          {modeTabs.map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#1D4ED8] text-white'
                    : 'bg-[#F8FAFC] text-[#334155] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MODE 1: PEARSON QUADRANTS */}
      {mode === 'quadrants' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Interactive Stage */}
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  График рассеяния и 4 квадранта относительно средних
                </h3>
                <div className="text-xs text-[#64748B]">
                  Тяните любую синюю точку мышкой · зелёные комнаты тянут r в плюс, красные — в минус
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRectangles((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                  showRectangles
                    ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]'
                    : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#475569]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showRectangles ? 'Площади (x−x̄)(y−ȳ) вкл.' : 'Площади выкл.'}</span>
              </button>
            </div>

            {/* Interactive SVG Plot */}
            <div className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden select-none">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="w-full h-auto block touch-none"
                onPointerMove={(e) => {
                  if (draggingId !== null) {
                    updatePointFromPointer(e.clientX, e.clientY, draggingId);
                  }
                }}
                onPointerUp={() => setDraggingId(null)}
                onPointerLeave={() => setDraggingId(null)}
              >
                {/* Plot background */}
                <rect
                  x={PAD}
                  y={PAD}
                  width={PLOT_W}
                  height={PLOT_H}
                  fill="#FFFFFF"
                  stroke="#CBD5E1"
                  strokeWidth={1}
                />

                {/* 4 Quadrant Tints around (meanX, meanY) */}
                {(() => {
                  const mx = toSvgX(scatterStats.meanX);
                  const my = toSvgY(scatterStats.meanY);
                  return (
                    <>
                      {/* Top-Right (+,+) => Green */}
                      <rect
                        x={mx}
                        y={PAD}
                        width={PAD + PLOT_W - mx}
                        height={my - PAD}
                        fill="rgba(5, 150, 105, 0.07)"
                      />
                      {/* Bottom-Left (-,-) => Green */}
                      <rect
                        x={PAD}
                        y={my}
                        width={mx - PAD}
                        height={PAD + PLOT_H - my}
                        fill="rgba(5, 150, 105, 0.07)"
                      />
                      {/* Top-Left (-,+) => Red */}
                      <rect
                        x={PAD}
                        y={PAD}
                        width={mx - PAD}
                        height={my - PAD}
                        fill="rgba(220, 38, 38, 0.07)"
                      />
                      {/* Bottom-Right (+,-) => Red */}
                      <rect
                        x={mx}
                        y={my}
                        width={PAD + PLOT_W - mx}
                        height={PAD + PLOT_H - my}
                        fill="rgba(220, 38, 38, 0.07)"
                      />

                      {/* Quadrant Labels */}
                      <text
                        x={PAD + PLOT_W - 8}
                        y={PAD + 16}
                        textAnchor="end"
                        fontSize={11}
                        fontWeight={700}
                        fill="#059669"
                      >
                        (+)(+) = +
                      </text>
                      <text
                        x={PAD + 8}
                        y={PAD + PLOT_H - 8}
                        textAnchor="start"
                        fontSize={11}
                        fontWeight={700}
                        fill="#059669"
                      >
                        (−)(−) = +
                      </text>
                      <text
                        x={PAD + 8}
                        y={PAD + 16}
                        textAnchor="start"
                        fontSize={11}
                        fontWeight={700}
                        fill="#DC2626"
                      >
                        (−)(+) = −
                      </text>
                      <text
                        x={PAD + PLOT_W - 8}
                        y={PAD + PLOT_H - 8}
                        textAnchor="end"
                        fontSize={11}
                        fontWeight={700}
                        fill="#DC2626"
                      >
                        (+)(−) = −
                      </text>

                      {/* Covariance rectangles */}
                      {showRectangles &&
                        points.map((pt) => {
                          const px = toSvgX(pt.x);
                          const py = toSvgY(pt.y);
                          const prod =
                            (pt.x - scatterStats.meanX) * (pt.y - scatterStats.meanY);
                          const isPos = prod >= 0;
                          return (
                            <rect
                              key={`rect-${pt.id}`}
                              x={Math.min(px, mx)}
                              y={Math.min(py, my)}
                              width={Math.abs(px - mx)}
                              height={Math.abs(py - my)}
                              fill={
                                isPos
                                  ? 'rgba(5, 150, 105, 0.12)'
                                  : 'rgba(220, 38, 38, 0.12)'
                              }
                              stroke={
                                isPos
                                  ? 'rgba(5, 150, 105, 0.35)'
                                  : 'rgba(220, 38, 38, 0.35)'
                              }
                              strokeWidth={1}
                            />
                          );
                        })}

                      {/* Mean dashed lines */}
                      <line
                        x1={mx}
                        y1={PAD}
                        x2={mx}
                        y2={PAD + PLOT_H}
                        stroke="#64748B"
                        strokeDasharray="4 4"
                        strokeWidth={1.2}
                      />
                      <line
                        x1={PAD}
                        y1={my}
                        x2={PAD + PLOT_W}
                        y2={my}
                        stroke="#64748B"
                        strokeDasharray="4 4"
                        strokeWidth={1.2}
                      />
                      <text
                        x={mx + 4}
                        y={PAD - 6}
                        fontSize={10}
                        fontFamily="monospace"
                        fill="#475569"
                      >
                        x̄ = {Math.round(scatterStats.meanX)}
                      </text>
                      <text
                        x={PAD - 6}
                        y={my + 4}
                        textAnchor="end"
                        fontSize={10}
                        fontFamily="monospace"
                        fill="#475569"
                      >
                        ȳ={Math.round(scatterStats.meanY)}
                      </text>
                    </>
                  );
                })()}

                {/* Regression Line */}
                {(() => {
                  const y0 = Math.max(
                    0,
                    Math.min(100, scatterStats.intercept + scatterStats.slope * 0)
                  );
                  const y100 = Math.max(
                    0,
                    Math.min(100, scatterStats.intercept + scatterStats.slope * 100)
                  );
                  return (
                    <line
                      x1={toSvgX(0)}
                      y1={toSvgY(y0)}
                      x2={toSvgX(100)}
                      y2={toSvgY(y100)}
                      stroke="#1D4ED8"
                      strokeWidth={2}
                      opacity={0.75}
                    />
                  );
                })()}

                {/* Draggable Points */}
                {points.map((pt) => {
                  const cx = toSvgX(pt.x);
                  const cy = toSvgY(pt.y);
                  const isActive = draggingId === pt.id;
                  return (
                    <g
                      key={pt.id}
                      className="cursor-grab active:cursor-grabbing"
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setDraggingId(pt.id);
                      }}
                    >
                      <circle cx={cx} cy={cy} r={14} fill="transparent" />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isActive ? 8 : 6.5}
                        fill={isActive ? '#1E40AF' : '#1D4ED8'}
                        stroke="#FFFFFF"
                        strokeWidth={2}
                      />
                    </g>
                  );
                })}

                {/* Axis Titles */}
                <text
                  x={PAD + PLOT_W / 2}
                  y={SVG_H - 10}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={600}
                  fill="#334155"
                >
                  Признак X (например, доход) →
                </text>
                <text
                  x={14}
                  y={PAD + PLOT_H / 2}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={600}
                  fill="#334155"
                  transform={`rotate(-90 14 ${PAD + PLOT_H / 2})`}
                >
                  Признак Y (оценка) →
                </text>
              </svg>
            </div>

            {/* Presets row */}
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.entries(SCATTER_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPoints(preset.points.map((p) => ({ ...p })))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:border-[#BFDBFE] transition-colors cursor-pointer whitespace-nowrap"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Control & Concept Deck */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Telemetry Strip */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 tabular-nums">
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">
                    <button
                      type="button"
                      onClick={() => onOpenTerm('коэффициент корреляции пирсона')}
                      className="text-[#1D4ED8] hover:underline font-medium cursor-pointer"
                    >
                      r Пирсона
                    </button>{' '}
                    (линейная)
                  </div>
                  <div
                    className={`text-2xl font-mono font-bold mt-0.5 ${
                      scatterStats.r > 0.15
                        ? 'text-[#059669]'
                        : scatterStats.r < -0.15
                        ? 'text-[#DC2626]'
                        : 'text-[#475569]'
                    }`}
                  >
                    {formatRuSigned(scatterStats.r, 2)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">
                    Объяснённая доля (r²)
                  </div>
                  <div className="text-2xl font-mono font-bold text-[#1D4ED8] mt-0.5">
                    {scatterStats.r2Pct}%
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">ρ Спирмена (ранги)</div>
                  <div className="text-lg font-mono font-bold text-[#0F172A] mt-0.5">
                    {formatRuSigned(scatterStats.spearman, 2)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">τ Кендалла (пары)</div>
                  <div className="text-lg font-mono font-bold text-[#0F172A] mt-0.5">
                    {formatRuSigned(scatterStats.kendall, 2)}
                  </div>
                </div>
              </div>

              {/* Axis [-1; +1] highlighting Direct vs Inverse bounds */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono text-[#64748B] tabular-nums">
                  <span>−1 (обратная)</span>
                  <span>0 (нет линейной)</span>
                  <span>+1 (прямая)</span>
                </div>
                <div className="relative h-3 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-1/2 bg-[#FEF2F2]" />
                  <div className="absolute inset-y-0 right-0 w-1/2 bg-[#F0FDF4]" />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-[#64748B]" />
                  <div
                    className="absolute top-0 bottom-0 w-2 -ml-1 rounded bg-[#0F172A] transition-transform duration-75"
                    style={{ left: `${((scatterStats.r + 1) / 2) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-[#475569]">
                  {scatterStats.r >= 0.05
                    ? 'Связь прямая: значение лежит в положительной половине [0; +1].'
                    : scatterStats.r <= -0.05
                    ? 'Связь обратная: значение лежит в отрицательной половине [−1; 0].'
                    : 'Линейный баланс около 0: зелёные и красные площади уравнялись.'}
                </div>
              </div>

              {/* Green vs Red tug-of-war */}
              {(() => {
                const total = scatterStats.greenWeight + scatterStats.redWeight || 1;
                const greenPct = Math.round((scatterStats.greenWeight / total) * 100);
                const redPct = 100 - greenPct;
                return (
                  <div className="space-y-1 pt-2 border-t border-[#E2E8F0]">
                    <div className="flex justify-between text-xs tabular-nums">
                      <span className="font-semibold text-[#059669]">
                        Зелёные квадранты: {greenPct}%
                      </span>
                      <span className="font-semibold text-[#DC2626]">
                        Красные: {redPct}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-md overflow-hidden flex bg-[#E2E8F0]">
                      <div
                        className="bg-[#059669]"
                        style={{ width: `${greenPct}%` }}
                      />
                      <div
                        className="bg-[#DC2626]"
                        style={{ width: `${redPct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Interactive Missions */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[#1D4ED8]">
                  Практическая миссия {missionIdx + 1} из {SCATTER_MISSIONS.length}
                </div>
                <div className="flex items-center gap-1">
                  {SCATTER_MISSIONS.map((m, idx) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMissionIdx(idx)}
                      className={`w-7 h-7 rounded-md text-xs font-mono font-bold cursor-pointer transition-colors ${
                        idx === missionIdx
                          ? 'bg-[#1D4ED8] text-white'
                          : 'bg-[#F8FAFC] border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <h4 className="text-sm font-bold text-[#0F172A]">
                {activeMission.title}
              </h4>
              <p className="text-xs text-[#475569] leading-relaxed">
                {activeMission.goal}
              </p>

              <div
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  missionDone
                    ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#065F46]'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {missionDone ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                      <span>Цель достигнута! Вот почему это так работает:</span>
                    </>
                  ) : (
                    <span>Двигайте точки (или проверьте пресеты) для выполнения условия.</span>
                  )}
                </div>
                {missionDone && <p className="leading-relaxed">{activeMission.why}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: KENDALL PAIRS & (1 ± τ)/2 */}
      {mode === 'kendall' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Visual Pair-Crossing Stage */}
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Перекрёстки пар в коэффициенте Кендалла (5 респондентов = 10 пар)
                </h3>
                <div className="text-xs text-[#64748B]">
                  Нажмите на две карточки справа (или стрелки ↑ ↓), чтобы поменять порядок трат
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const goal =
                    KENDALL_TARGET_GOALS[
                      Math.floor(Math.random() * KENDALL_TARGET_GOALS.length)
                    ];
                  setKendallGoal(goal);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] hover:bg-[#DBEAFE] cursor-pointer whitespace-nowrap"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Новая цель τ</span>
              </button>
            </div>

            {/* Interactive Two-Column Pairing Stage with Live SVG Links */}
            <div className="relative rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="grid grid-cols-12 items-center gap-2">
                {/* Left column: Fixed Income order 1..5 */}
                <div className="col-span-5 space-y-2.5">
                  <div className="text-[11px] font-semibold text-[#475569] text-center">
                    Доход (по возрастанию ↑)
                  </div>
                  {KENDALL_PEOPLE.map((person) => (
                    <div
                      key={person.id}
                      onMouseEnter={() => setHoverPersonId(person.id)}
                      onMouseLeave={() => setHoverPersonId(null)}
                      className={`h-12 px-3 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                        hoverPersonId === person.id
                          ? 'bg-[#EFF6FF] border-[#1D4ED8]'
                          : 'bg-white border-[#CBD5E1]'
                      }`}
                    >
                      <span className="font-bold text-[#0F172A] truncate">
                        {person.label}
                      </span>
                      <span className="font-mono text-[#475569] tabular-nums shrink-0">
                        {person.incomeLabel}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Middle SVG connection lines */}
                <div className="col-span-2 pt-6">
                  <svg viewBox="0 0 100 280" className="w-full h-[278px] overflow-visible">
                    {KENDALL_PEOPLE.map((person, leftIdx) => {
                      const rightIdx = rightOrder.indexOf(person.id);
                      const y1 = 24 + leftIdx * 58;
                      const y2 = 24 + rightIdx * 58;
                      // Determine if this person participates in crossings
                      const myCrossings = kendallData.pairs.filter(
                        (pr) =>
                          !pr.isConcordant && (pr.a === person.id || pr.b === person.id)
                      ).length;
                      const isDimmed =
                        hoverPersonId !== null && hoverPersonId !== person.id;
                      const strokeColor =
                        hoverPersonId === person.id
                          ? '#1D4ED8'
                          : myCrossings === 0
                          ? '#059669'
                          : '#DC2626';

                      return (
                        <g key={person.id} opacity={isDimmed ? 0.25 : 0.9}>
                          <line
                            x1={2}
                            y1={y1}
                            x2={98}
                            y2={y2}
                            stroke={strokeColor}
                            strokeWidth={hoverPersonId === person.id ? 3.5 : 2.2}
                            strokeLinecap="round"
                          />
                          <circle cx={2} cy={y1} r={3.5} fill={strokeColor} />
                          <circle cx={98} cy={y2} r={3.5} fill={strokeColor} />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Right column: Interactive Expense Ranks */}
                <div className="col-span-5 space-y-2.5">
                  <div className="text-[11px] font-semibold text-[#475569] text-center">
                    Траты на досуг (меньше → больше)
                  </div>
                  {rightOrder.map((personId, slotIdx) => {
                    const person = KENDALL_PEOPLE.find((p) => p.id === personId)!;
                    const isPicked = selectedSlot === slotIdx;
                    return (
                      <div
                        key={personId}
                        onMouseEnter={() => setHoverPersonId(personId)}
                        onMouseLeave={() => setHoverPersonId(null)}
                        className={`h-12 px-2.5 rounded-lg border flex items-center justify-between gap-1 text-xs transition-colors ${
                          isPicked
                            ? 'bg-[#EFF6FF] border-[#1D4ED8] ring-2 ring-[#BFDBFE]'
                            : hoverPersonId === personId
                            ? 'bg-[#EFF6FF] border-[#93C5FD]'
                            : 'bg-white border-[#CBD5E1]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSlotClick(slotIdx)}
                          className="flex-1 text-left font-bold text-[#0F172A] truncate cursor-pointer py-1"
                        >
                          #{slotIdx + 1} · {person.label}
                        </button>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={slotIdx === 0}
                            onClick={() => swapRightSlots(slotIdx, slotIdx - 1)}
                            aria-label="Переместить выше"
                            className="p-1 rounded hover:bg-[#F1F5F9] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5 text-[#334155]" />
                          </button>
                          <button
                            type="button"
                            disabled={slotIdx === 4}
                            onClick={() => swapRightSlots(slotIdx, slotIdx + 1)}
                            aria-label="Переместить ниже"
                            className="p-1 rounded hover:bg-[#F1F5F9] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5 text-[#334155]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {KENDALL_PRESETS.map((pr) => (
                <button
                  key={pr.label}
                  type="button"
                  onClick={() => {
                    setRightOrder(pr.order);
                    setSelectedSlot(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] cursor-pointer whitespace-nowrap"
                >
                  {pr.label}
                </button>
              ))}
            </div>

            {/* All 10 pairs breakdown */}
            <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
              <div className="text-xs font-semibold text-[#475569]">
                Все 10 пар (без перекрёстка = +P, перекрёсток линий = −Q):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 tabular-nums">
                {kendallData.pairs.map((pr) => {
                  const pA = KENDALL_PEOPLE[pr.a - 1].label.slice(-1);
                  const pB = KENDALL_PEOPLE[pr.b - 1].label.slice(-1);
                  return (
                    <div
                      key={`${pr.a}-${pr.b}`}
                      className={`px-2 py-1.5 rounded border text-xs font-mono text-center ${
                        pr.isConcordant
                          ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#065F46]'
                          : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                      }`}
                    >
                      {pA}–{pB}: {pr.isConcordant ? 'P (+)' : 'Q (×)'}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Concept & Probability Derivation Deck */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#0F172A]">
                  Откуда берётся формула (1 ± τ) / 2
                </h4>
                <button
                  type="button"
                  onClick={() => onOpenTerm('тау кендалла')}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                >
                  Словарь τ
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 tabular-nums text-center">
                <div className="p-2.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]">
                  <div className="text-[11px] text-[#065F46]">Согласовано (P)</div>
                  <div className="text-lg font-mono font-bold text-[#059669]">
                    {kendallData.P} / 10
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">
                  <div className="text-[11px] text-[#991B1B]">Инверсий (Q)</div>
                  <div className="text-lg font-mono font-bold text-[#DC2626]">
                    {kendallData.Q} / 10
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                  <div className="text-[11px] text-[#1E3A8A]">Кендалл τ</div>
                  <div className="text-lg font-mono font-bold text-[#1D4ED8]">
                    {formatRuSigned(kendallData.tau, 1)}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#334155] space-y-2 tabular-nums">
                <MathFormula
                  tex={`\\tau = \\frac{P - Q}{10} = \\frac{${kendallData.P} - ${kendallData.Q}}{10} = ${formatRuSigned(kendallData.tau, 1)}`}
                  displayMode
                />
                <p className="leading-relaxed">
                  Так как сумма долей всех пар равна <strong className="font-mono">1</strong>{' '}
                  (p + q = 1), а их разность равна{' '}
                  <strong className="font-mono">τ = p − q</strong>, решить эту пару уравнений можно в уме:
                </p>
              </div>

              {/* Direct vs Inverse probability output matching Task 7 */}
              <div className="space-y-2.5 tabular-nums">
                <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#065F46]">
                    <span>С ростом дохода траты УВЕЛИЧАТСЯ:</span>
                    <span className="font-mono text-base">
                      {Math.round(kendallData.pInc * 100)}% ({formatRu(kendallData.pInc, 2)})
                    </span>
                  </div>
                  <div className="text-[11px] text-[#065F46]">
                    <MathFormula
                      tex={`\\frac{1 + \\tau}{2} = \\frac{1 + (${formatRu(kendallData.tau, 1)})}{2} = ${formatRu(kendallData.pInc, 2)} = \\frac{${kendallData.P}}{10}`}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#991B1B]">
                    <span>С ростом дохода траты УМЕНЬШАТСЯ:</span>
                    <span className="font-mono text-base">
                      {Math.round(kendallData.qDec * 100)}% ({formatRu(kendallData.qDec, 2)})
                    </span>
                  </div>
                  <div className="text-[11px] text-[#991B1B]">
                    <MathFormula
                      tex={`\\frac{1 - \\tau}{2} = \\frac{1 - (${formatRu(kendallData.tau, 1)})}{2} = ${formatRu(kendallData.qDec, 2)} = \\frac{${kendallData.Q}}{10}`}
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#78350F] space-y-1">
                <div className="font-bold">
                  Вариант 3 (печатный бланк №7 / №6, эталонный ключ курса):
                </div>
                <p className="leading-relaxed">
                  При τ = +0,2 на вопрос «доля трат на продукты уменьшится?» считаем напрямую по
                  формуле <strong className="font-mono">Q = (1 − τ)/2 = (1 − 0,2)/2 = 0,4 (40%)</strong>.
                  На заметку для №8: по ключу практической работы курса шкалы
                  «Образование 1–4 × Удовлетворённость 1–4» сводят в таблицу 4×4 и выбирают{' '}
                  <strong>коэффициент сопряжённости Пирсона</strong>.
                </p>
              </div>
            </div>

            {kendallGoal !== null && (
              <div
                className={`rounded-xl border p-4 text-xs space-y-1.5 ${
                  Math.abs(kendallData.tau - kendallGoal) < 0.01
                    ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#065F46]'
                    : 'bg-white border-[#E2E8F0] text-[#334155]'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>
                    Задание: соберите τ = {formatRuSigned(kendallGoal, 1)}
                  </span>
                  {Math.abs(kendallData.tau - kendallGoal) < 0.01 && (
                    <span className="inline-flex items-center gap-1 text-[#059669]">
                      <CheckCircle2 className="w-4 h-4" /> Собрано!
                    </span>
                  )}
                </div>
                <p className="text-[#475569] tabular-nums">
                  Подсказка по парам: нужно{' '}
                  <strong>{Math.round(((1 + kendallGoal) / 2) * 10)}</strong> согласованных пар (P) и{' '}
                  <strong>{Math.round(((1 - kendallGoal) / 2) * 10)}</strong> перекрёстков (Q).
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: SCALE DEGRADATION LADDER */}
      {mode === 'ladder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Data & Representation Stage */}
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Одна выборка (12 человек) на 4 ступенях точности шкалы
                </h3>
                <div className="text-xs text-[#64748B]">
                  Переключайте уровень сверху вниз — смотрите, какая информация стирается и какие формулы выживают
                </div>
              </div>
            </div>

            {/* Dataset Scenario Selector */}
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(LADDER_DATASETS).map(([k, ds]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setLadderDatasetKey(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors whitespace-nowrap ${
                    ladderDatasetKey === k
                      ? 'bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8] font-semibold'
                      : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {ds.label}
                </button>
              ))}
            </div>

            {/* 4 Ladder Levels */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { lvl: 1 as const, title: '1. Метрика', sub: 'Точные числа' },
                { lvl: 2 as const, title: '2. Ранги', sub: 'Места 1..12' },
                { lvl: 3 as const, title: '3. Категории', sub: 'Таблица 4×4' },
                { lvl: 4 as const, title: '4. Дихотомия', sub: 'Таблица 2×2' },
              ].map((item) => (
                <button
                  key={item.lvl}
                  type="button"
                  onClick={() => setLadderLevel(item.lvl)}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    ladderLevel === item.lvl
                      ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#334155] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <div className="text-xs font-bold">{item.title}</div>
                  <div
                    className={`text-[11px] ${
                      ladderLevel === item.lvl ? 'text-[#DBEAFE]' : 'text-[#64748B]'
                    }`}
                  >
                    {item.sub}
                  </div>
                </button>
              ))}
            </div>

            {/* Dynamic View of the Data at Selected Level */}
            {(ladderLevel === 1 || ladderLevel === 2) && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse tabular-nums">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-y border-[#E2E8F0] text-[#475569]">
                      <th className="py-2 px-2.5 text-left">№</th>
                      <th className="py-2 px-2.5 text-right">
                        {ladderLevel === 1 ? 'Доход X (тыс. ₽)' : 'Ранг X (место)'}
                      </th>
                      <th className="py-2 px-2.5 text-right">
                        {ladderLevel === 1 ? 'Оценка Y (1–10)' : 'Ранг Y (место)'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ladderStats.ds.rows.map((row, idx) => (
                      <tr key={row.id} className="border-b border-[#E2E8F0]">
                        <td className="py-1.5 px-2.5 font-mono text-[#64748B]">
                          #{row.id}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-[#0F172A]">
                          {ladderLevel === 1 ? (
                            row.x
                          ) : (
                            <span className="text-[#1D4ED8]">
                              {ladderStats.rx[idx]} место{' '}
                              <span className="text-[#94A3B8] font-normal">
                                (было {row.x})
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-[#0F172A]">
                          {ladderLevel === 1 ? (
                            formatRu(row.y, 1)
                          ) : (
                            <span className="text-[#1D4ED8]">
                              {ladderStats.ry[idx]} место{' '}
                              <span className="text-[#94A3B8] font-normal">
                                (было {formatRu(row.y, 1)})
                              </span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {ladderLevel === 3 && (
              <div className="space-y-2 overflow-x-auto">
                <div className="text-xs text-[#475569]">
                  Доход и оценка сгруппированы в 4 градации — получилась таблица сопряжённости 4×4 (df = (4−1)(4−1) = 9):
                </div>
                <table className="w-full text-xs border-collapse tabular-nums text-center">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-y border-[#E2E8F0] text-[#475569]">
                      <th className="py-2 px-2 text-left">Оценка \ Доход</th>
                      <th className="py-2 px-2">Группа 1</th>
                      <th className="py-2 px-2">Группа 2</th>
                      <th className="py-2 px-2">Группа 3</th>
                      <th className="py-2 px-2">Группа 4</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ladderStats.matrix4.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-[#E2E8F0]">
                        <td className="py-2 px-2 text-left font-semibold text-[#334155]">
                          Уровень {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-2 px-2 font-mono font-bold ${
                              cell > 0 ? 'text-[#1D4ED8] bg-[#EFF6FF]/60' : 'text-[#94A3B8]'
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {ladderLevel === 4 && (
              <div className="space-y-3">
                <div className="text-xs text-[#475569]">
                  Все числа сжаты в два исхода (ниже/выше медианы) — получилась четырёхпольная таблица 2×2:
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs tabular-nums">
                  <div />
                  <div className="p-2 rounded bg-[#F8FAFC] font-semibold text-[#475569]">
                    Оценка: Низкая
                  </div>
                  <div className="p-2 rounded bg-[#F8FAFC] font-semibold text-[#475569]">
                    Оценка: Высокая
                  </div>

                  <div className="p-2 rounded bg-[#F8FAFC] font-semibold text-[#475569] flex items-center justify-center">
                    Доход: Низкий
                  </div>
                  <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                    <div className="text-[11px] text-[#1E3A8A]">ячейка a</div>
                    <div className="text-xl font-mono font-bold text-[#1D4ED8]">
                      {ladderStats.a}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="text-[11px] text-[#64748B]">ячейка b</div>
                    <div className="text-xl font-mono font-bold text-[#0F172A]">
                      {ladderStats.b}
                    </div>
                  </div>

                  <div className="p-2 rounded bg-[#F8FAFC] font-semibold text-[#475569] flex items-center justify-center">
                    Доход: Высокий
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="text-[11px] text-[#64748B]">ячейка c</div>
                    <div className="text-xl font-mono font-bold text-[#0F172A]">
                      {ladderStats.c}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                    <div className="text-[11px] text-[#1E3A8A]">ячейка d</div>
                    <div className="text-xl font-mono font-bold text-[#1D4ED8]">
                      {ladderStats.d}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Surviving Tools & Live Values Deck */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-[#0F172A]">
                Какие коэффициенты выживают на уровне {ladderLevel}
              </h4>
              <p className="text-xs text-[#475569] leading-relaxed">
                {ladderLevel === 1 &&
                  'Сохранены точные расстояния в рублях и баллах — работает параметрический линейный коэффициент r Пирсона (и можно также считать ранговые/табличные, но с потерей информации).'}
                {ladderLevel === 2 &&
                  'Точные расстояния стёрты: остаётся только порядок «больше / меньше». Пирсона по исходным рублям считать нельзя — его заменяют Спирмен ρ (разности рангов) и Кендалл τ (перекрёстки пар).'}
                {ladderLevel === 3 &&
                  'Стерся и точный порядок каждого человека — остались только 4 группы. Работают критерий χ² Пирсона, коэффициент взаимной сопряжённости C и нормированный Крамер V.'}
                {ladderLevel === 4 &&
                  'Остались только 2 бинарных ответа («Да / Нет», таблица 2×2). Для таких дихотомий предназначены ровно два коэффициента: ассоциации Юла (Q) и контингенции (φ).'}
              </p>

              <div className="space-y-2 pt-2 border-t border-[#E2E8F0] tabular-nums">
                <div
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    ladderLevel === 1
                      ? 'bg-[#EFF6FF] border-[#1D4ED8]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] opacity-55'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">
                      Линейный r Пирсона
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      {ladderLevel === 1 ? 'Основной на метрике' : 'Требует точных расстояний'}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-base text-[#1D4ED8]">
                    {formatRuSigned(ladderStats.pearson, 2)}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    ladderLevel === 2
                      ? 'bg-[#EFF6FF] border-[#1D4ED8]'
                      : ladderLevel > 2
                      ? 'bg-[#F8FAFC] border-[#E2E8F0] opacity-55'
                      : 'bg-white border-[#E2E8F0]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">
                      Ранги: Спирмен ρ / Кендалл τ
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      {ladderLevel <= 2
                        ? 'Видят порядок без выбросов'
                        : 'Требуют полного ранжирования'}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm text-[#0F172A]">
                    {formatRuSigned(ladderStats.spearman, 2)} /{' '}
                    {formatRuSigned(ladderStats.kendall, 2)}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    ladderLevel === 3
                      ? 'bg-[#EFF6FF] border-[#1D4ED8]'
                      : ladderLevel > 3
                      ? 'bg-[#F8FAFC] border-[#E2E8F0] opacity-55'
                      : 'bg-white border-[#E2E8F0]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">
                      Таблица 4×4: Крамер V / C Пирсона
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      χ² = {formatRu(ladderStats.chi2_4, 2)} (df = 9)
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm text-[#0F172A]">
                    V={formatRu(ladderStats.cramerV4, 2)} · C=
                    {formatRu(ladderStats.pearsonC4, 2)}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    ladderLevel === 4
                      ? 'bg-[#EFF6FF] border-[#1D4ED8]'
                      : 'bg-white border-[#E2E8F0]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">
                      Таблица 2×2: Юл Q / Контингенция φ
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      Для двух дихотомических шкал
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm text-[#0F172A]">
                    Q={formatRuSigned(ladderStats.yuleQ, 2)} · φ=
                    {formatRuSigned(ladderStats.phi, 2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 4: INTUITION BLITZ */}
      {mode === 'blitz' && currentBlitz && (
        <div className="max-w-3xl mx-auto bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold text-[#1D4ED8] tabular-nums">
              Блиц-проверка понимания · Вопрос {blitzIdx + 1} из {blitzDeck.length}
            </div>
            <div className="flex items-center gap-3 text-xs text-[#475569] tabular-nums">
              <span>
                Верно: <strong className="text-[#059669]">{blitzScore.right}</strong> из{' '}
                {blitzScore.total}
              </span>
              <button
                type="button"
                onClick={() => {
                  setBlitzDeck(generateDynamicBlitzDeck());
                  setBlitzIdx(0);
                  setBlitzPicked(null);
                  setBlitzScore({ right: 0, total: 0 });
                }}
                className="inline-flex items-center gap-1 text-[#64748B] hover:text-[#1D4ED8] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Новые числа</span>
              </button>
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-[#0F172A] leading-relaxed">
            <RichTermText text={currentBlitz.question} onOpenTerm={onOpenTerm} />
          </h3>

          <div className="space-y-2">
            {currentBlitz.options.map((opt, idx) => {
              const isPicked = blitzPicked === idx;
              const showOutcome = blitzPicked !== null;
              let btnClass =
                'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:bg-[#EFF6FF] hover:border-[#BFDBFE]';
              if (showOutcome) {
                if (opt.isCorrect) {
                  btnClass = 'bg-[#F0FDF4] border-[#16A34A] text-[#065F46] font-semibold';
                } else if (isPicked) {
                  btnClass = 'bg-[#FEF2F2] border-[#DC2626] text-[#991B1B]';
                } else {
                  btnClass = 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] opacity-70';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={blitzPicked !== null}
                  onClick={() => handleBlitzPick(idx)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors cursor-pointer flex items-center justify-between gap-2 ${btnClass}`}
                >
                  <span>{opt.text}</span>
                  {showOutcome && opt.isCorrect && (
                    <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  )}
                  {showOutcome && isPicked && !opt.isCorrect && (
                    <XCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {blitzPicked !== null && (
            <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
              <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#334155] space-y-2">
                {currentBlitz.formulaTex && (
                  <MathFormula tex={currentBlitz.formulaTex} displayMode />
                )}
                <p className="leading-relaxed">
                  <RichTermText
                    text={currentBlitz.options[blitzPicked].explain}
                    onOpenTerm={onOpenTerm}
                  />
                </p>
              </div>
              <button
                type="button"
                onClick={nextBlitzQuestion}
                className="px-5 py-2.5 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-[#1E40AF] transition-colors cursor-pointer"
              >
                {blitzIdx + 1 < blitzDeck.length ? 'Следующий вопрос' : 'Обновить числа и начать заново'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
