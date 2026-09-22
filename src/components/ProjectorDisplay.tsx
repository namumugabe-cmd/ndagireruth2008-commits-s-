import React, { useState, useEffect } from 'react';
import { School, SchoolElectionResults, PositionResult } from '../types';
import { getSchoolElectionResults } from '../services/storage';
import {
  Trophy,
  Maximize2,
  Minimize2,
  Tv,
  Users,
  Award,
  Sparkles,
  ArrowLeft,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Crown,
  BarChart3,
  LayoutGrid,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MemonLogo } from './MemonLogo';

interface ProjectorDisplayProps {
  school: School;
  onExit: () => void;
}

type ProjectorMode = 'leaderboard' | 'reveal' | 'bento' | 'turnout';

export const ProjectorDisplay: React.FC<ProjectorDisplayProps> = ({ school, onExit }) => {
  const [results, setResults] = useState<SchoolElectionResults>(() => getSchoolElectionResults(school.id));
  const [mode, setMode] = useState<ProjectorMode>('leaderboard');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // For Reveal Ceremony Mode
  const [activeRevealIndex, setActiveRevealIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Poll for live results updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const fresh = getSchoolElectionResults(school.id);
      setResults(fresh);
    }, 3000);
    return () => clearInterval(interval);
  }, [school.id]);

  // Handle auto-advance carousel for reveal mode
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoPlaying && mode === 'reveal') {
      timer = setInterval(() => {
        setIsRevealed(false);
        setActiveRevealIndex((prev) => (prev + 1) % results.positionsResults.length);
        setTimeout(() => {
          setIsRevealed(true);
          triggerConfetti();
        }, 800);
      }, 7000);
    }
    return () => clearInterval(timer);
  }, [isAutoPlaying, mode, results.positionsResults.length]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#10b981', '#38bdf8', '#ec4899'],
    });
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentRevealPosition = results.positionsResults[activeRevealIndex];

  const handleRevealWinner = () => {
    setIsRevealed(true);
    triggerConfetti();
  };

  const handleNextPosition = () => {
    setIsRevealed(false);
    setActiveRevealIndex((prev) => (prev + 1) % results.positionsResults.length);
  };

  const handlePrevPosition = () => {
    setIsRevealed(false);
    setActiveRevealIndex((prev) => (prev - 1 + results.positionsResults.length) % results.positionsResults.length);
  };

  const isDark = theme === 'dark';

  return (
    <div
      id="memon-projector-display-root"
      className={`min-h-screen transition-colors duration-300 flex flex-col justify-between overflow-hidden select-none ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Projector Control HUD (Sleek & discreet) */}
      <header
        className={`px-6 py-4 flex items-center justify-between border-b backdrop-blur-md z-30 ${
          isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white/80 border-slate-200 shadow-sm'
        }`}
      >
        {/* School & Brand Info */}
        <div className="flex items-center gap-4">
          <button
            id="exit-projector-btn"
            onClick={onExit}
            className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Projector</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-brand font-extrabold text-base tracking-wider uppercase">
                {school.name}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-bold">
                PROJECTOR MODE
              </span>
            </div>
            <p className="text-xs opacity-60">
              Reg: {school.regNumber} • {school.electionTitle || 'Student Leadership Elections'}
            </p>
          </div>
        </div>

        {/* Display Style Mode Switcher */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center p-1 rounded-2xl border text-xs font-semibold ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'
            }`}
          >
            <button
              id="mode-leaderboard-btn"
              onClick={() => setMode('leaderboard')}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                mode === 'leaderboard'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </button>
            <button
              id="mode-reveal-btn"
              onClick={() => {
                setMode('reveal');
                setIsRevealed(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                mode === 'reveal'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Reveal Ceremony</span>
            </button>
            <button
              id="mode-bento-btn"
              onClick={() => setMode('bento')}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                mode === 'bento'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Full Council</span>
            </button>
            <button
              id="mode-turnout-btn"
              onClick={() => setMode('turnout')}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                mode === 'turnout'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Turnout Stats</span>
            </button>
          </div>

          {/* Quick HUD Actions */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title="Toggle theme"
            className={`p-2 rounded-xl border transition ${
              isDark ? 'bg-slate-800 text-amber-300 border-slate-700' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={handleToggleFullscreen}
            title="Toggle fullscreen for projector"
            className={`p-2 rounded-xl border transition ${
              isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Projector Stage Area */}
      <main className="flex-1 flex flex-col justify-center p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {/* ================= STYLE 1: LIVE ASSEMBLY LEADERBOARD ================= */}
        {mode === 'leaderboard' && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-widest mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Auditorium Live Election Tallies
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold font-brand tracking-wider">
                Official Leadership Standings
              </h2>
              <p className="text-sm opacity-60 mt-1">
                Turnout: <strong>{results.totalVoted}</strong> of <strong>{results.totalEligible}</strong> pupils voted ({results.turnoutPercentage}%)
              </p>
            </div>

            {results.positionsResults.length === 0 ? (
              <div className={`p-12 text-center rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <Award className="w-12 h-12 mx-auto mb-3 text-amber-400 opacity-60" />
                <h3 className="text-xl font-bold font-brand">No Leadership Titles Registered</h3>
                <p className="text-xs opacity-60 mt-1 max-w-md mx-auto">
                  The school administration has not registered any candidate positions or offices for this election yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {results.positionsResults.map((posRes) => {
                  const winner = posRes.candidates.find((c) => c.isWinner);

                  return (
                    <div
                      key={posRes.position.id}
                      className={`rounded-3xl p-6 sm:p-8 border-2 transition shadow-2xl relative overflow-hidden ${
                        isDark
                          ? 'bg-slate-900/90 border-slate-800 shadow-slate-950/80'
                          : 'bg-white border-slate-200 shadow-slate-200/80'
                      }`}
                    >
                    {/* Position Heading */}
                    <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-700/30">
                      <div>
                        <span className="text-xs uppercase tracking-widest opacity-60 font-mono">Guild Office</span>
                        <h3 className="text-xl sm:text-2xl font-bold font-brand">{posRes.position.title}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs opacity-60 font-mono">Ballots Cast</span>
                        <div className="text-lg font-extrabold font-mono text-emerald-400">{posRes.totalVotes}</div>
                      </div>
                    </div>

                    {/* Candidates Standings Bars */}
                    <div className="space-y-5">
                      {posRes.candidates.map((cand, idx) => {
                        const isLeading = idx === 0 && cand.votes > 0;
                        return (
                          <div key={cand.id} className="space-y-2">
                            <div className="flex items-center justify-between text-sm sm:text-base">
                              <div className="flex items-center gap-3">
                                <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden border-2 border-slate-700 shrink-0 bg-slate-800 shadow">
                                  <img
                                    src={cand.photoUrl}
                                    alt={cand.fullName}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  {isLeading && (
                                    <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[9px]">
                                      ★
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-extrabold flex items-center gap-2">
                                    <span>{cand.fullName}</span>
                                    {isLeading && (
                                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] uppercase font-mono">
                                        Leader
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs opacity-60 font-mono">{cand.gradeOrClass}</div>
                                </div>
                              </div>

                              <div className="text-right font-mono">
                                <span className="text-lg sm:text-xl font-extrabold">{cand.votes}</span>
                                <span className="text-xs opacity-60 ml-1">({cand.percentage}%)</span>
                              </div>
                            </div>

                            {/* Animated Progress Bar */}
                            <div className="w-full h-4 rounded-full bg-slate-800/80 overflow-hidden p-0.5 border border-slate-700/40">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  isLeading
                                    ? 'bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/30'
                                    : 'bg-slate-600'
                                }`}
                                style={{ width: `${Math.max(4, cand.percentage)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* ================= STYLE 2: DRAMATIC WINNER REVEAL CEREMONY ================= */}
        {mode === 'reveal' && currentRevealPosition && (
          <div className="animate-fade-in flex flex-col items-center justify-center text-center py-4">
            {/* Position Carousel Navigator */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handlePrevPosition}
                className={`p-3 rounded-2xl border transition ${
                  isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800' : 'bg-white hover:bg-slate-200 border-slate-300'
                }`}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="px-6 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-sm font-bold">
                Position {activeRevealIndex + 1} of {results.positionsResults.length}
              </div>

              <button
                onClick={handleNextPosition}
                className={`p-3 rounded-2xl border transition ${
                  isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800' : 'bg-white hover:bg-slate-200 border-slate-300'
                }`}
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 transition ${
                  isAutoPlaying
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : isDark
                    ? 'bg-slate-900 text-slate-300 border-slate-800'
                    : 'bg-white text-slate-800 border-slate-300'
                }`}
              >
                {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>Auto-Slideshow</span>
              </button>
            </div>

            <div className="max-w-3xl w-full mx-auto">
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-mono font-bold block mb-2">
                Official Declaration of Result
              </span>
              <h2 className="text-3xl sm:text-6xl font-extrabold font-brand tracking-wide mb-8">
                {currentRevealPosition.position.title}
              </h2>

              {!isRevealed ? (
                /* Suspense Card before reveal */
                <div
                  className={`rounded-3xl p-12 border-2 border-dashed flex flex-col items-center justify-center space-y-6 shadow-2xl transition ${
                    isDark ? 'bg-slate-900/60 border-amber-500/40' : 'bg-white border-amber-400'
                  }`}
                >
                  <div className="w-24 h-24 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center animate-pulse">
                    <Trophy className="w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold font-brand">Results Sealed in Secret Database</h3>
                    <p className="text-sm opacity-60 max-w-md mx-auto">
                      Total <strong>{currentRevealPosition.totalVotes}</strong> pupil ballots processed for this position.
                    </p>
                  </div>
                  <button
                    id="trigger-reveal-winner-btn"
                    onClick={handleRevealWinner}
                    className="px-10 py-5 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-extrabold text-xl rounded-2xl shadow-2xl shadow-amber-500/30 transform hover:scale-105 active:scale-95 transition flex items-center gap-3"
                  >
                    <Sparkles className="w-6 h-6" />
                    <span>REVEAL WINNER ON PROJECTOR</span>
                  </button>
                </div>
              ) : (
                /* Glorious Winner Announcement */
                <div
                  className={`rounded-3xl p-8 sm:p-12 border-4 border-amber-400/80 shadow-2xl relative overflow-hidden animate-scale-in ${
                    isDark
                      ? 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 shadow-amber-500/20'
                      : 'bg-white shadow-amber-200'
                  }`}
                >
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={triggerConfetti}
                      className="p-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition text-xs font-bold flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      More Confetti
                    </button>
                  </div>

                  {(() => {
                    const winner = currentRevealPosition.candidates.find((c) => c.isWinner);
                    if (!winner) {
                      return (
                        <div className="py-8 space-y-4">
                          <div className="text-2xl font-bold text-amber-400">Election Standstill / Tie</div>
                          <p className="text-sm opacity-70">
                            The votes are currently tied between top candidates or no votes were cast yet.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col items-center space-y-6">
                        {/* Winner Badge & Laurel */}
                        <div className="relative">
                          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-4 border-amber-400 shadow-2xl ring-8 ring-amber-400/20 bg-slate-900">
                            <img
                              src={winner.photoUrl}
                              alt={winner.fullName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold font-mono text-xs shadow-lg uppercase tracking-wider flex items-center gap-1.5">
                            <Crown className="w-4 h-4" />
                            <span>ELECTED</span>
                          </div>
                        </div>

                        {/* Name & Title */}
                        <div className="space-y-1 mt-2">
                          <h3 className="text-3xl sm:text-5xl font-extrabold font-brand tracking-wider text-amber-300">
                            {winner.fullName}
                          </h3>
                          <p className="text-base sm:text-lg font-mono font-semibold text-emerald-400">
                            {winner.gradeOrClass}
                          </p>
                        </div>

                        {/* Winning Stats Pod */}
                        <div className="grid grid-cols-2 gap-4 max-w-md w-full my-4">
                          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                            <div className="text-xs opacity-60 uppercase font-mono">Total Votes</div>
                            <div className="text-3xl font-extrabold font-mono text-amber-400 mt-0.5">
                              {winner.votes}
                            </div>
                          </div>
                          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                            <div className="text-xs opacity-60 uppercase font-mono">Victory Margin</div>
                            <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-0.5">
                              {winner.percentage}%
                            </div>
                          </div>
                        </div>

                        {/* Other Runners-up */}
                        <div className="w-full pt-6 border-t border-slate-800/80">
                          <div className="text-xs uppercase tracking-widest opacity-60 mb-3 font-mono">
                            Other Candidates
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-3">
                            {currentRevealPosition.candidates
                              .filter((c) => c.id !== winner.id)
                              .map((c) => (
                                <div
                                  key={c.id}
                                  className="px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono flex items-center gap-2"
                                >
                                  <span>{c.fullName}</span>
                                  <span className="opacity-60 font-bold">
                                    {c.votes} votes ({c.percentage}%)
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= STYLE 3: BENTO GRID COUNCIL ================= */}
        {mode === 'bento' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold font-brand tracking-wider">
                Full Prefectorial Council & Guild Board
              </h2>
              <p className="text-xs opacity-60 font-mono mt-1">
                Auditorium High-Impact Overview • {school.name}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {results.positionsResults.map((posRes) => {
                const winner = posRes.candidates.find((c) => c.isWinner) || posRes.candidates[0];

                return (
                  <div
                    key={posRes.position.id}
                    className={`rounded-3xl p-6 border-2 transition shadow-xl flex flex-col justify-between ${
                      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-widest opacity-60">Post</span>
                      <h3 className="text-lg font-bold font-brand line-clamp-1 mb-4">{posRes.position.title}</h3>

                      {winner ? (
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                          <img
                            src={winner.photoUrl}
                            alt={winner.fullName}
                            className="w-14 h-14 rounded-xl object-cover border border-amber-400/60"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="text-xs font-bold text-amber-300 line-clamp-1">{winner.fullName}</div>
                            <div className="text-[11px] opacity-60 font-mono">{winner.gradeOrClass}</div>
                            <div className="text-[10px] text-emerald-400 font-bold font-mono mt-1">
                              {winner.votes} votes ({winner.percentage}%)
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs opacity-60">No candidate registered</div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono opacity-70">
                      <span>Total Polls</span>
                      <span className="font-bold text-slate-200">{posRes.totalVotes}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= STYLE 4: TURNOUT & STATS ================= */}
        {mode === 'turnout' && (
          <div className="max-w-4xl mx-auto w-full text-center space-y-8 animate-fade-in py-6">
            <MemonLogo size="md" centered={true} />

            <h2 className="text-3xl sm:text-5xl font-extrabold font-brand tracking-wider">
              Student Participation & Voter Turnout
            </h2>

            {/* Giant Turnout Circle / Metric */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
              <div className={`p-8 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="text-xs font-mono uppercase opacity-60 mb-1">Eligible Pupils</div>
                <div className="text-5xl font-extrabold font-mono text-slate-100">{results.totalEligible}</div>
                <div className="text-xs opacity-60 mt-2">Total registered student IDs</div>
              </div>

              <div className={`p-8 rounded-3xl border border-emerald-500/50 ${isDark ? 'bg-emerald-950/40' : 'bg-emerald-50'}`}>
                <div className="text-xs font-mono uppercase text-emerald-400 mb-1">Ballots Cast</div>
                <div className="text-5xl font-extrabold font-mono text-emerald-400">{results.totalVoted}</div>
                <div className="text-xs text-emerald-300/80 mt-2">Verified secret votes</div>
              </div>

              <div className={`p-8 rounded-3xl border border-amber-500/50 ${isDark ? 'bg-amber-950/40' : 'bg-amber-50'}`}>
                <div className="text-xs font-mono uppercase text-amber-400 mb-1">Overall Turnout</div>
                <div className="text-5xl font-extrabold font-mono text-amber-400">{results.turnoutPercentage}%</div>
                <div className="text-xs text-amber-300/80 mt-2">School democratic engagement</div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-2 max-w-2xl mx-auto">
              <div className="flex justify-between text-xs font-mono opacity-80">
                <span>0%</span>
                <span className="font-bold text-emerald-400">{results.totalVoted} of {results.totalEligible} voted</span>
                <span>100%</span>
              </div>
              <div className="w-full h-6 rounded-full bg-slate-800 overflow-hidden p-1 border border-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-amber-400 transition-all duration-1000"
                  style={{ width: `${results.turnoutPercentage}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info on Projector */}
      <footer className="px-6 py-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] opacity-60 font-mono">
        <span>MEMON XULE • Official School E-Voting Results Broadcaster</span>
        <span className="flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          Live database sync active
        </span>
      </footer>
    </div>
  );
};
