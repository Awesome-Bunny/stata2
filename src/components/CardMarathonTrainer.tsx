import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Dices,
  Flame,
  Layers,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import { TEST_QUESTIONS_BANK } from '../data/nasledovData';
import { MistakeItem, TestQuestion } from '../types/stats';
import { generateProceduralTestDeck } from '../utils/testGenerator';
import { RichTermText } from './RichTermText';

interface CardMarathonTrainerProps {
  onOpenTerm: (termKey: string) => void;
  onTestResult: (
    questionId: string,
    optionIdx: number,
    isCorrect: boolean,
    mistake?: Omit<MistakeItem, 'id' | 'createdAt'>
  ) => void;
  onRecordGeneratedAttempt: (isCorrect: boolean) => void;
}

type DeckMode = 'v1' | 'v3' | 'all_bank' | 'generated';

function shuffleOptions(q: TestQuestion): TestQuestion {
  const opts = [...q.options];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { ...q, options: opts };
}

function buildStaticDeck(mode: Exclude<DeckMode, 'generated'>): TestQuestion[] {
  if (mode === 'v1') {
    const ids = ['q10_both', 'q11_both', 'q12_v1', 'q13_v1'];
    return ids
      .map((id) => TEST_QUESTIONS_BANK.find((q) => q.id === id)!)
      .filter(Boolean)
      .map(shuffleOptions);
  }
  if (mode === 'v3') {
    const ids = ['q10_both', 'q11_both', 'q12_v3', 'q13_v3'];
    return ids
      .map((id) => TEST_QUESTIONS_BANK.find((q) => q.id === id)!)
      .filter(Boolean)
      .map(shuffleOptions);
  }
  const copy = [...TEST_QUESTIONS_BANK];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.map(shuffleOptions);
}

export const CardMarathonTrainer: React.FC<CardMarathonTrainerProps> = ({
  onOpenTerm,
  onTestResult,
  onRecordGeneratedAttempt,
}) => {
  const [deckMode, setDeckMode] = useState<DeckMode>('v1');
  const [genSize, setGenSize] = useState<4 | 8>(4);
  const [deck, setDeck] = useState<TestQuestion[]>(() => buildStaticDeck('v1'));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [pickedOptionIdx, setPickedOptionIdx] = useState<number | null>(null);
  const [status, setStatus] = useState<'answering' | 'correct' | 'failed' | 'won'>(
    'answering'
  );

  const [attemptNumber, setAttemptNumber] = useState(1);
  const [bestStreakByMode, setBestStreakByMode] = useState<Record<DeckMode, number>>({
    v1: 0,
    v3: 0,
    all_bank: 0,
    generated: 0,
  });
  const [completedRunsByMode, setCompletedRunsByMode] = useState<
    Record<DeckMode, number>
  >({
    v1: 0,
    v3: 0,
    all_bank: 0,
    generated: 0,
  });

  const currentCard = deck[currentIndex] || null;
  const isBankDeck = deckMode !== 'generated';

  const modeTitle = useMemo(() => {
    if (deckMode === 'v1') return 'Билет Варианта 1 (№10–13)';
    if (deckMode === 'v3') return 'Билет Варианта 3 (№10–13)';
    if (deckMode === 'all_bank')
      return `Весь банк тестов №10–13 и ловушек (${TEST_QUESTIONS_BANK.length} карточек)`;
    return `Сгенерированные тесты по базе №10–13 (${genSize} карточки)`;
  }, [deckMode, genSize]);

  const switchMode = (nextMode: DeckMode, customGenSize?: 4 | 8) => {
    const targetGenSize = customGenSize ?? genSize;
    setDeckMode(nextMode);
    if (customGenSize) setGenSize(customGenSize);
    setDeck(
      nextMode === 'generated'
        ? generateProceduralTestDeck(targetGenSize)
        : buildStaticDeck(nextMode)
    );
    setCurrentIndex(0);
    setPickedOptionIdx(null);
    setStatus('answering');
    setAttemptNumber(1);
  };

  const restartSameOrShuffled = (regenerate = false) => {
    if (deckMode === 'generated') {
      if (regenerate) {
        setDeck(generateProceduralTestDeck(genSize));
      } else {
        setDeck((prev) => prev.map(shuffleOptions));
      }
    } else {
      setDeck(buildStaticDeck(deckMode));
    }
    setCurrentIndex(0);
    setPickedOptionIdx(null);
    setStatus('answering');
    setAttemptNumber((n) => n + 1);
  };

  const handlePickOption = (optIdx: number) => {
    if (!currentCard || status !== 'answering') return;

    const chosen = currentCard.options[optIdx];
    setPickedOptionIdx(optIdx);

    if (isBankDeck) {
      onTestResult(
        currentCard.id,
        optIdx,
        chosen.isCorrect,
        chosen.isCorrect
          ? undefined
          : {
              kind: 'test',
              sourceLabel: `Карточки №10–13 · ${currentCard.variants}`,
              title: 'Карточка-марафон',
              prompt: currentCard.question,
              correctAnswer:
                currentCard.options.find((o) => o.isCorrect)?.text || '',
              hint: chosen.explain,
            }
      );
    } else {
      onRecordGeneratedAttempt(chosen.isCorrect);
    }

    if (chosen.isCorrect) {
      const nextCompleted = currentIndex + 1;
      setBestStreakByMode((prev) => ({
        ...prev,
        [deckMode]: Math.max(prev[deckMode], nextCompleted),
      }));

      if (nextCompleted >= deck.length) {
        setStatus('won');
        setCompletedRunsByMode((prev) => ({
          ...prev,
          [deckMode]: prev[deckMode] + 1,
        }));
      } else {
        setStatus('correct');
      }
    } else {
      setStatus('failed');
    }
  };

  const handleNextCard = () => {
    if (currentIndex + 1 < deck.length) {
      setCurrentIndex((i) => i + 1);
      setPickedOptionIdx(null);
      setStatus('answering');
    }
  };

  const activeOption =
    pickedOptionIdx !== null && currentCard
      ? currentCard.options[pickedOptionIdx]
      : null;

  return (
    <div className="space-y-6">
      {/* Header & Deck Mode Controls */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] mb-1">
              <Layers className="w-4 h-4" />
              <span>Последовательные карточки · Тесты №10–13</span>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Марафон карточек без права на ошибку
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              Карточки идут строго по очереди (1 → 2 → 3 → 4…). Если допущена
              ошибка, серия сбрасывается и все карточки нужно пройти заново с
              первой.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => switchMode('v1')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                deckMode === 'v1'
                  ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                  : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
              }`}
            >
              Вариант 1 (№10–13)
            </button>
            <button
              type="button"
              onClick={() => switchMode('v3')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                deckMode === 'v3'
                  ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                  : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
              }`}
            >
              Вариант 3 (№10–13)
            </button>
            <button
              type="button"
              onClick={() => switchMode('all_bank')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                deckMode === 'all_bank'
                  ? 'bg-[#0284C7] text-white border-[#0284C7]'
                  : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
              }`}
            >
              Вся база ({TEST_QUESTIONS_BANK.length} карт.)
            </button>
            <button
              type="button"
              onClick={() => switchMode('generated')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                deckMode === 'generated'
                  ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                  : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
              }`}
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Генератор тестов</span>
            </button>
          </div>
        </div>

        {/* Sub-bar: Streak telemetry & Generated controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E2E8F0]">
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#475569] tabular-nums">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F172A]">
              <Flame className="w-4 h-4 text-[#D97706]" />
              <span>
                Попытка №{attemptNumber} · Прогресс:{' '}
                {status === 'won' ? deck.length : currentIndex}/{deck.length}
              </span>
            </span>
            <span>·</span>
            <span>
              Лучшая серия:{' '}
              <strong className="text-[#1D4ED8]">
                {bestStreakByMode[deckMode]} / {deck.length}
              </strong>
            </span>
            <span>·</span>
            <span>
              Пройдено серий:{' '}
              <strong className="text-[#059669]">
                {completedRunsByMode[deckMode]}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {deckMode === 'generated' && (
              <>
                <div className="inline-flex rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-0.5">
                  {([4, 8] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => switchMode('generated', sz)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        genSize === sz
                          ? 'bg-white text-[#6D28D9] shadow-xs font-semibold'
                          : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      {sz} карт.
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => switchMode('generated', genSize)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE] hover:bg-[#EDE9FE] transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Новые карточки</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => restartSameOrShuffled(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Начать заново</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sequential Stepper */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
          <span>{modeTitle}</span>
          <span className="tabular-nums">
            {status === 'won'
              ? `Все ${deck.length} из ${deck.length} пройдены`
              : `Карточка ${currentIndex + 1} из ${deck.length}`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {deck.map((card, idx) => {
            const isPast =
              status === 'won' ||
              idx < currentIndex ||
              (idx === currentIndex && status === 'correct');
            const isCurrent = idx === currentIndex && status !== 'won';
            const isFailedHere = isCurrent && status === 'failed';

            return (
              <div
                key={card.id}
                className={`h-8 min-w-[2.25rem] px-2 rounded-lg border text-xs font-bold flex items-center justify-center tabular-nums transition-colors ${
                  isFailedHere
                    ? 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626]'
                    : isPast
                    ? 'bg-[#F0FDF4] border-[#16A34A] text-[#15803D]'
                    : isCurrent
                    ? 'bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8]'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]'
                }`}
              >
                {isPast ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : isFailedHere ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : (
                  idx + 1
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Victory Card */}
      {status === 'won' ? (
        <div className="bg-white border border-[#86EFAC] rounded-xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] flex items-center justify-center mx-auto">
            <Trophy className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#059669]">
              Безупречная серия
            </div>
            <h3 className="text-2xl font-bold text-[#0F172A]">
              Все {deck.length} карточек пройдены без единой ошибки!
            </h3>
            <p className="text-sm text-[#475569] max-w-xl mx-auto">
              Режим «{modeTitle}» закрыт с попытки №{attemptNumber}. Вы
              уверенно различаете ловушки тестовой части по учебнику А. Д.
              Наследова.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => restartSameOrShuffled(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Пройти серию ещё раз</span>
            </button>

            {deckMode === 'generated' ? (
              <button
                type="button"
                onClick={() => restartSameOrShuffled(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Сгенерировать новый набор</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode('generated')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE] text-sm font-semibold transition-colors cursor-pointer"
              >
                <Dices className="w-4 h-4" />
                <span>Перейти к сгенерированным тестам</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Active Single Card */
        currentCard && (
          <article
            className={`bg-white border rounded-xl p-6 sm:p-7 space-y-5 transition-colors ${
              status === 'failed'
                ? 'border-[#FCA5A5]'
                : status === 'correct'
                ? 'border-[#86EFAC]'
                : 'border-[#E2E8F0]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-[#64748B]">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#EFF6FF] text-[#1D4ED8] font-bold tabular-nums">
                  Карточка {currentIndex + 1} / {deck.length}
                </span>
                <span className="font-semibold text-[#475569]">
                  {currentCard.variants}
                </span>
              </div>
              <span className="font-mono tabular-nums">
                {currentCard.points} балла
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] leading-snug">
              <RichTermText text={currentCard.question} onOpenTerm={onOpenTerm} />
            </h3>

            <div className="space-y-2.5">
              {currentCard.options.map((opt, optIdx) => {
                const isPicked = pickedOptionIdx === optIdx;
                const isLocked = status !== 'answering';

                let optStyle =
                  'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A] hover:bg-[#EFF6FF] hover:border-[#93C5FD] cursor-pointer';

                if (isLocked) {
                  if (opt.isCorrect) {
                    optStyle =
                      'bg-[#F0FDF4] border-[#16A34A] text-[#14532D] cursor-default';
                  } else if (isPicked) {
                    optStyle =
                      'bg-[#FEF2F2] border-[#DC2626] text-[#7F1D1D] cursor-default';
                  } else {
                    optStyle =
                      'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8] cursor-default opacity-75';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    disabled={isLocked}
                    onClick={() => handlePickOption(optIdx)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors flex items-start gap-3 ${optStyle}`}
                  >
                    <span className="font-mono text-xs font-bold mt-0.5 shrink-0">
                      {String.fromCharCode(65 + optIdx)}.
                    </span>
                    <span className="text-sm sm:text-[15px] leading-relaxed flex-1">
                      <RichTermText text={opt.text} onOpenTerm={onOpenTerm} />
                    </span>
                    {isLocked && opt.isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
                    )}
                    {isLocked && isPicked && !opt.isCorrect && (
                      <XCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Feedback & Next / Restart Control */}
            {status === 'correct' && activeOption && (
              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-3 text-sm text-[#065F46]">
                  <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <RichTermText
                      text={activeOption.explain}
                      onOpenTerm={onOpenTerm}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleNextCard}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <span>
                      Перейти к карточке {currentIndex + 2} из {deck.length}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {status === 'failed' && activeOption && (
              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] space-y-2 text-sm text-[#991B1B]">
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldAlert className="w-5 h-5 text-[#DC2626] shrink-0" />
                    <span>
                      Серия прервана на карточке {currentIndex + 1} из{' '}
                      {deck.length}!
                    </span>
                  </div>
                  <div className="leading-relaxed">
                    <RichTermText
                      text={activeOption.explain}
                      onOpenTerm={onOpenTerm}
                    />
                  </div>
                  <div className="pt-1 text-xs font-medium text-[#7F1D1D]">
                    Правильный вариант подсвечен зелёным выше. Чтобы засчитать
                    серию, все карточки нужно пройти подряд без ошибок.
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => restartSameOrShuffled(false)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Начать заново с 1-й карточки</span>
                  </button>

                  {deckMode === 'generated' && (
                    <button
                      type="button"
                      onClick={() => restartSameOrShuffled(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE] text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Сгенерировать другой набор и начать с 1-й</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </article>
        )
      )}

      {/* Rules Summary Footer */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B]">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#1D4ED8] shrink-0" />
          <span>
            Подсказка: в режиме «Генератор тестов» каждый раз создаются новые
            числа, таблицы сопряжённости, пары шкал и ловушки знака на базе
            вопросов №10–13.
          </span>
        </div>
      </div>
    </div>
  );
};
