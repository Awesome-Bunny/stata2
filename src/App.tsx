import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Calculator,
  ClipboardCheck,
  Flame,
  FlaskConical,
  GraduationCap,
  Layers,
  RotateCcw,
  Target,
  Timer,
} from 'lucide-react';
import { CardMarathonTrainer } from './components/CardMarathonTrainer';
import { ComparisonView } from './components/ComparisonView';
import { DfChi2Lab } from './components/DfChi2Lab';
import { DirectTrainer } from './components/DirectTrainer';
import { ExamSimulator } from './components/ExamSimulator';
import { GlossaryModal } from './components/GlossaryModal';
import { GlossaryView } from './components/GlossaryView';
import { ProgressAnalyticsView } from './components/ProgressAnalyticsView';
import { StatCalculator } from './components/StatCalculator';
import { StepTrainer } from './components/StepTrainer';
import { TestTrainer } from './components/TestTrainer';
import { useTrainerProgress } from './hooks/useTrainerProgress';
import { AppTab } from './types/stats';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('trainer');
  const [activeTermKey, setActiveTermKey] = useState<string | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcTargetLabel, setCalcTargetLabel] = useState<string | null>(null);
  const [forceGeneratedSignal, setForceGeneratedSignal] = useState(0);
  const calcApplyRef = useRef<((val: string) => void) | null>(null);

  const handleRegisterCalcTarget = useCallback(
    (label: string, applyValue: (val: string) => void) => {
      setCalcTargetLabel(label);
      calcApplyRef.current = applyValue;
    },
    []
  );

  const handleTabChange = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    setCalcTargetLabel(null);
    calcApplyRef.current = null;
  }, []);

  const {
    state: progress,
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
  } = useTrainerProgress();

  const handleOpenSavedGeneratedTicket = useCallback(
    (ticketId: string, targetTab: 'trainer' | 'direct') => {
      selectGeneratedTicket(ticketId);
      setForceGeneratedSignal((n) => n + 1);
      handleTabChange(targetTab);
    },
    [selectGeneratedTicket, handleTabChange]
  );

  const handleCreateAndOpenTicket = useCallback(
    (targetTab: 'trainer' | 'direct') => {
      createNewGeneratedTicket(targetTab === 'trainer' ? 'steps' : 'direct');
      setForceGeneratedSignal((n) => n + 1);
      handleTabChange(targetTab);
    },
    [createNewGeneratedTicket, handleTabChange]
  );

  const mistakeCount = useMemo(
    () => Object.keys(progress.mistakes).length,
    [progress.mistakes]
  );

  const solvedTotal = useMemo(
    () =>
      Object.keys(progress.solvedSteps).length +
      Object.keys(progress.solvedDirect).length +
      Object.values(progress.answeredTests).filter((t) => t.isCorrect).length +
      Object.keys(progress.solvedDfDrills).length,
    [
      progress.solvedSteps,
      progress.solvedDirect,
      progress.answeredTests,
      progress.solvedDfDrills,
    ]
  );

  const accuracyPct = useMemo(() => {
    const entries = Object.values(progress.dailyStats);
    const totalAttempts = entries.reduce((sum, e) => sum + e.attempts, 0);
    const totalCorrect = entries.reduce((sum, e) => sum + e.correct, 0);
    return totalAttempts > 0
      ? Math.round((totalCorrect / totalAttempts) * 100)
      : null;
  }, [progress.dailyStats]);

  const navItems: { id: AppTab; label: string; icon: typeof Layers }[] = [
    { id: 'trainer', label: 'По шагам', icon: Layers },
    { id: 'direct', label: 'Без шагов', icon: Target },
    { id: 'compare', label: 'Сравнение', icon: ArrowLeftRight },
    { id: 'df_lab', label: 'Степени df', icon: FlaskConical },
    { id: 'tests', label: 'Тесты', icon: ClipboardCheck },
    { id: 'cards', label: 'Карточки', icon: Flame },
    { id: 'exam', label: 'Экзамен', icon: Timer },
    { id: 'stats', label: 'Статистика', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Top 3-Zone Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand */}
          <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
            <div className="w-9 h-9 rounded-lg bg-[#1D4ED8] text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#0F172A] leading-tight">
                СтатПрактикум
              </div>
              <div className="text-[11px] text-[#64748B] leading-tight">
                По учебнику А. Д. Наследова
              </div>
            </div>
          </div>

          {/* Zone 2: Desktop Navigation Tabs */}
          <nav
            aria-label="Основные разделы"
            className="hidden xl:flex items-center gap-1"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                      : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.id === 'tests' && mistakeCount > 0 && (
                    <span className="ml-0.5 font-mono text-[11px] text-[#DC2626] tabular-nums">
                      ({mistakeCount})
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Progress & Quick Glossary */}
          <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#475569] tabular-nums mr-1">
              <button
                type="button"
                onClick={() => setActiveTab('stats')}
                title="Открыть графики прогресса и точности"
                className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
              >
                Решено: <strong className="text-[#0F172A]">{solvedTotal}</strong>
                {accuracyPct !== null && (
                  <span className="text-[#059669] font-semibold">
                    {' '}
                    · {accuracyPct}%
                  </span>
                )}
              </button>
              {mistakeCount > 0 && (
                <>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tests')}
                    className="text-[#DC2626] font-semibold hover:underline cursor-pointer"
                  >
                    Ошибок: {mistakeCount}
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCalcOpen((prev) => !prev)}
              title="Открыть или скрыть статистический калькулятор"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                calcOpen
                  ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white'
                  : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#334155] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Калькулятор</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('glossary')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F8FAFC] border border-[#CBD5E1] text-[#1D4ED8] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Словарь</span>
            </button>

            <button
              type="button"
              onClick={resetAllProgress}
              title="Сбросить весь сохранённый прогресс"
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tablet / Mobile secondary tab strip */}
        <div className="xl:hidden border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#1D4ED8] text-white'
                      : 'bg-white border border-[#E2E8F0] text-[#475569]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'trainer' && (
          <StepTrainer
            progress={progress}
            generatedTicket={activeGeneratedTicket}
            forceGeneratedSignal={forceGeneratedSignal}
            onRegenerateTicket={() => createNewGeneratedTicket('steps')}
            onSelectGeneratedTicket={selectGeneratedTicket}
            onOpenTerm={(key) => setActiveTermKey(key)}
            onOpenCalculator={() => setCalcOpen(true)}
            onRegisterCalcTarget={handleRegisterCalcTarget}
            onStepResult={markStepResult}
            onTestResult={markTestResult}
          />
        )}

        {activeTab === 'direct' && (
          <DirectTrainer
            progress={progress}
            generatedTicket={activeGeneratedTicket}
            forceGeneratedSignal={forceGeneratedSignal}
            onRegenerateTicket={() => createNewGeneratedTicket('direct')}
            onSelectGeneratedTicket={selectGeneratedTicket}
            onOpenTerm={(key) => setActiveTermKey(key)}
            onOpenCalculator={() => setCalcOpen(true)}
            onRegisterCalcTarget={handleRegisterCalcTarget}
            onDirectResult={markDirectResult}
            onTestResult={markTestResult}
          />
        )}

        {activeTab === 'compare' && (
          <ComparisonView onOpenTerm={(key) => setActiveTermKey(key)} />
        )}

        {activeTab === 'df_lab' && (
          <DfChi2Lab
            progress={progress}
            onOpenTerm={(key) => setActiveTermKey(key)}
            onDfDrillResult={markDfDrillResult}
          />
        )}

        {activeTab === 'tests' && (
          <TestTrainer
            progress={progress}
            onOpenTerm={(key) => setActiveTermKey(key)}
            onTestResult={markTestResult}
            onResetTests={resetTestsOnly}
            onResolveMistake={resolveMistake}
            onOpenCardsMode={() => handleTabChange('cards')}
          />
        )}

        {activeTab === 'cards' && (
          <CardMarathonTrainer
            onOpenTerm={(key) => setActiveTermKey(key)}
            onTestResult={markTestResult}
            onRecordGeneratedAttempt={(isCorrect) =>
              recordPracticeAttempt('tests', isCorrect, true)
            }
          />
        )}

        {activeTab === 'exam' && (
          <ExamSimulator
            progress={progress}
            onCreateGeneratedTicket={() => createNewGeneratedTicket('exam')}
            onOpenTerm={(key) => setActiveTermKey(key)}
            onOpenCalculator={() => setCalcOpen(true)}
            onRegisterCalcTarget={handleRegisterCalcTarget}
            onRecordExam={recordExamAttempt}
            onAddMistakes={addMistakesBatch}
          />
        )}

        {activeTab === 'stats' && (
          <ProgressAnalyticsView
            progress={progress}
            onNavigateTab={handleTabChange}
            onOpenGeneratedTicket={handleOpenSavedGeneratedTicket}
            onCreateNewGeneratedTicket={handleCreateAndOpenTicket}
          />
        )}

        {activeTab === 'glossary' && (
          <GlossaryView onOpenTerm={(key) => setActiveTermKey(key)} />
        )}
      </main>

      <StatCalculator
        isOpen={calcOpen}
        onClose={() => setCalcOpen(false)}
        activeTargetLabel={calcTargetLabel}
        onInsertValue={
          calcTargetLabel
            ? (val) => {
                calcApplyRef.current?.(val);
              }
            : undefined
        }
      />

      <GlossaryModal
        termKey={activeTermKey}
        onClose={() => setActiveTermKey(null)}
        onSelectTerm={(key) => setActiveTermKey(key)}
        onOpenFullGlossary={() => handleTabChange('glossary')}
      />
    </div>
  );
}
