export function normalizeText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

export function normalizeNumericCandidate(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/\s+/g, '')
    .replace(/%/g, '')
    .replace(/руб\.?/gi, '')
    .replace(',', '.');
  if (!cleaned || !/^[+-]?\d+(\.\d+)?$/.test(cleaned)) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * Validates user input against accepted answers while strictly avoiding
 * polarity substring bugs (e.g. "не соответствует" matching "соответствует").
 */
export function validateStepAnswer(
  rawInput: string,
  acceptedAnswers: string[],
  numericTolerance = 0.02
): boolean {
  const normInput = normalizeText(rawInput);
  if (!normInput) return false;

  const inputNum = normalizeNumericCandidate(rawInput);

  for (const candidate of acceptedAnswers) {
    const normCand = normalizeText(candidate);

    // 1. Numeric comparison (handles "81 350", "0,2" vs "0.2", "25%" vs "25")
    const candNum = normalizeNumericCandidate(candidate);
    if (inputNum !== null && candNum !== null) {
      if (Math.abs(inputNum - candNum) <= numericTolerance) {
        return true;
      }
      continue;
    }

    // 2. Exact match
    if (normInput === normCand) {
      return true;
    }

    // 3. Polarity safety check: never match positive if user typed negative prefix "не "
    const inputHasNeg = /(^|\s)не\s+/.test(normInput) || normInput === 'нет';
    const candHasNeg = /(^|\s)не\s+/.test(normCand) || normCand === 'нет';
    if (inputHasNeg !== candHasNeg) {
      continue;
    }

    // 4. Safe word-boundary inclusion for multi-word phrases (only when polarity agrees)
    if (normCand.length >= 4 && normInput.includes(normCand)) {
      return true;
    }
    if (normInput.length >= 4 && normCand.includes(normInput)) {
      return true;
    }
  }

  return false;
}

export interface TextSegment {
  type: 'text' | 'term';
  content: string;
  termKey?: string;
}

export function parseTermSegments(text: string): TextSegment[] {
  if (!text) return [];
  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const segments: TextSegment[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      segments.push({
        type: 'text',
        content: text.slice(lastIdx, match.index),
      });
    }
    const key = match[1].trim().toLowerCase();
    const label = (match[2] || match[1]).trim();
    segments.push({
      type: 'term',
      content: label,
      termKey: key,
    });
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIdx),
    });
  }

  return segments;
}

export function stableIndexOrder(length: number, seed: string): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  for (let i = indices.length - 1; i > 0; i--) {
    hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
    const j = hash % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export function stableShuffle<T>(items: T[], seed: string): T[] {
  return stableIndexOrder(items.length, seed).map((idx) => items[idx]);
}

