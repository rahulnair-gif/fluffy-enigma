import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Trophy, Clock, Target, Zap, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function DailyChallenges({ isOpen, onClose, onStartChallenge, coins, onRewardClaim }) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['dailyChallenges', today],
    queryFn: async () => {
      const allChallenges = await base44.entities.DailyChallenge.filter({ challenge_date: today });
      return allChallenges;
    }
  });

  const { data: completedChallenges = [] } = useQuery({
    queryKey: ['completedChallenges'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return [];
      return await base44.entities.DailyChallenge.filter({ completed_by: user.email });
    }
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (challengeData) => {
      return await base44.entities.DailyChallenge.create(challengeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyChallenges'] });
    }
  });

  const completeChallengeMutation = useMutation({
    mutationFn: async ({ challengeId, email }) => {
      return await base44.entities.DailyChallenge.update(challengeId, {
        completed_by: email,
        completion_time: new Date().toISOString()
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['completedChallenges'] });
      if (onRewardClaim) {
        onRewardClaim(data.reward_coins);
      }
    }
  });

  React.useEffect(() => {
    if (challenges.length === 0 && !isLoading) {
      const dailyChallenges = [
        { challenge_type: 'speed_run', target_value: 300, reward_coins: 150, challenge_date: today },
        { challenge_type: 'high_score', target_value: 5000, reward_coins: 200, challenge_date: today },
        { challenge_type: 'limited_balls', target_value: 10, reward_coins: 250, challenge_date: today }
      ];

      dailyChallenges.forEach(challenge => {
        createChallengeMutation.mutate(challenge);
      });
    }
  }, [challenges.length, isLoading, today]);

  const getChallengeIcon = (type) => {
    switch (type) {
      case 'speed_run': return <Clock className="w-6 h-6" />;
      case 'limited_balls': return <Target className="w-6 h-6" />;
      case 'survival': return <Zap className="w-6 h-6" />;
      case 'high_score': return <Trophy className="w-6 h-6" />;
      default: return <Trophy className="w-6 h-6" />;
    }
  };

  const getChallengeDescription = (challenge) => {
    switch (challenge.challenge_type) {
      case 'speed_run':
        return `Clear 5 levels in under ${challenge.target_value} seconds`;
      case 'limited_balls':
        return `Reach level 5 with only ${challenge.target_value} balls max`;
      case 'survival':
        return `Survive ${challenge.target_value} rounds without losing`;
      case 'high_score':
        return `Score ${challenge.target_value} points in a single game`;
      default:
        return 'Complete the challenge';
    }
  };

  const isCompleted = (challenge) => {
    return completedChallenges.some(c => 
      c.challenge_date === challenge.challenge_date && 
      c.challenge_type === challenge.challenge_type
    );
  };

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
            className="bg-[#0a0a1a] rounded-xl border-4 border-yellow-500 p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto"
            style={{
              boxShadow: '0 0 40px #ffff0080',
              fontFamily: '"Courier New", monospace'
            }}
          >
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-yellow-500 hover:text-yellow-400"
            >
              <X className="h-6 w-6" />
            </Button>

            <h2 className="text-4xl font-bold text-yellow-500 tracking-wider mb-2 text-center" style={{
              textShadow: '0 0 10px #ffff00'
            }}>
              🎯 DAILY CHALLENGES
            </h2>

            <div className="text-center text-sm text-gray-400 mb-6">
              Complete challenges to earn bonus coins!
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center text-cyan-500 py-8">LOADING...</div>
              ) : challenges.length === 0 ? (
                <div className="text-center text-gray-500 py-8">Generating today's challenges...</div>
              ) : (
                challenges.map((challenge) => {
                  const completed = isCompleted(challenge);
                  return (
                    <motion.div
                      key={challenge.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-lg border-2 ${
                        completed
                          ? 'bg-green-500 bg-opacity-10 border-green-500'
                          : 'bg-yellow-500 bg-opacity-10 border-yellow-500'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${
                          completed ? 'bg-green-500' : 'bg-yellow-500'
                        }`}>
                          {completed ? (
                            <CheckCircle2 className="h-6 w-6 text-black" />
                          ) : (
                            getChallengeIcon(challenge.challenge_type)
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className={`text-lg font-bold mb-1 ${
                            completed ? 'text-green-400' : 'text-yellow-400'
                          }`}>
                            {challenge.challenge_type.split('_').map(w => 
                              w.charAt(0).toUpperCase() + w.slice(1)
                            ).join(' ')}
                          </h3>
                          <p className="text-sm text-gray-400 mb-2">
                            {getChallengeDescription(challenge)}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-400 font-bold">
                              💰 {challenge.reward_coins} COINS
                            </span>
                          </div>
                        </div>

                        {!completed && (
                          <Button
                            onClick={() => {
                              onStartChallenge(challenge);
                              onClose();
                            }}
                            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                          >
                            START
                          </Button>
                        )}

                        {completed && (
                          <div className="text-green-400 font-bold text-sm">
                            ✓ COMPLETED
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            <Button
              onClick={onClose}
              className="w-full mt-6 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
            >
              CLOSE
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}