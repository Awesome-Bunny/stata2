import React, { useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { NASLEDOV_GLOSSARY } from '../data/nasledovData';
import { MathFormula } from './MathFormula';

interface RichTermTextProps {
  text: string;
  onOpenTerm: (termKey: string) => void;
}

type Segment =
  | { type: 'text'; content: string }
  | { type: 'math'; tex: string }
  | { type: 'term'; content: string; termKey: string };

// Build auto-detection rules from NASLEDOV_GLOSSARY patterns sorted longest-first
const AUTO_TERM_MATCHERS: { regex: RegExp; key: string }[] = (() => {
  const items: { pattern: string; key: string }[] = [];
  for (const entry of Object.values(NASLEDOV_GLOSSARY)) {
    const pats = entry.patterns || [];
    for (const p of pats) {
      items.push({ pattern: p, key: entry.key });
    }
  }
  // Longer patterns take priority over shorter substrings
  items.sort((a, b) => b.pattern.length - a.pattern.length);
  return items.map((item) => ({
    key: item.key,
    regex: new RegExp(
      `(^|[^а-яёa-z0-9])(${item.pattern})(?=$|[^а-яёa-z0-9])`,
      'i'
    ),
  }));
})();

function autoDetectTerms(plain: string): Segment[] {
  if (!plain) return [];

  for (const matcher of AUTO_TERM_MATCHERS) {
    const m = matcher.regex.exec(plain);
    if (m) {
      const prefixLen = m[1].length;
      const matchStart = m.index + prefixLen;
      const matchedText = m[2];
      const matchEnd = matchStart + matchedText.length;

      const before = plain.slice(0, matchStart);
      const after = plain.slice(matchEnd);

      return [
        ...autoDetectTerms(before),
        { type: 'term', content: matchedText, termKey: matcher.key },
        ...autoDetectTerms(after),
      ];
    }
  }

  return [{ type: 'text', content: plain }];
}

function tokenizeRichText(input: string): Segment[] {
  if (!input) return [];

  // Match either [[key|label]] / [[key]] OR $inline latex$
  const tokenRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\$([^$]+)\$/g;
  const result: Segment[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(input)) !== null) {
    if (match.index > lastIdx) {
      result.push(...autoDetectTerms(input.slice(lastIdx, match.index)));
    }

    if (match[1] !== undefined) {
      const key = match[1].trim().toLowerCase();
      const label = (match[2] || match[1]).trim();
      result.push({ type: 'term', content: label, termKey: key });
    } else if (match[3] !== undefined) {
      result.push({ type: 'math', tex: match[3] });
    }

    lastIdx = tokenRegex.lastIndex;
  }

  if (lastIdx < input.length) {
    result.push(...autoDetectTerms(input.slice(lastIdx)));
  }

  return result;
}

export const RichTermText: React.FC<RichTermTextProps> = ({
  text,
  onOpenTerm,
}) => {
  const segments = useMemo(() => tokenizeRichText(text), [text]);

  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <React.Fragment key={idx}>{seg.content}</React.Fragment>;
        }
        if (seg.type === 'math') {
          return <MathFormula key={`m-${idx}`} tex={seg.tex} />;
        }
        return (
          <button
            key={`${seg.termKey}-${idx}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTerm(seg.termKey);
            }}
            title="Нажмите, чтобы сразу увидеть определение из словаря А. Д. Наследова"
            className="inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border-b border-dotted border-[#2563EB] hover:bg-[#DBEAFE] hover:text-[#1E3A8A] transition-colors font-medium text-[0.95em] align-baseline cursor-pointer"
          >
            <BookOpen className="w-3 h-3 shrink-0 opacity-80" />
            <span>{seg.content}</span>
          </button>
        );
      })}
    </>
  );
};
