import React, { useState } from 'react';
import { ArrowLeftRight, AlertTriangle } from 'lucide-react';
import { TASKS_DATA } from '../data/nasledovData';
import { MathFormula } from './MathFormula';
import { RichTermText } from './RichTermText';

interface ComparisonViewProps {
  onOpenTerm: (termKey: string) => void;
}

const TEST_DIFFS = [
  {
    num: '10–11',
    topic: 'Общие тестовые вопросы обоих вариантов',
    v1: '№10: при резком росте $n$ $\\to$ уменьшение $\\Delta$ и увеличение доверительной вероятности. №11: для $2 \\times 2$ $\\to$ коэффициент контингенции и коэффициент ассоциации.',
    v3: 'Совпадает с Вариантом 1: формулировки и ключи в №10 и №11 идентичны.',
  },
  {
    num: '12',
    topic: 'Фокус вопроса №12',
    v1: 'Что определяет коэффициент $t$ в формуле $\\Delta = t \\cdot \\frac{\\sigma}{\\sqrt{n}}$? Ответ: доверительную вероятность.',
    v3: 'В каком диапазоне изменяется коэффициент ранговой корреляции Кендалла $\\tau$? Ответ: от $-1$ до $+1$.',
  },
  {
    num: '13',
    topic: 'Ловушка по коэффициенту Пирсона (№13)',
    v1: 'Пределы Пирсона ПРИ ПРЯМОЙ связи $\\to$ от $0$ до $+1$ (не от $-1$ до $+1$!).',
    v3: 'Шкалы переменных для расчёта коэффициента Пирсона $\\to$ только метрическая.',
  },
];

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  onOpenTerm,
}) => {
  const [v1Target, setV1Target] = useState<'v1_stepanov' | 'v1'>('v1_stepanov');
  const [v3Target, setV3Target] = useState<'v3_avdeeva' | 'v3_new' | 'v3'>('v3_avdeeva');

  const v1 = v1Target === 'v1_stepanov' ? TASKS_DATA.v1_stepanov : TASKS_DATA.v1;
  const v1Label =
    v1Target === 'v1_stepanov'
      ? 'Вариант 1 (печатный)'
      : 'Вариант 1 (базовый)';

  const v3 =
    v3Target === 'v3_avdeeva'
      ? TASKS_DATA.v3_avdeeva
      : v3Target === 'v3_new'
      ? TASKS_DATA.v3_new
      : TASKS_DATA.v3;
  const v3Label =
    v3Target === 'v3_avdeeva'
      ? 'Вариант 3 (печатный, 2026)'
      : v3Target === 'v3_new'
      ? 'Вариант 3 (печатный, 2027)'
      : 'Вариант 3 (текстовый)';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] mb-1">
            <ArrowLeftRight className="w-4 h-4" />
            <span>Сравнительная матрица</span>
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">
            {v1Label} vs {v3Label} бок о бок
          </h2>
          <p className="text-sm text-[#475569] mt-1">
            Сопоставление формул, условий и ловушек по всем заданиям №1–13, чтобы
            вы не перепутали шаблон решения при смене номера билета.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 shrink-0">
          <div className="inline-flex rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-0.5">
            <button
              type="button"
              onClick={() => setV1Target('v1_stepanov')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                v1Target === 'v1_stepanov'
                  ? 'bg-[#1D4ED8] text-white'
                  : 'text-[#334155] hover:bg-[#F1F5F9]'
              }`}
            >
              В1 (печатный)
            </button>
            <button
              type="button"
              onClick={() => setV1Target('v1')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                v1Target === 'v1'
                  ? 'bg-[#1D4ED8] text-white'
                  : 'text-[#334155] hover:bg-[#F1F5F9]'
              }`}
            >
              В1 (базовый)
            </button>
          </div>

          <div className="inline-flex rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-0.5">
            <button
              type="button"
              onClick={() => setV3Target('v3_avdeeva')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                v3Target === 'v3_avdeeva'
                  ? 'bg-[#0284C7] text-white'
                  : 'text-[#334155] hover:bg-[#F1F5F9]'
              }`}
            >
              В3 (2026)
            </button>
            <button
              type="button"
              onClick={() => setV3Target('v3_new')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                v3Target === 'v3_new'
                  ? 'bg-[#0284C7] text-white'
                  : 'text-[#334155] hover:bg-[#F1F5F9]'
              }`}
            >
              В3 (2027)
            </button>
            <button
              type="button"
              onClick={() => setV3Target('v3')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                v3Target === 'v3'
                  ? 'bg-[#0284C7] text-white'
                  : 'text-[#334155] hover:bg-[#F1F5F9]'
              }`}
            >
              В3 (текст)
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {v1.map((t1, idx) => {
          const t3 = v3[idx];
          return (
            <section
              key={t1.num}
              className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                <h3 className="text-base font-bold text-[#1D4ED8] tabular-nums">
                  Задание №{t1.num}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#475569]">
                  <span>В1: <MathFormula tex={t1.formulaTex} /></span>
                  <span>·</span>
                  <span>В3: <MathFormula tex={t3.formulaTex} /></span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Variant 1 */}
                <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                    {v1Label} · {t1.points}
                  </div>
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    {t1.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-[#334155]">
                    <RichTermText text={t1.text} onOpenTerm={onOpenTerm} />
                  </p>
                  <div className="p-2.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed text-[#78350F]">
                      <RichTermText text={t1.trap} onOpenTerm={onOpenTerm} />
                    </p>
                  </div>
                  <div className="text-xs font-mono font-semibold text-[#059669] tabular-nums pt-1">
                    Эталон: {t1.steps.map((s) => s.ans[0]).join(' → ')}
                  </div>
                </div>

                {/* Variant 3 */}
                <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
                    {v3Label} · {t3.points}
                  </div>
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    {t3.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-[#334155]">
                    <RichTermText text={t3.text} onOpenTerm={onOpenTerm} />
                  </p>
                  <div className="p-2.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed text-[#78350F]">
                      <RichTermText text={t3.trap} onOpenTerm={onOpenTerm} />
                    </p>
                  </div>
                  <div className="text-xs font-mono font-semibold text-[#059669] tabular-nums pt-1">
                    Эталон: {t3.steps.map((s) => s.ans[0]).join(' → ')}
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        {/* Tests 10-13 summary */}
        <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
          <h3 className="text-base font-bold text-[#0F172A]">
            Тестовые задания №10–13: ключевые различия
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {TEST_DIFFS.map((row) => (
              <div
                key={row.num}
                className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
              >
                <div>
                  <div className="text-xs font-semibold text-[#1D4ED8] mb-1">
                    №{row.num} · Вариант 1 ({row.topic})
                  </div>
                  <p className="text-xs text-[#334155] leading-relaxed">
                    <RichTermText text={row.v1} onOpenTerm={onOpenTerm} />
                  </p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#0284C7] mb-1">
                    №{row.num} · Вариант 3
                  </div>
                  <p className="text-xs text-[#334155] leading-relaxed">
                    <RichTermText text={row.v3} onOpenTerm={onOpenTerm} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
