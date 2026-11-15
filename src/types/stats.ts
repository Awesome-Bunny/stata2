export type AppTab =
  | 'trainer'
  | 'direct'
  | 'compare'
  | 'df_lab'
  | 'tests'
  | 'cards'
  | 'exam'
  | 'stats'
  | 'glossary';

export type VariantSource = 'v1' | 'v3' | 'generated';

export type GlossarySourceStatus = 'exact' | 'adapted' | 'course';

export interface GlossaryEntry {
  key: string;
  title: string;
  academic: string;
  simple: string;
  formula: string;
  formulaTex: string;
  trap: string;
  examTasks: number[];
  patterns?: string[];
  sourceStatus: GlossarySourceStatus;
  sourceRef: string;
  sourceNote: string;
}

export interface Chi2Row {
  df: number;
  p05: number;
  p01: number;
  note: string;
}

export interface TaskStep {
  id: string;
  label: string;
  ans: string[];
  hint: string;
  placeholder?: string;
  quickChoices?: string[];
  numericTolerance?: number;
}

export interface TaskItem {
  id: string;
  num: number;
  title: string;
  points: string;
  pointsNum: number;
  text: string;
  trap: string;
  formulaSummary: string;
  formulaTex: string;
  steps: TaskStep[];
}

export interface TestOption {
  text: string;
  isCorrect: boolean;
  explain: string;
}

export interface TestQuestion {
  id: string;
  variants: string;
  topic: 'sampling' | 'scales' | 'correlation' | 'df' | 'models';
  points: number;
  question: string;
  options: TestOption[];
}

export interface DfDrillExercise {
  id: string;
  scenario: string;
  type: 'normality' | 'contingency';
  k_or_rc: string;
  correct_df: number;
  correct_crit: number;
  emp: number;
  conclusion: string;
  conclusionOptions: string[];
  explain: string;
}

export interface GeneratedTicket {
  id: string;
  seedLabel: string;
  generatedAt: string;
  createdAt: number;
  origin?: 'steps' | 'direct' | 'exam';
  tasks: TaskItem[];
  tests: TestQuestion[];
}

export interface MistakeItem {
  id: string;
  kind: 'step' | 'test' | 'df';
  sourceLabel: string;
  title: string;
  prompt: string;
  correctAnswer: string;
  hint: string;
  createdAt: number;
}

export interface ExamAttempt {
  id: string;
  timestamp: number;
  variantLabel: string;
  generatedTicketId?: string;
  isGenerated?: boolean;
  durationSeconds: number;
  timeLimitSeconds: number;
  earnedPoints: number;
  maxPoints: number;
  correctCount: number;
  totalCount: number;
}

export interface DailyStatEntry {
  date: string; // YYYY-MM-DD
  solved: number;
  attempts: number;
  correct: number;
}

export type StatModuleKey =
  | 'steps'
  | 'direct'
  | 'tests'
  | 'df'
  | 'exam'
  | 'generated';

export interface ModuleAccuracyStats {
  attempts: number;
  correct: number;
}

export interface TrainerProgressState {
  solvedSteps: Record<string, boolean>;
  solvedDirect: Record<string, boolean>;
  stepAttempts: Record<string, { value: string; isCorrect: boolean }>;
  answeredTests: Record<string, { optionIdx: number; isCorrect: boolean }>;
  solvedDfDrills: Record<string, boolean>;
  mistakes: Record<string, MistakeItem>;
  examHistory: ExamAttempt[];
  dailyStats: Record<string, DailyStatEntry>;
  moduleStats: Record<StatModuleKey, ModuleAccuracyStats>;
  savedGeneratedTickets: GeneratedTicket[];
  activeGeneratedTicketId: string;
}
