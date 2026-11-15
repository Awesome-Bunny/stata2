import React, { useState } from 'react';
import {
  ArrowDownToLine,
  Calculator,
  Delete,
  History,
  X,
} from 'lucide-react';

interface StatCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  activeTargetLabel?: string | null;
  onInsertValue?: (formattedValue: string) => void;
}

/**
 * Safe deterministic recursive-descent arithmetic evaluator supporting +, -, *, /, parentheses, unary minus.
 */
function evaluateArithmetic(expr: string): number | null {
  const normalized = expr
    .replace(/,/g, '.')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\s+/g, '');

  if (!normalized || !/^[0-9+\-*/().]+$/.test(normalized)) {
    return null;
  }

  let pos = 0;

  function parseExpression(): number {
    let left = parseTerm();
    while (pos < normalized.length) {
      const ch = normalized[pos];
      if (ch === '+' || ch === '-') {
        pos++;
        const right = parseTerm();
        left = ch === '+' ? left + right : left - right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (pos < normalized.length) {
      const ch = normalized[pos];
      if (ch === '*' || ch === '/') {
        pos++;
        const right = parseFactor();
        if (ch === '*') left = left * right;
        else {
          if (right === 0) throw new Error('Division by zero');
          left = left / right;
        }
      } else {
        break;
      }
    }
    return left;
  }

  function parseFactor(): number {
    if (pos < normalized.length && normalized[pos] === '+') {
      pos++;
      return parseFactor();
    }
    if (pos < normalized.length && normalized[pos] === '-') {
      pos++;
      return -parseFactor();
    }
    if (pos < normalized.length && normalized[pos] === '(') {
      pos++;
      const inner = parseExpression();
      if (normalized[pos] !== ')') throw new Error('Unclosed parenthesis');
      pos++;
      return inner;
    }

    const start = pos;
    while (
      pos < normalized.length &&
      ((normalized[pos] >= '0' && normalized[pos] <= '9') ||
        normalized[pos] === '.')
    ) {
      pos++;
    }
    if (start === pos) throw new Error('Unexpected token');
    const num = Number(normalized.slice(start, pos));
    if (!Number.isFinite(num)) throw new Error('Invalid number');
    return num;
  }

  try {
    const val = parseExpression();
    if (pos !== normalized.length || !Number.isFinite(val)) return null;
    return val;
  } catch {
    return null;
  }
}

function formatCalcNumber(num: number): string {
  const rounded = Number(num.toFixed(6));
  return String(rounded).replace('.', ',');
}

export const StatCalculator: React.FC<StatCalculatorProps> = ({
  isOpen,
  onClose,
  activeTargetLabel,
  onInsertValue,
}) => {
  const [expr, setExpr] = useState('');
  const [displayResult, setDisplayResult] = useState<string>('0');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<{ expr: string; res: string }[]>([]);

  if (!isOpen) return null;

  const appendToken = (token: string) => {
    setErrorMsg(null);
    setExpr((prev) => prev + token);
  };

  const handleClear = () => {
    setExpr('');
    setDisplayResult('0');
    setErrorMsg(null);
  };

  const handleBackspace = () => {
    setErrorMsg(null);
    setExpr((prev) => prev.slice(0, -1));
  };

  const handleEvaluate = () => {
    const targetExpr = expr.trim() || displayResult;
    const val = evaluateArithmetic(targetExpr);
    if (val === null) {
      setErrorMsg('Проверьте выражение');
      return;
    }
    const formatted = formatCalcNumber(val);
    setDisplayResult(formatted);
    setErrorMsg(null);
    if (expr.trim()) {
      setHistory((prev) =>
        [{ expr: expr.trim(), res: formatted }, ...prev].slice(0, 4)
      );
      setExpr(formatted);
    }
  };

  const applyUnary = (fn: (x: number) => number | null, label: string) => {
    const source = expr.trim() || displayResult;
    const val = evaluateArithmetic(source);
    if (val === null) {
      setErrorMsg('Введите число');
      return;
    }
    const out = fn(val);
    if (out === null || !Number.isFinite(out)) {
      setErrorMsg('Недопустимая операция');
      return;
    }
    const formatted = formatCalcNumber(out);
    setDisplayResult(formatted);
    setHistory((prev) =>
      [{ expr: `${label}(${source})`, res: formatted }, ...prev].slice(0, 4)
    );
    setExpr(formatted);
    setErrorMsg(null);
  };

  const handleInsert = () => {
    if (!onInsertValue) return;
    // Evaluate if expression hasn't been evaluated yet
    const evaluated = expr.trim() ? evaluateArithmetic(expr) : null;
    const valToInsert =
      evaluated !== null ? formatCalcNumber(evaluated) : displayResult;
    onInsertValue(valToInsert);
  };

  const buttons: {
    label: string;
    onClick: () => void;
    variant?: 'op' | 'primary' | 'util';
  }[] = [
    { label: 'C', onClick: handleClear, variant: 'util' },
    { label: '(', onClick: () => appendToken('('), variant: 'util' },
    { label: ')', onClick: () => appendToken(')'), variant: 'util' },
    { label: '÷', onClick: () => appendToken('÷'), variant: 'op' },

    { label: '7', onClick: () => appendToken('7') },
    { label: '8', onClick: () => appendToken('8') },
    { label: '9', onClick: () => appendToken('9') },
    { label: '×', onClick: () => appendToken('×'), variant: 'op' },

    { label: '4', onClick: () => appendToken('4') },
    { label: '5', onClick: () => appendToken('5') },
    { label: '6', onClick: () => appendToken('6') },
    { label: '−', onClick: () => appendToken('−'), variant: 'op' },

    { label: '1', onClick: () => appendToken('1') },
    { label: '2', onClick: () => appendToken('2') },
    { label: '3', onClick: () => appendToken('3') },
    { label: '+', onClick: () => appendToken('+'), variant: 'op' },

    { label: '0', onClick: () => appendToken('0') },
    { label: ',', onClick: () => appendToken(',') },
    {
      label: '⌫',
      onClick: handleBackspace,
      variant: 'util',
    },
    { label: '=', onClick: handleEvaluate, variant: 'primary' },
  ];

  return (
    <aside
      aria-label="Встроенный статистический калькулятор"
      className="fixed bottom-4 right-4 z-40 w-[320px] sm:w-[348px] bg-white border border-[#CBD5E1] rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
          <Calculator className="w-4 h-4 text-[#1D4ED8]" />
          <span>Калькулятор для задач</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Скрыть калькулятор"
          className="p-1 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Display */}
      <div className="px-4 py-3 bg-[#0F172A] text-white space-y-1">
        <input
          type="text"
          value={expr}
          onChange={(e) => {
            setErrorMsg(null);
            setExpr(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleEvaluate();
            }
          }}
          placeholder="Введите выражение..."
          className="w-full bg-transparent text-right font-mono text-xs text-[#94A3B8] focus:outline-none tabular-nums"
        />
        <div className="flex items-center justify-between gap-2">
          {errorMsg ? (
            <span className="text-[11px] text-[#FCA5A5] font-medium">
              {errorMsg}
            </span>
          ) : (
            <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">
              Итог
            </span>
          )}
          <div className="font-mono text-2xl font-bold tracking-tight tabular-nums truncate">
            {displayResult}
          </div>
        </div>
      </div>

      {/* Stat Quick Functions */}
      <div className="px-3 pt-2.5 pb-1 grid grid-cols-4 gap-1.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <button
          type="button"
          onClick={() => applyUnary((x) => x * x, 'x²')}
          title="Возвести в квадрат (например, σ → σ²)"
          className="py-1.5 rounded-md bg-white border border-[#CBD5E1] text-xs font-mono font-semibold text-[#1D4ED8] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
        >
          x²
        </button>
        <button
          type="button"
          onClick={() => applyUnary((x) => (x >= 0 ? Math.sqrt(x) : null), '√')}
          title="Квадратный корень (например, √n)"
          className="py-1.5 rounded-md bg-white border border-[#CBD5E1] text-xs font-mono font-semibold text-[#1D4ED8] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
        >
          √x
        </button>
        <button
          type="button"
          onClick={() => applyUnary((x) => (1 + x) / 2, '(1+τ)/2')}
          title="Кендалл «увеличится»: (1 + τ) / 2"
          className="py-1.5 rounded-md bg-white border border-[#CBD5E1] text-[11px] font-mono font-semibold text-[#059669] hover:bg-[#ECFDF5] transition-colors cursor-pointer"
        >
          (1+τ)/2
        </button>
        <button
          type="button"
          onClick={() => applyUnary((x) => (1 - x) / 2, '(1−τ)/2')}
          title="Кендалл «уменьшится»: (1 − τ) / 2"
          className="py-1.5 rounded-md bg-white border border-[#CBD5E1] text-[11px] font-mono font-semibold text-[#D97706] hover:bg-[#FFFBEB] transition-colors cursor-pointer"
        >
          (1−τ)/2
        </button>
      </div>

      {/* Keypad */}
      <div className="p-3 grid grid-cols-4 gap-1.5">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={b.onClick}
            className={`h-10 rounded-lg font-mono text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center ${
              b.variant === 'primary'
                ? 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF]'
                : b.variant === 'op'
                ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] hover:bg-[#DBEAFE]'
                : b.variant === 'util'
                ? 'bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] hover:bg-[#E2E8F0]'
                : 'bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F8FAFC]'
            }`}
          >
            {b.label === '⌫' ? <Delete className="w-4 h-4" /> : b.label}
          </button>
        ))}
      </div>

      {/* Insert into active step input */}
      {onInsertValue && (
        <div className="px-3 pb-3 space-y-2">
          <button
            type="button"
            onClick={handleInsert}
            className="w-full py-2 px-3 rounded-lg bg-[#059669] text-white text-xs font-semibold hover:bg-[#047857] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>
              {activeTargetLabel
                ? `Вставить в ответ (${activeTargetLabel})`
                : 'Вставить результат в активное поле'}
            </span>
          </button>
        </div>
      )}

      {/* History strip */}
      {history.length > 0 && (
        <div className="px-3 py-2 bg-[#F8FAFC] border-t border-[#E2E8F0] space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
            <History className="w-3 h-3" />
            <span>Недавние вычисления</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {history.map((h, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setExpr(h.res);
                  setDisplayResult(h.res);
                }}
                className="px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[11px] font-mono text-[#334155] hover:border-[#1D4ED8] tabular-nums cursor-pointer"
              >
                {h.expr} = <strong>{h.res}</strong>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
