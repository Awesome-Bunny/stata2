import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Flame,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { TEST_QUESTIONS_BANK } from '../data/nasledovData';
import { MistakeItem, TrainerProgressState } from '../types/stats';
import { stableIndexOrder } from '../utils/validation';
import { RichTermText } from './RichTermText';

interface TestTrainerProps {
  progress: TrainerProgressState;
  onOpenTerm: (termKey: string) => void;
  onTestResult: (
    questionId: string,
    optionIdx: number,
    isCorrect: boolean,
    mistake?: Omit<MistakeItem, 'id' | 'createdAt'>
  ) => void;
  onResetTests: () => void;
  onResolveMistake: (id: string) => void;
  onOpenCardsMode?: () => void;
}

type FilterKey = 'all' | 'core' | 'df_scales' | 'sampling_corr' | 'mistakes';

export const TestTrainer: React.FC<TestTrainerProps> = ({
  progress,
  onOpenTerm,
  onTestResult,
  onResetTests,
  onResolveMistake,
  onOpenCardsMode,
}) => {
  const [filter, setFilter] = useState<FilterKey>('all');

  const allMistakes = useMemo(
    () =>
      Object.values(progress.mistakes).sort(
        (a, b) => b.createdAt - a.createdAt
      ),
    [progress.mistakes]
  );

  const testMistakeIds = useMemo(
    () =>
      new Set(
        allMistakes.filter((m) => m.kind === 'test').map((m) => m.id)
      ),
    [allMistakes]
  );

  const filteredQuestions = useMemo(() => {
    return TEST_QUESTIONS_BANK.filter((q) => {
      if (filter === 'all') return true;
      if (filter === 'core') return q.id.startsWith('q1');
      if (filter === 'df_scales') return q.topic === 'df' || q.topic === 'scales';
      if (filter === 'sampling_corr')
        return q.topic === 'sampling' || q.topic === 'correlation' || q.topic === 'models';
      if (filter === 'mistakes') return testMistakeIds.has(q.id);
      return true;
    });
  }, [filter, testMistakeIds]);

  const correctCount = TEST_QUESTIONS_BANK.filter(
    (q) => progress.answeredTests[q.id]?.isCorrect
  ).length;

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] mb-1">
              <ClipboardCheck className="w-4 h-4" />
              <span>Тестовая часть экзамена · Задания №10–13</span>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Тесты с разбором каждого варианта и отработкой ошибок
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              Выбирайте любой вариант ответа — тренажёр сразу объяснит, почему
              он верен или в какой формулировке спрятана ловушка билета.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right tabular-nums">
              <div className="text-xs text-[#64748B]">Решено верно</div>
              <div className="text-lg font-bold text-[#059669]">
                {correctCount} / {TEST_QUESTIONS_BANK.length}
              </div>
            </div>
            {onOpenCardsMode && (
              <button
                type="button"
                onClick={onOpenCardsMode}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] hover:bg-[#FEF3C7] transition-colors cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Карточки №10–13</span>
              </button>
            )}
            <button
              type="button"
              onClick={onResetTests}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Сбросить ответы</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#E2E8F0]">
          {[
            { id: 'all', label: `Все вопросы (${TEST_QUESTIONS_BANK.length})` },
            { id: 'core', label: 'Билеты №10–13 (В1 и В3)' },
            { id: 'df_scales', label: 'Шкалы и степени свободы df' },
            { id: 'sampling_corr', label: 'Выборка, Пирсон, Кендалл и тренды' },
            {
              id: 'mistakes',
              label: `Отработка ошибок (${allMistakes.length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as FilterKey)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                filter === tab.id
                  ? tab.id === 'mistakes'
                    ? 'bg-[#DC2626] text-white border-[#DC2626]'
                    : 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                  : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:bg-[#F1F5F9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Unified Mistake Queue Review when mistakes filter is active */}
      {filter === 'mistakes' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Очередь отработки ошибок (шаги №1–9, тесты и df)
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Ошибки автоматически исчезают после верного повторного ответа в
                тренажёре или по кнопке «Усвоено».
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#DC2626] tabular-nums">
              Осталось: {allMistakes.length}
            </span>
          </div>

          {allMistakes.length === 0 ? (
            <div className="p-6 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-center space-y-1">
              <CheckCircle2 className="w-7 h-7 text-[#059669] mx-auto" />
              <div className="text-sm font-semibold text-[#166534]">
                Очередь ошибок пуста!
              </div>
              <p className="text-xs text-[#15803D]">
                Все промахи из тренажёра, тестов и экзамена успешно отработаны.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allMistakes.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-lg bg-[#FEF2F2]/60 border border-[#FECACA] space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs font-semibold text-[#991B1B]">
                      {m.sourceLabel} · {m.title}
                    </div>
                    <button
                      type="button"
                      onClick={() => onResolveMistake(m.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Усвоено</span>
                    </button>
                  </div>
                  <p className="text-sm font-medium text-[#0F172A]">
                    <RichTermText text={m.prompt} onOpenTerm={onOpenTerm} />
                  </p>
                  <div className="text-xs font-mono text-[#059669] font-semibold">
                    Верный ответ: {m.correctAnswer}
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    <RichTermText text={m.hint} onOpenTerm={onOpenTerm} />
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Test Question Cards */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => {
          const ansState = progress.answeredTests[q.id];
          return (
            <article
              key={q.id}
              className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
                <span className="font-semibold text-[#1D4ED8]">
                  {q.variants}
                </span>
                <span className="font-mono tabular-nums">
                  Вопрос {idx + 1} · {q.points} балла
                </span>
              </div>

              <h3 className="text-base font-bold text-[#0F172A] leading-snug">
                <RichTermText text={q.question} onOpenTerm={onOpenTerm} />
              </h3>

              <div className="space-y-2">
                {stableIndexOrder(q.options.length, q.id).map((origOptIdx) => {
                  const opt = q.options[origOptIdx];
                  const isPicked = ansState?.optionIdx === origOptIdx;
                  return (
                    <button
                      key={origOptIdx}
                      type="button"
                      onClick={() =>
                        onTestResult(
                          q.id,
                          origOptIdx,
                          opt.isCorrect,
                          opt.isCorrect
                            ? undefined
                            : {
                                kind: 'test',
                                sourceLabel: q.variants,
                                title: 'Тестовый вопрос',
                                prompt: q.question,
                                correctAnswer:
                                  q.options.find((o) => o.isCorrect)?.text ||
                                  '',
                                hint:
                                  q.options.find((o) => o.isCorrect)?.explain ||
                                  opt.explain,
                              }
                        )
                      }
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors cursor-pointer ${
                        isPicked
                          ? opt.isCorrect
                            ? 'bg-[#F0FDF4] border-[#16A34A] text-[#14532D] font-medium'
                            : 'bg-[#FEF2F2] border-[#DC2626] text-[#7F1D1D]'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {opt.text}
                    </button>
                  );
                })}
              </div>

              {ansState !== undefined && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                    ansState.isCorrect
                      ? 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]'
                      : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]'
                  }`}
                >
                  {ansState.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">
                    <RichTermText
                      text={q.options[ansState.optionIdx]?.explain || ''}
                      onOpenTerm={onOpenTerm}
                    />
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
