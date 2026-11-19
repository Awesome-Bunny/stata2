import { CHI2_TABLE } from '../data/nasledovData';
import { TestOption, TestQuestion } from '../types/stats';

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

function makeCard(
  idPrefix: string,
  variants: string,
  topic: TestQuestion['topic'],
  question: string,
  options: TestOption[],
  formulaTex?: string
): TestQuestion {
  return {
    id: `${idPrefix}_${Math.random().toString(36).slice(2, 7)}`,
    variants,
    topic,
    points: 2,
    question,
    formulaTex,
    options: shuffle(options),
  };
}

/**
 * Generates procedural test questions grounded in all test topics (№10–13 + textbook rules).
 */
export function generateProceduralTestDeck(count: 4 | 8 = 4): TestQuestion[] {
  const templates: Array<() => TestQuestion> = [
    // 1. Sampling size & error (based on №10)
    () => {
      const scenario = pickRandom([
        {
          n1: 100,
          n2: 400,
          factor: 4,
          root: 2,
          dir: 'увеличили',
          errDir: 'уменьшится',
        },
        {
          n1: 200,
          n2: 1800,
          factor: 9,
          root: 3,
          dir: 'увеличили',
          errDir: 'уменьшится',
        },
        {
          n1: 1600,
          n2: 400,
          factor: 4,
          root: 2,
          dir: 'уменьшили',
          errDir: 'увеличится',
        },
      ]);

      return makeCard(
        'gen_q10_scale',
        'Сгенерированный тест · По типу №10 (Выборка)',
        'sampling',
        `При неизменных $\\sigma$ и [[коэффициент доверия|$t$]] объём [[выборка|выборки]] $n$ ${scenario.dir} в ${scenario.factor} раза (с $${scenario.n1}$ до $${scenario.n2}$ чел.). Как изменится [[предельная ошибка выборки]] $\\Delta = t \\cdot \\frac{\\sigma}{\\sqrt{n}}$?`,
        [
          {
            text: `Она ${scenario.errDir} в ${scenario.root} раза`,
            isCorrect: true,
            explain: `Верно! Объём выборки $n$ стоит под квадратным корнем в знаменателе: $\\sqrt{${scenario.factor}} = ${scenario.root}$, поэтому [[предельная ошибка выборки]] ${scenario.errDir} именно в ${scenario.root} раза.`,
          },
          {
            text: `Она ${scenario.errDir} в ${scenario.factor} раза`,
            isCorrect: false,
            explain: `Ошибка квадратного корня! В знаменателе формулы $\\Delta = t \\cdot \\frac{\\sigma}{\\sqrt{n}}$ стоит $\\sqrt{n}$, а не просто $n$, поэтому изменение в ${scenario.factor} раза даёт сдвиг в $\\sqrt{${scenario.factor}} = ${scenario.root}$ раза.`,
          },
          {
            text: 'Не изменится, так как зависит только от генеральной совокупности',
            isCorrect: false,
            explain:
              'Неверно: от выборки не зависит [[дисперсия]] генеральной совокупности, а вот ошибка выборки $\\Delta$ напрямую зависит от $n$.',
          },
        ],
        '\\Delta = t \\cdot \\frac{\\sigma}{\\sqrt{n}}'
      );
    },

    // 2. Sampling size sharp increase (based on №10 both)
    () => {
      const nVal = pickRandom([3000, 5000, 8000]);
      return makeCard(
        'gen_q10_dir',
        'Сгенерированный тест · По типу №10 (Точность)',
        'sampling',
        `Исследователь резко увеличил [[выборка|объём выборки]] до $n = ${nVal}$ человек при тех же показателях разброса в [[генеральная совокупность|генеральной совокупности]]. Какие два следствия верны?`,
        [
          {
            text: 'Уменьшение предельной ошибки выборки (Δ) и увеличение доверительной вероятности',
            isCorrect: true,
            explain:
              'Верно! Чем больше выборка $n$, тем меньше ошибка $\\Delta = t \\cdot \\frac{\\sigma}{\\sqrt{n}}$ (при фиксированном $t$) либо тем выше [[доверительная вероятность]] при заданной точности.',
          },
          {
            text: 'Увеличение предельной ошибки выборки',
            isCorrect: false,
            explain:
              'Неверно: рост $n$ уменьшает (а не увеличивает) ошибку $\\Delta$.',
          },
          {
            text: 'Увеличение дисперсии в генеральной совокупности',
            isCorrect: false,
            explain:
              'Неверно: [[дисперсия]] генеральной совокупности от объёма выборки $n$ не зависит.',
          },
        ],
        '\\Delta = t \\cdot \\frac{\\sigma}{\\sqrt{n}}, \\qquad n = \\frac{t^2 \\cdot \\sigma^2}{\\Delta^2}'
      );
    },

    // 3. Dichotomous 2x2 variables (based on №11)
    () => {
      const pair = pickRandom([
        '«Пол (мужской / женский)» и «Наличие водительских прав (да / нет)»',
        '«Проживание (город / село)» и «Удалённая работа (да / нет)»',
        '«Прохождение курса (да / нет)» и «Успешная сдача зачёта (да / нет)»',
        '«Наличие высшего образования (да / нет)» и «Волонтёрский опыт (да / нет)»',
      ]);

      return makeCard(
        'gen_q11_dich',
        'Сгенерированный тест · По типу №11 (Таблица 2×2)',
        'scales',
        `Изучается связь между двумя [[дихотомическая переменная|дихотомическими переменными]] в [[номинальная шкала|номинальной шкале]]: ${pair}. Какие коэффициенты предназначены для такой таблицы $2 \\times 2$?`,
        [
          {
            text: 'Коэффициент контингенции и коэффициент ассоциации',
            isCorrect: true,
            explain:
              'Верно! По учебнику А. Д. Наследова для четырёхпольной таблицы $2 \\times 2$ из двух дихотомических признаков применяются коэффициент контингенции ($\\phi$) и коэффициент ассоциации Юла ($Q$).',
          },
          {
            text: 'Коэффициент корреляции Пирсона и коэффициент детерминации',
            isCorrect: false,
            explain:
              'Неверно: оба этих показателя требуют количественной ([[шкала отношений|метрической]]) зависимой переменной.',
          },
          {
            text: 'Коэффициент ранговой корреляции Спирмена',
            isCorrect: false,
            explain:
              'Неверно: коэффициент Спирмена применяется для порядковых (ранговых) шкал, а не для номинальных дихотомий.',
          },
        ],
        'K_a = \\frac{ad - bc}{ad + bc}, \\qquad K_k = \\frac{ad - bc}{\\sqrt{(a+b)(c+d)(a+c)(b+d)}}'
      );
    },

    // 4. Confidence coefficient t & probability (based on №12-V1)
    () => {
      const variant = pickRandom([
        { t: 1, pct: '68,3%' },
        { t: 2, pct: '95,4%' },
        { t: 3, pct: '99,7%' },
      ]);
      const askTValue = Math.random() > 0.45;

      if (askTValue) {
        return makeCard(
          'gen_q12_tval',
          'Сгенерированный тест · По типу №12 (Коэффициент доверия)',
          'sampling',
          `При расчёте [[предельная ошибка выборки|предельной ошибки выборки]] $\\Delta = t \\cdot \\frac{\\sigma}{\\sqrt{n}}$ социолог задал [[доверительная вероятность|доверительную вероятность]] $${variant.pct}$. Чему равен [[коэффициент доверия]] $t$?`,
          [
            {
              text: `t = ${variant.t}`,
              isCorrect: true,
              explain: `Верно! По стандартному правилу курса для доверительной вероятности $${variant.pct}$ [[коэффициент доверия]] равен $t = ${variant.t}$.`,
            },
            {
              text: `t = ${variant.t === 2 ? 3 : 2}`,
              isCorrect: false,
              explain: `Неверно: $t = ${variant.t === 2 ? 3 : 2}$ соответствует доверительной вероятности $${variant.t === 2 ? '99,7%' : '95,4%'}$, а не $${variant.pct}$.`,
            },
            {
              text: 't = 0,05',
              isCorrect: false,
              explain:
                'Ловушка! $0{,}05$ — это [[уровень значимости]] ($p$), а не коэффициент доверия $t$ в формуле $\\Delta$.',
            },
          ],
          '\\Delta = t \\cdot \\frac{\\sigma}{\\sqrt{n}} \\quad (t=1 \\to 68{,}3\\%;\\; t=2 \\to 95{,}4\\%;\\; t=3 \\to 99{,}7\\%)'
        );
      }

      return makeCard(
        'gen_q12_tdef',
        'Сгенерированный тест · По типу №12 (Формула Δ)',
        'sampling',
        'Какой параметр в формуле [[предельная ошибка выборки|предельной ошибки выборки]] $\\Delta = t \\cdot \\frac{\\sigma}{\\sqrt{n}}$ задаётся выбранной [[доверительная вероятность|доверительной вероятностью]]?',
        [
          {
            text: 'Коэффициент доверия t',
            isCorrect: true,
            explain:
              'Верно! Именно [[коэффициент доверия]] $t$ определяется заданной доверительной вероятностью ($1 \\to 68{,}3\\%;\\; 2 \\to 95{,}4\\%;\\; 3 \\to 99{,}7\\%$).',
          },
          {
            text: 'Стандартное отклонение σ',
            isCorrect: false,
            explain:
              'Неверно: [[стандартное отклонение]] $\\sigma$ характеризует разброс признака в выборке, а не уровень доверия.',
          },
          {
            text: 'Объём выборки n',
            isCorrect: false,
            explain:
              'Неверно: $n$ — это число опрошенных респондентов.',
          },
        ],
        '\\Delta = t \\cdot \\frac{\\sigma}{\\sqrt{n}} \\quad (t=1 \\to 68{,}3\\%;\\; t=2 \\to 95{,}4\\%;\\; t=3 \\to 99{,}7\\%)'
      );
    },

    // 5. Coefficient bounds & direction traps (based on №12-V3 & №13-V1)
    () => {
      const boundCase = pickRandom([
        {
          name: '[[коэффициент корреляции пирсона|коэффициент линейной корреляции Пирсона]] ($r$) при ПРЯМОЙ связи',
          correct: 'От 0 до +1',
          explainCorrect:
            'Верно! Прямая (положительная) связь означает $r > 0$, поэтому при прямой связи диапазон составляет от $0$ до $+1$ (а не от $-1$ до $+1$).',
          wrong1: 'От -1 до +1',
          explainWrong1:
            'Попались в классическую ловушку Билета №13! От $-1$ до $+1$ — это полный диапазон при любом знаке, а условие «при ПРЯМОЙ связи» оставляет только $[0; +1]$.',
          wrong2: 'От -1 до 0',
          explainWrong2:
            'Неверно: от $-1$ до $0$ коэффициент изменяется при ОБРАТНОЙ связи.',
        },
        {
          name: '[[коэффициент корреляции пирсона|коэффициент корреляции Пирсона]] ($r$) при ОБРАТНОЙ связи',
          correct: 'От -1 до 0',
          explainCorrect:
            'Верно! Обратная (отрицательная) связь означает, что с ростом одного признака второй снижается ($r < 0$), то есть пределы от $-1$ до $0$.',
          wrong1: 'От -1 до +1',
          explainWrong1:
            'Ловушка формулировки! Вопрос ограничивает связь только ОБРАТНОЙ, значит положительная часть $(0; +1]$ исключается.',
          wrong2: 'От 0 до +1',
          explainWrong2:
            'Неверно: $[0; +1]$ соответствует прямой (положительной) связи.',
        },
        {
          name: '[[тау кендалла|коэффициент ранговой корреляции Кендалла]] ($\\tau$) в общем случае',
          correct: 'От -1 до +1',
          explainCorrect:
            'Верно! Ранговая корреляция Кендалла $\\tau$ показывает и силу, и направление связи, поэтому принимает значения в диапазоне $[-1; +1]$.',
          wrong1: 'От 0 до +1',
          explainWrong1:
            'Неверно: без направления (знака) от $0$ до $1$ измеряются [[коэффициент детерминации]] $\\eta^2$ и коэффициент сопряжённости $C$, но не $\\tau$ Кендалла.',
          wrong2: 'От 0 до бесконечности',
          explainWrong2:
            'Неверно: от $0$ до $+\\infty$ принимает значения статистика $\\chi^2$, а коэффициенты корреляции нормированы.',
        },
      ]);

      return makeCard(
        'gen_q13_bounds',
        'Сгенерированный тест · По типу №12/№13 (Пределы коэффициентов)',
        'correlation',
        `В каких пределах изменяется ${boundCase.name}?`,
        [
          {
            text: boundCase.correct,
            isCorrect: true,
            explain: boundCase.explainCorrect,
          },
          {
            text: boundCase.wrong1,
            isCorrect: false,
            explain: boundCase.explainWrong1,
          },
          {
            text: boundCase.wrong2,
            isCorrect: false,
            explain: boundCase.explainWrong2,
          },
        ],
        boundCase.name.includes('Кендалла')
          ? '\\tau = \\frac{P - Q}{\\frac{1}{2}n(n - 1)} \\in [-1; +1]'
          : 'r = \\frac{\\sum (x - \\bar{x})(y - \\bar{y})}{\\sqrt{\\sum (x - \\bar{x})^2 \\cdot \\sum (y - \\bar{y})^2}} \\in [-1; +1]'
      );
    },

    // 6. Scales -> Right statistical test (based on №13-V3, №6, №8)
    () => {
      const scaleScenario = pickRandom([
        {
          prompt:
            'доход семьи в рублях ([[шкала отношений|метрическая шкала]], [[нормальное распределение|нормальный закон]]) и ежемесячные траты на досуг в рублях (метрическая, нормальный закон)',
          correct: 'Линейный коэффициент корреляции Пирсона (r)',
          explainCorrect:
            'Верно! Для двух метрических нормально распределённых переменных применяется параметрический коэффициент корреляции $r$ Пирсона.',
          wrong1: 'Коэффициент контингенции Пирсона (φ)',
          explainWrong1:
            'Неверно: коэффициент контингенции предназначен для двух дихотомических признаков ($2 \\times 2$).',
          wrong2: 'Критерий Хи-квадрат (χ²) для таблицы сопряжённости',
          explainWrong2:
            'Неверно: $\\chi^2$ сопряжённости используется для качественных (номинальных/ранговых) шкал.',
        },
        {
          prompt:
            'уровень образования (4 [[ранговая шкала|упорядоченные градации]]) и степень доверия институтам (5 упорядоченных градаций)',
          correct: 'Коэффициент ранговой корреляции Кендалла (τ)',
          explainCorrect:
            'Верно! Когда обе переменные измерены в порядковой (ранговой) шкале, применяется непараметрический коэффициент ранговой корреляции Кендалла ($\\tau$).',
          wrong1: 'Линейный коэффициент корреляции Пирсона (r)',
          explainWrong1:
            'Неверно: коэффициент $r$ Пирсона требует только [[шкала отношений|метрических шкал]].',
          wrong2: 'Коэффициент ассоциации Юла (Q)',
          explainWrong2:
            'Неверно: коэффициент ассоциации Юла работает только в таблице $2 \\times 2$ для дихотомических признаков.',
        },
        {
          prompt:
            'федеральный округ ([[номинальная шкала]], 6 категорий) и оценка качества жизни (10-балльная [[шкала отношений|метрическая шкала]], [[нормальное распределение|нормальный закон]])',
          correct: 'Однофакторный дисперсионный анализ (ANOVA) и η²',
          explainCorrect:
            'Верно! Категориальный фактор + метрическая нормально распределённая зависимая переменная — это задача для [[дисперсионный анализ|ANOVA]] и [[коэффициент детерминации|коэффициента детерминации]] $\\eta^2$.',
          wrong1: 'Коэффициент корреляции Пирсона (r)',
          explainWrong1:
            'Неверно: федеральный округ задан в номинальной шкале, для которой нельзя считать $r$ Пирсона.',
          wrong2: 'Коэффициент ранговой корреляции Кендалла (τ)',
          explainWrong2:
            'Неверно: номинальные категории регионов не имеют порядка «больше–меньше», поэтому ранговый $\\tau$ неприменим.',
        },
      ]);

      return makeCard(
        'gen_q13_scales',
        'Сгенерированный тест · По типу №13 / №6 / №8 (Шкалы)',
        'scales',
        `Какой метод или коэффициент следует выбрать, если даны две переменные: ${scaleScenario.prompt}?`,
        [
          {
            text: scaleScenario.correct,
            isCorrect: true,
            explain: scaleScenario.explainCorrect,
          },
          {
            text: scaleScenario.wrong1,
            isCorrect: false,
            explain: scaleScenario.explainWrong1,
          },
          {
            text: scaleScenario.wrong2,
            isCorrect: false,
            explain: scaleScenario.explainWrong2,
          },
        ],
        scaleScenario.correct.includes('Пирсона')
          ? 'r = \\frac{\\sum (x - \\bar{x})(y - \\bar{y})}{\\sqrt{\\sum (x - \\bar{x})^2 \\cdot \\sum (y - \\bar{y})^2}}'
          : scaleScenario.correct.includes('Кендалла')
          ? '\\tau = \\frac{P - Q}{\\frac{1}{2}n(n - 1)}'
          : '\\eta^2 = \\frac{\\delta^2_{\\text{меж}}}{\\sigma^2_{\\text{общ}}} = \\frac{\\sigma^2_{\\text{общ}} - \\overline{\\sigma^2_{\\text{внутр}}}}{\\sigma^2_{\\text{общ}}}'
      );
    },

    // 7. Degrees of freedom df & Chi-squared trap (based on df bonus / №4 vs №6)
    () => {
      const isNormality = Math.random() > 0.45;
      if (isNormality) {
        const k = pickRandom([6, 7, 8, 9, 10, 12, 14]);
        const df = k - 3;
        const row = CHI2_TABLE.find((r) => r.df === df)!;
        const empOk = Math.random() > 0.5;
        const emp = Number(
          (row.p05 * (empOk ? 0.65 : 1.25)).toFixed(2)
        );
        return makeCard(
          'gen_df_norm',
          'Сгенерированный тест · Степени свободы df (№4)',
          'df',
          `При проверке [[нормальное распределение|нормальности распределения]] данные разбиты на $k = ${k}$ интервалов, получено $\\chi^2_{\\text{эмп}} = ${formatRu(emp, 2)}$. Каково число [[степени свободы|степеней свободы]] $df$ и каков вывод при $p = 0{,}05$ ($\\chi^2_{\\text{табл}} = ${formatRu(row.p05, 2)}$)?`,
          [
            {
              text: `df = ${df}; распределение ${empOk ? 'соответствует' : 'НЕ соответствует'} нормальному закону`,
              isCorrect: true,
              explain: `Верно! Для проверки нормальности $df = k - 3 = ${k} - 3 = ${df}$. Так как $${formatRu(emp, 2)} ${empOk ? '<' : '>'} ${formatRu(row.p05, 2)}$, распределение ${empOk ? 'соответствует' : 'не соответствует'} нормальному закону.`,
            },
            {
              text: `df = ${k - 1}; распределение ${empOk ? 'НЕ соответствует' : 'соответствует'} нормальному закону`,
              isCorrect: false,
              explain: `Двойная ошибка! При проверке нормальности вычитаем $3$ ($df = ${k} - 3 = ${df}$), а не $1$. Кроме того, нормальность принимается при $\\chi^2_{\\text{эмп}} < \\chi^2_{\\text{табл}}$.`,
            },
            {
              text: `df = ${df}; распределение ${empOk ? 'НЕ соответствует' : 'соответствует'} нормальному закону`,
              isCorrect: false,
              explain: `Степени свободы $df = ${df}$ найдены верно, но вывод перепутан! Нормальность подтверждается, когда $\\chi^2_{\\text{эмп}} < \\chi^2_{\\text{табл}}$, и отвергается при $\\chi^2_{\\text{эмп}} > \\chi^2_{\\text{табл}}$.`,
            },
          ],
          'df = k - 3, \\qquad \\chi^2_{\\text{эмп}} < \\chi^2_{\\text{табл}} \\;\\Rightarrow\\; \\text{норма}'
        );
      }

      const r = pickRandom([3, 4, 5]);
      const c = pickRandom([3, 4, 5]);
      const df = (r - 1) * (c - 1);
      return makeCard(
        'gen_df_cont',
        'Сгенерированный тест · Степени свободы df (№6)',
        'df',
        `Построена [[коэффициент взаимной сопряжённости|таблица сопряжённости]] двух категориальных переменных размером $${r} \\times ${c}$ ($r = ${r}$ строк, $c = ${c}$ столбцов). Чему равно число [[степени свободы|степеней свободы]] $df$?`,
        [
          {
            text: `df = ${df}`,
            isCorrect: true,
            explain: `Верно! Для таблицы сопряжённости используется формула $df = (r - 1)(c - 1) = (${r} - 1)(${c} - 1) = ${df}$.`,
          },
          {
            text: `df = ${r * c - 3}`,
            isCorrect: false,
            explain: `Ловушка! Вы применили формулу нормальности $k - 3$ к числу ячеек ($${r * c} - 3$), хотя для таблицы $r \\times c$ нужно $df = (r - 1)(c - 1) = ${df}$.`,
          },
          {
            text: `df = ${r * c}`,
            isCorrect: false,
            explain: `Неверно: $${r} \\times ${c} = ${r * c}$ — это просто общее количество ячеек таблицы, без вычета связей.`,
          },
        ],
        'df = (r - 1)(c - 1)'
      );
    },

    // 8. Kendall tau direction probability trap (based on №7)
    () => {
      const tau = pickRandom([0.2, 0.3, 0.4, 0.6, 0.8]);
      const isUp = Math.random() > 0.5;
      const ans = isUp ? (1 + tau) / 2 : (1 - tau) / 2;
      const wrongAns = isUp ? (1 - tau) / 2 : (1 + tau) / 2;
      const ansPct = Math.round(ans * 100);
      const wrongPct = Math.round(wrongAns * 100);

      return makeCard(
        'gen_kendall_prob',
        'Сгенерированный тест · Ловушка №7 (Тау Кендалла)',
        'correlation',
        `Между доходом и долей сбережений получен [[тау кендалла|коэффициент Кендалла]] $\\tau = ${formatRu(tau)}$. Какова вероятность того, что с ростом дохода доля сбережений ${isUp ? 'УВЕЛИЧИТСЯ' : 'УМЕНЬШИТСЯ'}?`,
        [
          {
            text: `${formatRu(ans)} (${ansPct}%)`,
            isCorrect: true,
            explain: `Верно! Слово «${isUp ? 'УВЕЛИЧИТСЯ' : 'УМЕНЬШИТСЯ'}» задаёт ${isUp ? 'сонаправленное изменение → знак ПЛЮС' : 'инверсию → знак МИНУС'}: $${isUp ? `\\frac{1 + ${formatRu(tau)}}{2}` : `\\frac{1 - ${formatRu(tau)}}{2}`} = ${formatRu(ans)}$ ($${ansPct}\\%$).`,
          },
          {
            text: `${formatRu(wrongAns)} (${wrongPct}%)`,
            isCorrect: false,
            explain: `Ловушка знака! Формула с ${isUp ? 'минусом' : 'плюсом'} вычисляет вероятность ${isUp ? 'уменьшения' : 'увеличения'}, а в вопросе спрашивается про «${isUp ? 'УВЕЛИЧИТСЯ' : 'УМЕНЬШИТСЯ'}».`,
          },
          {
            text: `${formatRu(tau)} (${Math.round(tau * 100)}%)`,
            isCorrect: false,
            explain:
              'Неверно: само значение $\\tau = P - Q$ является разностью вероятностей, а не отдельной вероятностью.',
          },
        ],
        isUp ? 'P = \\frac{1 + \\tau}{2}' : 'Q = \\frac{1 - \\tau}{2}'
      );
    },

    // 9. Trend model S_y comparison (based on №1)
    () => {
      const syLin = pickRandom([780, 950, 1140]);
      const syPar = pickRandom([2890, 3640, 4420]);
      const linBetter = Math.random() > 0.35;
      const aVal = linBetter ? syLin : syPar;
      const bVal = linBetter ? syPar : syLin;

      return makeCard(
        'gen_models_sy',
        'Сгенерированный тест · По типу №1 (Ошибка модели)',
        'models',
        `Для временного ряда построены два [[уравнение тренда|уравнения тренда]]: линейный тренд имеет [[ошибка модели тренда|ошибку модели]] $S_y = ${aVal}$, а параболический — $S_y = ${bVal}$. Какую модель нужно использовать для прогноза?`,
        [
          {
            text: linBetter
              ? `Линейную, так как её ошибка S_y меньше (${aVal} < ${bVal})`
              : `Параболическую, так как её ошибка S_y меньше (${bVal} < ${aVal})`,
            isCorrect: true,
            explain: `Верно! Критерий отбора модели — минимум стандартной ошибки оценки $\\min(S_y)$: чем меньше $S_y$, тем ближе расчётная кривая к реальным данным.`,
          },
          {
            text: linBetter
              ? `Параболическую, так как её ошибка S_y выше (${bVal} > ${aVal})`
              : `Линейную, так как у неё больше ошибка S_y (${aVal} > ${bVal})`,
            isCorrect: false,
            explain:
              'Ошибка выбора критерия! Высокое значение $S_y$ показывает сильный промах модели, а не её качество.',
          },
          {
            text: 'Среднее арифметическое прогнозов обеих моделей',
            isCorrect: false,
            explain:
              'Неверно: выбирается единственная модель с наименьшей ошибкой $S_y$.',
          },
        ],
        '\\min(S_y) \\;\\Rightarrow\\; \\hat{y}(t)'
      );
    },
  ];

  const pickedFns =
    count <= templates.length
      ? shuffle(templates).slice(0, count)
      : [...shuffle(templates), pickRandom(templates)].slice(0, count);

  return pickedFns.map((fn) => fn());
}

export function generateTestQuestionByNum(num: 10 | 11 | 12 | 13): TestQuestion {
  const matchPrefix: Record<10 | 11 | 12 | 13, string[]> = {
    10: ['gen_q10_scale', 'gen_q10_dir'],
    11: ['gen_q11_dich', 'gen_df_cont'],
    12: ['gen_q12_tval', 'gen_q12_tdef', 'gen_kendall_prob'],
    13: ['gen_q13_bounds', 'gen_q13_scales'],
  };

  let lastDeck: TestQuestion[] = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    lastDeck = generateProceduralTestDeck(8);
    const candidates = lastDeck.filter((q) =>
      matchPrefix[num].some((prefix) => q.id.startsWith(prefix))
    );
    if (candidates.length > 0) {
      return pickRandom(candidates);
    }
  }
  return pickRandom(lastDeck);
}
