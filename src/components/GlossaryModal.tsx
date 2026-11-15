import React, { useEffect } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  CheckCircle2,
  Info,
  Lightbulb,
  X,
} from 'lucide-react';
import { NASLEDOV_GLOSSARY } from '../data/nasledovData';
import { GlossarySourceStatus } from '../types/stats';
import { MathFormula } from './MathFormula';
import { RichTermText } from './RichTermText';

const SOURCE_BADGE_MAP: Record<
  GlossarySourceStatus,
  {
    label: string;
    containerClass: string;
    badgeClass: string;
    textClass: string;
  }
> = {
  exact: {
    label: 'Точно из учебника А. Д. Наследова (2004)',
    containerClass: 'bg-[#F0FDF4] border-[#BBF7D0]',
    badgeClass: 'text-[#059669]',
    textClass: 'text-[#065F46]',
  },
  adapted: {
    label: 'Учебник А. Д. Наследова + программа курса',
    containerClass: 'bg-[#FFFBEB] border-[#FDE68A]',
    badgeClass: 'text-[#B45309]',
    textClass: 'text-[#78350F]',
  },
  course: {
    label: 'Из экзаменационного курса (нет в учебнике Наследова 2004)',
    containerClass: 'bg-[#F8FAFC] border-[#CBD5E1]',
    badgeClass: 'text-[#475569]',
    textClass: 'text-[#334155]',
  },
};

interface GlossaryModalProps {
  termKey: string | null;
  onClose: () => void;
  onSelectTerm: (termKey: string) => void;
  onOpenFullGlossary: () => void;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({
  termKey,
  onClose,
  onSelectTerm,
  onOpenFullGlossary,
}) => {
  useEffect(() => {
    if (!termKey) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [termKey, onClose]);

  if (!termKey) return null;

  const entry = NASLEDOV_GLOSSARY[termKey.toLowerCase()];
  const sourceMeta = entry ? SOURCE_BADGE_MAP[entry.sourceStatus] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 backdrop-blur-[2px] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="glossary-modal-title"
    >
      <div
        className="w-full max-w-xl bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#1D4ED8] uppercase tracking-wide mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Словарь учебника А. Д. Наследова</span>
            </div>
            <h2
              id="glossary-modal-title"
              className="text-lg font-bold text-[#0F172A]"
            >
              {entry ? entry.title : `Термин: ${termKey}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно словаря"
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {!entry ? (
            <div className="space-y-3 text-sm text-[#475569]">
              <p>
                Термин «{termKey}» отсутствует в быстрой карточке. Откройте
                полный словарь курса, чтобы посмотреть все термины и формулы.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullGlossary();
                }}
                className="px-4 py-2 rounded-lg bg-[#1D4ED8] text-white text-sm font-medium hover:bg-[#1E40AF] transition-colors cursor-pointer"
              >
                Перейти в полный словарь
              </button>
            </div>
          ) : (
            <>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                  Академическое определение
                </div>
                <p className="text-[15px] leading-relaxed text-[#0F172A]">
                  <RichTermText
                    text={entry.academic}
                    onOpenTerm={onSelectTerm}
                  />
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F0F9FF] border border-[#BAE6FD]">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#0369A1] mb-1">
                  <Lightbulb className="w-4 h-4" />
                  <span>Простыми словами</span>
                </div>
                <p className="text-sm leading-relaxed text-[#0C4A6E]">
                  <RichTermText
                    text={entry.simple}
                    onOpenTerm={onSelectTerm}
                  />
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                  <Calculator className="w-4 h-4" />
                  <span>Формула / Правило</span>
                </div>
                <div className="px-4 py-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#1D4ED8] overflow-x-auto">
                  <MathFormula tex={entry.formulaTex} displayMode />
                </div>
              </div>

              {sourceMeta && (
                <div
                  className={`p-3.5 rounded-lg border space-y-1.5 ${sourceMeta.containerClass}`}
                >
                  <div
                    className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${sourceMeta.badgeClass}`}
                  >
                    {entry.sourceStatus === 'exact' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : entry.sourceStatus === 'adapted' ? (
                      <BookOpen className="w-4 h-4 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 shrink-0" />
                    )}
                    <span>{sourceMeta.label}</span>
                  </div>
                  <div className={`text-xs font-semibold ${sourceMeta.textClass}`}>
                    Где искать: {entry.sourceRef}
                  </div>
                  <p className={`text-xs leading-relaxed ${sourceMeta.textClass}`}>
                    {entry.sourceNote}
                  </p>
                </div>
              )}

              <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A]">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#B45309] mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    Экзаменационная ловушка · Задания №
                    {entry.examTasks.join(', №')}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-[#78350F]">
                  <RichTermText text={entry.trap} onOpenTerm={onSelectTerm} />
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
