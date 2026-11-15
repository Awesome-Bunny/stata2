import { CHI2_TABLE, TEST_QUESTIONS_BANK } from '../data/nasledovData';
import { GeneratedTicket, TaskItem, TestQuestion } from '../types/stats';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatRu(num: number, decimals?: number): string {
  const fixed = decimals !== undefined ? Number(num.toFixed(decimals)) : num;
  return String(fixed).replace('.', ',');
}

export function generateExamTicket(
  origin: 'steps' | 'direct' | 'exam' = 'steps'
): GeneratedTicket {
  const idSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const ticketId = `gen_${idSuffix}_${Date.now().toString(36)}`;

  // --- TASK 1: Trend choice (linear vs parabolic) or parabolic forecast ---
  const isTwoModelChoice = Math.random() > 0.4;
  const tTargets = [
    { year: 2025, t: 13 },
    { year: 2026, t: 15 },
    { year: 2027, t: 17 },
  ];
  const target = pickRandom(tTargets);
  const linA = pickRandom([31200, 34500, 38400, 42100]);
  const linB = pickRandom([2400, 2850, 3150, 3400]);
  const parA = linA + 1800;
  const parB = linB - 900;
  const parC = pickRandom([75, 90, 110, -45]);

  let task1: TaskItem;
  if (isTwoModelChoice) {
    const linearWins = Math.random() > 0.35;
    const syLin = linearWins ? pickRandom([840, 960, 1120]) : pickRandom([3820, 4250]);
    const syPar = linearWins ? pickRandom([3910, 4680]) : pickRandom([720, 890]);
    const winnerModel = linearWins ? 'линейная' : 'параболическая';
    const forecast = linearWins
      ? linA + linB * target.t
      : parA + parB * target.t + parC * target.t * target.t;

    task1 = {
      id: `gen_${idSuffix}_t1`,
      num: 1,
      title: `Задание 1. Выбор уравнения тренда и прогноз (${target.year} г.)`,
      points: '4 балла',
      pointsNum: 4,
      formulaSummary: 'min(S_y) → ŷ(t)',
      formulaTex: '\\min(S_y) \\;\\Longrightarrow\\; \\hat{y}(t)',
      text: `Дана динамика средней з/п за 6 лет (2016–2021 гг., шаг чётного ряда $t$: $-5, -3, -1, +1, +3, +5$; для ${target.year} г. задано $t = ${target.t}$). Рассчитаны два [[уравнение тренда|тренда]]: 1) Линейный: $a = ${linA}$; $b = ${linB}$; [[ошибка модели тренда|ошибка модели]] $S_y = ${syLin}$. 2) Параболический: $a = ${parA}$; $b = ${parB}$; $c = ${parC}$; [[ошибка модели тренда|ошибка модели]] $S_y = ${syPar}$. Выберите точную модель и сделайте прогноз на ${target.year} год.`,
      trap: `Сначала сравните ошибки $S_y$: ${syLin} против ${syPar}. Побеждает модель с МЕНЬШЕЙ ошибкой (${winnerModel}). В параболе не забудьте квадратичное слагаемое $c \\cdot t^2$!`,
      steps: [
        {
          id: `gen_${idSuffix}_t1_s1`,
          label: 'Шаг 1. Какую модель выбираем по наименьшей ошибке $S_y$?',
          ans: linearWins ? ['линейная', 'линейный', '1'] : ['параболическая', 'параболический', '2'],
          quickChoices: ['линейная', 'параболическая'],
          hint: `Сравните $S_y$: $${Math.min(syLin, syPar)} < ${Math.max(syLin, syPar)}$ → выбираем ${winnerModel} модель.`,
        },
        {
          id: `gen_${idSuffix}_t1_s2`,
          label: `Шаг 2. Вычислите прогноз з/п на ${target.year} год ($t = ${target.t}$):`,
          ans: [String(forecast)],
          hint: linearWins
            ? `$\\hat{y} = ${linA} + ${linB} \\times ${target.t} = ${forecast}$ руб.`
            : `$\\hat{y} = ${parA} + ${parB} \\times ${target.t} + (${parC}) \\times ${target.t * target.t} = ${forecast}$ руб.`,
        },
      ],
    };
  } else {
    const cPos = Math.abs(parC);
    const forecast = parA + parB * target.t + cPos * target.t * target.t;
    task1 = {
      id: `gen_${idSuffix}_t1`,
      num: 1,
      title: `Задание 1. Прогноз по параболическому уравнению тренда (${target.year} г.)`,
      points: '4 балла',
      pointsNum: 4,
      formulaSummary: 'ŷ = a + b·t + c·t²',
      formulaTex: '\\hat{y} = a + b \\cdot t + c \\cdot t^2',
      text: `Динамика средней з/п за 6 лет (2016–2021 гг.) описывается [[уравнение тренда|параболическим трендом]]: $a = ${parA}$; $b = ${parB}$; $c = ${cPos}$. Сделайте прогноз з/п на ${target.year} год (при расчётном $t = ${target.t}$).`,
      trap: `Используется парабола $\\hat{y} = a + b \\cdot t + c \\cdot t^2$. Не забудьте умножить $c = ${cPos}$ на $t^2 = ${target.t * target.t}$!`,
      steps: [
        {
          id: `gen_${idSuffix}_t1_s1`,
          label: `Шаг 1. Вычислите линейную составляющую $b \\cdot t = ${parB} \\times ${target.t}$:`,
          ans: [String(parB * target.t)],
          hint: `$${parB} \\times ${target.t} = ${parB * target.t}$.`,
        },
        {
          id: `gen_${idSuffix}_t1_s2`,
          label: `Шаг 2. Вычислите полный прогноз $\\hat{y} = ${parA} + ${parB * target.t} + ${cPos} \\times ${target.t * target.t}$:`,
          ans: [String(forecast)],
          hint: `$${cPos} \\times ${target.t * target.t} = ${cPos * target.t * target.t}$; итог $= ${forecast}$ руб.`,
        },
      ],
    };
  }

  // --- TASK 2 & TASK 3: Variance / Eta^2 & Sampling error ---
  const combos = [
    { sigma: 4, innerVar: 12, eta: 25, n: 400, sqrtN: 20, xbar: 7.2 },
    { sigma: 2, innerVar: 2, eta: 50, n: 2500, sqrtN: 50, xbar: 6.9 },
    { sigma: 5, innerVar: 15, eta: 40, n: 625, sqrtN: 25, xbar: 6.5 },
    { sigma: 4, innerVar: 4, eta: 75, n: 1600, sqrtN: 40, xbar: 7.4 },
    { sigma: 5, innerVar: 20, eta: 20, n: 100, sqrtN: 10, xbar: 5.8 },
    { sigma: 6, innerVar: 18, eta: 50, n: 900, sqrtN: 30, xbar: 7.0 },
  ];
  const cfg = pickRandom(combos);
  const totalVar = cfg.sigma * cfg.sigma;
  const betweenVar = totalVar - cfg.innerVar;
  const meanErr = Number((cfg.sigma / cfg.sqrtN).toFixed(3));
  const delta95 = Number((2 * meanErr).toFixed(3));
  const delta99 = Number((3 * meanErr).toFixed(3));

  const task2: TaskItem = {
    id: `gen_${idSuffix}_t2`,
    num: 2,
    title: 'Задание 2. Доля влияния региона проживания (η²)',
    points: '4 балла',
    pointsNum: 4,
    formulaSummary: 'η² = (σ² − σ²_внутр) / σ² × 100%',
    formulaTex: '\\eta^2 = \\frac{\\sigma^2_{\\text{общ}} - \\overline{\\sigma^2_{\\text{внутр}}}}{\\sigma^2_{\\text{общ}}} \\cdot 100\\%',
    text: `Опрошено ${cfg.n} респондентов ([[выборка|выборка]] $n = ${cfg.n}$) в регионах РФ об удовлетворённости жизнью (шкала 1–10). [[среднее арифметическое|Среднее по выборке]] $\\bar{x} = ${formatRu(cfg.xbar)}$ балла, [[стандартное отклонение]] по всей выборке $\\sigma = ${cfg.sigma}$. Средняя из [[внутригрупповая дисперсия|дисперсий внутри регионов]] $= ${cfg.innerVar}$. Найдите [[коэффициент детерминации]] $\\eta^2$ (% влияния региона).`,
    trap: `Числа $${cfg.n}$ и $${formatRu(cfg.xbar)}$ здесь лишние! Сначала возведите $\\sigma = ${cfg.sigma}$ в квадрат ($${totalVar}$), и только потом вычитайте внутригрупповую дисперсию $${cfg.innerVar}$!`,
    steps: [
      {
        id: `gen_${idSuffix}_t2_s1`,
        label: 'Шаг 1. Найдите общую дисперсию $\\sigma^2_{\\text{общ}} = \\sigma^2$:',
        ans: [String(totalVar)],
        hint: `$${cfg.sigma}^2 = ${totalVar}$.`,
      },
      {
        id: `gen_${idSuffix}_t2_s2`,
        label: `Шаг 2. Найдите межгрупповую дисперсию $\\delta^2_{\\text{меж}} = ${totalVar} - ${cfg.innerVar}$:`,
        ans: [String(betweenVar)],
        hint: `$${totalVar} - ${cfg.innerVar} = ${betweenVar}$.`,
      },
      {
        id: `gen_${idSuffix}_t2_s3`,
        label: `Шаг 3. Найдите процент влияния региона $\\frac{${betweenVar}}{${totalVar}} \\times 100\\%$:`,
        ans: [String(cfg.eta), `${cfg.eta}%`],
        hint: `$\\frac{${betweenVar}}{${totalVar}} \\times 100\\% = ${cfg.eta}\\%$.`,
      },
    ],
  };

  const task3: TaskItem = {
    id: `gen_${idSuffix}_t3`,
    num: 3,
    title: 'Задание 3. Погрешность выборки для 95,4% и 99,7%',
    points: '4 балла',
    pointsNum: 4,
    formulaSummary: 'Δ = t · (σ / √n)',
    formulaTex: '\\Delta = t \\cdot \\frac{\\sigma}{\\sqrt{n}}',
    text: `Для выборки из задания №2 ($n = ${cfg.n}$, [[стандартное отклонение]] $\\sigma = ${cfg.sigma}$) рассчитайте [[предельная ошибка выборки|погрешность выборки $\\Delta$]] для [[доверительная вероятность|доверительных вероятностей]] $95{,}4\\%$ и $99{,}7\\%$.`,
    trap: `Сначала извлеките корень $\\sqrt{${cfg.n}} = ${cfg.sqrtN}$, найдите [[средняя ошибка выборки|среднюю ошибку]] $m = \\frac{${cfg.sigma}}{${cfg.sqrtN}} = ${formatRu(meanErr)}$, затем умножьте на $t = 2$ и $t = 3$.`,
    steps: [
      {
        id: `gen_${idSuffix}_t3_s1`,
        label: `Шаг 1. Средняя ошибка выборки $m = \\frac{${cfg.sigma}}{\\sqrt{${cfg.n}}}$:`,
        ans: [formatRu(meanErr), String(meanErr)],
        hint: `$\\frac{${cfg.sigma}}{${cfg.sqrtN}} = ${formatRu(meanErr)}$.`,
      },
      {
        id: `gen_${idSuffix}_t3_s2`,
        label: 'Шаг 2. Погрешность $\\Delta$ для вероятности $95{,}4\\%$ ($t = 2$):',
        ans: [formatRu(delta95), String(delta95)],
        hint: `$2 \\times ${formatRu(meanErr)} = ${formatRu(delta95)}$.`,
      },
      {
        id: `gen_${idSuffix}_t3_s3`,
        label: 'Шаг 3. Погрешность $\\Delta$ для вероятности $99{,}7\\%$ ($t = 3$):',
        ans: [formatRu(delta99), String(delta99)],
        hint: `$3 \\times ${formatRu(meanErr)} = ${formatRu(delta99)}$.`,
      },
    ],
  };

  // --- TASK 4 & TASK 5: Normality Chi2 (df = k - 3) coupled with Task 5 ---
  const kChoices = [6, 7, 8, 9, 10, 11, 12, 14];
  const k = pickRandom(kChoices);
  const df = k - 3;
  const chiRow = CHI2_TABLE.find((r) => r.df === df)!;
  const isNormal = Math.random() > 0.45;
  const chiEmp = isNormal
    ? Number((chiRow.p05 * (0.45 + Math.random() * 0.3)).toFixed(2))
    : Number((chiRow.p05 * (1.15 + Math.random() * 0.25)).toFixed(2));

  const task4: TaskItem = {
    id: `gen_${idSuffix}_t4`,
    num: 4,
    title: `Задание 4. Проверка нормальности по χ² (${k} интервалов)`,
    points: '4 балла',
    pointsNum: 4,
    formulaSummary: 'df = k − 3 | Сравнение χ²_эмп и χ²_табл',
    formulaTex: 'df = k - 3 \\quad | \\quad \\chi^2_{\\text{эмп}} \\gtrless \\chi^2_{\\text{табл}}',
    text: `Данные разбиты на ${k} интервалов ([[интервальный ряд|$k = ${k}$]]). Рассчитан [[критерий хи-квадрат пирсона|критерий $\\chi^2$ Пирсона]]: $\\chi^2_{\\text{эмп}} = ${formatRu(chiEmp, 2)}$. Найдите [[степени свободы]], табличное значение при [[уровень значимости|$p = 0{,}05$]] и сделайте вывод о [[нормальное распределение|нормальности]].`,
    trap: `Для проверки нормальности вычитаем 3: $df = ${k} - 3 = ${df}$! Табличный порог $= ${formatRu(chiRow.p05, 2)}$. Так как $${formatRu(chiEmp, 2)} ${isNormal ? '<' : '>'} ${formatRu(chiRow.p05, 2)}$, распределение ${isNormal ? 'СООТВЕТСТВУЕТ' : 'НЕ соответствует'} нормальному закону.`,
    steps: [
      {
        id: `gen_${idSuffix}_t4_s1`,
        label: `Шаг 1. Число степеней свободы $df = ${k} - 3$:`,
        ans: [String(df)],
        hint: `$${k} - 3 = ${df}$.`,
      },
      {
        id: `gen_${idSuffix}_t4_s2`,
        label: `Шаг 2. Табличное значение $\\chi^2_{\\text{табл}}$ ($df = ${df}$, $p = 0{,}05$):`,
        ans: [formatRu(chiRow.p05, 2), String(chiRow.p05)],
        hint: `По Приложению 4 для $df = ${df}$ критический порог равен $${formatRu(chiRow.p05, 2)}$.`,
      },
      {
        id: `gen_${idSuffix}_t4_s3`,
        label: 'Шаг 3. Вывод о соответствии нормальному закону:',
        ans: [isNormal ? 'соответствует' : 'не соответствует'],
        quickChoices: ['соответствует', 'не соответствует'],
        hint: isNormal
          ? `$${formatRu(chiEmp, 2)} < ${formatRu(chiRow.p05, 2)}$ → соответствует нормальному закону.`
          : `$${formatRu(chiEmp, 2)} > ${formatRu(chiRow.p05, 2)}$ → НЕ соответствует нормальному закону.`,
      },
    ],
  };

  let task5: TaskItem;
  if (!isNormal) {
    const low = Number((cfg.xbar - cfg.sigma).toFixed(1));
    const high = Number((cfg.xbar + cfg.sigma).toFixed(1));
    task5 = {
      id: `gen_${idSuffix}_t5`,
      num: 5,
      title: `Задание 5. Доля респондентов в интервале [${formatRu(low)}; ${formatRu(high)}]`,
      points: '4 балла',
      pointsNum: 4,
      formulaSummary: 'Проверка применимости нормального закона',
      formulaTex: 'z = \\frac{x - \\bar{x}}{\\sigma} \\;\\;\\text{(если в №4 нормальность подтверждена)}',
      text: `Оцените долю респондентов в границах от $${formatRu(low)}$ до $${formatRu(high)}$ баллов ($\\bar{x} = ${formatRu(cfg.xbar)}$; $\\sigma = ${cfg.sigma}$), учитывая результат проверки на [[нормальное распределение]] в задании №4.`,
      trap: 'ЛОВУШКА СВЯЗКИ №4 И №5: даже если границы похожи на $\\pm 1\\sigma$, в задании №4 нормальность была ОТВЕРГНУТА! Применять [[правило трёх сигм]] запрещено.',
      steps: [
        {
          id: `gen_${idSuffix}_t5_s1`,
          label: 'Шаг 1. Укажите долю респондентов (%) или вывод о невозможности оценки с учётом результата №4:',
          ans: [
            'данные не соответствуют нормальному закону, оценить невозможно',
            'оценить невозможно',
            'невозможно',
            'не соответствует',
            'не соответствуют',
            'нет',
          ],
          placeholder: 'Введите % или слово «невозможно»',
          hint: 'Так как в №4 $\\chi^2_{\\text{эмп}} > \\chi^2_{\\text{табл}}$, данные не соответствуют нормальному закону — оценить невозможно.',
        },
      ],
    };
  } else {
    const useTwoSigma = Math.random() > 0.6 && cfg.xbar - 2 * cfg.sigma >= 0;
    const mult = useTwoSigma ? 2 : 1;
    const low = Number((cfg.xbar - mult * cfg.sigma).toFixed(1));
    const high = Number((cfg.xbar + mult * cfg.sigma).toFixed(1));
    const pct = useTwoSigma ? '95,4' : '68,3';
    const pctAlt = useTwoSigma
      ? ['95,4', '95.4', '95,44', '95.44', '95,4%']
      : ['68,3', '68.3', '68,26', '68.26', '68,3%'];
    task5 = {
      id: `gen_${idSuffix}_t5`,
      num: 5,
      title: `Задание 5. Доля респондентов в интервале [${formatRu(low)}; ${formatRu(high)}]`,
      points: '4 балла',
      pointsNum: 4,
      formulaSummary: 'Проверка применимости нормального закона',
      formulaTex: 'z = \\frac{x - \\bar{x}}{\\sigma} \\;\\;\\text{(если в №4 нормальность подтверждена)}',
      text: `В задании №4 [[нормальное распределение|нормальность]] подтвердилась ($\\bar{x} = ${formatRu(cfg.xbar)}$; $\\sigma = ${cfg.sigma}$). Какая доля респондентов имеет оценки в пределах от $${formatRu(low)}$ до $${formatRu(high)}$ баллов?`,
      trap: `Проверьте расстояние от среднего $${formatRu(cfg.xbar)}$ до границ: ровно $\\pm ${mult}\\sigma$. Применяем [[правило трёх сигм]]!`,
      steps: [
        {
          id: `gen_${idSuffix}_t5_s1`,
          label: `Шаг 1. Сколько сигм ($\\sigma = ${cfg.sigma}$) отложено в каждую сторону от среднего $${formatRu(cfg.xbar)}$?`,
          ans: [String(mult)],
          hint: `$\\frac{${formatRu(high)} - ${formatRu(cfg.xbar)}}{${cfg.sigma}} = ${mult}$.`,
        },
        {
          id: `gen_${idSuffix}_t5_s2`,
          label: `Шаг 2. Доля наблюдений в пределах $\\pm ${mult}\\sigma$ (в %):`,
          ans: pctAlt,
          hint: `По правилу трёх сигм для $\\pm ${mult}\\sigma$ это $${pct}\\%$.`,
        },
      ],
    };
  }

  // --- TASK 6 & TASK 8: Scale to Method matching ---
  const t6IsNominalOrdinal = Math.random() > 0.5;
  const task6: TaskItem = t6IsNominalOrdinal
    ? {
        id: `gen_${idSuffix}_t6`,
        num: 6,
        title: 'Задание 6. Выбор критерия связи (ранговая 5 градаций + номинальная 3 категории)',
        points: '4 балла',
        pointsNum: 4,
        formulaSummary: 'Выбор критерия по типу шкал',
        formulaTex: '\\text{Шкала } X \\times \\text{Шкала } Y \\;\\longrightarrow\\; \\text{критерий связи}',
        text: 'Изучается связь между уровнем доверия СМИ (5 [[ранговая шкала|ранговых]] градаций) и типом населённого пункта (3 [[номинальная шкала|номинальные категории]]: мегаполис, малый город, село). Какой критерий и коэффициент силы связи применимы?',
        trap: 'Обе переменные категориальные ([[коэффициент взаимной сопряжённости|таблица сопряжённости]] $5 \\times 3$, $df = 8$). Дисперсионный анализ $\\eta^2$ не подходит — нужен [[критерий хи-квадрат пирсона|критерий $\\chi^2$ Пирсона]] и [[коэффициент взаимной сопряжённости|коэффициент сопряжённости $C$]].',
        steps: [
          {
            id: `gen_${idSuffix}_t6_s1`,
            label: 'Шаг 1. Выберите адекватный критерий анализа связи:',
            ans: [
              'критерий хи-квадрат пирсона',
              'хи-квадрат пирсона',
              'хи-квадрат',
              'хи квадрат',
              'критерий пирсона',
              'сопряженности',
              'крамера',
              'χ²',
            ],
            quickChoices: [
              'критерий хи-квадрат пирсона',
              'коэффициент детерминации',
              'коэффициент корреляции пирсона',
            ],
            hint: 'Для качественных (номинальных/ранговых) переменных в таблице сопряжённости применяются $\\chi^2$ Пирсона и коэффициент сопряжённости $C$.',
          },
        ],
      }
    : {
        id: `gen_${idSuffix}_t6`,
        num: 6,
        title: 'Задание 6. Выбор коэффициента связи (10-балльная нормальная + тип занятости)',
        points: '4 балла',
        pointsNum: 4,
        formulaSummary: 'Выбор критерия по типу шкал',
        formulaTex: '\\text{Шкала } X \\times \\text{Шкала } Y \\;\\longrightarrow\\; \\text{критерий связи}',
        text: 'Оценивается влияние типа занятости (4 [[номинальная шкала|номинальные категории]]) на индекс удовлетворённости работой (10-балльная [[шкала отношений|метрическая шкала]], [[нормальное распределение|нормальный закон]]). Какой коэффициент следует применить?',
        trap: 'Здесь зависимая переменная — метрическая с нормальным распределением! Поэтому выбираем [[коэффициент детерминации]] $\\eta^2$ ([[дисперсионный анализ]] ANOVA).',
        steps: [
          {
            id: `gen_${idSuffix}_t6_s1`,
            label: 'Шаг 1. Укажите метод или коэффициент силы влияния:',
            ans: [
              'коэффициент детерминации',
              'детерминации',
              'эта-квадрат',
              'эта квадрат',
              'дисперсионный анализ',
              'anova',
              'η²',
            ],
            quickChoices: [
              'коэффициент детерминации',
              'критерий хи-квадрат пирсона',
              'тау кендалла',
            ],
            hint: 'Фактор (категории) + нормальный метрический результат → коэффициент детерминации $\\eta^2$ / ANOVA.',
          },
        ],
      };

  // --- TASK 7: Kendall tau probability ---
  const tauVal = pickRandom([0.2, 0.3, 0.4, 0.5, 0.6, 0.8]);
  const isIncrease = Math.random() > 0.5;
  const prob = isIncrease ? (1 + tauVal) / 2 : (1 - tauVal) / 2;
  const probPct = Math.round(prob * 100);

  const task7: TaskItem = {
    id: `gen_${idSuffix}_t7`,
    num: 7,
    title: `Задание 7. Вероятность по коэффициенту τ Кендалла (${isIncrease ? 'УВЕЛИЧИТСЯ' : 'УМЕНЬШИТСЯ'})`,
    points: '4 балла',
    pointsNum: 4,
    formulaSummary: '(1 ± τ) / 2',
    formulaTex: 'P \\;/\\; Q = \\frac{1 \\pm \\tau}{2}',
    text: `Между уровнем дохода и долей расходов рассчитан [[тау кендалла|коэффициент Кендалла]] $\\tau = ${formatRu(tauVal)}$. Какова вероятность того, что с ростом дохода доля расходов ${isIncrease ? 'УВЕЛИЧИТСЯ' : 'УМЕНЬШИТСЯ'}?`,
    trap: isIncrease
      ? 'Слово «УВЕЛИЧИТСЯ» означает сонаправленность → берём ПЛЮС: $P = \\frac{1 + \\tau}{2}$.'
      : 'ВНИМАНИЕ: слово «УМЕНЬШИТСЯ» означает инверсию → берём МИНУС: $Q = \\frac{1 - \\tau}{2}$!',
    steps: [
      {
        id: `gen_${idSuffix}_t7_s1`,
        label: `Шаг 1. Вычислите вероятность (${isIncrease ? `$P = \\frac{1 + ${formatRu(tauVal)}}{2}$` : `$Q = \\frac{1 - ${formatRu(tauVal)}}{2}$`}):`,
        ans: [formatRu(prob), String(prob), String(probPct), `${probPct}%`],
        hint: `Результат: $${formatRu(prob)}$ (или $${probPct}\\%$).`,
      },
    ],
  };

  // --- TASK 8: Complementary scale matching ---
  const task8: TaskItem = t6IsNominalOrdinal
    ? {
        id: `gen_${idSuffix}_t8`,
        num: 8,
        title: 'Задание 8. Выбор метода (Образование 4 уровня + Метрический нормальный доход)',
        points: '4 балла',
        pointsNum: 4,
        formulaSummary: 'Выбор метода по типу шкал',
        formulaTex: '\\text{Шкала } X \\times \\text{Шкала } Y \\;\\longrightarrow\\; \\text{метод анализа}',
        text: 'Изучается связь между уровнем образования (4 [[ранговая шкала|ранговые]] категории) и ожидаемым доходом в рублях ([[шкала отношений|метрическая шкала]], [[нормальное распределение|нормальное распределение]]). Какой вид анализа нужен?',
        trap: 'Зависимая переменная метрическая и нормальная, фактор имеет 4 градации → [[дисперсионный анализ]] (ANOVA) и [[коэффициент детерминации]] $\\eta^2$.',
        steps: [
          {
            id: `gen_${idSuffix}_t8_s1`,
            label: 'Шаг 1. Выберите адекватный метод:',
            ans: [
              'дисперсионный анализ',
              'коэффициент детерминации',
              'детерминации',
              'эта-квадрат',
              'anova',
            ],
            quickChoices: [
              'дисперсионный анализ',
              'тау кендалла',
              'коэффициент ассоциации юла',
            ],
            hint: 'Однофакторный дисперсионный анализ (ANOVA) и $\\eta^2$.',
          },
        ],
      }
    : {
        id: `gen_${idSuffix}_t8`,
        num: 8,
        title: 'Задание 8. Выбор коэффициента для двух ранговых шкал',
        points: '2 балла',
        pointsNum: 2,
        formulaSummary: 'Выбор метода по типу шкал',
        formulaTex: '\\text{Шкала } X \\times \\text{Шкала } Y \\;\\longrightarrow\\; \\text{метод анализа}',
        text: 'Сопоставляются стаж работы в 4 [[ранговая шкала|упорядоченных группах]] и уровень лояльности организации (4 упорядоченные градации). Какой коэффициент корреляции следует выбрать?',
        trap: 'Обе шкалы порядковые (ранговые) → [[тау кендалла|коэффициент ранговой корреляции Кендалла]] ($\\tau$)!',
        steps: [
          {
            id: `gen_${idSuffix}_t8_s1`,
            label: 'Шаг 1. Выберите подходящий коэффициент корреляции:',
            ans: ['тау кендалла', 'кендалла', 'кенделл', 'коэффициент ранговой корреляции кендалла'],
            quickChoices: [
              'тау кендалла',
              'коэффициент корреляции пирсона',
              'коэффициент детерминации',
            ],
            hint: 'Для двух ранговых переменных используется коэффициент ранговой корреляции Кендалла ($\\tau$).',
          },
        ],
      };

  // --- TASK 9: Linear Regression ---
  const regA = pickRandom([2500, 3200, 3600, 4400, 5200]);
  const regB = pickRandom([0.08, 0.1, 0.12, 0.15]);
  const regX = pickRandom([100000, 150000, 200000, 250000, 300000]);
  const regY = Math.round(regA + regB * regX);

  const task9: TaskItem = {
    id: `gen_${idSuffix}_t9`,
    num: 9,
    title: 'Задание 9. Прогноз по уравнению линейной регрессии',
    points: '4 балла',
    pointsNum: 4,
    formulaSummary: 'ŷ = a + b · x',
    formulaTex: '\\hat{y} = a + b \\cdot x',
    text: `Зависимость расходов на обучение ($Y$) от дохода семьи ($X$) задана [[линейная регрессия|уравнением регрессии]]: $a = ${regA}$, $b = ${formatRu(regB)}$. Рассчитайте прогноз при доходе $X = ${regX.toLocaleString('ru-RU')}$ руб.`,
    trap: `Сначала умножьте $b = ${formatRu(regB)}$ на $${regX}$, затем прибавьте константу $a = ${regA}$.`,
    steps: [
      {
        id: `gen_${idSuffix}_t9_s1`,
        label: `Шаг 1. Вычислите $\\hat{y} = ${regA} + ${formatRu(regB)} \\times ${regX}$:`,
        ans: [String(regY)],
        hint: `$${formatRu(regB)} \\times ${regX} = ${Math.round(regB * regX)}$; $${regA} + ${Math.round(regB * regX)} = ${regY}$ руб.`,
      },
    ],
  };

  // --- TASKS 10-13: 4 Shuffled test questions from bank ---
  const pickedTests: TestQuestion[] = shuffle(TEST_QUESTIONS_BANK)
    .slice(0, 4)
    .map((q, idx) => ({
      ...q,
      id: `gen_${idSuffix}_q${idx + 10}_${q.id}`,
      variants: `Сгенерированный билет ${idSuffix} · Задание №${10 + idx}`,
      options: shuffle(q.options),
    }));

  return {
    id: ticketId,
    seedLabel: `Билет #${idSuffix}`,
    generatedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    createdAt: Date.now(),
    origin,
    tasks: [task1, task2, task3, task4, task5, task6, task7, task8, task9],
    tests: pickedTests,
  };
}
