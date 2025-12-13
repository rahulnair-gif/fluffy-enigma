import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Leaderboard({ mode = 'all' }) {
  const [selectedMode, setSelectedMode] = useState(mode);

  const { data: scores = [], isLoading } = useQuery({
    queryKey: ['leaderboard', selectedMode],
    queryFn: async () => {
      const allScores = await base44.entities.Score.list('-score', 10);
      return allScores;
    },
  });

  if (isLoading) {
    return (
      <div className="text-center text-cyan-500" style={{ fontFamily: '"Courier New", monospace' }}>
        LOADING...
      </div>
    );
  }

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-300" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 text-center text-cyan-500">#{index + 1}</span>;
  };

  const modes = [
    { id: 'all', label: 'ALL TIME', icon: Trophy },
    { id: 'today', label: 'TODAY', icon: TrendingUp },
    { id: 'week', label: 'THIS WEEK', icon: Medal }
  ];

  return (
    <div className="w-full">
      <div className="text-center mb-4">
        <h2 className="text-3xl font-bold" style={{
          fontFamily: '"Courier New", monospace',
          color: '#ffff00',
          textShadow: '0 0 10px #ffff00'
        }}>
          🏆 LEADERBOARD 🏆
        </h2>
      </div>

      <div className="flex gap-2 mb-4">
        {modes.map(m => {
          const Icon = m.icon;
          return (
            <Button
              key={m.id}
              onClick={() => setSelectedMode(m.id)}
              size="sm"
              className={`flex-1 ${
                selectedMode === m.id
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-800 text-gray-400'
              }`}
              style={{ fontFamily: '"Courier New", monospace' }}
            >
              <Icon className="w-4 h-4 mr-1" />
              {m.label}
            </Button>
          );
        })}
      </div>
      
      <div className="space-y-2">
        {scores.length === 0 ? (
          <div className="text-center text-gray-500 py-8" style={{ fontFamily: '"Courier New", monospace' }}>
            NO SCORES YET. BE THE FIRST!
          </div>
        ) : (
          scores.map((score, index) => (
            <div
              key={score.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border-2"
              style={{
                backgroundColor: index < 3 ? '#00ffff10' : '#ffffff05',
                borderColor: index < 3 ? '#00ffff' : '#ffffff20',
                fontFamily: '"Courier New", monospace'
              }}
            >
              <div className="flex items-center justify-center w-8">
                {getRankIcon(index)}
              </div>
              
              <div className="flex-1">
                <div className="text-sm font-bold text-cyan-400">
                  {score.player_name}
                </div>
                <div className="text-xs text-gray-500">
                  LEVEL {score.level}
                </div>
              </div>
              
              <div className="text-xl font-bold text-yellow-400" style={{
                textShadow: '0 0 10px #ffff00'
              }}>
                {score.score.toString().padStart(6, '0')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}