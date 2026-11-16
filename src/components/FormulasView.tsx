import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookMarked,
  CheckCircle2,
  HelpCircle,
  Search,
  Sigma,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import { FORMULA_BLOCKS, FORMULAS_DATA } from '../data/formulasData';
import { FormulaBlockId, FormulaEntry } from '../types/stats';
import { MathFormula } from './MathFormula';

interface FormulasViewProps {
  onDrillTask?: (taskNum: number) => void;
}

interface QuizQuestion {
  target: FormulaEntry;
  promptPhrase: string;
  options: FormulaEntry[];
}

function buildQuizQuestion(blockFilter: FormulaBlockId | 'all'): QuizQuestion {
  const pool =
    blockFilter === 'all'
      ? FORMULAS_DATA
      : FORMULAS_DATA.filter((f) => f.blockId === blockFilter);
  const effectivePool = pool.length >= 4 ? pool : FORMULAS_DATA;
  const target = effectivePool[Math.floor(Math.random() * effectivePool.length)];
  const promptPhrase =
    target.triggerPhrases[
      Math.floor(Math.random() * target.triggerPhrases.length)
    ] || target.application;

  const distractorsPool = FORMULAS_DATA.filter((f) => f.id !== target.id);
  const shuffledDistractors = [...distractorsPool].sort(() => Math.random() - 0.5);
  const options = [target, ...shuffledDistractors.slice(0, 3)].sort(
    () => Math.random() - 0.5
  );

  return { target, promptPhrase, options };
}

export const FormulasView: React.FC<FormulasViewProps> = ({ onDrillTask }) => {
  const [subMode, setSubMode] = useState<'reference' | 'quiz'>('reference');
  const [blockFilter, setBlockFilter] = useState<FormulaBlockId | 'all'>('all');
  const [onlyExamTasks, setOnlyExamTasks] = useState(false);
  const [query, setQuery] = useState('');

  // Formula-recognition quiz state
  const [quizQuestion, setQuizQuestion] = useState<QuizQuestion>(() =>
    buildQuizQuestion('all')
  );
  const [pickedOptionId, setPickedOptionId] = useState<string | null>(null);
  const [quizStats, setQuizStats] = useState({ total: 0, correct: 0, streak: 0 });

  const filteredFormulas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FORMULAS_DATA.filter((f) => {
      if (blockFilter !== 'all' && f.blockId !== blockFilter) return false;
      if (onlyExamTasks && (!f.examTasks || f.examTasks.length === 0)) return false;
      if (!q) return true;
      return (
        f.title.toLowerCase().includes(q) ||
        f.application.toLowerCase().includes(q) ||
        f.whatWeFind.toLowerCase().includes(q) ||
        f.triggerPhrases.some((p) => p.toLowerCase().includes(q)) ||
        f.variables.some(
          (v) =>
            v.desc.toLowerCase().includes(q) || v.symbol.toLowerCase().includes(q)
        )
      );
    });
  }, [blockFilter, onlyExamTasks, query]);

  const handleNextQuiz = (nextBlock: FormulaBlockId | 'all' = blockFilter) => {
    setQuizQuestion(buildQuizQuestion(nextBlock));
    setPickedOptionId(null);
  };

  const handlePickOption = (optionId: string) => {
    if (pickedOptionId !== null) return;
    setPickedOptionId(optionId);
    const isOk = optionId === quizQuestion.target.id;
    setQuizStats((prev) => ({
      total: prev.total + 1,
      correct: prev.correct + (isOk ? 1 : 0),
      streak: isOk ? prev.streak + 1 : 0,
    }));
  };

  const activeBlockMeta = useMemo(
    () => FORMULA_BLOCKS.find((b) => b.id === blockFilter) || null,
    [blockFilter]
  );

  return (
    <div className="space-y-6">
      {/* Header & Mode Switch */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1D4ED8] mb-1">
              <Sigma className="w-4 h-4" />
              <span>Основные формулы для решения задач · 8 тематических блоков</span>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Справочник формул и тренажёр распознавания по условию
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              Каждая формула разобрана по схеме: где применяется, по каким словам
              в условии её узнать, что именно ищем и что означает каждая переменная.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg shrink-0 self-start lg:self-center">
            <button
              type="button"
              onClick={() => setSubMode('reference')}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                subMode === 'reference'
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Справочник ({FORMULAS_DATA.length})
            </button>
            <button
              type="button"
              onClick={() => setSubMode('quiz')}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                subMode === 'quiz'
                  ? 'bg-white text-[#1D4ED8] shadow-sm'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Тренажёр выбора формулы
            </button>
          </div>
        </div>

        {/* Block Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => {
              setBlockFilter('all');
              if (subMode === 'quiz') handleNextQuiz('all');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              blockFilter === 'all'
                ? 'bg-[#1D4ED8] text-white'
                : 'bg-[#F8FAFC] text-[#334155] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
            }`}
          >
            Все блоки
          </button>
          {FORMULA_BLOCKS.map((blk) => (
            <button
              key={blk.id}
              type="button"
              onClick={() => {
                setBlockFilter(blk.id);
                if (subMode === 'quiz') handleNextQuiz(blk.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                blockFilter === blk.id
                  ? 'bg-[#1D4ED8] text-white'
                  : 'bg-[#F8FAFC] text-[#334155] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
              }`}
            >
              {blk.shortTitle}
            </button>
          ))}
        </div>
      </div>

      {subMode === 'reference' ? (
        <>
          {/* Search & Exam Filter Toolbar */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск: мода, Крамер, однородность, 2×2, Вилкоксон..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1D4ED8] focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setOnlyExamTasks((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border whitespace-nowrap transition-colors cursor-pointer ${
                  onlyExamTasks
                    ? 'bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8]'
                    : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Только формулы билетов №1–13</span>
              </button>
              <span className="text-xs text-[#64748B] tabular-nums whitespace-nowrap">
                Найдено: <strong className="text-[#0F172A]">{filteredFormulas.length}</strong>
              </span>
            </div>
          </div>

          {activeBlockMeta && (
            <div className="px-1 flex flex-wrap items-center justify-between gap-2 text-sm text-[#475569]">
              <div>
                <span className="font-semibold text-[#0F172A]">
                  {activeBlockMeta.title}
                </span>
                <span className="mx-2 text-[#CBD5E1]">·</span>
                <span>{activeBlockMeta.description}</span>
              </div>
              {activeBlockMeta.relatedTasks.length > 0 && (
                <div className="text-xs text-[#1D4ED8] font-medium tabular-nums">
                  Задания экзамена: №{activeBlockMeta.relatedTasks.join(', №')}
                </div>
              )}
            </div>
          )}

          {filteredFormulas.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center space-y-2">
              <BookMarked className="w-8 h-8 text-[#94A3B8] mx-auto" />
              <div className="text-base font-semibold text-[#0F172A]">
                По этому запросу формул не найдено
              </div>
              <p className="text-sm text-[#64748B]">
                Сбросьте поисковую строку или переключите фильтр блоков.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredFormulas.map((formula) => (
                <article
                  key={formula.id}
                  className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* Quiet unboxed metadata line */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
                      <span>{formula.blockTitle}</span>
                      {formula.examTasks && formula.examTasks.length > 0 && (
                        <span className="font-semibold text-[#1D4ED8] tabular-nums">
                          Встречается в №{formula.examTasks.join(', №')}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-[#0F172A]">
                      {formula.title}
                    </h3>

                    {/* Formula Showcase */}
                    <div className="px-4 py-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] overflow-x-auto">
                      <MathFormula
                        tex={formula.formulaTex}
                        displayMode
                        className="text-base text-[#0F172A]"
                      />
                    </div>

                    {/* Structured details matching PDF */}
                    <div className="space-y-2.5 text-xs leading-relaxed text-[#334155]">
                      <div>
                        <span className="font-semibold text-[#0F172A]">
                          Применение:{' '}
                        </span>
                        <span>{formula.application}</span>
                      </div>

                      <div>
                        <span className="font-semibold text-[#B91C1C]">
                          Когда видим в задаче:{' '}
                        </span>
                        <span>
                          {formula.triggerPhrases.map((p, idx) => (
                            <React.Fragment key={p}>
                              {idx > 0 && ' / '}
                              «{p}»
                            </React.Fragment>
                          ))}
                        </span>
                      </div>

                      <div>
                        <span className="font-semibold text-[#059669]">
                          Что ищем:{' '}
                        </span>
                        <span>{formula.whatWeFind}</span>
                      </div>
                    </div>

                    {/* Variables list */}
                    <div className="pt-2.5 border-t border-[#E2E8F0]">
                      <div className="text-[11px] font-semibold text-[#64748B] mb-1.5">
                        Переменные
                      </div>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {formula.variables.map((v, idx) => (
                          <div key={idx} className="flex items-baseline gap-1.5">
                            <dt className="font-mono font-semibold text-[#1D4ED8] shrink-0">
                              <MathFormula tex={v.symbol} />
                            </dt>
                            <dd className="text-[#475569]">— {v.desc}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {formula.note && (
                      <div className="pt-2 border-t border-[#E2E8F0] text-xs text-[#92400E]">
                        <span className="font-semibold">Примечание: </span>
                        {formula.note}
                      </div>
                    )}
                  </div>

                  {onDrillTask &&
                    formula.examTasks &&
                    formula.examTasks.length > 0 && (
                      <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center gap-2">
                        {formula.examTasks.map((tNum) => (
                          <button
                            key={tNum}
                            type="button"
                            onClick={() => onDrillTask(tNum)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] transition-colors cursor-pointer"
                          >
                            <span>Зубрить задание №{tNum}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    )}
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Formula Recognition Quiz */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
              <span className="font-semibold text-[#1D4ED8]">
                Распознавание формулы по формулировке задачи
              </span>
              <span className="tabular-nums">
                Решено: <strong className="text-[#0F172A]">{quizStats.total}</strong> ·
                Точность:{' '}
                <strong className="text-[#059669]">
                  {quizStats.total > 0
                    ? `${Math.round((quizStats.correct / quizStats.total) * 100)}%`
                    : '—'}
                </strong>{' '}
                · Серия:{' '}
                <strong className="text-[#1D4ED8]">{quizStats.streak}</strong>
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#475569]">
                В условии задачи вы видите формулировку:
              </div>
              <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-base font-semibold text-[#0F172A] leading-relaxed">
                «{quizQuestion.promptPhrase}»
              </div>
              <div className="text-xs text-[#64748B]">
                Цель поиска: <span className="text-[#334155] font-medium">{quizQuestion.target.whatWeFind}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-[#475569]">
                Какая формула здесь применяется?
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quizQuestion.options.map((opt) => {
                  const isPicked = pickedOptionId === opt.id;
                  const isTarget = opt.id === quizQuestion.target.id;
                  const revealed = pickedOptionId !== null;

                  let cardStyle =
                    'bg-[#F8FAFC] border-[#CBD5E1] hover:bg-[#EFF6FF] hover:border-[#93C5FD]';
                  if (revealed) {
                    if (isTarget) {
                      cardStyle = 'bg-[#F0FDF4] border-[#16A34A]';
                    } else if (isPicked) {
                      cardStyle = 'bg-[#FEF2F2] border-[#DC2626]';
                    } else {
                      cardStyle = 'bg-[#F8FAFC] border-[#E2E8F0] opacity-65';
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={revealed}
                      onClick={() => handlePickOption(opt.id)}
                      className={`text-left p-4 rounded-xl border transition-colors cursor-pointer disabled:cursor-default space-y-2.5 ${cardStyle}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-[#0F172A]">
                          {opt.title}
                        </span>
                        {revealed && isTarget && (
                          <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                        )}
                        {revealed && isPicked && !isTarget && (
                          <XCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                        )}
                      </div>
                      <div className="overflow-x-auto py-1">
                        <MathFormula tex={opt.formulaTex} displayMode />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {pickedOptionId !== null && (
              <div className="pt-3 border-t border-[#E2E8F0] space-y-3">
                <div
                  className={`p-3.5 rounded-lg border text-xs leading-relaxed flex items-start gap-2.5 ${
                    pickedOptionId === quizQuestion.target.id
                      ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#166534]'
                      : 'bg-[#FEE2E2] border-[#FCA5A5] text-[#991B1B]'
                  }`}
                >
                  {pickedOptionId === quizQuestion.target.id ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold mb-1">
                      {pickedOptionId === quizQuestion.target.id
                        ? `Верно! Это: ${quizQuestion.target.title}`
                        : `Правильный выбор: ${quizQuestion.target.title}`}
                    </div>
                    <div>{quizQuestion.target.application}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-[#475569]">
                    Переменные:{' '}
                    {quizQuestion.target.variables.map((v, i) => (
                      <span key={i} className="mr-3 inline-flex items-baseline gap-1">
                        <MathFormula tex={v.symbol} className="font-semibold text-[#1D4ED8]" />
                        <span>({v.desc})</span>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNextQuiz()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#1D4ED8] text-white hover:bg-[#1E40AF] transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Следующий вопрос</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
              <HelpCircle className="w-4 h-4 text-[#1D4ED8]" />
              <span>Как учить формулы быстрее</span>
            </div>
            <ul className="space-y-2 text-xs text-[#475569] leading-relaxed">
              <li>
                1. Сверяйтесь с ключевыми словами условия: «однородность» →{' '}
                <strong className="text-[#0F172A]">коэффициент вариации V</strong>,
                «2×2» → <strong className="text-[#0F172A]">ассоциация / контингенция / Йейтс</strong>.
              </li>
              <li>
                2. Для сдвигов «до и после» ищите{' '}
                <strong className="text-[#0F172A]">критерий Вилкоксона</strong>, для
                двух независимых порядковых выборок —{' '}
                <strong className="text-[#0F172A]">Манна–Уитни</strong>.
              </li>
              <li>
                3. Переключайте верхний фильтр по блокам, чтобы отрабатывать только
                нужную тему (например, корреляцию или ANOVA).
              </li>
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
};
