import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { useApp } from '../context/AppContext';
import {
  Trophy,
  Medal,
  Award,
  CheckCircle2,
  Droplet,
  Zap,
  Leaf,
  Flame,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { LEADERBOARD_USERS } from '../data/mockData';
import confetti from 'canvas-confetti';
import { KindredHeroSection } from '../components/community/KindredHeroSection';
import { CommunityContactCtaSection } from '../components/community/CommunityContactCtaSection';

export const Community: React.FC = () => {
  const { challenges, joinChallenge, recordChallengeCheckIn, user } = useApp();
  const [challengeFilter, setChallengeFilter] = useState<'all' | 'joined' | 'available' | 'completed'>('all');

  const filteredChallenges = challenges.filter(c => {
    if (challengeFilter === 'all') return true;
    if (challengeFilter === 'joined') return c.status === 'joined' || c.status === 'in_progress';
    if (challengeFilter === 'available') return c.status === 'available';
    if (challengeFilter === 'completed') return c.status === 'completed';
    return true;
  });

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#174A8B', '#237A57', '#2563EB', '#10B981'],
      });
    } catch (e) {
      // safe fallback
    }
  };

  const handleCheckIn = (id: string) => {
    recordChallengeCheckIn(id);
    triggerConfetti();
  };

  const scrollToChallenges = () => {
    const el = document.getElementById('community-challenges');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const earnedBadgesCount = challenges.filter(c => c.status === 'completed').length;
  const userName = user?.fullName || 'Facility Operator';
  const userInitials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || 'AQ';

  return (
    <AppLayout
      title="Conservation Community & Challenges"
      hero={<KindredHeroSection onJoinCircle={scrollToChallenges} />}
      cta={<CommunityContactCtaSection />}
    >
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white tracking-tight">
              Resource Sustainability Collective
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Interactive demonstration sprints, habit tracking, and conservation milestone badges
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#237A57] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5" />
              <span>Demo Simulation Cohort</span>
            </span>
          </div>
        </div>

        {/* CURRENT USER STATUS BANNER */}
        <div className="p-5 rounded-xl bg-gradient-to-r from-[#174A8B] to-[#237A57] text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={userName}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/30"
              />
            ) : (
              <div
                aria-hidden="true"
                className="w-12 h-12 rounded-xl bg-white/15 ring-2 ring-white/30 flex items-center justify-center font-mono font-bold text-base text-white shrink-0"
              >
                {userInitials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold font-heading text-white">{userName}</h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/20 text-emerald-100 font-semibold">
                  Demo Rank #3
                </span>
              </div>
              <p className="text-xs text-white/80 font-mono mt-0.5">
                {user?.facilityName || 'AquaWatt Facility Console'} • Simulation Preview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-white/20">
            <div>
              <span className="text-[11px] font-mono text-emerald-100 uppercase">Sustainability Score</span>
              <div className="text-2xl font-extrabold font-mono text-white">
                {user?.sustainabilityScore ?? 85} <span className="text-xs text-emerald-200">/ 100</span>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-mono text-emerald-100 uppercase">Completed Sprints</span>
              <div className="text-2xl font-extrabold font-mono text-white">
                {earnedBadgesCount} <span className="text-xs text-emerald-200">/ {challenges.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN LAYOUT: CHALLENGES ON LEFT, LEADERBOARD ON RIGHT */}
        <div id="community-challenges" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: CHALLENGES */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Active Conservation Sprints
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Targeted reduction sprints designed to build lasting resource habits
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div
                role="group"
                aria-label="Filter challenges by status"
                className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs"
              >
                {(['all', 'joined', 'available', 'completed'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    aria-pressed={challengeFilter === tab}
                    onClick={() => setChallengeFilter(tab)}
                    className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors cursor-pointer ${
                      challengeFilter === tab
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Challenge Cards Grid */}
            <div className="space-y-4">
              {filteredChallenges.map(challenge => {
                const isWater = challenge.category === 'water';
                const isCompleted = challenge.status === 'completed';
                const isJoined = challenge.status === 'joined' || challenge.status === 'in_progress';

                return (
                  <div
                    key={challenge.id}
                    className={`p-5 rounded-xl border transition-all ${
                      isCompleted
                        ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-[#237A57]/30'
                        : 'bg-white dark:bg-[#121B2B] border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isWater
                              ? 'bg-blue-50 dark:bg-sky-950 text-[#174A8B] dark:text-sky-400'
                              : 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isWater ? <Droplet className="w-5 h-5 fill-current" /> : <Zap className="w-5 h-5 fill-current" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {challenge.title}
                            </h4>
                            <Badge
                              variant={
                                isCompleted
                                  ? 'success'
                                  : isJoined
                                  ? 'primary'
                                  : 'neutral'
                              }
                              size="sm"
                            >
                              {challenge.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                            {challenge.description}
                          </p>
                        </div>
                      </div>

                      {/* Right Action Button */}
                      <div className="sm:self-center shrink-0">
                        {challenge.status === 'available' ? (
                          <button
                            type="button"
                            onClick={() => joinChallenge(challenge.id)}
                            className="px-4 py-2 rounded-lg bg-[#174A8B] hover:bg-[#123A6F] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            Join Sprint
                          </button>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[#237A57] dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            Reward Claimed
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCheckIn(challenge.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#237A57] hover:bg-[#1C6347] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Daily Check-in (+25%)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Badges */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1.5">
                        <span>{challenge.targetMetric}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {challenge.userProgressPercent}% Completed
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-[#237A57]' : 'bg-[#174A8B]'
                          }`}
                          style={{ width: `${challenge.userProgressPercent}%` }}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono">
                        <span>Participants: {challenge.participantsCount.toLocaleString()}</span>
                        <span className="text-[#237A57] dark:text-emerald-400 font-medium">
                          Reward: Badge "{challenge.badgeReward}" (+{challenge.rewardPoints} pts)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: REGIONAL LEADERBOARD */}
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading">
                    Sample Eco Leaderboard
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">Demo Cohort</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 mt-2">
                {LEADERBOARD_USERS.map(lUser => (
                  <div
                    key={lUser.rank}
                    className={`py-3 flex items-center justify-between gap-2 text-xs transition-colors px-2 -mx-2 rounded-lg ${
                      lUser.isCurrentUser
                        ? 'bg-blue-50/50 dark:bg-sky-950/30 border border-[#174A8B]/30'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[11px] shrink-0 ${
                          lUser.rank === 1
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                            : lUser.rank === 2
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                            : lUser.rank === 3
                            ? 'bg-amber-700/20 text-amber-800 dark:text-amber-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {lUser.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {lUser.name} {lUser.isCurrentUser && '(You)'}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {lUser.location}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-[#237A57] dark:text-emerald-400 block">
                        {lUser.ecoScore} pts
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        -{lUser.carbonAvoidedKg} kg CO₂
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievement Badges Showcase */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Medal className="w-4 h-4 text-[#174A8B] dark:text-sky-400" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading">
                    Sprint Badges (Demo)
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{earnedBadgesCount} / {challenges.length} Earned</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-emerald-300 dark:border-emerald-800">
                  <Award className="w-5 h-5 text-[#237A57] mb-1.5" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                    Hydro Sentinel
                  </p>
                  <p className="text-[10px] text-slate-400">Sub-40 gal daily average</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-emerald-300 dark:border-emerald-800">
                  <Leaf className="w-5 h-5 text-[#237A57] mb-1.5" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                    Aqua Alchemist
                  </p>
                  <p className="text-[10px] text-slate-400">35%+ rainwater offset</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 opacity-60">
                  <Zap className="w-5 h-5 text-slate-400 mb-1.5" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                    Peak Master
                  </p>
                  <p className="text-[10px] text-slate-400">In Progress (45%)</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 opacity-60">
                  <Trophy className="w-5 h-5 text-slate-400 mb-1.5" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                    Zero Waste Hero
                  </p>
                  <p className="text-[10px] text-slate-400">Locked</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
