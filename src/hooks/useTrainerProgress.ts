import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DailyStatEntry,
  ExamAttempt,
  GeneratedTicket,
  MistakeItem,
  ModuleAccuracyStats,
  StatModuleKey,
  TrainerProgressState,
} from '../types/stats';
import { generateExamTicket } from '../utils/taskGenerator';

const STORAGE_KEY = 'nasledov_stat_trainer_v1';
const MAX_SAVED_TICKETS = 25;

const DEFAULT_MODULE_STATS: Record<StatModuleKey, ModuleAccuracyStats> = {
  steps: { attempts: 0, correct: 0 },
  direct: { attempts: 0, correct: 0 },
  tests: { attempts: 0, correct: 0 },
  df: { attempts: 0, correct: 0 },
  exam: { attempts: 0, correct: 0 },
  generated: { attempts: 0, correct: 0 },
};

function createDefaultState(): TrainerProgressState {
  const initialTicket = generateExamTicket('steps');
  return {
    solvedSteps: {},
    solvedDirect: {},
    stepAttempts: {},
    answeredTests: {},
    solvedDfDrills: {},
    mistakes: {},
    examHistory: [],
    dailyStats: {},
    moduleStats: { ...DEFAULT_MODULE_STATS },
    savedGeneratedTickets: [initialTicket],
    activeGeneratedTicketId: initialTicket.id,
  };
}

export function getLocalDateKey(ts = Date.now()): string {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isGeneratedEntityId(id: string): boolean {
  return (
    id.startsWith('gen_') ||
    id.startsWith('direct_gen_') ||
    id.startsWith('Билет #')
  );
}

function normalizeTicket(t: GeneratedTicket, idx: number): GeneratedTicket {
  return {
    ...t,
    id: t.id || `gen_legacy_${idx}_${t.seedLabel.replace(/\s+/g, '')}`,
    createdAt: t.createdAt || Date.now() - idx * 60000,
    origin: t.origin || 'steps',
  };
}

function loadInitialState(): TrainerProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as Partial<TrainerProgressState>;
    const solvedSteps = { ...(parsed.solvedSteps || {}) };
    const solvedDirect = { ...(parsed.solvedDirect || {}) };
    const stepAttempts = { ...(parsed.stepAttempts || {}) };
    const answeredTests = parsed.answeredTests || {};
    const solvedDfDrills = parsed.solvedDfDrills || {};
    const mistakes = { ...(parsed.mistakes || {}) };
    const examHistory = Array.isArray(parsed.examHistory)
      ? parsed.examHistory
      : [];

    // Clean up any stale Variant 1 Task 1 attempts/mistakes from temporary t=17/95830 state
    if (
      mistakes['v1_t1_s2']?.correctAnswer === '17' ||
      stepAttempts['v1_t1_s2']?.value?.trim() === '17'
    ) {
      delete mistakes['v1_t1_s2'];
      delete stepAttempts['v1_t1_s2'];
      delete solvedSteps['v1_t1_s2'];
    }

    if (
      mistakes['v1_t1_s3']?.correctAnswer === '95830' ||
      stepAttempts['v1_t1_s3']?.value?.replace(/\s+/g, '') === '95830'
    ) {
      delete mistakes['v1_t1_s3'];
      delete stepAttempts['v1_t1_s3'];
      delete solvedSteps['v1_t1_s3'];
    }

    if (mistakes['direct_v1_t1']?.correctAnswer?.includes('95830')) {
      delete mistakes['direct_v1_t1'];
      delete solvedDirect['direct_v1_t1'];
    }

    const rawTickets = Array.isArray(parsed.savedGeneratedTickets)
      ? parsed.savedGeneratedTickets
          .filter((t) => t && Array.isArray(t.tasks) && Array.isArray(t.tests))
          .map(normalizeTicket)
      : [];

    const savedGeneratedTickets =
      rawTickets.length > 0 ? rawTickets : [generateExamTicket('steps')];
    const activeGeneratedTicketId =
      parsed.activeGeneratedTicketId &&
      savedGeneratedTickets.some((t) => t.id === parsed.activeGeneratedTicketId)
        ? parsed.activeGeneratedTicketId
        : savedGeneratedTickets[0].id;

    // Backfill dailyStats/moduleStats if upgrading from earlier saved state without them
    let dailyStats = parsed.dailyStats || {};
    let moduleStats = parsed.moduleStats || { ...DEFAULT_MODULE_STATS };

    if (!parsed.dailyStats) {
      const today = getLocalDateKey();
      const stepAttList = Object.values(stepAttempts);
      const testList = Object.values(answeredTests);
      const dfSolvedCount = Object.keys(solvedDfDrills).length;

      const stepCorrect = stepAttList.filter((a) => a.isCorrect).length;
      const testCorrect = testList.filter((t) => t.isCorrect).length;

      const totalAttempts =
        stepAttList.length + testList.length + dfSolvedCount;
      const totalCorrect = stepCorrect + testCorrect + dfSolvedCount;

      if (totalAttempts > 0) {
        dailyStats = {
          [today]: {
            date: today,
            solved: totalCorrect,
            attempts: totalAttempts,
            correct: totalCorrect,
          },
        };
        moduleStats = {
          steps: { attempts: stepAttList.length, correct: stepCorrect },
          direct: { attempts: 0, correct: 0 },
          tests: { attempts: testList.length, correct: testCorrect },
          df: { attempts: dfSolvedCount, correct: dfSolvedCount },
          exam: { attempts: 0, correct: 0 },
          generated: { attempts: 0, correct: 0 },
        };
      }
    }

    return {
      solvedSteps,
      solvedDirect,
      stepAttempts,
      answeredTests,
      solvedDfDrills,
      mistakes,
      examHistory,
      dailyStats,
      moduleStats: {
        steps: moduleStats.steps || { attempts: 0, correct: 0 },
        direct: moduleStats.direct || { attempts: 0, correct: 0 },
        tests: moduleStats.tests || { attempts: 0, correct: 0 },
        df: moduleStats.df || { attempts: 0, correct: 0 },
        exam: moduleStats.exam || { attempts: 0, correct: 0 },
        generated: moduleStats.generated || { attempts: 0, correct: 0 },
      },
      savedGeneratedTickets,
      activeGeneratedTicketId,
    };
  } catch {
    return createDefaultState();
  }
}

function appendDailyAndModule(
  prev: TrainerProgressState,
  moduleKey: StatModuleKey,
  attemptsDelta: number,
  correctDelta: number,
  solvedDelta: number,
  ts = Date.now(),
  alsoCountGenerated = false
): {
  dailyStats: Record<string, DailyStatEntry>;
  moduleStats: Record<StatModuleKey, ModuleAccuracyStats>;
} {
  const dateKey = getLocalDateKey(ts);
  const existingDay = prev.dailyStats[dateKey] || {
    date: dateKey,
    solved: 0,
    attempts: 0,
    correct: 0,
  };
  const existingMod = prev.moduleStats[moduleKey] || {
    attempts: 0,
    correct: 0,
  };
  const existingGen = prev.moduleStats.generated || {
    attempts: 0,
    correct: 0,
  };

  const nextModuleStats: Record<StatModuleKey, ModuleAccuracyStats> = {
    ...prev.moduleStats,
    [moduleKey]: {
      attempts: existingMod.attempts + attemptsDelta,
      correct: existingMod.correct + correctDelta,
    },
  };

  if (alsoCountGenerated && moduleKey !== 'generated') {
    nextModuleStats.generated = {
      attempts: existingGen.attempts + attemptsDelta,
      correct: existingGen.correct + correctDelta,
    };
  }

  return {
    dailyStats: {
      ...prev.dailyStats,
      [dateKey]: {
        date: dateKey,
        solved: existingDay.solved + solvedDelta,
        attempts: existingDay.attempts + attemptsDelta,
        correct: existingDay.correct + correctDelta,
      },
    },
    moduleStats: nextModuleStats,
  };
}

export function useTrainerProgress() {
  const [state, setState] = useState<TrainerProgressState>(loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [state]);

  const activeGeneratedTicket = useMemo(() => {
    return (
      state.savedGeneratedTickets.find(
        (t) => t.id === state.activeGeneratedTicketId
      ) || state.savedGeneratedTickets[0]
    );
  }, [state.savedGeneratedTickets, state.activeGeneratedTicketId]);

  const createNewGeneratedTicket = useCallback(
    (origin: 'steps' | 'direct' | 'exam' = 'steps'): GeneratedTicket => {
      const ticket = generateExamTicket(origin);
      setState((prev) => ({
        ...prev,
        savedGeneratedTickets: [ticket, ...prev.savedGeneratedTickets].slice(
          0,
          MAX_SAVED_TICKETS
        ),
        activeGeneratedTicketId: ticket.id,
      }));
      return ticket;
    },
    []
  );

  const selectGeneratedTicket = useCallback((ticketId: string) => {
    setState((prev) => {
      if (!prev.savedGeneratedTickets.some((t) => t.id === ticketId)) {
        return prev;
      }
      return {
        ...prev,
        activeGeneratedTicketId: ticketId,
      };
    });
  }, []);

  const markStepResult = useCallback(
    (
      stepId: string,
      value: string,
      isCorrect: boolean,
      mistakePayload?: Omit<MistakeItem, 'id' | 'createdAt'>
    ) => {
      setState((prev) => {
        const nextSolved = { ...prev.solvedSteps };
        const nextMistakes = { ...prev.mistakes };
        const wasAlreadySolved = Boolean(prev.solvedSteps[stepId]);

        if (isCorrect) {
          nextSolved[stepId] = true;
          delete nextMistakes[stepId];
        } else if (mistakePayload) {
          nextMistakes[stepId] = {
            ...mistakePayload,
            id: stepId,
            createdAt: Date.now(),
          };
        }

        const { dailyStats, moduleStats } = appendDailyAndModule(
          prev,
          'steps',
          1,
          isCorrect ? 1 : 0,
          isCorrect && !wasAlreadySolved ? 1 : 0,
          Date.now(),
          isGeneratedEntityId(stepId)
        );

        return {
          ...prev,
          solvedSteps: nextSolved,
          stepAttempts: {
            ...prev.stepAttempts,
            [stepId]: { value, isCorrect },
          },
          mistakes: nextMistakes,
          dailyStats,
          moduleStats,
        };
      });
    },
    []
  );

  const markDirectResult = useCallback(
    (
      taskId: string,
      isCorrect: boolean,
      mistakePayload?: Omit<MistakeItem, 'id' | 'createdAt'>
    ) => {
      setState((prev) => {
        const nextSolvedDirect = { ...prev.solvedDirect };
        const nextMistakes = { ...prev.mistakes };
        const wasAlreadySolved = Boolean(prev.solvedDirect[taskId]);

        if (isCorrect) {
          nextSolvedDirect[taskId] = true;
          delete nextMistakes[`direct_${taskId}`];
        } else if (mistakePayload) {
          nextMistakes[`direct_${taskId}`] = {
            ...mistakePayload,
            id: `direct_${taskId}`,
            createdAt: Date.now(),
          };
        }

        const { dailyStats, moduleStats } = appendDailyAndModule(
          prev,
          'direct',
          1,
          isCorrect ? 1 : 0,
          isCorrect && !wasAlreadySolved ? 1 : 0,
          Date.now(),
          isGeneratedEntityId(taskId)
        );

        return {
          ...prev,
          solvedDirect: nextSolvedDirect,
          mistakes: nextMistakes,
          dailyStats,
          moduleStats,
        };
      });
    },
    []
  );

  const markTestResult = useCallback(
    (
      questionId: string,
      optionIdx: number,
      isCorrect: boolean,
      mistakePayload?: Omit<MistakeItem, 'id' | 'createdAt'>
    ) => {
      setState((prev) => {
        const nextMistakes = { ...prev.mistakes };
        const wasAlreadyCorrect = Boolean(
          prev.answeredTests[questionId]?.isCorrect
        );

        if (isCorrect) {
          delete nextMistakes[questionId];
        } else if (mistakePayload) {
          nextMistakes[questionId] = {
            ...mistakePayload,
            id: questionId,
            createdAt: Date.now(),
          };
        }

        const { dailyStats, moduleStats } = appendDailyAndModule(
          prev,
          'tests',
          1,
          isCorrect ? 1 : 0,
          isCorrect && !wasAlreadyCorrect ? 1 : 0,
          Date.now(),
          isGeneratedEntityId(questionId)
        );

        return {
          ...prev,
          answeredTests: {
            ...prev.answeredTests,
            [questionId]: { optionIdx, isCorrect },
          },
          mistakes: nextMistakes,
          dailyStats,
          moduleStats,
        };
      });
    },
    []
  );

  const markDfDrillResult = useCallback(
    (
      drillId: string,
      isCorrect: boolean,
      mistakePayload?: Omit<MistakeItem, 'id' | 'createdAt'>
    ) => {
      setState((prev) => {
        const nextDrills = { ...prev.solvedDfDrills };
        const nextMistakes = { ...prev.mistakes };
        const wasAlreadySolved = Boolean(prev.solvedDfDrills[drillId]);

        if (isCorrect) {
          nextDrills[drillId] = true;
          delete nextMistakes[drillId];
        } else if (mistakePayload) {
          nextMistakes[drillId] = {
            ...mistakePayload,
            id: drillId,
            createdAt: Date.now(),
          };
        }

        const { dailyStats, moduleStats } = appendDailyAndModule(
          prev,
          'df',
          1,
          isCorrect ? 1 : 0,
          isCorrect && !wasAlreadySolved ? 1 : 0
        );

        return {
          ...prev,
          solvedDfDrills: nextDrills,
          mistakes: nextMistakes,
          dailyStats,
          moduleStats,
        };
      });
    },
    []
  );

  const recordPracticeAttempt = useCallback(
    (
      moduleKey: StatModuleKey,
      isCorrect: boolean,
      alsoCountGenerated = false
    ) => {
      setState((prev) => {
        const { dailyStats, moduleStats } = appendDailyAndModule(
          prev,
          moduleKey,
          1,
          isCorrect ? 1 : 0,
          isCorrect ? 1 : 0,
          Date.now(),
          alsoCountGenerated
        );
        return {
          ...prev,
          dailyStats,
          moduleStats,
        };
      });
    },
    []
  );

  const addMistakesBatch = useCallback((items: MistakeItem[]) => {
    if (items.length === 0) return;
    setState((prev) => {
      const nextMistakes = { ...prev.mistakes };
      for (const item of items) {
        nextMistakes[item.id] = item;
      }
      return {
        ...prev,
        mistakes: nextMistakes,
      };
    });
  }, []);

  const resolveMistake = useCallback((id: string) => {
    setState((prev) => {
      const nextMistakes = { ...prev.mistakes };
      delete nextMistakes[id];
      return {
        ...prev,
        mistakes: nextMistakes,
      };
    });
  }, []);

  const resetTestsOnly = useCallback(() => {
    setState((prev) => ({
      ...prev,
      answeredTests: {},
    }));
  }, []);

  const recordExamAttempt = useCallback((attempt: ExamAttempt) => {
    setState((prev) => {
      const { dailyStats, moduleStats } = appendDailyAndModule(
        prev,
        'exam',
        attempt.totalCount,
        attempt.correctCount,
        attempt.correctCount,
        attempt.timestamp,
        Boolean(attempt.isGenerated)
      );

      return {
        ...prev,
        examHistory: [attempt, ...prev.examHistory].slice(0, 15),
        dailyStats,
        moduleStats,
      };
    });
  }, []);

  const resetAllProgress = useCallback(() => {
    const fresh = createDefaultState();
    setState(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    state,
    activeGeneratedTicket,
    createNewGeneratedTicket,
    selectGeneratedTicket,
    markStepResult,
    markDirectResult,
    markTestResult,
    markDfDrillResult,
    recordPracticeAttempt,
    addMistakesBatch,
    resolveMistake,
    resetTestsOnly,
    recordExamAttempt,
    resetAllProgress,
  };
}
