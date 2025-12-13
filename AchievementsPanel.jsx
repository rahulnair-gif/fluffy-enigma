import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Trophy, Lock, CheckCircle2, Target, Zap, Star, Award } from 'lucide-react';

const ACHIEVEMENTS = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first game',
    icon: Star,
    requirement: { stat: 'total_games_played', value: 1 }
  },
  {
    id: 'level_master',
    name: 'Level Master',
    description: 'Reach Level 10',
    icon: Trophy,
    requirement: { stat: 'highest_level', value: 10 }
  },
  {
    id: 'score_hunter',
    name: 'Score Hunter',
    description: 'Score 10,000 points',
    icon: Target,
    requirement: { stat: 'highest_score', value: 10000 }
  },
  {
    id: 'brick_breaker',
    name: 'Brick Breaker',
    description: 'Destroy 500 bricks',
    icon: Award,
    requirement: { stat: 'total_bricks_destroyed', value: 500 }
  },
  {
    id: 'powerup_collector',
    name: 'Power-Up Collector',
    description: 'Collect 10 power-ups',
    icon: Zap,
    requirement: { stat: 'total_powerups_collected', value: 10 }
  },
  {
    id: 'dedicated_player',
    name: 'Dedicated Player',
    description: 'Play 25 games',
    icon: Star,
    requirement: { stat: 'total_games_played', value: 25 }
  },
  {
    id: 'elite_scorer',
    name: 'Elite Scorer',
    description: 'Score 50,000 points',
    icon: Trophy,
    requirement: { stat: 'highest_score', value: 50000 }
  },
  {
    id: 'destruction_master',
    name: 'Destruction Master',
    description: 'Destroy 2,000 bricks',
    icon: Award,
    requirement: { stat: 'total_bricks_destroyed', value: 2000 }
  },
  {
    id: 'level_legend',
    name: 'Level Legend',
    description: 'Reach Level 25',
    icon: Trophy,
    requirement: { stat: 'highest_level', value: 25 }
  }
];

export default function AchievementsPanel({ isOpen, onClose, unlockedAchievements, playerStats }) {
  const getProgress = (achievement) => {
    const stat = playerStats?.[achievement.requirement.stat] || 0;
    const required = achievement.requirement.value;
    return Math.min((stat / required) * 100, 100);
  };

  const isUnlocked = (achievement) => {
    return unlockedAchievements?.some(a => a.achievement_id === achievement.id);
  };

  const unlockedCount = ACHIEVEMENTS.filter(isUnlocked).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0a0a1a] rounded-xl border-4 border-cyan-500 p-6 w-full max-w-3xl relative max-h-[90vh] overflow-y-auto"
            style={{
              boxShadow: '0 0 40px #00ffff80',
              fontFamily: '"Courier New", monospace'
            }}
          >
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-cyan-500 hover:text-cyan-400"
            >
              <X className="h-6 w-6" />
            </Button>

            <div className="mb-6">
              <h2 className="text-3xl font-bold text-cyan-500 tracking-wider mb-2" style={{
                textShadow: '0 0 10px #00ffff'
              }}>
                🏆 ACHIEVEMENTS
              </h2>
              <div className="text-sm text-gray-400">
                {unlockedCount} / {ACHIEVEMENTS.length} UNLOCKED
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full transition-all duration-500"
                  style={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ACHIEVEMENTS.map((achievement) => {
                const unlocked = isUnlocked(achievement);
                const progress = getProgress(achievement);
                const Icon = achievement.icon;

                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      unlocked
                        ? 'bg-cyan-500 bg-opacity-10 border-cyan-500'
                        : 'bg-gray-900 bg-opacity-50 border-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        unlocked ? 'bg-cyan-500' : 'bg-gray-700'
                      }`}>
                        {unlocked ? (
                          <CheckCircle2 className="h-6 w-6 text-black" />
                        ) : (
                          <Lock className="h-6 w-6 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-4 w-4 ${
                            unlocked ? 'text-cyan-400' : 'text-gray-500'
                          }`} />
                          <h3 className={`font-bold ${
                            unlocked ? 'text-cyan-400' : 'text-gray-400'
                          }`}>
                            {achievement.name}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          {achievement.description}
                        </p>

                        {!unlocked && (
                          <>
                            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-purple-500 to-cyan-500 h-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {playerStats?.[achievement.requirement.stat] || 0} / {achievement.requirement.value}
                            </div>
                          </>
                        )}

                        {unlocked && (
                          <div className="text-xs text-green-400 font-bold">
                            ✓ UNLOCKED
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <Button
              onClick={onClose}
              className="w-full mt-6 bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
              style={{ fontFamily: '"Courier New", monospace' }}
            >
              CLOSE
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { ACHIEVEMENTS };