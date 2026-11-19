import { TaskDirectKind, TaskItem } from '../types/stats';

export interface DirectFieldSpec {
  key: string;
  label: string;
  placeholder: string;
  ans: string[];
  tolerance: number;
  isNumeric: boolean;
}

export function resolveTaskDirectKind(task: TaskItem): TaskDirectKind {
  if (task.directKind) return task.directKind;
  if (task.num === 1) return 'trend';
  if (task.num === 2) return 'eta2';
  if (task.num === 3) return task.steps.length >= 3 ? 'sampling_pair' : 'sampling_single';
  if (task.num === 4) return 'chi2_normality';
  if (task.num === 5) return 'normal_share';
  if (task.num === 6 || task.num === 8) return 'method_choice';
  if (task.num === 7) return 'kendall_prob';
  return 'regression';
}

export function getDirectFields(
  task: TaskItem,
  strictNoHints = false
): DirectFieldSpec[] {
  const lastStep = task.steps[task.steps.length - 1];
  const kind = resolveTaskDirectKind(task);

  if (strictNoHints) {
    if (kind === 'sampling_pair' && task.steps.length >= 3) {
      return [
        {
          key: 'd95',
          label: 'Для 95,4%:',
          placeholder: 'Введите ответ',
          ans: task.steps[1].ans,
          tolerance: task.steps[1].numericTolerance ?? 0.02,
          isNumeric: true,
        },
        {
          key: 'd99',
          label: 'Для 99,7%:',
          placeholder: 'Введите ответ',
          ans: task.steps[2].ans,
          tolerance: task.steps[2].numericTolerance ?? 0.02,
          isNumeric: true,
        },
      ];
    }

    if (kind === 'chi2_normality') {
      return [
        {
          key: 'chi2Crit',
          label: 'χ²_табл (p = 0,05):',
          placeholder: 'Введите ответ',
          ans: task.steps[1]?.ans || [],
          tolerance: task.steps[1]?.numericTolerance ?? 0.02,
          isNumeric: true,
        },
        {
          key: 'main',
          label: 'Вывод:',
          placeholder: 'Введите ответ',
          ans: lastStep.ans,
          tolerance: 0.02,
          isNumeric: false,
        },
      ];
    }

    return [
      {
        key: 'main',
        label: 'Ответ:',
        placeholder: 'Введите ответ',
        ans: lastStep.ans,
        tolerance:
          kind === 'trend' || kind === 'regression'
            ? lastStep.numericTolerance ?? 0.5
            : kind === 'eta2'
            ? lastStep.numericTolerance ?? 0.05
            : kind === 'normal_share'
            ? lastStep.numericTolerance ?? 0.15
            : lastStep.numericTolerance ?? 0.02,
        isNumeric: kind !== 'method_choice',
      },
    ];
  }

  if (kind === 'trend') {
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

  if (kind === 'eta2') {
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

  if (kind === 'sampling_pair' && task.steps.length >= 3) {
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

  if (kind === 'sampling_single') {
    return [
      {
        key: 'main',
        label: 'Погрешность Δ для 95,4% (t = 2):',
        placeholder: 'Введите десятичное число',
        ans: lastStep.ans,
        tolerance: lastStep.numericTolerance ?? 0.02,
        isNumeric: true,
      },
    ];
  }

  if (kind === 'chi2_normality') {
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

  if (kind === 'normal_share') {
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

  if (kind === 'method_choice') {
    return [
      {
        key: 'main',
        label:
          task.num === 5 || task.num === 6
            ? 'Критерий / коэффициент для оценки связи:'
            : 'Подходящий метод анализа или коэффициент:',
        placeholder:
          task.num === 5 || task.num === 6
            ? 'Введите название критерия или коэффициента'
            : 'Введите название метода или коэффициента',
        ans: lastStep.ans,
        tolerance: 0.02,
        isNumeric: false,
      },
    ];
  }

  if (kind === 'kendall_prob') {
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
      label: 'Итоговый прогноз по регрессии (руб.):',
      placeholder: 'Введите итоговое значение',
      ans: lastStep.ans,
      tolerance: lastStep.numericTolerance ?? 0.5,
      isNumeric: true,
    },
  ];
}
