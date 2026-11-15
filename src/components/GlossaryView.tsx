import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Info,
  Search,
} from 'lucide-react';
import { NASLEDOV_GLOSSARY } from '../data/nasledovData';
import { GlossarySourceStatus } from '../types/stats';
import { MathFormula } from './MathFormula';
import { RichTermText } from './RichTermText';

interface GlossaryViewProps {
  onOpenTerm?: (termKey: string) => void;
}

const SOURCE_STYLE: Record<
  GlossarySourceStatus,
  {
    shortLabel: string;
    boxClass: string;
    titleClass: string;
    bodyClass: string;
  }
> = {
  exact: {
    shortLabel: 'Точно из учебника Наследова (2004)',
    boxClass: 'bg-[#F0FDF4] border-[#BBF7D0]',
    titleClass: 'text-[#059669]',
    bodyClass: 'text-[#065F46]',
  },
  adapted: {
    shortLabel: 'Учебник Наследова + курс социологии',
    boxClass: 'bg-[#FFFBEB] border-[#FDE68A]',
    titleClass: 'text-[#B45309]',
    bodyClass: 'text-[#78350F]',
  },
  course: {
    shortLabel: 'Только курс социологии (нет в Наследове 2004)',
    boxClass: 'bg-[#F8FAFC] border-[#CBD5E1]',
    titleClass: 'text-[#475569]',
    bodyClass: 'text-[#334155]',
  },
};

export const GlossaryView: React.FC<GlossaryViewProps> = ({ onOpenTerm }) => {
  const [query, setQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState<number | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<GlossarySourceStatus | 'all'>(
    'all'
  );

  const allEntries = useMemo(() => Object.values(NASLEDOV_GLOSSARY), []);

  const countsBySource = useMemo(() => {
    const counts: Record<GlossarySourceStatus, number> = {
      exact: 0,
      adapted: 0,
      course: 0,
    };
    for (const item of allEntries) {
      counts[item.sourceStatus] += 1;
    }
    return counts;
  }, [allEntries]);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntries.filter((item) => {
      const matchesTask =
        taskFilter === 'all' || item.examTasks.includes(taskFilter);
      if (!matchesTask) return false;
      const matchesSource =
        sourceFilter === 'all' || item.sourceStatus === sourceFilter;
      if (!matchesSource) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.academic.toLowerCase().includes(q) ||
        item.simple.toLowerCase().includes(q) ||
        item.formula.toLowerCase().includes(q) ||
        item.sourceRef.toLowerCase().includes(q) ||
        item.sourceNote.toLowerCase().includes(q)
      );
    });
  }, [allEntries, query, taskFilter, sourceFilter]);

  const noop = () => {};

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] mb-1">
              <BookOpen className="w-4 h-4" />
              <span>Справочник курса · Проверка по первоисточнику</span>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Словарь терминов с главами и страницами А. Д. Наследова (2004)
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              Для каждого термина указаны точная глава, страница и формула из
              учебника, а также честная пометка, взят ли он прямо из книги или
              дополнен из программы экзамена по социологии.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск термина, главы, страницы..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1D4ED8] focus:bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-4 border-t border-[#E2E8F0]">
          <span className="text-xs font-medium text-[#64748B] mr-1">
            Источник:
          </span>
          {(
            [
              { id: 'all', label: `Все (${allEntries.length})` },
              {
                id: 'exact',
                label: `Точно из учебника (${countsBySource.exact})`,
              },
              {
                id: 'adapted',
                label: `Учебник + курс (${countsBySource.adapted})`,
              },
              {
                id: 'course',
                label: `Только экзаменационный курс (${countsBySource.course})`,
              },
            ] as const
          ).map((src) => (
            <button
              key={src.id}
              type="button"
              onClick={() => setSourceFilter(src.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                sourceFilter === src.id
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
              }`}
            >
              {src.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-[#E2E8F0]">
          <span className="text-xs font-medium text-[#64748B] mr-1">
            Фильтр по заданию:
          </span>
          <button
            type="button"
            onClick={() => setTaskFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              taskFilter === 'all'
                ? 'bg-[#1D4ED8] text-white'
                : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
            }`}
          >
            Все ({allEntries.length})
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setTaskFilter(num)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium tabular-nums transition-colors cursor-pointer ${
                taskFilter === num
                  ? 'bg-[#1D4ED8] text-white'
                  : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
              }`}
            >
              №{num}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center text-sm text-[#64748B]">
          По вашему запросу термины не найдены. Попробуйте очистить фильтр.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {entries.map((item) => {
            const srcMeta = SOURCE_STYLE[item.sourceStatus];
            return (
              <article
                key={item.key}
                className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-[#0F172A]">
                      {item.title}
                    </h3>
                    <span className="text-xs font-mono text-[#64748B] shrink-0 tabular-nums">
                      №{item.examTasks.join(', №')}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed text-[#334155]">
                    <RichTermText
                      text={item.academic}
                      onOpenTerm={onOpenTerm || noop}
                    />
                  </p>

                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0369A1] mb-0.5">
                      На пальцах
                    </div>
                    <p className="text-xs leading-relaxed text-[#334155]">
                      <RichTermText
                        text={item.simple}
                        onOpenTerm={onOpenTerm || noop}
                      />
                    </p>
                  </div>

                  <div className="px-3.5 py-2.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] overflow-x-auto">
                    <MathFormula tex={item.formulaTex} displayMode />
                  </div>

                  <div
                    className={`p-3 rounded-lg border space-y-1 ${srcMeta.boxClass}`}
                  >
                    <div
                      className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${srcMeta.titleClass}`}
                    >
                      {item.sourceStatus === 'exact' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      ) : item.sourceStatus === 'adapted' ? (
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Info className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{srcMeta.shortLabel}</span>
                    </div>
                    <div className={`text-xs font-semibold ${srcMeta.bodyClass}`}>
                      {item.sourceRef}
                    </div>
                    <p className={`text-xs leading-relaxed ${srcMeta.bodyClass}`}>
                      {item.sourceNote}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-[#78350F]">
                    <RichTermText
                      text={item.trap}
                      onOpenTerm={onOpenTerm || noop}
                    />
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
