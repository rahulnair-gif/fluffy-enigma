import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Trophy, Settings, Award, Menu, ShoppingBag, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import Leaderboard from '../components/Leaderboard';
import GameSettings from '../components/GameSettings';
import AchievementsPanel, { ACHIEVEMENTS } from '../components/AchievementsPanel';
import Shop from '../components/Shop';
import GameRules from '../components/GameRules';
import DailyChallenges from '../components/DailyChallenges';
import LevelEditor from '../components/LevelEditor';

export default function BrickBreaker() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('loading');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('highScore');
      return saved ? parseInt(saved) : 0;
    }
    return 0;
  });
  const [playerName, setPlayerName] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showDailyChallenges, setShowDailyChallenges] = useState(false);
  const [showLevelEditor, setShowLevelEditor] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [customLevelMode, setCustomLevelMode] = useState(false);
  const [customBrickLayout, setCustomBrickLayout] = useState(null);
  const [logoUrl] = useState('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691a647c58594b68e5e2be08/0cb371b0a_1765212283391.jpg');
  const [coins, setCoins] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gameCoins');
      return saved ? parseInt(saved) : 0;
    }
    return 0;
  });
  const [earnedCoins, setEarnedCoins] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('earnedCoins');
      return saved ? parseInt(saved) : 0;
    }
    return 0;
  });
  const [ownedItems, setOwnedItems] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ownedItems');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [selectedBallTheme, setSelectedBallTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedBallTheme');
      return saved || null;
    }
    return null;
  });
  const [sessionStats, setSessionStats] = useState({
    bricksDestroyed: 0,
    powerupsCollected: 0
  });
  const [aimLocked, setAimLocked] = useState(false);
  const aimLockedRef = useRef(false);
  const [lineEliminatorActive, setLineEliminatorActive] = useState(false);
  
  const [settings, setSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gameSettings');
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
      
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        // Auto-enable mobile mode if on mobile device
        if (isMobile && !parsedSettings.mobileMode) {
          parsedSettings.mobileMode = true;
          localStorage.setItem('gameSettings', JSON.stringify(parsedSettings));
        }
        return parsedSettings;
      }
      
      return {
        sfxVolume: 0.5,
        musicVolume: 0.3,
        particles: true,
        screenShake: true,
        difficulty: 'normal',
        mobileMode: isMobile,
        ballTrails: true,
        trailLength: 10,
        trailOpacity: 0.6
      };
    }
    return {
      sfxVolume: 0.5,
      musicVolume: 0.3,
      particles: true,
      screenShake: true,
      difficulty: 'normal',
      mobileMode: false,
      ballTrails: true,
      trailLength: 10,
      trailOpacity: 0.6
    };
  });
  
  const queryClient = useQueryClient();
  const audioContextRef = useRef(null);
  const musicGainNodeRef = useRef(null);
  const musicTimeoutRef = useRef(null);
  const isMusicPlayingRef = useRef(false);
  const hardModeIntervalRef = useRef(null);
  const currentMusicVariationRef = useRef(0);
  const musicVariationStartTimeRef = useRef(null);

  // Fetch player stats
  const { data: playerStats } = useQuery({
    queryKey: ['playerStats'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return null; // No user logged in
      const stats = await base44.entities.PlayerStats.filter({ created_by: user.email });
      return stats[0] || null;
    }
  });

  // Fetch unlocked achievements
  const { data: unlockedAchievements = [] } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return []; // No user logged in
      return await base44.entities.Achievement.filter({ created_by: user.email });
    }
  });

  // Update stats mutation
  const updateStatsMutation = useMutation({
    mutationFn: async (stats) => {
      const user = await base44.auth.me();
      if (!user) return null;
      if (playerStats?.id) {
        return await base44.entities.PlayerStats.update(playerStats.id, stats);
      } else {
        return await base44.entities.PlayerStats.create(stats);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerStats'] });
    }
  });

  // Unlock achievement mutation
  const unlockAchievementMutation = useMutation({
    mutationFn: async (achievementId) => {
      const user = await base44.auth.me();
      if (!user) return null;
      return await base44.entities.Achievement.create({
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString(),
        created_by: user.email // Ensure created_by is set
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    }
  });

  // Check and unlock achievements
  const checkAchievements = async (newStats) => {
    if (!newStats) return;
    for (const achievement of ACHIEVEMENTS) {
      const alreadyUnlocked = unlockedAchievements.some(a => a.achievement_id === achievement.id);
      if (!alreadyUnlocked) {
        const statValue = newStats[achievement.requirement.stat] || 0;
        if (statValue >= achievement.requirement.value) {
          await unlockAchievementMutation.mutateAsync(achievement.id);
        }
      }
    }
  };

  const submitScoreMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Score.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      setScoreSubmitted(true);
    },
  });

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('gameSettings', JSON.stringify(newSettings));
  };

  const recallBalls = () => {
    const game = gameRef.current;
    
    // Stop all balls and return to initial position
    game.balls.forEach(ball => {
      ball.stopped = true;
      ball.vx = 0;
      ball.vy = 0;
    });
    
    // Trigger the round end logic
    const mainBall = game.balls.find(b => b.isMainBall);
    const finalLandingX = mainBall ? mainBall.x : game.initialBall.x;
    
    game.balls = [];
    game.initialBall.x = game.launchPositions.reduce((prev, curr) => 
      Math.abs(curr - finalLandingX) < Math.abs(prev - finalLandingX) ? curr : prev
    );
    game.lastBallX = finalLandingX;
    game.roundCount++;
    
    if (game.bricks.length === 0 && !game.enemy) {
      game.currentLevel++;
      setLevel(game.currentLevel);
    }
    
    setGameState('aiming');
    aimLockedRef.current = false;
    setAimLocked(false);
  };

  const stopBackgroundMusic = () => {
    if (musicTimeoutRef.current) {
      clearTimeout(musicTimeoutRef.current);
      musicTimeoutRef.current = null;
    }
    isMusicPlayingRef.current = false;
    // Stop any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = ctx;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    musicGainNodeRef.current = gainNode;
    
    return () => {
      stopBackgroundMusic();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (musicGainNodeRef.current) {
      musicGainNodeRef.current.gain.value = settings.musicVolume;
    }
  }, [settings.musicVolume]);

  const playMenuMusic = () => {
    if (!isMusicPlayingRef.current) return;

    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'suspended') {
       const resumeAudio = () => {
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
            if (isMusicPlayingRef.current) {
              playMenuMusic();
            }
          });
        }
      };
      document.addEventListener('click', resumeAudio);
      document.addEventListener('keydown', resumeAudio);
      return;
    }

    // Play announcer voice first
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance("WELCOME TO RETRO SMASHER");
      utterance.rate = 0.9;
      utterance.pitch = 0.8;
      utterance.volume = settings.musicVolume;
      
      // Find a deep male voice if available
      const voices = window.speechSynthesis.getVoices();
      const deepVoice = voices.find(v => v.name.includes('Male') || v.name.includes('male')) || voices[0];
      if (deepVoice) utterance.voice = deepVoice;
      
      window.speechSynthesis.speak(utterance);
    }

    const melody = [
      { freq: 659.25, time: 0, duration: 0.4 }, { freq: 783.99, time: 0.4, duration: 0.4 },
      { freq: 880.00, time: 0.8, duration: 0.4 }, { freq: 783.99, time: 1.2, duration: 0.2 },
      { freq: 659.25, time: 1.4, duration: 0.2 }, { freq: 523.25, time: 1.6, duration: 0.8 },
      
      { freq: 587.33, time: 2.4, duration: 0.4 }, { freq: 659.25, time: 2.8, duration: 0.4 },
      { freq: 783.99, time: 3.2, duration: 0.4 }, { freq: 659.25, time: 3.6, duration: 0.2 },
      { freq: 587.33, time: 3.8, duration: 0.2 }, { freq: 493.88, time: 4.0, duration: 0.8 },
      
      { freq: 659.25, time: 4.8, duration: 0.4 }, { freq: 783.99, time: 5.2, duration: 0.4 },
      { freq: 880.00, time: 5.6, duration: 0.4 }, { freq: 987.77, time: 6.0, duration: 0.4 },
      { freq: 880.00, time: 6.4, duration: 0.4 }, { freq: 783.99, time: 6.8, duration: 0.8 },
      
      { freq: 659.25, time: 7.6, duration: 0.4 }, { freq: 587.33, time: 8.0, duration: 0.4 },
      { freq: 523.25, time: 8.4, duration: 1.2 }
    ];

    const bass = [
      { freq: 130.81, time: 0, duration: 0.3 }, { freq: 130.81, time: 0.4, duration: 0.3 },
      { freq: 130.81, time: 0.8, duration: 0.3 }, { freq: 130.81, time: 1.2, duration: 0.3 },
      { freq: 146.83, time: 1.6, duration: 0.3 }, { freq: 146.83, time: 2.0, duration: 0.3 },
      
      { freq: 123.47, time: 2.4, duration: 0.3 }, { freq: 123.47, time: 2.8, duration: 0.3 },
      { freq: 123.47, time: 3.2, duration: 0.3 }, { freq: 123.47, time: 3.6, duration: 0.3 },
      { freq: 110.00, time: 4.0, duration: 0.3 }, { freq: 110.00, time: 4.4, duration: 0.3 },
      
      { freq: 130.81, time: 4.8, duration: 0.3 }, { freq: 130.81, time: 5.2, duration: 0.3 },
      { freq: 146.83, time: 5.6, duration: 0.3 }, { freq: 164.81, time: 6.0, duration: 0.3 },
      { freq: 146.83, time: 6.4, duration: 0.3 }, { freq: 146.83, time: 6.8, duration: 0.3 },
      
      { freq: 130.81, time: 7.2, duration: 0.3 }, { freq: 130.81, time: 7.6, duration: 0.3 },
      { freq: 123.47, time: 8.0, duration: 0.3 }, { freq: 130.81, time: 8.4, duration: 0.6 }
    ];

    const pad = [
      { freq: 261.63, time: 0, duration: 1.6 }, { freq: 329.63, time: 0, duration: 1.6 },
      { freq: 293.66, time: 1.6, duration: 0.8 }, { freq: 369.99, time: 1.6, duration: 0.8 },
      { freq: 246.94, time: 2.4, duration: 1.6 }, { freq: 311.13, time: 2.4, duration: 1.6 },
      { freq: 220.00, time: 4.0, duration: 0.8 }, { freq: 277.18, time: 4.0, duration: 0.8 },
      { freq: 261.63, time: 4.8, duration: 1.6 }, { freq: 329.63, time: 4.8, duration: 1.6 },
      { freq: 293.66, time: 6.4, duration: 1.2 }, { freq: 369.99, time: 6.4, duration: 1.2 },
      { freq: 261.63, time: 7.6, duration: 1.2 }, { freq: 329.63, time: 7.6, duration: 1.2 }
    ];

    const playSequence = () => {
      if (!isMusicPlayingRef.current || !ctx || ctx.state === 'suspended') {
        return;
      }
      
      const startTime = ctx.currentTime;
      const gainNode = musicGainNodeRef.current;

      melody.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(gainNode);
        
        osc.type = 'square';
        osc.frequency.value = note.freq;
        
        gain.gain.setValueAtTime(0, startTime + note.time);
        gain.gain.linearRampToValueAtTime(0.12, startTime + note.time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.time + note.duration);
        
        osc.start(startTime + note.time);
        osc.stop(startTime + note.time + note.duration);
      });

      bass.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(gainNode);
        
        osc.type = 'sawtooth';
        osc.frequency.value = note.freq;
        
        gain.gain.setValueAtTime(0, startTime + note.time);
        gain.gain.linearRampToValueAtTime(0.15, startTime + note.time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.time + note.duration);
        
        osc.start(startTime + note.time);
        osc.stop(startTime + note.time + note.duration);
      });

      pad.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(gainNode);
        
        osc.type = 'sine';
        osc.frequency.value = note.freq;
        
        gain.gain.setValueAtTime(0, startTime + note.time);
        gain.gain.linearRampToValueAtTime(0.05, startTime + note.time + 0.1);
        gain.gain.linearRampToValueAtTime(0.05, startTime + note.time + note.duration - 0.1);
        gain.gain.linearRampToValueAtTime(0.01, startTime + note.time + note.duration);
        
        osc.start(startTime + note.time);
        osc.stop(startTime + note.time + note.duration);
      });

      if (musicTimeoutRef.current) {
        clearTimeout(musicTimeoutRef.current);
      }
      
      musicTimeoutRef.current = setTimeout(playSequence, 9600);
    };

    playSequence();
  };

  const play90sRockMusic = () => {
    if (!isMusicPlayingRef.current) return;

    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'suspended') {
      const resumeAudio = () => {
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
            if (isMusicPlayingRef.current) {
              play90sRockMusic();
            }
          });
        }
      };
      document.addEventListener('click', resumeAudio);
      document.addEventListener('keydown', resumeAudio);
      return;
    }

    // Fast-paced 90's grunge/alternative rock style
    const rockRiffs = [
      {
        // Fast power chord progression
        guitar: [
          { freq: 220.00, time: 0, duration: 0.2 }, { freq: 220.00, time: 0.2, duration: 0.2 },
          { freq: 246.94, time: 0.4, duration: 0.2 }, { freq: 246.94, time: 0.6, duration: 0.2 },
          { freq: 277.18, time: 0.8, duration: 0.2 }, { freq: 277.18, time: 1.0, duration: 0.2 },
          { freq: 246.94, time: 1.2, duration: 0.2 }, { freq: 220.00, time: 1.4, duration: 0.4 },
          { freq: 196.00, time: 1.8, duration: 0.2 }, { freq: 220.00, time: 2.0, duration: 0.2 },
          { freq: 246.94, time: 2.2, duration: 0.2 }, { freq: 277.18, time: 2.4, duration: 0.4 },
          { freq: 293.66, time: 2.8, duration: 0.2 }, { freq: 277.18, time: 3.0, duration: 0.2 },
          { freq: 246.94, time: 3.2, duration: 0.2 }, { freq: 220.00, time: 3.4, duration: 0.4 },
        ],
        bass: [
          { freq: 110.00, time: 0, duration: 0.2 }, { freq: 110.00, time: 0.2, duration: 0.2 },
          { freq: 123.47, time: 0.4, duration: 0.2 }, { freq: 123.47, time: 0.6, duration: 0.2 },
          { freq: 138.59, time: 0.8, duration: 0.2 }, { freq: 138.59, time: 1.0, duration: 0.2 },
          { freq: 123.47, time: 1.2, duration: 0.2 }, { freq: 110.00, time: 1.4, duration: 0.4 },
          { freq: 98.00, time: 1.8, duration: 0.2 }, { freq: 110.00, time: 2.0, duration: 0.2 },
          { freq: 123.47, time: 2.2, duration: 0.2 }, { freq: 138.59, time: 2.4, duration: 0.4 },
          { freq: 146.83, time: 2.8, duration: 0.2 }, { freq: 138.59, time: 3.0, duration: 0.2 },
          { freq: 123.47, time: 3.2, duration: 0.2 }, { freq: 110.00, time: 3.4, duration: 0.4 },
        ],
        drums: [
          { type: 'kick', time: 0 }, { type: 'hihat', time: 0.1 },
          { type: 'snare', time: 0.2 }, { type: 'hihat', time: 0.3 },
          { type: 'kick', time: 0.4 }, { type: 'hihat', time: 0.5 },
          { type: 'snare', time: 0.6 }, { type: 'hihat', time: 0.7 },
          { type: 'kick', time: 0.8 }, { type: 'hihat', time: 0.9 },
          { type: 'snare', time: 1.0 }, { type: 'hihat', time: 1.1 },
          { type: 'kick', time: 1.2 }, { type: 'kick', time: 1.3 },
          { type: 'snare', time: 1.4 }, { type: 'hihat', time: 1.5 },
          { type: 'kick', time: 1.6 }, { type: 'hihat', time: 1.7 },
          { type: 'snare', time: 1.8 }, { type: 'hihat', time: 1.9 },
          { type: 'kick', time: 2.0 }, { type: 'hihat', time: 2.1 },
          { type: 'snare', time: 2.2 }, { type: 'hihat', time: 2.3 },
          { type: 'kick', time: 2.4 }, { type: 'hihat', time: 2.5 },
          { type: 'snare', time: 2.6 }, { type: 'hihat', time: 2.7 },
          { type: 'kick', time: 2.8 }, { type: 'hihat', time: 2.9 },
          { type: 'snare', time: 3.0 }, { type: 'hihat', time: 3.1 },
          { type: 'kick', time: 3.2 }, { type: 'kick', time: 3.3 },
          { type: 'snare', time: 3.4 }, { type: 'hihat', time: 3.5 },
        ]
      },
      {
        // Fast descending riff
        guitar: [
          { freq: 293.66, time: 0, duration: 0.15 }, { freq: 277.18, time: 0.15, duration: 0.15 },
          { freq: 246.94, time: 0.3, duration: 0.15 }, { freq: 220.00, time: 0.45, duration: 0.25 },
          { freq: 246.94, time: 0.7, duration: 0.15 }, { freq: 277.18, time: 0.85, duration: 0.15 },
          { freq: 293.66, time: 1.0, duration: 0.3 }, { freq: 329.63, time: 1.3, duration: 0.3 },
          { freq: 277.18, time: 1.6, duration: 0.2 }, { freq: 246.94, time: 1.8, duration: 0.2 },
          { freq: 220.00, time: 2.0, duration: 0.2 }, { freq: 196.00, time: 2.2, duration: 0.3 },
          { freq: 220.00, time: 2.5, duration: 0.15 }, { freq: 246.94, time: 2.65, duration: 0.15 },
          { freq: 277.18, time: 2.8, duration: 0.3 }, { freq: 293.66, time: 3.1, duration: 0.5 },
        ],
        bass: [
          { freq: 146.83, time: 0, duration: 0.3 }, { freq: 138.59, time: 0.3, duration: 0.2 },
          { freq: 123.47, time: 0.5, duration: 0.2 }, { freq: 110.00, time: 0.7, duration: 0.3 },
          { freq: 123.47, time: 1.0, duration: 0.3 }, { freq: 146.83, time: 1.3, duration: 0.3 },
          { freq: 138.59, time: 1.6, duration: 0.2 }, { freq: 123.47, time: 1.8, duration: 0.2 },
          { freq: 110.00, time: 2.0, duration: 0.2 }, { freq: 98.00, time: 2.2, duration: 0.3 },
          { freq: 110.00, time: 2.5, duration: 0.3 }, { freq: 138.59, time: 2.8, duration: 0.3 },
          { freq: 146.83, time: 3.1, duration: 0.5 },
        ],
        drums: [
          { type: 'kick', time: 0 }, { type: 'hihat', time: 0.1 },
          { type: 'snare', time: 0.2 }, { type: 'hihat', time: 0.3 },
          { type: 'kick', time: 0.4 }, { type: 'hihat', time: 0.5 },
          { type: 'snare', time: 0.6 }, { type: 'hihat', time: 0.7 },
          { type: 'kick', time: 0.8 }, { type: 'hihat', time: 0.9 },
          { type: 'snare', time: 1.0 }, { type: 'hihat', time: 1.1 },
          { type: 'kick', time: 1.2 }, { type: 'hihat', time: 1.3 },
          { type: 'snare', time: 1.4 }, { type: 'snare', time: 1.5 },
          { type: 'kick', time: 1.6 }, { type: 'hihat', time: 1.7 },
          { type: 'snare', time: 1.8 }, { type: 'hihat', time: 1.9 },
          { type: 'kick', time: 2.0 }, { type: 'hihat', time: 2.1 },
          { type: 'snare', time: 2.2 }, { type: 'hihat', time: 2.3 },
          { type: 'kick', time: 2.4 }, { type: 'kick', time: 2.5 },
          { type: 'snare', time: 2.6 }, { type: 'hihat', time: 2.7 },
          { type: 'kick', time: 2.8 }, { type: 'hihat', time: 2.9 },
          { type: 'snare', time: 3.0 }, { type: 'snare', time: 3.1 },
          { type: 'kick', time: 3.2 }, { type: 'hihat', time: 3.3 },
        ]
      }
    ];

    let currentRiff = 0;

    const playRiff = () => {
      if (!isMusicPlayingRef.current || !ctx || ctx.state === 'suspended') {
        return;
      }

      const startTime = ctx.currentTime;
      const riff = rockRiffs[currentRiff];
      const gainNode = musicGainNodeRef.current;

      // Heavy distorted guitar
      riff.guitar.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const distortion = ctx.createWaveShaper();

        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
          const x = (i - 128) / 128;
          curve[i] = Math.tanh(x * 5) * 0.9; // Heavier distortion
        }
        distortion.curve = curve;

        osc.connect(distortion);
        distortion.connect(gain);
        gain.connect(gainNode);

        osc.type = 'sawtooth';
        osc.frequency.value = note.freq;

        gain.gain.setValueAtTime(0, startTime + note.time);
        gain.gain.linearRampToValueAtTime(0.18, startTime + note.time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.time + note.duration);

        osc.start(startTime + note.time);
        osc.stop(startTime + note.time + note.duration);
      });

      // Punchy bass
      riff.bass.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(gainNode);

        osc.type = 'triangle';
        osc.frequency.value = note.freq;

        gain.gain.setValueAtTime(0, startTime + note.time);
        gain.gain.linearRampToValueAtTime(0.25, startTime + note.time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.time + note.duration);

        osc.start(startTime + note.time);
        osc.stop(startTime + note.time + note.duration);
      });

      // Fast drums
      riff.drums.forEach(drum => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(gainNode);

        if (drum.type === 'kick') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(150, startTime + drum.time);
          osc.frequency.exponentialRampToValueAtTime(30, startTime + drum.time + 0.08);
          filter.type = 'lowpass';
          filter.frequency.value = 100;
          gain.gain.setValueAtTime(0.35, startTime + drum.time);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + drum.time + 0.15);
          osc.start(startTime + drum.time);
          osc.stop(startTime + drum.time + 0.15);
        } else if (drum.type === 'snare') {
          osc.type = 'triangle';
          osc.frequency.value = 200;
          filter.type = 'highpass';
          filter.frequency.value = 1000;
          gain.gain.setValueAtTime(0.2, startTime + drum.time);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + drum.time + 0.12);
          osc.start(startTime + drum.time);
          osc.stop(startTime + drum.time + 0.12);
        } else if (drum.type === 'hihat') {
          osc.type = 'square';
          osc.frequency.value = 400;
          filter.type = 'highpass';
          filter.frequency.value = 3000;
          gain.gain.setValueAtTime(0.08, startTime + drum.time);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + drum.time + 0.05);
          osc.start(startTime + drum.time);
          osc.stop(startTime + drum.time + 0.05);
        }
      });

      currentRiff = (currentRiff + 1) % rockRiffs.length;

      if (musicTimeoutRef.current) {
        clearTimeout(musicTimeoutRef.current);
      }

      musicTimeoutRef.current = setTimeout(playRiff, 3600); // Faster tempo
    };

    playRiff();
  };

  const playBackgroundMusic = () => {
      if (!isMusicPlayingRef.current) return;

      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === 'suspended') {
         const resumeAudio = () => {
          if (ctx.state === 'suspended') {
            ctx.resume().then(() => {
              document.removeEventListener('click', resumeAudio);
              document.removeEventListener('keydown', resumeAudio);
              if (isMusicPlayingRef.current) {
                playBackgroundMusic();
              }
            });
          }
        };
        document.addEventListener('click', resumeAudio);
        document.addEventListener('keydown', resumeAudio);
        return;
      }

      // Initialize variation start time
      if (!musicVariationStartTimeRef.current) {
        musicVariationStartTimeRef.current = Date.now();
      }

      // Check if 90 seconds (90000ms) have passed
      const elapsed = Date.now() - musicVariationStartTimeRef.current;
      if (elapsed >= 90000) {
        currentMusicVariationRef.current = (currentMusicVariationRef.current + 1) % 5;
        musicVariationStartTimeRef.current = Date.now();
      }

      // 5 Music Variations
      const allMusicVariations = [
        // Variation 1: Early 90's hip hop boom-bap beats
        [
        {
          // Classic boom-bap pattern
          bass: [
            { freq: 65.41, time: 0, duration: 0.4 }, { freq: 65.41, time: 0.5, duration: 0.3 },
            { freq: 73.42, time: 1.0, duration: 0.4 }, { freq: 73.42, time: 1.5, duration: 0.3 },
            { freq: 65.41, time: 2.0, duration: 0.4 }, { freq: 58.27, time: 2.5, duration: 0.3 },
            { freq: 61.74, time: 3.0, duration: 0.4 }, { freq: 65.41, time: 3.5, duration: 0.5 },
          ],
          synth: [
            { freq: 261.63, time: 0, duration: 0.15 }, { freq: 329.63, time: 0.5, duration: 0.15 },
            { freq: 392.00, time: 1.0, duration: 0.15 }, { freq: 329.63, time: 1.5, duration: 0.15 },
            { freq: 261.63, time: 2.0, duration: 0.15 }, { freq: 233.08, time: 2.5, duration: 0.15 },
            { freq: 246.94, time: 3.0, duration: 0.15 }, { freq: 261.63, time: 3.5, duration: 0.15 },
          ],
          drums: [
            { type: 'kick', time: 0 }, { type: 'hihat', time: 0.25 }, { type: 'hihat', time: 0.5 },
            { type: 'snare', time: 0.5 }, { type: 'hihat', time: 0.75 }, { type: 'kick', time: 1.0 },
            { type: 'hihat', time: 1.25 }, { type: 'snare', time: 1.5 }, { type: 'hihat', time: 1.75 },
            { type: 'kick', time: 2.0 }, { type: 'hihat', time: 2.25 }, { type: 'snare', time: 2.5 },
            { type: 'hihat', time: 2.75 }, { type: 'kick', time: 3.0 }, { type: 'kick', time: 3.25 },
            { type: 'hihat', time: 3.5 }, { type: 'snare', time: 3.5 }, { type: 'hihat', time: 3.75 },
          ]
        },
        {
          // Funky variation
          bass: [
            { freq: 58.27, time: 0, duration: 0.3 }, { freq: 65.41, time: 0.4, duration: 0.3 },
            { freq: 73.42, time: 0.8, duration: 0.4 }, { freq: 65.41, time: 1.3, duration: 0.3 },
            { freq: 58.27, time: 1.7, duration: 0.3 }, { freq: 61.74, time: 2.1, duration: 0.4 },
            { freq: 65.41, time: 2.6, duration: 0.3 }, { freq: 73.42, time: 3.0, duration: 0.5 },
          ],
          synth: [
            { freq: 233.08, time: 0, duration: 0.2 }, { freq: 293.66, time: 0.5, duration: 0.2 },
            { freq: 349.23, time: 1.0, duration: 0.2 }, { freq: 293.66, time: 1.5, duration: 0.2 },
            { freq: 261.63, time: 2.0, duration: 0.2 }, { freq: 246.94, time: 2.5, duration: 0.2 },
            { freq: 293.66, time: 3.0, duration: 0.2 }, { freq: 349.23, time: 3.5, duration: 0.2 },
          ],
          drums: [
            { type: 'kick', time: 0 }, { type: 'hihat', time: 0.25 }, { type: 'snare', time: 0.5 },
            { type: 'hihat', time: 0.75 }, { type: 'kick', time: 1.0 }, { type: 'hihat', time: 1.25 },
            { type: 'snare', time: 1.5 }, { type: 'kick', time: 1.75 }, { type: 'kick', time: 2.0 },
            { type: 'hihat', time: 2.25 }, { type: 'snare', time: 2.5 }, { type: 'hihat', time: 2.75 },
            { type: 'kick', time: 3.0 }, { type: 'hihat', time: 3.25 }, { type: 'snare', time: 3.5 },
            { type: 'hihat', time: 3.75 },
          ]
        }
      ],
      // Variation 2: Upbeat electronic synth
      [
        {
          bass: [
            { freq: 82.41, time: 0, duration: 0.4 }, { freq: 87.31, time: 0.5, duration: 0.3 },
            { freq: 98.00, time: 1.0, duration: 0.4 }, { freq: 87.31, time: 1.5, duration: 0.3 },
            { freq: 82.41, time: 2.0, duration: 0.4 }, { freq: 73.42, time: 2.5, duration: 0.3 },
            { freq: 77.78, time: 3.0, duration: 0.4 }, { freq: 82.41, time: 3.5, duration: 0.5 },
          ],
          synth: [
            { freq: 329.63, time: 0, duration: 0.2 }, { freq: 392.00, time: 0.5, duration: 0.2 },
            { freq: 440.00, time: 1.0, duration: 0.2 }, { freq: 392.00, time: 1.5, duration: 0.2 },
            { freq: 329.63, time: 2.0, duration: 0.2 }, { freq: 293.66, time: 2.5, duration: 0.2 },
            { freq: 349.23, time: 3.0, duration: 0.2 }, { freq: 392.00, time: 3.5, duration: 0.2 },
          ],
          drums: [
            { type: 'kick', time: 0 }, { type: 'hihat', time: 0.25 }, { type: 'snare', time: 0.5 },
            { type: 'hihat', time: 0.75 }, { type: 'kick', time: 1.0 }, { type: 'hihat', time: 1.25 },
            { type: 'snare', time: 1.5 }, { type: 'hihat', time: 1.75 }, { type: 'kick', time: 2.0 },
            { type: 'hihat', time: 2.25 }, { type: 'snare', time: 2.5 }, { type: 'hihat', time: 2.75 },
            { type: 'kick', time: 3.0 }, { type: 'hihat', time: 3.25 }, { type: 'snare', time: 3.5 },
            { type: 'hihat', time: 3.75 },
          ]
        }
      ],
      // Variation 3: Slow ambient wave
      [
        {
          bass: [
            { freq: 55.00, time: 0, duration: 1.0 }, { freq: 58.27, time: 1.0, duration: 1.0 },
            { freq: 61.74, time: 2.0, duration: 1.0 }, { freq: 55.00, time: 3.0, duration: 1.0 },
          ],
          synth: [
            { freq: 220.00, time: 0, duration: 0.8 }, { freq: 246.94, time: 1.0, duration: 0.8 },
            { freq: 277.18, time: 2.0, duration: 0.8 }, { freq: 220.00, time: 3.0, duration: 0.8 },
          ],
          drums: [
            { type: 'kick', time: 0 }, { type: 'kick', time: 2.0 },
            { type: 'snare', time: 1.0 }, { type: 'snare', time: 3.0 },
          ]
        }
      ],
      // Variation 4: Fast chiptune arcade
      [
        {
          bass: [
            { freq: 110.00, time: 0, duration: 0.2 }, { freq: 110.00, time: 0.3, duration: 0.2 },
            { freq: 123.47, time: 0.6, duration: 0.2 }, { freq: 110.00, time: 0.9, duration: 0.2 },
            { freq: 146.83, time: 1.2, duration: 0.2 }, { freq: 138.59, time: 1.5, duration: 0.2 },
            { freq: 123.47, time: 1.8, duration: 0.2 }, { freq: 110.00, time: 2.1, duration: 0.3 },
          ],
          synth: [
            { freq: 440.00, time: 0, duration: 0.15 }, { freq: 523.25, time: 0.3, duration: 0.15 },
            { freq: 587.33, time: 0.6, duration: 0.15 }, { freq: 659.25, time: 0.9, duration: 0.15 },
            { freq: 587.33, time: 1.2, duration: 0.15 }, { freq: 523.25, time: 1.5, duration: 0.15 },
            { freq: 440.00, time: 1.8, duration: 0.3 },
          ],
          drums: [
            { type: 'kick', time: 0 }, { type: 'hihat', time: 0.15 }, { type: 'hihat', time: 0.3 },
            { type: 'snare', time: 0.45 }, { type: 'kick', time: 0.6 }, { type: 'hihat', time: 0.75 },
            { type: 'snare', time: 0.9 }, { type: 'kick', time: 1.05 }, { type: 'hihat', time: 1.2 },
            { type: 'snare', time: 1.35 }, { type: 'kick', time: 1.5 }, { type: 'hihat', time: 1.65 },
            { type: 'snare', time: 1.8 }, { type: 'kick', time: 1.95 },
          ]
        }
      ],
      // Variation 5: Funky disco groove
      [
        {
          bass: [
            { freq: 73.42, time: 0, duration: 0.3 }, { freq: 82.41, time: 0.4, duration: 0.3 },
            { freq: 73.42, time: 0.8, duration: 0.3 }, { freq: 65.41, time: 1.2, duration: 0.4 },
            { freq: 73.42, time: 1.7, duration: 0.3 }, { freq: 82.41, time: 2.1, duration: 0.3 },
            { freq: 87.31, time: 2.5, duration: 0.3 }, { freq: 98.00, time: 3.0, duration: 0.5 },
          ],
          synth: [
            { freq: 293.66, time: 0, duration: 0.2 }, { freq: 329.63, time: 0.5, duration: 0.2 },
            { freq: 369.99, time: 1.0, duration: 0.2 }, { freq: 329.63, time: 1.5, duration: 0.2 },
            { freq: 293.66, time: 2.0, duration: 0.2 }, { freq: 349.23, time: 2.5, duration: 0.2 },
            { freq: 392.00, time: 3.0, duration: 0.2 }, { freq: 440.00, time: 3.5, duration: 0.2 },
          ],
          drums: [
            { type: 'kick', time: 0 }, { type: 'hihat', time: 0.25 }, { type: 'kick', time: 0.5 },
            { type: 'snare', time: 0.75 }, { type: 'kick', time: 1.0 }, { type: 'hihat', time: 1.25 },
            { type: 'snare', time: 1.5 }, { type: 'kick', time: 1.75 }, { type: 'kick', time: 2.0 },
            { type: 'hihat', time: 2.25 }, { type: 'snare', time: 2.5 }, { type: 'hihat', time: 2.75 },
            { type: 'kick', time: 3.0 }, { type: 'snare', time: 3.5 },
          ]
        }
      ]
    ];

    const hipHopBeats = allMusicVariations[currentMusicVariationRef.current];
    let currentBeat = 0;

      const playBeat = () => {
        if (!isMusicPlayingRef.current || !ctx || ctx.state === 'suspended') {
          return;
        }

        const startTime = ctx.currentTime;
        const beat = hipHopBeats[currentBeat];
        const gainNode = musicGainNodeRef.current;

        // Deep bass line
        beat.bass.forEach(note => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(gainNode);

          osc.type = 'sine';
          osc.frequency.value = note.freq;
          filter.type = 'lowpass';
          filter.frequency.value = 300;

          gain.gain.setValueAtTime(0, startTime + note.time);
          gain.gain.linearRampToValueAtTime(0.25, startTime + note.time + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.time + note.duration);

          osc.start(startTime + note.time);
          osc.stop(startTime + note.time + note.duration);
        });

        // Synth melody (sampled feel)
        beat.synth.forEach(note => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.connect(gain);
          gain.connect(gainNode);

          osc.type = 'square';
          osc.frequency.value = note.freq;

          gain.gain.setValueAtTime(0, startTime + note.time);
          gain.gain.linearRampToValueAtTime(0.08, startTime + note.time + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.time + note.duration);

          osc.start(startTime + note.time);
          osc.stop(startTime + note.time + note.duration);
        });

        // Boom-bap drums
        beat.drums.forEach(drum => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(gainNode);

          if (drum.type === 'kick') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(180, startTime + drum.time);
            osc.frequency.exponentialRampToValueAtTime(40, startTime + drum.time + 0.08);
            filter.type = 'lowpass';
            filter.frequency.value = 120;
            gain.gain.setValueAtTime(0.35, startTime + drum.time);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + drum.time + 0.15);
            osc.start(startTime + drum.time);
            osc.stop(startTime + drum.time + 0.15);
          } else if (drum.type === 'snare') {
            osc.type = 'triangle';
            osc.frequency.value = 220;
            filter.type = 'bandpass';
            filter.frequency.value = 2000;
            gain.gain.setValueAtTime(0.2, startTime + drum.time);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + drum.time + 0.12);
            osc.start(startTime + drum.time);
            osc.stop(startTime + drum.time + 0.12);
          } else if (drum.type === 'hihat') {
            osc.type = 'square';
            osc.frequency.value = 500;
            filter.type = 'highpass';
            filter.frequency.value = 4000;
            gain.gain.setValueAtTime(0.06, startTime + drum.time);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + drum.time + 0.04);
            osc.start(startTime + drum.time);
            osc.stop(startTime + drum.time + 0.04);
          }
        });

        currentBeat = (currentBeat + 1) % hipHopBeats.length;

        if (musicTimeoutRef.current) {
          clearTimeout(musicTimeoutRef.current);
        }

        musicTimeoutRef.current = setTimeout(playBeat, 4000);
      };

      playBeat();
    };

  useEffect(() => {
    if (gameState === 'gameover' || gameState === 'menu' || gameState === 'loading') {
      stopBackgroundMusic();
      return;
    }

    stopBackgroundMusic();
    musicVariationStartTimeRef.current = Date.now();

    isMusicPlayingRef.current = true;
    const timer = setTimeout(() => {
      // Play fast-paced 90s rock when enemy is present (level 11+)
      if (gameRef.current.enemy) {
        play90sRockMusic();
      } else {
        playBackgroundMusic();
      }
    }, 100);
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopBackgroundMusic();
      } else if (gameState !== 'gameover' && !isMusicPlayingRef.current) {
        stopBackgroundMusic();
        isMusicPlayingRef.current = true;
        if (gameState === 'menu') {
          playMenuMusic();
        } else {
          if (gameRef.current.enemy) {
            play90sRockMusic();
          } else {
            playBackgroundMusic();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearTimeout(timer);
      stopBackgroundMusic();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameState]);

  const playLaunchSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'suspended' || settings.sfxVolume === 0) return;
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3 * settings.sfxVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  const playHitSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'suspended' || settings.sfxVolume === 0) return;
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.2 * settings.sfxVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  };

  const playPowerUpSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'suspended' || settings.sfxVolume === 0) return;
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523, ctx.currentTime);
    oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.05);
    oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3 * settings.sfxVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  };

  const playGameOverSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'suspended' || settings.sfxVolume === 0) return;
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);
    oscillator.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.6);
    
    gainNode.gain.setValueAtTime(0.3 * settings.sfxVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.6);
  };

  const playLevelUpSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'suspended' || settings.sfxVolume === 0) return;
    
    // Retro arcade level up jingle
    const notes = [
      { freq: 523, time: 0, duration: 0.1 },      // C5
      { freq: 659, time: 0.1, duration: 0.1 },    // E5
      { freq: 784, time: 0.2, duration: 0.1 },    // G5
      { freq: 1047, time: 0.3, duration: 0.3 }    // C6
    ];
    
    notes.forEach(note => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'square';
      oscillator.frequency.value = note.freq;
      
      gainNode.gain.setValueAtTime(0.3 * settings.sfxVolume, ctx.currentTime + note.time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + note.time + note.duration);
      
      oscillator.start(ctx.currentTime + note.time);
      oscillator.stop(ctx.currentTime + note.time + note.duration);
    });
  };

  const gameRef = useRef({
    balls: [],
    initialBall: { x: 0, y: 0, radius: 6, speed: 8.26 },
    aimAngle: -Math.PI / 4,
    bricks: [],
    brickCols: 7,
    brickWidth: 0,
    brickHeight: 21,
    brickPadding: 2,
    brickOffsetTop: 40,
    layerGap: 18,
    mouseX: 0,
    mouseY: 0,
    animationId: null,
    particles: [],
    initialized: false,
    currentLevel: 1,
    launchPositions: [],
    numPositions: 30,
    lastBallX: null,
    roundCount: 0,
    powerUps: [],
    activePowerUps: [],
    restitution: 1.0, 
    friction: 0,
    animationFrame: 0,
    stars: [],
    enemy: null,
    enemyProjectiles: [],
    currentBallType: 'standard',
    recordedPath: [],
    pathRecordingActive: false,
    screenShake: { x: 0, y: 0, intensity: 0 },
    lasers: [],
    bricksDescending: false,
    descendAmount: 0,
    descendTarget: 0,
    ballTypes: {
      standard: { name: 'Standard', color: '#00ffff', unlockLevel: 1, icon: '⚪', speed: 8.26, radius: 6 },
      heavy: { name: 'Heavy', color: '#ff8800', unlockLevel: 5, icon: '🔶', speed: 6.75, radius: 7, piercing: 3 },
      exploding: { name: 'Exploding', color: '#ff0000', unlockLevel: 10, icon: '💥', speed: 9.72, radius: 6, explosionRadius: 50 },
      laser: { name: 'Laser', color: '#00ff00', unlockLevel: 15, icon: '⚡', speed: 9.72, radius: 6, laserLength: 150 }
    },
    themes: [
      {
        name: 'CYAN',
        bg: '#0a0a1a',
        gradient: 'from-cyan-500 via-transparent to-magenta-500',
        ball: '#00ffff',
        border: '#00ffff',
        brickColors: ['#00ffff', '#00ff00', '#ffff00', '#ff00ff', '#ff0066'],
        powerup: '#ffd700',
        moving: '#ff00ff',
        aimLine: '#ffff00',
        bottomLine: '#ff0066'
      },
      {
        name: 'NEON GREEN',
        bg: '#0a1a0a',
        gradient: 'from-green-500 via-transparent to-lime-500',
        ball: '#00ff00',
        border: '#00ff00',
        brickColors: ['#00ff00', '#7fff00', '#adff2f', '#9acd32', '#32cd32'],
        powerup: '#ffff00',
        moving: '#7fff00',
        aimLine: '#adff2f',
        bottomLine: '#00ff00'
      },
      {
        name: 'HOT PINK',
        bg: '#1a0a1a',
        gradient: 'from-pink-500 via-transparent to-purple-500',
        ball: '#ff1493',
        border: '#ff1493',
        brickColors: ['#ff1493', '#ff69b4', '#ff00ff', '#da70d6', '#ba55d3'],
        powerup: '#ffd700',
        moving: '#ff00ff',
        aimLine: '#ff69b4',
        bottomLine: '#ff1493'
      },
      {
        name: 'ELECTRIC BLUE',
        bg: '#0a0a1f',
        gradient: 'from-blue-500 via-transparent to-cyan-500',
        ball: '#4169e1',
        border: '#4169e1',
        brickColors: ['#4169e1', '#1e90ff', '#00bfff', '#87ceeb', '#00ffff'],
        powerup: '#ffd700',
        moving: '#1e90ff',
        aimLine: '#87ceeb',
        bottomLine: '#4169e1'
      },
      {
        name: 'SUNSET',
        bg: '#1a0f0a',
        gradient: 'from-orange-500 via-transparent to-red-500',
        ball: '#ff4500',
        border: '#ff4500',
        brickColors: ['#ff4500', '#ff6347', '#ff8c00', '#ffa500', '#ffb347'],
        powerup: '#ffd700',
        moving: '#ff6347',
        aimLine: '#ffa500',
        bottomLine: '#ff4500'
      }
    ],
    powerUpTypes: {
      extraBall: { icon: '➕', color: '#ffd700', name: 'Extra Ball' },
      multiBall: { icon: '✖', color: '#00ffff', name: 'Multi-Ball' },
      speedBoost: { icon: '⚡', color: '#ff00ff', name: 'Speed Boost' },
      brickFreeze: { icon: '❄', color: '#87ceeb', name: 'Brick Freeze' },
      ballSize: { icon: '💥', color: '#ff8800', name: 'Ball Size' },
      lineEliminator: { icon: '💣', color: '#ff0000', name: 'Line Eliminator' }
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameState === 'menu') return;

    const ctx = canvas.getContext('2d');
    const game = gameRef.current;

    const resizeCanvas = () => {
      const maxWidth = 600;
      const maxHeight = 800;
      const width = Math.min(maxWidth, window.innerWidth - 40);
      const height = Math.min(maxHeight, window.innerHeight - 200);
      
      canvas.width = width;
      canvas.height = height;
      
      const positionSpacing = (width - 40) / (game.numPositions - 1);
      game.launchPositions = [];
      for (let i = 0; i < game.numPositions; i++) {
        game.launchPositions.push(20 + i * positionSpacing);
      }
      
      if (game.initialBall.x === 0) {
        game.initialBall.x = game.launchPositions[Math.floor(game.numPositions / 2)];
      }
      game.initialBall.y = height - 30;
      // No change to brickWidth calc here, it's recalculated in initBricks and moveBricksDown now
      
      if (game.stars.length === 0) {
        for (let i = 0; i < 100; i++) {
          game.stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2.5 + 0.5,
            speed: Math.random() * 0.8 + 0.1,
            twinkle: Math.random() * Math.PI * 2,
            layer: Math.floor(Math.random() * 3), // 0, 1, or 2 for parallax
            brightness: Math.random() * 0.5 + 0.5
          });
        }
      }
      
      if (!game.initialized) {
        initBricks();
        game.initialized = true;
      }
    };

    const spawnLasers = () => {
      game.lasers = [];

      // Spawn one vertical laser
      const verticalX = 50 + Math.random() * (canvas.width - 100);
      game.lasers.push({
        type: 'vertical',
        x: verticalX,
        y: 0,
        width: 3,
        height: canvas.height - 40,
        active: true,
        lastToggle: Date.now()
      });

      // Spawn one horizontal laser
      const horizontalY = 100 + Math.random() * (canvas.height - 200);
      game.lasers.push({
        type: 'horizontal',
        x: 0,
        y: horizontalY,
        width: canvas.width,
        height: 3,
        active: true,
        lastToggle: Date.now()
      });
    };

    const initBricks = () => {
      // Only reset bricks on first initialization
      if (game.bricks.length === 0) {
        // Always create exactly 5 bricks
        const maxBricks = 5;
        game.brickCols = 7; // Keep consistent layout
        game.brickWidth = ((canvas.width - (game.brickCols + 1) * game.brickPadding) / game.brickCols) * 0.42;

        // Spawn lasers on first init
        spawnLasers();

      // Add metal + pink brick combo from level 5 onwards
      let metalBrickId = null;
      let pinkBrickId = null;
      if (game.currentLevel >= 5 && game.bricks.length < maxBricks - 1) {
        const metalX = canvas.width / 2 - game.brickWidth / 2;
        const metalY = game.brickOffsetTop + 5 * (game.brickHeight + game.brickPadding);

        metalBrickId = 'metal_' + Date.now();
        pinkBrickId = 'pink_' + Date.now();

        game.bricks.push({
          id: metalBrickId,
          x: metalX,
          y: metalY,
          width: game.brickWidth,
          height: game.brickHeight,
          health: Infinity,
          maxHealth: Infinity,
          type: 'metal',
          indestructible: true,
          linkedBrickId: pinkBrickId,
          originalX: metalX,
          moveDir: 0,
          moveSpeed: 0,
          hitFlash: 0
        });

        game.bricks.push({
          id: pinkBrickId,
          x: metalX,
          y: metalY - game.brickHeight - game.brickPadding,
          width: game.brickWidth,
          height: game.brickHeight,
          health: 30,
          maxHealth: 30,
          type: 'pink',
          linkedBrickId: metalBrickId,
          originalX: metalX,
          moveDir: 0,
          moveSpeed: 0,
          hitFlash: 0
        });
        }

        // Create remaining bricks up to maxBricks
        while (game.bricks.length < maxBricks) {
          const col = Math.floor(Math.random() * game.brickCols);
          const row = Math.floor(Math.random() * 3);
          
          const x = col * (game.brickWidth + game.brickPadding) + game.brickPadding + (canvas.width - (game.brickCols * (game.brickWidth + game.brickPadding))) / 2;
          const y = game.brickOffsetTop + row * (game.brickHeight + game.brickPadding);

          let brickType, health;

          // Custom level mode - use predefined layout
          if (customLevelMode && customBrickLayout && customBrickLayout.length > 0) {
            const customBrick = customBrickLayout.find(b => b.row === row && b.col === col);
            if (!customBrick) continue; // Skip if no brick at this position
            brickType = customBrick.type;
            health = customBrick.health;
            } else {
            // Normal random generation
            const powerupChance = Math.min(0.3 + game.currentLevel * 0.02, 0.4);
            const movingChance = Math.min(0.6 + game.currentLevel * 0.02, 0.7);
            const negativeChance = Math.min(0.15 + game.currentLevel * 0.01, 0.25);

            const rand = Math.random();
            if (rand < powerupChance) {
              brickType = 'powerup';
            } else if (rand < movingChance) {
              brickType = 'moving';
            } else {
              brickType = 'normal';
            }

            // Some bricks start with negative health (never for powerup bricks)
            const isNegative = brickType !== 'powerup' && Math.random() < negativeChance;
            health = isNegative ? -game.currentLevel : game.currentLevel;
            }

          let baseMoveSpeed = 0.5 + (game.currentLevel * 0.1);
          if (settings.difficulty === 'easy') {
            baseMoveSpeed = Math.max(0.2, baseMoveSpeed * 0.75);
          } else if (settings.difficulty === 'hard') {
            baseMoveSpeed *= 1.2;
          } else if (settings.difficulty === 'insane') {
            baseMoveSpeed *= 1.5;
          }
          const moveSpeed = Math.min(baseMoveSpeed, 3);

          game.bricks.push({
            x,
            y,
            width: game.brickWidth,
            height: game.brickHeight,
            health: health,
            maxHealth: health,
            initialHealth: health,
            type: brickType,
            originalX: x,
            moveDir: Math.random() > 0.5 ? 1 : -1,
            moveSpeed: moveSpeed,
            hitFlash: 0
          });
            }
            }

            // Spawn boss at level 11
            if (game.currentLevel >= 11 && !game.enemy) {
        const bossHealth = 50 + (game.currentLevel - 11) * 15;
        game.enemy = {
          x: canvas.width / 2,
          y: game.brickOffsetTop + 100,
          radius: 20,
          vx: 1.5,
          vy: 1,
          health: bossHealth,
          maxHealth: bossHealth,
          attackTimer: 0,
          attackCooldown: 120,
          isAttacking: false,
          attackPhase: 0,
          invulnerable: false,
          invulnerableTimer: 0
        };
      } else if (game.currentLevel < 11) {
        game.enemy = null;
        game.enemyProjectiles = [];
      }
      };

    const getColorForBrick = (brick) => {
      const theme = game.themes[Math.floor(game.roundCount / 5) % game.themes.length];
      if (brick.type === 'ultra') return '#ffffff';
      if (brick.type === 'metal') return '#808080';
      if (brick.type === 'pink') return '#ffb6c1';
      if (brick.type === 'powerup') return theme.powerup;
      if (brick.type === 'moving') return theme.moving;

      return theme.brickColors[Math.min(brick.health - 1, theme.brickColors.length - 1)];
    };

    const findClosestLaunchPosition = (x) => {
      let closestPos = game.launchPositions[0];
      let minDist = Math.abs(x - closestPos);
      
      for (let i = 1; i < game.launchPositions.length; i++) {
        const dist = Math.abs(x - game.launchPositions[i]);
        if (dist < minDist) {
          minDist = dist;
          closestPos = game.launchPositions[i];
        }
      }
      
      return closestPos;
    };

    const drawBrick = (brick) => {
      const color = getColorForBrick(brick);

      // Apply descent animation offset
      let yOffset = 0;
      if (game.bricksDescending && brick.targetY) {
        yOffset = game.descendAmount;
      }

      // Add subtle pulse animation for moving bricks
      let pulseEffect = 0;
      if (brick.type === 'moving') {
        pulseEffect = Math.sin(game.animationFrame * 0.1 + brick.x * 0.01) * 2;
      }

      // Hit flash effect
      if (brick.hitFlash > 0) {
        ctx.shadowBlur = 30 + brick.hitFlash * 20;
        ctx.shadowColor = '#ffffff';
        brick.hitFlash -= 0.15;
      } else {
        ctx.shadowBlur = 15 + pulseEffect;
        ctx.shadowColor = color;
      }

      if (brick.type === 'metal') {
        // Add white flash overlay when hit
        if (brick.hitFlash > 0) {
          ctx.fillStyle = '#ffffff' + Math.floor(brick.hitFlash * 80).toString(16).padStart(2, '0');
          ctx.fillRect(brick.x, brick.y + yOffset, brick.width, brick.height);
        }
        
        const gradient = ctx.createLinearGradient(brick.x, brick.y + yOffset, brick.x + brick.width, brick.y + yOffset + brick.height);
        gradient.addColorStop(0, '#a8a8a8');
        gradient.addColorStop(0.5, '#808080');
        gradient.addColorStop(1, '#606060');

        ctx.fillStyle = gradient;
        ctx.fillRect(brick.x, brick.y + yOffset, brick.width, brick.height);

        ctx.strokeStyle = '#404040';
        ctx.lineWidth = 3;
        ctx.strokeRect(brick.x, brick.y + yOffset, brick.width, brick.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "Courier New"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (brick.indestructible) {
          ctx.fillText('🔒', brick.x + brick.width / 2, brick.y + yOffset + brick.height / 2);
        } else {
          ctx.fillText(Math.round(brick.health), brick.x + brick.width / 2, brick.y + yOffset + brick.height / 2);
        }
      } else if (brick.type === 'pink') {
        // Add white flash overlay when hit
        if (brick.hitFlash > 0) {
          ctx.fillStyle = '#ffffff' + Math.floor(brick.hitFlash * 100).toString(16).padStart(2, '0');
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        }
        
        const gradient = ctx.createLinearGradient(brick.x, brick.y, brick.x + brick.width, brick.y + brick.height);
        gradient.addColorStop(0, '#ffc0cb');
        gradient.addColorStop(1, '#ff69b4');

        ctx.fillStyle = gradient;
        ctx.fillRect(brick.x, brick.y + yOffset, brick.width, brick.height);

        ctx.strokeStyle = '#ff1493';
        ctx.lineWidth = 2;
        ctx.strokeRect(brick.x, brick.y + yOffset, brick.width, brick.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "Courier New"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💗' + Math.round(brick.health), brick.x + brick.width / 2, brick.y + yOffset + brick.height / 2);
      } else if (brick.type === 'ultra') {
        // Add white flash overlay when hit
        if (brick.hitFlash > 0) {
          ctx.fillStyle = '#ffffff' + Math.floor(brick.hitFlash * 150).toString(16).padStart(2, '0');
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        }
        
        const gradient = ctx.createLinearGradient(brick.x, brick.y, brick.x + brick.width, brick.y + brick.height);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#cccccc');
        gradient.addColorStop(1, '#ffffff');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(brick.x, brick.y + yOffset, brick.width, brick.height);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(brick.x, brick.y + yOffset, brick.width, brick.height);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px "Courier New"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡' + Math.round(brick.health), brick.x + brick.width / 2, brick.y + yOffset + brick.height / 2);
      } else if (brick.type === 'powerup') {
        // Add white flash overlay when hit
        if (brick.hitFlash > 0) {
          ctx.fillStyle = '#ffffff' + Math.floor(brick.hitFlash * 120).toString(16).padStart(2, '0');
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        }
        
        const gradient = ctx.createLinearGradient(brick.x, brick.y, brick.x + brick.width, brick.y + brick.height);
        gradient.addColorStop(0, '#ffd700');
        gradient.addColorStop(1, '#ff8c00');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(brick.x, brick.y + yOffset, brick.width, brick.height);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(brick.x, brick.y + yOffset, brick.width, brick.height);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px "Courier New"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐' + Math.round(brick.health), brick.x + brick.width / 2, brick.y + yOffset + brick.height / 2);
      } else if (brick.type === 'moving') {
        // Add wobble effect
        const wobble = Math.sin(game.animationFrame * 0.08 + brick.x * 0.02) * 1;
        
        ctx.save();
        ctx.translate(brick.x + brick.width / 2, brick.y + brick.height / 2);
        ctx.rotate(wobble * 0.05);
        ctx.translate(-(brick.x + brick.width / 2), -(brick.y + brick.height / 2));
        
        // Add white flash overlay when hit
        if (brick.hitFlash > 0) {
          ctx.fillStyle = '#ffffff' + Math.floor(brick.hitFlash * 100).toString(16).padStart(2, '0');
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        }
        
        ctx.fillStyle = color + '40';
        ctx.fillRect(brick.x, brick.y + yOffset, brick.width, brick.height);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(brick.x, brick.y + yOffset, brick.width, brick.height);
        ctx.setLineDash([]);
        
        ctx.fillStyle = color;
        ctx.font = 'bold 12px "Courier New"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↔' + Math.round(brick.health), brick.x + brick.width / 2, brick.y + yOffset + brick.height / 2);
        
        ctx.restore();
      } else {
        // Add white flash overlay when hit
        if (brick.hitFlash > 0) {
          ctx.fillStyle = '#ffffff' + Math.floor(brick.hitFlash * 100).toString(16).padStart(2, '0');
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        }
        
        ctx.fillStyle = color + '40';
        ctx.fillRect(brick.x, brick.y + yOffset, brick.width, brick.height);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(brick.x, brick.y + yOffset, brick.width, brick.height);
        
        ctx.fillStyle = brick.health < 0 ? '#ff6666' : color;
        ctx.font = 'bold 12px "Courier New"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(brick.health), brick.x + brick.width / 2, brick.y + yOffset + brick.height / 2);
      }
      
      ctx.shadowBlur = 0;
    };

    const drawBall = (ball) => {
      const theme = game.themes[Math.floor(game.roundCount / 5) % game.themes.length];
      const ballType = game.ballTypes[ball.type || 'standard'];
      
      // Use themed ball color if selected
      let ballColor = ballType.color;
      if (selectedBallTheme) {
        const themedBall = [
          { id: 'fire_ball', color: '#ff4500' },
          { id: 'ice_ball', color: '#00bfff' },
          { id: 'lightning_ball', color: '#ffff00' },
          { id: 'shadow_ball', color: '#4b0082' },
          { id: 'rainbow_ball', color: '#ff00ff' },
          { id: 'galaxy_ball', color: '#8b00ff' },
          { id: 'golden_ball', color: '#ffd700' },
          { id: 'diamond_ball', color: '#b9f2ff' },
        ].find(b => b.id === selectedBallTheme);
        if (themedBall) ballColor = themedBall.color;
      }
      
      // Only show trail for the main ball (first ball)
      if (settings.ballTrails && ball.isMainBall && ball.trail && ball.trail.length > 0) {
        for (let i = 0; i < ball.trail.length; i++) {
          const pos = ball.trail[i];
          const alpha = ((i + 1) / ball.trail.length) * settings.trailOpacity;
          const size = ball.radius * (0.4 + (i / ball.trail.length) * 0.6);
          
          ctx.shadowBlur = 15 * alpha;
          ctx.shadowColor = ballColor;
          ctx.fillStyle = ballColor + Math.floor(alpha * 255).toString(16).padStart(2, '0');
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      ctx.shadowBlur = 20;
      ctx.shadowColor = ballColor;
      ctx.fillStyle = ballColor;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw icon on ball
      if (ballType.icon && ball.radius > 5) {
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${ball.radius * 1.5}px "Courier New"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ballType.icon, ball.x, ball.y);
      }
      
      ctx.shadowBlur = 0;
    };

    const drawPowerUp = (powerUp) => {
      ctx.shadowBlur = 20;
      ctx.shadowColor = powerUp.color;
      ctx.fillStyle = powerUp.color;
      ctx.beginPath();
      ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px "Courier New"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(powerUp.icon, powerUp.x, powerUp.y);
      ctx.shadowBlur = 0;
    };

    const drawLasers = () => {
      // Hide lasers every 2 rounds for 2 rounds
      const roundCycle = game.roundCount % 4;
      const lasersVisible = roundCycle < 2;

      if (!lasersVisible) return;

      game.lasers.forEach(laser => {
        const pulse = Math.sin(game.animationFrame * 0.1) * 0.3 + 0.7;

        ctx.save();
        ctx.setLineDash([10, 30]); // Big spaces between dots

        if (laser.active) {
          // Active laser - bright and firing
          ctx.shadowBlur = 30;
          ctx.shadowColor = '#ff0000';
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 6;

          ctx.beginPath();
          if (laser.type === 'vertical') {
            ctx.moveTo(laser.x + laser.width / 2, laser.y);
            ctx.lineTo(laser.x + laser.width / 2, laser.y + laser.height);
          } else {
            ctx.moveTo(laser.x, laser.y + laser.height / 2);
            ctx.lineTo(laser.x + laser.width, laser.y + laser.height / 2);
          }
          ctx.stroke();

          // Pulsing glow effect
          ctx.strokeStyle = '#ffffff' + Math.floor(pulse * 150).toString(16).padStart(2, '0');
          ctx.lineWidth = 4;
          ctx.beginPath();
          if (laser.type === 'vertical') {
            ctx.moveTo(laser.x + laser.width / 2, laser.y);
            ctx.lineTo(laser.x + laser.width / 2, laser.y + laser.height);
          } else {
            ctx.moveTo(laser.x, laser.y + laser.height / 2);
            ctx.lineTo(laser.x + laser.width, laser.y + laser.height / 2);
          }
          ctx.stroke();
        } else {
          // Inactive laser - dim and waiting
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#00ffff';
          ctx.strokeStyle = '#00ffff60';
          ctx.lineWidth = 3;

          ctx.beginPath();
          if (laser.type === 'vertical') {
            ctx.moveTo(laser.x + laser.width / 2, laser.y);
            ctx.lineTo(laser.x + laser.width / 2, laser.y + laser.height);
          } else {
            ctx.moveTo(laser.x, laser.y + laser.height / 2);
            ctx.lineTo(laser.x + laser.width, laser.y + laser.height / 2);
          }
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
      });
    };

    const drawEnemy = () => {
      if (!game.enemy) return;
      
      const enemy = game.enemy;
      
      // Add bobbing and subtle rotation
      const bob = Math.sin(game.animationFrame * 0.05) * 3;
      const wobble = Math.sin(game.animationFrame * 0.08) * 0.1;
      
      ctx.save();
      ctx.translate(enemy.x, enemy.y + bob);
      ctx.rotate(wobble);
      ctx.translate(-enemy.x, -(enemy.y + bob));
      
      // Multiple pulsing glows - more intense during attack
      const basePulse = Math.sin(game.animationFrame * 0.1) * 0.3 + 0.7;
      const pulse = enemy.isAttacking ? 1 : basePulse;
      const pulse2 = Math.sin(game.animationFrame * 0.15 + 1) * 0.2 + 0.6;
      
      // Warning glow when charging attack
      if (enemy.isAttacking) {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y + bob, enemy.radius + 15, 0, Math.PI * 2);
        ctx.fillStyle = '#ffff00' + Math.floor(pulse * 50).toString(16).padStart(2, '0');
        ctx.fill();
      }
      
      // Outer glow
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y + bob, enemy.radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ff0000' + Math.floor(pulse2 * 30).toString(16).padStart(2, '0');
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y + bob, enemy.radius + 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff0000' + Math.floor(pulse * 40).toString(16).padStart(2, '0');
      ctx.fill();
      
      // Main body with slight scale pulse - invulnerable flash
      const scalePulse = 1 + Math.sin(game.animationFrame * 0.12) * 0.05;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y + bob, enemy.radius * scalePulse, 0, Math.PI * 2);
      ctx.fillStyle = enemy.invulnerable ? '#ffaa00' : '#ff0000';
      ctx.fill();
      ctx.strokeStyle = enemy.invulnerable ? '#ffff00' : '#ff6666';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Eyes with blink - glowing during attack
      const eyeOffset = 5;
      const blinkPhase = (game.animationFrame % 120) / 120;
      const eyeHeight = blinkPhase > 0.95 ? 1 : 4;
      
      ctx.fillStyle = enemy.isAttacking ? '#ff0000' : '#000';
      ctx.shadowBlur = enemy.isAttacking ? 10 : 0;
      ctx.shadowColor = '#ff0000';
      ctx.beginPath();
      ctx.ellipse(enemy.x - eyeOffset, enemy.y + bob - 3, 4, eyeHeight, 0, 0, Math.PI * 2);
      ctx.ellipse(enemy.x + eyeOffset, enemy.y + bob - 3, 4, eyeHeight, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Angry mouth - wider during attack
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const mouthSize = enemy.isAttacking ? 8 : 6;
      ctx.arc(enemy.x, enemy.y + bob + 4, mouthSize, 0.2, Math.PI - 0.2);
      ctx.stroke();
      
      ctx.restore();
      
      // Health bar
      const barWidth = 60;
      const barHeight = 6;
      const healthPercent = enemy.health / enemy.maxHealth;
      
      ctx.fillStyle = '#000';
      ctx.fillRect(enemy.x - barWidth / 2 - 1, enemy.y + bob - enemy.radius - 15, barWidth + 2, barHeight + 2);
      
      ctx.fillStyle = '#333';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y + bob - enemy.radius - 14, barWidth, barHeight);
      
      const barColor = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
      ctx.fillStyle = barColor;
      ctx.shadowBlur = 8;
      ctx.shadowColor = barColor;
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y + bob - enemy.radius - 14, barWidth * healthPercent, barHeight);
      ctx.shadowBlur = 0;
      
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(enemy.x - barWidth / 2, enemy.y + bob - enemy.radius - 14, barWidth, barHeight);
      
      // Boss name tag
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 10px "Courier New"';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#ff0000';
      ctx.fillText('BOSS', enemy.x, enemy.y + bob - enemy.radius - 20);
      ctx.shadowBlur = 0;
    };

    const drawEnemyProjectiles = () => {
      game.enemyProjectiles.forEach(proj => {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = proj.color;
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Trail effect
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(proj.x - proj.vx * 2, proj.y - proj.vy * 2, proj.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    };

    const drawAimLine = () => {
      if (game.balls.length > 0) return;
      if (gameState !== 'aiming' && gameState !== 'ready') return;

      const theme = game.themes[Math.floor(game.roundCount / 5) % game.themes.length];
      const angle = game.aimAngle;
      const maxBounces = 1;
      const step = 5;

      ctx.save();

      let x = game.initialBall.x;
      let y = game.initialBall.y;
      let vx = Math.cos(angle);
      let vy = Math.sin(angle);
      let bounces = 0;

      ctx.strokeStyle = theme.aimLine;
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.shadowBlur = 25;
      ctx.shadowColor = theme.aimLine;
      ctx.globalAlpha = 0.9;

      ctx.beginPath();
      ctx.moveTo(x, y);

      for (let i = 0; i < 500 && bounces <= maxBounces; i++) {
        x += vx * step;
        y += vy * step;

        let hitBrick = false;
        for (let brick of game.bricks) {
          if (x + game.initialBall.radius > brick.x &&
              x - game.initialBall.radius < brick.x + brick.width &&
              y + game.initialBall.radius > brick.y &&
              y - game.initialBall.radius < brick.y + brick.height) {
            hitBrick = true;
            break;
          }
        }

        if (hitBrick) {
          ctx.lineTo(x, y);
          break;
        }

        if (x <= game.initialBall.radius) {
          x = game.initialBall.radius;
          vx = Math.abs(vx);
          bounces++;
        } else if (x >= canvas.width - game.initialBall.radius) {
          x = canvas.width - game.initialBall.radius;
          vx = -Math.abs(vx);
          bounces++;
        }

        if (y <= game.initialBall.radius) {
          y = game.initialBall.radius;
          vy = Math.abs(vy);
          bounces++;
        }

        if (y >= canvas.height - 30) {
          y = canvas.height - 30;
          break;
        }

        ctx.lineTo(x, y);

        if (bounces > maxBounces) break;
      }

      ctx.stroke();
      ctx.restore();
    };

    const createParticles = (x, y, color, intensity = 1) => {
      if (!settings.particles) return;
      const count = Math.floor(20 * intensity);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = (2 + Math.random() * 4) * intensity;
        const size = 1 + Math.random() * 4;
        const particleType = Math.random();
        
        game.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 2,
          life: 30 + Math.random() * 30,
          maxLife: 60,
          color,
          size: size,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.4,
          shape: particleType < 0.3 ? 'circle' : particleType < 0.6 ? 'square' : 'triangle',
          trail: []
        });
      }
    };

    const triggerScreenShake = (intensity) => {
      // Screen shake disabled
    };

    const updateParticles = () => {
      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
        p.vx *= 0.98; // Air resistance
        p.rotation += p.rotationSpeed;
        p.life--;
        return p.life > 0;
      });
      
      // Update screen shake
      if (game.screenShake.intensity > 0) {
        game.screenShake.x = (Math.random() - 0.5) * game.screenShake.intensity;
        game.screenShake.y = (Math.random() - 0.5) * game.screenShake.intensity;
        game.screenShake.intensity *= 0.9;
        if (game.screenShake.intensity < 0.1) {
          game.screenShake.intensity = 0;
          game.screenShake.x = 0;
          game.screenShake.y = 0;
        }
      }
    };

    const drawParticles = () => {
      game.particles.forEach(p => {
        const alpha = (p.life / p.maxLife);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha;
        
        // Enhanced glow effect
        ctx.shadowBlur = 12 * alpha;
        ctx.shadowColor = p.color;
        
        ctx.fillStyle = p.color;
        
        // Draw different shapes
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'square') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else if (p.shape === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
        }
        
        ctx.restore();
      });
    };

    const spawnPowerUp = (x, y) => {
      const types = Object.keys(game.powerUpTypes);
      // Filter line eliminator - only available from level 5+
      const availableTypes = types.filter(type => 
        type !== 'lineEliminator' || game.currentLevel >= 5
      );
      const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      const powerUpConfig = game.powerUpTypes[randomType];
      
      game.powerUps.push({
        x,
        y,
        radius: 8,
        vy: 2,
        type: randomType,
        color: powerUpConfig.color,
        icon: powerUpConfig.icon
      });
    };

    const checkPowerUpCollection = () => {
      for (let i = game.powerUps.length - 1; i >= 0; i--) {
        const powerUp = game.powerUps[i];
        
        if (powerUp.y >= canvas.height - 30 - powerUp.radius) {
          const dist = Math.abs(powerUp.x - game.initialBall.x);
          if (dist < 40) {
            activatePowerUp(powerUp);
            createParticles(powerUp.x, powerUp.y, powerUp.color, 2);
            playPowerUpSound();
            game.powerUps.splice(i, 1);
          } else {
            game.powerUps.splice(i, 1);
          }
        }
      }
    };

    const activatePowerUp = (powerUp) => {
      setScore(s => s + 50 * game.currentLevel);
      setSessionStats(prev => ({ ...prev, powerupsCollected: prev.powerupsCollected + 1 }));
      
      switch (powerUp.type) {
        case 'extraBall':
          game.roundCount++; // This will add one ball to the next launch
          break;
          
        case 'multiBall':
          if (game.balls.length > 0 && game.balls.length < 10) {
            const existingBalls = [...game.balls];
            existingBalls.forEach(ball => {
              if (!ball.stopped && game.balls.length < 10) {
                const ballsToAdd = Math.min(2, 10 - game.balls.length);
                for (let i = 0; i < ballsToAdd; i++) {
                  const angle = (Math.random() - 0.5) * 0.3;
                  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                  game.balls.push({
                    x: ball.x,
                    y: ball.y,
                    radius: ball.radius,
                    vx: Math.cos(Math.atan2(ball.vy, ball.vx) + angle) * speed,
                    vy: Math.sin(Math.atan2(ball.vy, ball.vx) + angle) * speed,
                    speed: ball.speed,
                    stopped: false,
                    trail: [],
                    isMainBall: false // New balls from multi-ball are not main balls
                  });
                }
              }
            });
          }
          break;
          
        case 'speedBoost':
          game.activePowerUps.push({
            type: 'speedBoost',
            duration: 300,
            remaining: 300
          });
          game.balls.forEach(ball => {
            if (!ball.stopped) {
              const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
              ball.vx = (ball.vx / currentSpeed) * (currentSpeed * 1.5);
              ball.vy = (ball.vy / currentSpeed) * (currentSpeed * 1.5);
            }
          });
          break;
          
        case 'brickFreeze':
          game.activePowerUps.push({
            type: 'brickFreeze',
            duration: 180,
            remaining: 180
          });
          break;
          
        case 'ballSize':
          game.activePowerUps.push({
            type: 'ballSize',
            duration: 240,
            remaining: 240
          });
          game.balls.forEach(ball => {
            ball.radius = 9;
          });
          break;
          
        case 'lineEliminator':
          setLineEliminatorActive(true);
          break;
      }
    };

    const updateActivePowerUps = () => {
      for (let i = game.activePowerUps.length - 1; i >= 0; i--) {
        const powerUp = game.activePowerUps[i];
        powerUp.remaining--;
        
        if (powerUp.remaining <= 0) {
          if (powerUp.type === 'ballSize') {
            game.balls.forEach(ball => {
              ball.radius = 6;
            });
          }
          if (powerUp.type === 'speedBoost') { // Revert speed boost
            game.balls.forEach(ball => {
              const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
              ball.vx = (ball.vx / currentSpeed) * (currentSpeed / 1.5);
              ball.vy = (ball.vy / currentSpeed) * (currentSpeed / 1.5);
            });
          }
          game.activePowerUps.splice(i, 1);
        }
      }
    };

    const updatePowerUps = () => {
      game.powerUps.forEach(powerUp => {
        powerUp.y += powerUp.vy;
      });
      checkPowerUpCollection();
    };

    const updateMovingBricks = () => {
      const isFrozen = game.activePowerUps.some(p => p.type === 'brickFreeze');

      game.bricks.forEach(brick => {
        // Fleeing behavior for high-health bricks
        if (brick.health >= 8 && !isFrozen) {
          let closestBall = null;
          let minDist = Infinity;

          game.balls.forEach(ball => {
            if (!ball.stopped) {
              const dx = ball.x - (brick.x + brick.width / 2);
              const dy = ball.y - (brick.y + brick.height / 2);
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < minDist && dist < 150) {
                minDist = dist;
                closestBall = { x: ball.x, y: ball.y, dx, dy };
              }
            }
          });

          if (closestBall) {
            const fleeSpeed = 2;
            const fleeX = closestBall.dx < 0 ? fleeSpeed : -fleeSpeed;
            brick.x += fleeX;

            const minX = game.brickPadding;
            const maxX = canvas.width - brick.width - game.brickPadding;
            brick.x = Math.max(minX, Math.min(maxX, brick.x));
          }
        }

        if (brick.type === 'moving' && !isFrozen) {
          brick.x += brick.moveDir * brick.moveSpeed;

          const minX = game.brickPadding;
          const maxX = canvas.width - brick.width - game.brickPadding;

          if (brick.x <= minX || brick.x >= maxX) {
            brick.moveDir *= -1;
            brick.x = Math.max(minX, Math.min(maxX, brick.x));
          }
        }
      });
    };

    const updateLasers = () => {
      // Hide lasers every 2 rounds for 2 rounds
      const roundCycle = game.roundCount % 4;
      const lasersVisible = roundCycle < 2;

      if (!lasersVisible) return;

      const now = Date.now();

      // Toggle lasers on/off every 5 seconds
      game.lasers.forEach(laser => {
        if (now - laser.lastToggle >= 5000) {
          laser.active = !laser.active;
          laser.lastToggle = now;
          if (laser.active) {
            playPowerUpSound();
          }
        }
      });

      // Active lasers destroy bricks in their path
      game.lasers.forEach(laser => {
        if (!laser.active) return;

        for (let i = game.bricks.length - 1; i >= 0; i--) {
          const brick = game.bricks[i];

          // Skip indestructible metal bricks
          if (brick.type === 'metal' && brick.indestructible) continue;

          let brickInLaser = false;
          if (laser.type === 'vertical') {
            brickInLaser = brick.x < laser.x + laser.width && brick.x + brick.width > laser.x;
          } else {
            brickInLaser = brick.y < laser.y + laser.height && brick.y + brick.height > laser.y;
          }

          if (brickInLaser) {
            const brickWasNegative = brick.initialHealth < 0;
            if (brickWasNegative) {
              brick.health += 1;
            } else {
              brick.health -= 1;
            }

            brick.hitFlash = 1;

            const shouldBreak = brickWasNegative 
              ? brick.health > brick.maxHealth
              : brick.health <= 0;

            if (shouldBreak) {
              if (brick.type === 'powerup') {
                spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
              }
              const points = 10 * game.currentLevel;
              setScore(s => s + points);

              setEarnedCoins(earned => {
                if (earned >= 1500) return earned;
                const coinsToAward = Math.floor(points / 2);
                const newEarned = Math.min(earned + coinsToAward, 1500);
                localStorage.setItem('earnedCoins', newEarned.toString());

                setCoins(c => {
                  const newCoins = c + (newEarned - earned);
                  localStorage.setItem('gameCoins', newCoins.toString());
                  return newCoins;
                });

                return newEarned;
              });

              const color = getColorForBrick(brick);
              createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, color, 1.5);
              game.bricks.splice(i, 1);
              setSessionStats(prev => ({ ...prev, bricksDestroyed: prev.bricksDestroyed + 1 }));
            }
          }
        }
      });
    };

    const updateEnemy = () => {
      if (!game.enemy) return;
      
      const enemy = game.enemy;
      
      // Move boss
      enemy.x += enemy.vx;
      enemy.y += enemy.vy;
      
      // Bounce off walls
      if (enemy.x - enemy.radius <= 0) {
        enemy.vx = Math.abs(enemy.vx);
        enemy.x = enemy.radius;
      } else if (enemy.x + enemy.radius >= canvas.width) {
        enemy.vx = -Math.abs(enemy.vx);
        enemy.x = canvas.width - enemy.radius;
      }
      
      // Bounce off top and stay in upper area
      if (enemy.y - enemy.radius <= 0) {
        enemy.vy = Math.abs(enemy.vy);
        enemy.y = enemy.radius;
      }
      
      // Keep boss in upper area
      const maxY = canvas.height * 0.4;
      if (enemy.y + enemy.radius >= maxY) {
        enemy.vy = -Math.abs(enemy.vy);
        enemy.y = maxY - enemy.radius;
      }
      
      // Update invulnerability
      if (enemy.invulnerable) {
        enemy.invulnerableTimer--;
        if (enemy.invulnerableTimer <= 0) {
          enemy.invulnerable = false;
        }
      }
      
      // Boss attack patterns
      enemy.attackTimer++;
      if (enemy.attackTimer >= enemy.attackCooldown) {
        enemy.isAttacking = true;
        enemy.invulnerable = true;
        enemy.invulnerableTimer = 30;
        
        // Different attack patterns based on attack phase
        if (enemy.attackPhase === 0) {
          // Spread shot - fire projectiles in multiple directions
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            game.enemyProjectiles.push({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(angle) * 3,
              vy: Math.sin(angle) * 3,
              radius: 5,
              color: '#ff6600',
              damage: 1
            });
          }
          playHitSound();
        } else if (enemy.attackPhase === 1) {
          // Aimed shot - fire at player position
          const targetX = game.initialBall.x;
          const targetY = canvas.height - 50;
          const dx = targetX - enemy.x;
          const dy = targetY - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          for (let i = -1; i <= 1; i++) {
            game.enemyProjectiles.push({
              x: enemy.x,
              y: enemy.y,
              vx: (dx / dist) * 4 + i * 0.5,
              vy: (dy / dist) * 4,
              radius: 6,
              color: '#ff0000',
              damage: 1
            });
          }
          playPowerUpSound();
        } else {
          // Rain attack - drop projectiles from above
          for (let i = 0; i < 5; i++) {
            game.enemyProjectiles.push({
              x: 50 + (canvas.width - 100) * (i / 4),
              y: 0,
              vx: 0,
              vy: 4,
              radius: 5,
              color: '#ffff00',
              damage: 1
            });
          }
          playHitSound();
        }
        
        enemy.attackPhase = (enemy.attackPhase + 1) % 3;
        enemy.attackTimer = 0;
        
        setTimeout(() => {
          if (enemy) enemy.isAttacking = false;
        }, 500);
      }
      
      // Update projectiles
      for (let i = game.enemyProjectiles.length - 1; i >= 0; i--) {
        const proj = game.enemyProjectiles[i];
        proj.x += proj.vx;
        proj.y += proj.vy;
        
        // Remove if out of bounds
        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
          game.enemyProjectiles.splice(i, 1);
          continue;
        }
        
        // Check collision with player area
        if (proj.y >= canvas.height - 40) {
          game.enemyProjectiles.splice(i, 1);
          // Could add damage to player here
        }
      }
      
      // Check collision with balls
      game.balls.forEach(ball => {
        if (ball.stopped || enemy.invulnerable) return;
        
        const dx = ball.x - enemy.x;
        const dy = ball.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < ball.radius + enemy.radius) {
          playHitSound();

          // Bounce ball
          const angle = Math.atan2(dy, dx);
          const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          ball.vx = Math.cos(angle) * speed * game.restitution;
          ball.vy = Math.sin(angle) * speed * game.restitution;
          
          // Damage boss
          const baseDamage = ball.isMainBall ? 1 : 0.5;
          const levelBonus = game.currentLevel >= 3 ? (game.currentLevel - 2) * 0.3 : 0;
          enemy.health -= (baseDamage + levelBonus);
          triggerScreenShake(8);
          
          createParticles(enemy.x, enemy.y, '#ff0000', 2.5);
          
          if (enemy.health <= 0) {
            // Boss defeated - massive rewards and animation
            const points = 1000 * game.currentLevel;
            setScore(s => s + points);

            setEarnedCoins(earned => {
              if (earned >= 1500) return earned;
              const coinsToAward = Math.floor(points / 2);
              const newEarned = Math.min(earned + coinsToAward, 1500);
              localStorage.setItem('earnedCoins', newEarned.toString());

              setCoins(c => {
                const newCoins = c + (newEarned - earned);
                localStorage.setItem('gameCoins', newCoins.toString());
                return newCoins;
              });

              return newEarned;
            });

            // Epic defeat animation
            for (let i = 0; i < 50; i++) {
              setTimeout(() => {
                createParticles(enemy.x, enemy.y, ['#ff0000', '#ff6600', '#ffff00'][i % 3], 3);
              }, i * 20);
            }
            
            triggerScreenShake(15);
            playPowerUpSound();
            
            // Spawn many power-ups
            for (let i = 0; i < 5; i++) {
              const angle = (i / 5) * Math.PI * 2;
              const powerUpTypes = Object.keys(game.powerUpTypes);
              const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
              const powerUpConfig = game.powerUpTypes[randomType];

              game.powerUps.push({
                x: enemy.x + Math.cos(angle) * 15,
                y: enemy.y + Math.sin(angle) * 15,
                radius: 8,
                vx: Math.cos(angle) * 2,
                vy: 1,
                type: randomType,
                color: powerUpConfig.color,
                icon: powerUpConfig.icon
              });
            }
            
            game.enemy = null;
            game.enemyProjectiles = [];
          }
          
          // Separate ball and boss to prevent sticking
          const overlap = (ball.radius + enemy.radius) - distance;
          const separationX = dx / distance * overlap * 0.5;
          const separationY = dy / distance * overlap * 0.5;
          ball.x += separationX;
          ball.y += separationY;
          enemy.x -= separationX;
          enemy.y -= separationY;
        }
      });
    };

    const checkCollision = (ball) => {
      const ballType = game.ballTypes[ball.type || 'standard'];
      let hitCount = 0;
      const maxHits = ballType.piercing || 1;

      for (let i = game.bricks.length - 1; i >= 0; i--) {
        const brick = game.bricks[i];

        // Skip indestructible metal bricks
        if (brick.type === 'metal' && brick.indestructible) {
          if (ball.x + ball.radius > brick.x &&
              ball.x - ball.radius < brick.x + brick.width &&
              ball.y + ball.radius > brick.y &&
              ball.y - ball.radius < brick.y + brick.height) {
            // Bounce off the metal brick
            const ballCenterX = ball.x;
            const ballCenterY = ball.y;
            const brickCenterX = brick.x + brick.width / 2;
            const brickCenterY = brick.y + brick.height / 2;

            const dx = ballCenterX - brickCenterX;
            const dy = ballCenterY - brickCenterY;

            const overlapX = (brick.width / 2 + ball.radius) - Math.abs(dx);
            const overlapY = (brick.height / 2 + ball.radius) - Math.abs(dy);

            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

            if (overlapX < overlapY) {
              ball.x += dx > 0 ? overlapX : -overlapX;
              ball.vx = -ball.vx * game.restitution;
            } else {
              ball.y += dy > 0 ? overlapY : -overlapY;
              ball.vy = -ball.vy * game.restitution;
            }

            playHitSound();
            createParticles(ball.x, ball.y, '#808080', 1);
          }
          continue;
        }

        if (ball.x + ball.radius > brick.x &&
            ball.x - ball.radius < brick.x + brick.width &&
            ball.y + ball.radius > brick.y &&
            ball.y - ball.radius < brick.y + brick.height) {
          
          const ballCenterX = ball.x;
          const ballCenterY = ball.y;
          const brickCenterX = brick.x + brick.width / 2;
          const brickCenterY = brick.y + brick.height / 2;
          
          const dx = ballCenterX - brickCenterX;
          const dy = ballCenterY - brickCenterY;
          
          const overlapX = (brick.width / 2 + ball.radius) - Math.abs(dx);
          const overlapY = (brick.height / 2 + ball.radius) - Math.abs(dy);
          
          const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          
          // Only bounce if not piercing or last hit
          if (hitCount === 0 || hitCount >= maxHits - 1) {
            if (overlapX < overlapY) {
              ball.x += dx > 0 ? overlapX : -overlapX;
              ball.vx = -ball.vx * game.restitution;
              
              const relativeHitY = (ball.y - brickCenterY) / (brick.height / 2);
              const angleInfluence = relativeHitY * 0.3;
              ball.vy = (ball.vy + angleInfluence * speed * 0.5) * game.restitution;
              
              const spinEffect = (Math.random() - 0.5) * 0.15;
              ball.vy += spinEffect * speed;

            } else {
              ball.y += dy > 0 ? overlapY : -overlapY;
              ball.vy = -ball.vy * game.restitution;

              const relativeHitX = (ball.x - brickCenterX) / (brick.width / 2);
              const angleInfluence = relativeHitX * 0.3;
              ball.vx = (ball.vx + angleInfluence * speed * 0.5) * game.restitution;
              
              const spinEffect = (Math.random() - 0.5) * 0.15;
              ball.vx += spinEffect * speed;
            }
            
            const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            const maxSpeedFactor = 1.1;
            const minSpeedFactor = 0.85;
            
            if (currentSpeed > speed * maxSpeedFactor) {
              const scale = (speed * maxSpeedFactor) / currentSpeed;
              ball.vx *= scale;
              ball.vy *= scale;
            } else if (currentSpeed < speed * minSpeedFactor) {
              const scale = (speed * minSpeedFactor) / currentSpeed;
              ball.vx *= scale;
              ball.vy *= scale;
            }
          }
          
          // Handle negative health bricks
          const wasNegative = brick.initialHealth < 0;
          const baseDamage = ball.isMainBall ? 1 : 0.5;
          const levelBonus = game.currentLevel >= 3 ? (game.currentLevel - 2) * 0.3 : 0;
          const hitDamage = baseDamage + levelBonus;

          if (wasNegative) {
            brick.health += hitDamage; // Increase towards positive
          } else {
            brick.health -= hitDamage; // Normal decrease
          }

          brick.hitFlash = 1; // Trigger flash effect
          playHitSound();

          const color = getColorForBrick(brick);
          const isHighImpact = ballType.piercing || ball.type === 'heavy';

          // Enhanced particle effects with varied colors
          const particleColors = [color, '#ffffff', color + 'cc'];
          for (let pc = 0; pc < 3; pc++) {
            createParticles(ball.x, ball.y, particleColors[pc % particleColors.length], isHighImpact ? 1.8 : 1.2);
          }

          if (isHighImpact) {
            triggerScreenShake(3);
          }

          // Handle special ball types
          if (ball.type === 'exploding' && hitCount === 0) {
            // Explode on first impact
            triggerScreenShake(8);
            const explosionRadius = ballType.explosionRadius;
            for (let j = game.bricks.length - 1; j >= 0; j--) {
              const otherBrick = game.bricks[j];
              const dist = Math.sqrt(
                Math.pow(otherBrick.x + otherBrick.width / 2 - ball.x, 2) +
                Math.pow(otherBrick.y + otherBrick.height / 2 - ball.y, 2)
              );
              if (dist < explosionRadius) {
                const brickWasNegative = otherBrick.initialHealth < 0;
                if (brickWasNegative) {
                  otherBrick.health += 2;
                } else {
                  otherBrick.health -= 2;
                }
                createParticles(otherBrick.x + otherBrick.width / 2, otherBrick.y + otherBrick.height / 2, '#ff0000', 2);
                
                const brickShouldBreak = brickWasNegative 
                  ? otherBrick.health > otherBrick.maxHealth
                  : otherBrick.health <= 0;
                
                if (brickShouldBreak) {
                if (otherBrick.type === 'powerup') {
                  spawnPowerUp(otherBrick.x + otherBrick.width / 2, otherBrick.y + otherBrick.height / 2);
                }
                const points = 10 * game.currentLevel;
                setScore(s => s + points);

                setEarnedCoins(earned => {
                  if (earned >= 1500) return earned;
                  const coinsToAward = Math.floor(points / 2);
                  const newEarned = Math.min(earned + coinsToAward, 1500);
                  localStorage.setItem('earnedCoins', newEarned.toString());

                  setCoins(c => {
                    const newCoins = c + (newEarned - earned);
                    localStorage.setItem('gameCoins', newCoins.toString());
                    return newCoins;
                  });

                  return newEarned;
                });

                game.bricks.splice(j, 1);
                setSessionStats(prev => ({ ...prev, bricksDestroyed: prev.bricksDestroyed + 1 }));
                if (j < i) i--;
                }
              }
            }
          } else if (ball.type === 'laser' && hitCount === 0) {
            // Fire laser
            const laserLength = ballType.laserLength;
            const angle = Math.atan2(ball.vy, ball.vx);
            const laserEndX = ball.x + Math.cos(angle) * laserLength;
            const laserEndY = ball.y + Math.sin(angle) * laserLength;
            
            for (let j = game.bricks.length - 1; j >= 0; j--) {
              const otherBrick = game.bricks[j];
              const bx = otherBrick.x + otherBrick.width / 2;
              const by = otherBrick.y + otherBrick.height / 2;
              
              // Check if brick is in laser path
              const d = Math.abs((laserEndY - ball.y) * bx - (laserEndX - ball.x) * by + laserEndX * ball.y - laserEndY * ball.x) /
                        Math.sqrt(Math.pow(laserEndY - ball.y, 2) + Math.pow(laserEndX - ball.x, 2));
              
              if (d < 15) { // Laser width
                const dist = Math.sqrt(Math.pow(bx - ball.x, 2) + Math.pow(by - ball.y, 2));
                if (dist < laserLength) {
                  const brickWasNegative = otherBrick.initialHealth < 0;
                  if (brickWasNegative) {
                    otherBrick.health += 1;
                  } else {
                    otherBrick.health -= 1;
                  }
                  createParticles(bx, by, '#00ff00', 1.2);
                  
                  const brickShouldBreak = brickWasNegative 
                    ? otherBrick.health > otherBrick.maxHealth
                    : otherBrick.health <= 0;
                  
                  if (brickShouldBreak) {
                    if (otherBrick.type === 'powerup') {
                      spawnPowerUp(bx, by);
                    }
                    const points = 10 * game.currentLevel;
                    setScore(s => s + points);

                    setEarnedCoins(earned => {
                      if (earned >= 1500) return earned;
                      const coinsToAward = Math.floor(points / 2);
                      const newEarned = Math.min(earned + coinsToAward, 1500);
                      localStorage.setItem('earnedCoins', newEarned.toString());

                      setCoins(c => {
                        const newCoins = c + (newEarned - earned);
                        localStorage.setItem('gameCoins', newCoins.toString());
                        return newCoins;
                      });

                      return newEarned;
                    });

                    game.bricks.splice(j, 1);
                    setSessionStats(prev => ({ ...prev, bricksDestroyed: prev.bricksDestroyed + 1 }));
                    if (j < i) i--;
                  }
                }
              }
            }
          }

          // Check if brick should break - must go through all values including positive equivalent
          const shouldBreak = wasNegative 
            ? brick.health > brick.maxHealth
            : brick.health <= 0;

          if (shouldBreak) {
            // Check if this is a pink brick - weaken the linked metal brick
            if (brick.type === 'pink' && brick.linkedBrickId) {
              const metalBrick = game.bricks.find(b => b.id === brick.linkedBrickId);
              if (metalBrick && metalBrick.type === 'metal') {
                metalBrick.indestructible = false;
                metalBrick.health = 25;
                metalBrick.maxHealth = 25;
              }
            }

            if (brick.type === 'powerup') {
              spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
            }
            const points = 10 * game.currentLevel;
            setScore(s => s + points);

            // Award coins with cap
            setEarnedCoins(earned => {
              if (earned >= 1500) return earned;
              const coinsToAward = Math.floor(points / 2);
              const newEarned = Math.min(earned + coinsToAward, 1500);
              localStorage.setItem('earnedCoins', newEarned.toString());

              setCoins(c => {
                const newCoins = c + (newEarned - earned);
                localStorage.setItem('gameCoins', newCoins.toString());
                return newCoins;
              });

              return newEarned;
            });

            game.bricks.splice(i, 1);
            setSessionStats(prev => ({ ...prev, bricksDestroyed: prev.bricksDestroyed + 1 }));
          }
          
          hitCount++;
          if (hitCount >= maxHits) break;
        }
      }
    };

    const moveBricksDown = () => {
      // Respawn lasers in new positions
      spawnLasers();

      // Move ALL existing bricks down (they persist)
      game.bricks.forEach(brick => {
        brick.y += (game.brickHeight + game.brickPadding);
      });

      // Determine how many NEW bricks to add at the top
      const numNewBricks = Math.min(5, 15 - game.bricks.length);
      
      // Add new bricks ONLY at the top row
      for (let i = 0; i < numNewBricks; i++) {
        const col = Math.floor(Math.random() * game.brickCols);

        const powerupChance = Math.min(0.3 + game.currentLevel * 0.02, 0.4);
        const movingChance = Math.min(0.6 + game.currentLevel * 0.02, 0.7);

        const rand = Math.random();
        let brickType;
        if (rand < powerupChance) {
          brickType = 'powerup';
        } else if (rand < movingChance) {
          brickType = 'moving';
        } else {
          brickType = 'normal';
        }

        const health = game.currentLevel;

        const x = col * (game.brickWidth + game.brickPadding) + game.brickPadding + (canvas.width - (game.brickCols * (game.brickWidth + game.brickPadding))) / 2;

        let baseMoveSpeed = 0.5 + (game.currentLevel * 0.1);
        if (settings.difficulty === 'easy') {
          baseMoveSpeed = Math.max(0.2, baseMoveSpeed * 0.75);
        } else if (settings.difficulty === 'hard') {
          baseMoveSpeed *= 1.2;
        } else if (settings.difficulty === 'insane') {
          baseMoveSpeed *= 1.5;
        }
        const moveSpeed = Math.min(baseMoveSpeed, 3);

        game.bricks.push({
          x: x,
          y: game.brickOffsetTop,
          width: game.brickWidth,
          height: game.brickHeight,
          health: health,
          maxHealth: Math.abs(health),
          initialHealth: health,
          type: brickType,
          originalX: x,
          moveDir: Math.random() > 0.5 ? 1 : -1,
          moveSpeed: moveSpeed,
          hitFlash: 0
        });
        }
      
      // Check for game over condition (bricks reaching bottom line)
      if (game.bricks.length > 0) {
        const lowestBrick = Math.max(...game.bricks.map(b => b.y + b.height));
        if (lowestBrick >= canvas.height - 60) {
          // Check if player has extra lives
          const lifeItem = ownedItems.find(i => i.id === 'extra_life');
          if (lifeItem && lifeItem.quantity > 0) {
            // Use an extra life - remove bottom layer of bricks
            const bottomThreshold = canvas.height - 80;
            game.bricks = game.bricks.filter(b => b.y + b.height < bottomThreshold);

            // Decrease extra life count
            setOwnedItems(prev => {
              const updated = prev.map(item => 
                item.id === 'extra_life' 
                  ? { ...item, quantity: item.quantity - 1 }
                  : item
              ).filter(item => item.id !== 'extra_life' || item.quantity > 0);
              localStorage.setItem('ownedItems', JSON.stringify(updated));
              return updated;
            });
          } else {
            setGameState('gameover');
          }
        }
      }
    };

    const update = () => {
      if (gameState !== 'playing' && gameState !== 'aiming') return;
      
      // Handle smooth brick descent animation
      if (game.bricksDescending) {
        const descendSpeed = 2;
        game.descendAmount += descendSpeed;
        
        if (game.descendAmount >= game.descendTarget) {
          // Animation complete - finalize positions and add new bricks
          game.descendAmount = game.descendTarget;
          game.bricksDescending = false;
          
          // Finalize brick positions
          game.bricks.forEach(brick => {
            brick.y = brick.targetY || brick.y;
            delete brick.targetY;
          });
          
          // Add new bricks at top
          const numNewBricks = Math.min(5, 15 - game.bricks.length);
          for (let i = 0; i < numNewBricks; i++) {
            const col = Math.floor(Math.random() * game.brickCols);
            const powerupChance = Math.min(0.3 + game.currentLevel * 0.02, 0.4);
            const movingChance = Math.min(0.6 + game.currentLevel * 0.02, 0.7);
            const rand = Math.random();
            let brickType;
            if (rand < powerupChance) {
              brickType = 'powerup';
            } else if (rand < movingChance) {
              brickType = 'moving';
            } else {
              brickType = 'normal';
            }
            const health = game.currentLevel;
            const x = col * (game.brickWidth + game.brickPadding) + game.brickPadding + (canvas.width - (game.brickCols * (game.brickWidth + game.brickPadding))) / 2;
            let baseMoveSpeed = 0.5 + (game.currentLevel * 0.1);
            if (settings.difficulty === 'easy') {
              baseMoveSpeed = Math.max(0.2, baseMoveSpeed * 0.75);
            } else if (settings.difficulty === 'hard') {
              baseMoveSpeed *= 1.2;
            }
            const moveSpeed = Math.min(baseMoveSpeed, 3);
            game.bricks.push({
              x: x,
              y: game.brickOffsetTop,
              width: game.brickWidth,
              height: game.brickHeight,
              health: health,
              maxHealth: Math.abs(health),
              initialHealth: health,
              type: brickType,
              originalX: x,
              moveDir: Math.random() > 0.5 ? 1 : -1,
              moveSpeed: moveSpeed,
              hitFlash: 0
            });
          }
          
          // Respawn lasers
          spawnLasers();
          
          // Check for game over
          if (game.bricks.length > 0) {
            const lowestBrick = Math.max(...game.bricks.map(b => b.y + b.height));
            if (lowestBrick >= canvas.height - 60) {
              const lifeItem = ownedItems.find(i => i.id === 'extra_life');
              if (lifeItem && lifeItem.quantity > 0) {
                const bottomThreshold = canvas.height - 80;
                game.bricks = game.bricks.filter(b => b.y + b.height < bottomThreshold);
                setOwnedItems(prev => {
                  const updated = prev.map(item => 
                    item.id === 'extra_life' 
                      ? { ...item, quantity: item.quantity - 1 }
                      : item
                  ).filter(item => item.id !== 'extra_life' || item.quantity > 0);
                  localStorage.setItem('ownedItems', JSON.stringify(updated));
                  return updated;
                });
              } else {
                setGameState('gameover');
              }
            }
          }
          
          // Spawn boss at level 11
          if (game.currentLevel >= 11 && !game.enemy) {
            const bossHealth = 50 + (game.currentLevel - 11) * 15;
            game.enemy = {
              x: canvas.width / 2,
              y: game.brickOffsetTop + 100,
              radius: 20,
              vx: 1.5,
              vy: 1,
              health: bossHealth,
              maxHealth: bossHealth,
              attackTimer: 0,
              attackCooldown: 120,
              isAttacking: false,
              attackPhase: 0,
              invulnerable: false,
              invulnerableTimer: 0
            };
          }
          
          setGameState('aiming');
        } else {
          // Set target positions for smooth animation
          game.bricks.forEach(brick => {
            if (!brick.targetY) {
              brick.targetY = brick.y + game.descendTarget;
            }
          });
        }
        
        return;
      }
      
      if (gameState !== 'playing') return;
      
      let allBallsReturned = true;
      let mainBallLandingX = null; // Track landing position of the main ball
      
      for (let i = game.balls.length - 1; i >= 0; i--) {
        const ball = game.balls[i];

        if (!ball.stopped) {
          // Only update trail for main ball
          if (settings.ballTrails && ball.isMainBall) {
            ball.trail.push({ x: ball.x, y: ball.y });
            if (ball.trail.length > settings.trailLength) {
              ball.trail.shift();
            }
          }

          // Main ball records its path, followers play it back
          if (ball.isMainBall) {
            const lowestBrickY = game.bricks.length > 0 
              ? Math.max(...game.bricks.map(b => b.y + b.height))
              : 0;

            if (ball.y > lowestBrickY && ball.vy > 0) {
              // No need to bounce here, let it pass through bricks from above if it's below them.
              // This condition is for ball going below all bricks, but still above the platform
            }

            ball.x += ball.vx;
            ball.y += ball.vy;

            // Record path for followers
            if (game.pathRecordingActive) {
              game.recordedPath.push({ x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy });
            }
          } else if (ball.isFollowing && game.recordedPath.length > 0) {
            // Follower balls play back the recorded path
            if (ball.pathIndex < game.recordedPath.length) {
              const pathPoint = game.recordedPath[ball.pathIndex];
              ball.x = pathPoint.x;
              ball.y = pathPoint.y;
              ball.vx = pathPoint.vx;
              ball.vy = pathPoint.vy;
              ball.pathIndex++;
            } else {
              // Path ended, continue with last velocity
              ball.x += ball.vx;
              ball.y += ball.vy;
            }
          } else {
            // Fallback for non-following balls
            ball.x += ball.vx;
            ball.y += ball.vy;
          }
          
          ball.vx *= (1 - game.friction);
          ball.vy *= (1 - game.friction);
          
          // Left wall collision
          if (ball.x - ball.radius <= 0) {
            ball.x = ball.radius;
            ball.vx = Math.abs(ball.vx) * game.restitution;
            playHitSound();
            const impactAngle = Math.atan2(ball.vy, ball.vx);
            const angleVariation = (Math.random() - 0.5) * 0.1;
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            ball.vx = Math.cos(impactAngle + angleVariation) * speed;
            ball.vy = Math.sin(impactAngle + angleVariation) * speed;

          // Right wall collision
          } else if (ball.x + ball.radius >= canvas.width) {
            ball.x = canvas.width - ball.radius;
            ball.vx = -Math.abs(ball.vx) * game.restitution;
            playHitSound();
            const impactAngle = Math.atan2(ball.vy, ball.vx);
            const angleVariation = (Math.random() - 0.5) * 0.1;
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            ball.vx = Math.cos(impactAngle + angleVariation) * speed;
            ball.vy = Math.sin(impactAngle + angleVariation) * speed;
          }
          
          // Top wall collision - bounce back down
          if (ball.y - ball.radius <= 0) {
            ball.y = ball.radius;
            ball.vy = Math.abs(ball.vy) * game.restitution; // Ensure it bounces down
            playHitSound();
            const horizontalVariation = (Math.random() - 0.5) * 0.2;
            ball.vx += horizontalVariation;
          }
          
          // Bottom line (player platform) collision - stop ball
          if (ball.y >= canvas.height - 30 - ball.radius && ball.vy > 0) {
            ball.stopped = true;
            ball.y = canvas.height - 30 - ball.radius;
            ball.vx = 0;
            ball.vy = 0;

            // Track main ball landing position and stop recording
            if (ball.isMainBall) {
              mainBallLandingX = ball.x;
              game.pathRecordingActive = false;
            }
          } else {
            allBallsReturned = false;
          }

          if (!ball.stopped && !ball.isFollowing) {
            checkCollision(ball);
          }
        }
      }
      
      updateMovingBricks();
      updatePowerUps();
      updateActivePowerUps();
      updateLasers();
      updateEnemy();

      // Check if any brick has reached the bottom line
      if (game.bricks.length > 0) {
        const lowestBrick = Math.max(...game.bricks.map(b => b.y + b.height));
        if (lowestBrick >= canvas.height - 60) {
          // Check if player has extra lives
          const lifeItem = ownedItems.find(i => i.id === 'extra_life');
          if (lifeItem && lifeItem.quantity > 0) {
            // Use an extra life - remove bottom layer of bricks
            const bottomThreshold = canvas.height - 80;
            game.bricks = game.bricks.filter(b => b.y + b.height < bottomThreshold);

            // Decrease extra life count
            setOwnedItems(prev => {
              const updated = prev.map(item => 
                item.id === 'extra_life' 
                  ? { ...item, quantity: item.quantity - 1 }
                  : item
              ).filter(item => item.id !== 'extra_life' || item.quantity > 0);
              localStorage.setItem('ownedItems', JSON.stringify(updated));
              return updated;
            });
          } else {
            setGameState('gameover');
          }
        }
      }

      if (allBallsReturned && game.balls.length > 0) {
        // Use the mainBallLandingX if it was set, otherwise fallback to the current initialBall.x
        const finalLandingX = mainBallLandingX !== null ? mainBallLandingX : game.initialBall.x;
        
        // Move all balls to the main ball's landing position (for visual coherence before clearing)
        game.balls.forEach(ball => {
          ball.x = finalLandingX;
        });
        
        game.balls = [];

        // Reset laser timers when round ends
        game.lasers.forEach(laser => {
          laser.lastToggle = Date.now();
        });

        // Update initial ball position for next round
        game.initialBall.x = findClosestLaunchPosition(finalLandingX);
        game.lastBallX = finalLandingX; // Store for general reference

        game.roundCount++;

        // Level up every 3 rounds
        if (game.roundCount % 3 === 0) {
          const newLevel = game.currentLevel + 1;
          game.currentLevel = newLevel;
          setLevel(newLevel);
          playLevelUpSound();
        }

        // Start smooth brick descent animation
        game.bricksDescending = true;
        game.descendAmount = 0;
        game.descendTarget = game.brickHeight + game.brickPadding;
      }
      
      updateParticles();
    };

    const draw = () => {
      const theme = game.themes[Math.floor(game.roundCount / 5) % game.themes.length];
      
      // Apply screen shake
      ctx.save();
      ctx.translate(game.screenShake.x, game.screenShake.y);
      
      ctx.fillStyle = theme.bg;
      ctx.fillRect(-game.screenShake.x, -game.screenShake.y, canvas.width + Math.abs(game.screenShake.x * 2), canvas.height + Math.abs(game.screenShake.y * 2));
      
      game.animationFrame++;
      
      ctx.save();
      game.stars.forEach((star) => {
        // Parallax effect - different layers move at different speeds
        const parallaxSpeed = star.speed * (1 + star.layer * 0.3);
        star.y += parallaxSpeed;
        
        // Add subtle horizontal drift based on layer
        star.x += Math.sin(game.animationFrame * 0.01 + star.layer) * 0.05;
        
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
        
        const twinkle = Math.sin(star.twinkle + game.animationFrame * 0.05) * 0.5 + 0.5;
        const layerOpacity = 40 + star.layer * 30; // Back layers dimmer
        const brightness = twinkle * star.brightness;
        
        ctx.shadowBlur = (star.layer + 1) * 2;
        ctx.shadowColor = theme.border;
        ctx.fillStyle = theme.border + Math.floor(brightness * 100 + layerOpacity).toString(16).padStart(2, '0');
        
        // Larger stars in foreground
        const starSize = star.size * (1 + star.layer * 0.2);
        ctx.fillRect(star.x, star.y, starSize, starSize);
      });
      ctx.restore();
      
      ctx.save();
      ctx.strokeStyle = theme.border + '08';
      ctx.lineWidth = 1;
      const gridSize = 40;
      const offsetY = (game.animationFrame * 0.5) % gridSize;
      
      for (let y = -gridSize + offsetY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      ctx.restore();
      
      ctx.save();
      const pulse = Math.sin(game.animationFrame * 0.03) * 0.5 + 0.5;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, theme.border + Math.floor(pulse * 15).toString(16).padStart(2, '0'));
      gradient.addColorStop(0.5, 'transparent');
      gradient.addColorStop(1, theme.ball + Math.floor(pulse * 15).toString(16).padStart(2, '0'));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      
      ctx.save();
      ctx.fillStyle = theme.ball + '08';
      for (let i = 0; i < canvas.height; i += 4) {
        const scanlineOpacity = Math.sin((i + game.animationFrame) * 0.1) * 0.02 + 0.06;
        ctx.fillStyle = theme.ball + Math.floor(scanlineOpacity * 255).toString(16).padStart(2, '0');
        ctx.fillRect(0, i, canvas.width, 2);
      }
      ctx.restore();
      
      ctx.save();
      const numShapes = 5;
      for (let i = 0; i < numShapes; i++) {
        const shapePhase = game.animationFrame * 0.01 + (i * Math.PI * 2) / numShapes;
        const x = canvas.width / 2 + Math.cos(shapePhase) * (canvas.width * 0.4);
        const y = canvas.height / 2 + Math.sin(shapePhase * 0.7) * (canvas.height * 0.3);
        const size = 20 + Math.sin(shapePhase * 2) * 10;
        const rotation = game.animationFrame * 0.02 + i;
        
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.strokeStyle = theme.border + '10';
        ctx.lineWidth = 2;
        
        if (i % 2 === 0) {
          ctx.strokeRect(-size / 2, -size / 2, size, size);
        } else {
          ctx.beginPath();
          for (let j = 0; j < 3; j++) {
            const angle = (j / 3) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(angle) * size / 2;
            const py = Math.sin(angle) * size / 2;
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
        
        ctx.rotate(-rotation);
        ctx.translate(-x, -y);
      }
      ctx.restore();
      
      game.bricks.forEach(drawBrick);
      game.powerUps.forEach(drawPowerUp);
      drawLasers();
      drawEnemyProjectiles();
      drawEnemy();
      
      if (game.balls.length > 0) {
        game.balls.forEach(ball => drawBall(ball));
      } else {
        // Draw initial ball without trail by default (or if it's not explicitly marked as main ball)
        drawBall({ ...game.initialBall, isMainBall: true });
      }
      
      drawAimLine();
      
      // Draw line eliminator preview
      if (lineEliminatorActive) {
        ctx.save();
        ctx.setLineDash([10, 5]);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff0000';
        
        const y = game.mouseY || canvas.height / 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        
        ctx.restore();
      }
      
      drawParticles();
      
      ctx.strokeStyle = theme.bottomLine;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 40);
      ctx.lineTo(canvas.width, canvas.height - 40);
      ctx.stroke();
      
      if (game.balls.length > 0 && gameState === 'playing') {
        ctx.fillStyle = theme.ball;
        ctx.font = 'bold 16px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText(`BALLS: ${game.balls.filter(b => !b.stopped).length}`, 10, 25);
      }
      
      ctx.fillStyle = theme.border + '60';
      ctx.font = 'bold 12px "Courier New"';
      ctx.textAlign = 'right';
      ctx.fillText(`THEME: ${theme.name}`, canvas.width - 10, 25);
      
      if (game.activePowerUps.length > 0) {
        ctx.textAlign = 'left';
        let yOffset = 50;
        game.activePowerUps.forEach(powerUp => {
          const config = game.powerUpTypes[powerUp.type];
          const progress = powerUp.remaining / powerUp.duration;
          const barWidth = 100;
          const barHeight = 10;
          
          // Pulsing glow for active power-ups
          const pulse = Math.sin(game.animationFrame * 0.1) * 0.3 + 0.7;
          ctx.shadowBlur = 15 * pulse;
          ctx.shadowColor = config.color;
          
          // Background
          ctx.fillStyle = '#00000080';
          ctx.fillRect(8, yOffset - 18, barWidth + 4, 32);
          
          // Icon with glow
          ctx.font = 'bold 16px "Courier New"';
          ctx.fillStyle = config.color;
          ctx.fillText(config.icon, 15, yOffset - 4);
          
          // Power-up name
          ctx.font = 'bold 9px "Courier New"';
          ctx.fillStyle = config.color;
          ctx.fillText(config.name.toUpperCase(), 35, yOffset - 8);
          
          // Progress bar background
          ctx.fillStyle = config.color + '20';
          ctx.fillRect(35, yOffset, barWidth - 25, barHeight);
          
          // Progress bar fill with gradient
          const gradient = ctx.createLinearGradient(35, yOffset, 35 + (barWidth - 25) * progress, yOffset);
          gradient.addColorStop(0, config.color);
          gradient.addColorStop(1, config.color + 'aa');
          ctx.fillStyle = gradient;
          ctx.fillRect(35, yOffset, (barWidth - 25) * progress, barHeight);
          
          // Border
          ctx.strokeStyle = config.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(35, yOffset, barWidth - 25, barHeight);
          
          ctx.shadowBlur = 0;
          yOffset += 36;
        });
      }
      
      // Display current ball type
      const currentBallType = game.ballTypes[game.currentBallType];
      ctx.textAlign = 'left';
      ctx.font = 'bold 14px "Courier New"';
      ctx.fillStyle = currentBallType.color;
      ctx.fillText(`BALL: ${currentBallType.icon} ${currentBallType.name.toUpperCase()}`, 10, canvas.height - 10);
      
      // Display enemy warning at level 11
      if (game.currentLevel >= 11 && game.enemy) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px "Courier New"';
        const warningAlpha = Math.sin(game.animationFrame * 0.1) * 0.3 + 0.7;
        ctx.fillStyle = '#ff0000' + Math.floor(warningAlpha * 255).toString(16).padStart(2, '0');
        ctx.fillText('⚠ ENEMY ACTIVE ⚠', canvas.width / 2, canvas.height - 15);
        ctx.restore();
      }
      
      // Restore screen shake translation
      ctx.restore();
    };

    const gameLoop = () => {
      update();
      draw();
      game.animationId = requestAnimationFrame(gameLoop);
    };

    const handleMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
      const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

      const dyRaw = y - game.initialBall.y;
      const dxRaw = x - game.initialBall.x;

      game.mouseX = x;
      game.mouseY = y;

      if (gameState === 'aiming' || gameState === 'ready') {
        // In mobile mode, only allow aim adjustment if not locked
        if (settings.mobileMode && aimLockedRef.current) return;

        let angle = Math.atan2(dyRaw, dxRaw);

        if (angle > -Math.PI / 12) angle = -Math.PI / 12;
        if (angle < -11 * Math.PI / 12) angle = -11 * Math.PI / 12;

        game.aimAngle = angle;
      }
    };

    const eliminateLine = (position) => {
      const bricksToRemove = [];
      
      game.bricks.forEach((brick, index) => {
        // Remove bricks in horizontal line at position Y
        const brickCenterY = brick.y + brick.height / 2;
        const shouldRemove = Math.abs(brickCenterY - position) < 30;
        
        if (shouldRemove && !(brick.type === 'metal' && brick.indestructible)) {
          bricksToRemove.push(index);
          
          // Award points and coins
          if (brick.type === 'powerup') {
            spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
          }
          const points = 10 * game.currentLevel;
          setScore(s => s + points);
          
          setEarnedCoins(earned => {
            if (earned >= 1500) return earned;
            const coinsToAward = Math.floor(points / 2);
            const newEarned = Math.min(earned + coinsToAward, 1500);
            localStorage.setItem('earnedCoins', newEarned.toString());
            
            setCoins(c => {
              const newCoins = c + (newEarned - earned);
              localStorage.setItem('gameCoins', newCoins.toString());
              return newCoins;
            });
            
            return newEarned;
          });
          
          const color = getColorForBrick(brick);
          createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, color, 2);
          setSessionStats(prev => ({ ...prev, bricksDestroyed: prev.bricksDestroyed + 1 }));
        }
      });
      
      // Remove bricks from end to start to avoid index issues
      bricksToRemove.reverse().forEach(index => {
        game.bricks.splice(index, 1);
      });
      
      triggerScreenShake(8);
      playPowerUpSound();
      setLineEliminatorActive(false);
    };

    const handleClick = (e) => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      // Handle line eliminator click
      if (lineEliminatorActive) {
        const rect = canvas.getBoundingClientRect();
        const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
        eliminateLine(y);
        return;
      }

      if (gameState !== 'aiming' && gameState !== 'ready') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      game.balls = [];
      game.recordedPath = [];
      game.pathRecordingActive = true;
      playLaunchSound();

      const ballCount = Math.min(game.roundCount + 1, 10);
      const currentType = game.currentBallType;
      const ballConfig = game.ballTypes[currentType];
      const speedMultiplier = settings.mobileMode ? 0.6 : 1;
      const angle = game.aimAngle;

      for (let i = 0; i < ballCount; i++) {
        setTimeout(() => {
          const hasSizeBoost = game.activePowerUps.some(p => p.type === 'ballSize');

          game.balls.push({
            x: game.initialBall.x,
            y: game.initialBall.y,
            radius: hasSizeBoost ? (ballConfig.radius + 3) : ballConfig.radius,
            vx: Math.cos(angle) * ballConfig.speed * speedMultiplier,
            vy: Math.sin(angle) * ballConfig.speed * speedMultiplier,
            speed: ballConfig.speed * speedMultiplier,
            stopped: false,
            trail: [],
            isMainBall: i === 0,
            type: currentType,
            pathIndex: 0,
            isFollowing: i > 0
          });
        }, i * 100);
      }

      setGameState('playing');
    };

    const handleTouchStart = (e) => {
      e.preventDefault();
      
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      
      if (gameState !== 'aiming' && gameState !== 'ready') {
        return;
      }

      // Mobile mode: first tap locks aim, second tap launches
      if (settings.mobileMode) {
        if (!aimLockedRef.current) {
          aimLockedRef.current = true;
          setAimLocked(true);
          return;
        }
      }

      // Launch balls
      aimLockedRef.current = false;
      setAimLocked(false);
      game.balls = [];
      game.recordedPath = [];
      game.pathRecordingActive = true;
      playLaunchSound();

      const ballCount = Math.min(game.currentLevel, 10);
      const currentType = game.currentBallType;
      const ballConfig = game.ballTypes[currentType];
      const speedMultiplier = settings.mobileMode ? 0.6 : 1;
      const angle = game.aimAngle;

      for (let i = 0; i < ballCount; i++) {
        setTimeout(() => {
          const hasSizeBoost = game.activePowerUps.some(p => p.type === 'ballSize');

          game.balls.push({
            x: game.initialBall.x,
            y: game.initialBall.y,
            radius: hasSizeBoost ? (ballConfig.radius + 3) : ballConfig.radius,
            vx: Math.cos(angle) * ballConfig.speed * speedMultiplier,
            vy: Math.sin(angle) * ballConfig.speed * speedMultiplier,
            speed: ballConfig.speed * speedMultiplier,
            stopped: false,
            trail: [],
            isMainBall: i === 0,
            type: currentType,
            pathIndex: 0,
            isFollowing: i > 0
          });
        }, i * 100);
      }

      setGameState('playing');
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove, { passive: false }); 
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    gameLoop();

    if (settings.difficulty === 'hard' || settings.difficulty === 'insane') {
      hardModeIntervalRef.current = setInterval(() => {
        if (gameState === 'playing' || gameState === 'aiming') {
          const isFrozen = game.activePowerUps.some(p => p.type === 'brickFreeze');
          if (!isFrozen) {
             moveBricksDown();
          }
        }
      }, settings.difficulty === 'insane' ? 3000 : 5000);
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      if (game.animationId) {
        cancelAnimationFrame(game.animationId);
      }
      if (hardModeIntervalRef.current) {
        clearInterval(hardModeIntervalRef.current);
        hardModeIntervalRef.current = null;
      }
    };
  }, [gameState, score, level, settings, playerStats, unlockedAchievements]);

  const handleSubmitScore = () => {
    if (!playerName.trim()) return;
    
    submitScoreMutation.mutate({
      player_name: playerName.trim(),
      score: score,
      level: level,
    });
  };

  const handleGameOver = async () => {
    const newStats = {
      total_bricks_destroyed: (playerStats?.total_bricks_destroyed || 0) + sessionStats.bricksDestroyed,
      total_powerups_collected: (playerStats?.total_powerups_collected || 0) + sessionStats.powerupsCollected,
      highest_level: Math.max(playerStats?.highest_level || 0, level),
      highest_score: Math.max(playerStats?.highest_score || 0, score),
      total_games_played: (playerStats?.total_games_played || 0) + 1
    };
    
    await updateStatsMutation.mutateAsync(newStats);
    await checkAchievements(newStats);
    
    setHighScore(hs => {
      const newHighScore = Math.max(hs, score);
      localStorage.setItem('highScore', newHighScore.toString());
      return newHighScore;
    });
    playGameOverSound();
  };

  useEffect(() => {
    if (gameState === 'gameover') {
      handleGameOver();
    }
  }, [gameState, score, level, playerStats, sessionStats, unlockedAchievements]);

  const resetGame = () => {
    setScore(0);
    setLevel(1);
    setScoreSubmitted(false);
    setPlayerName('');
    setShowLeaderboard(false);
    setSessionStats({ bricksDestroyed: 0, powerupsCollected: 0 });
    aimLockedRef.current = false;
    setAimLocked(false);
    const game = gameRef.current;
    game.balls = [];
    game.particles = [];
    game.currentLevel = 1;
    game.initialized = false;
    game.lastBallX = null;
    game.roundCount = 0;
    game.powerUps = [];
    game.activePowerUps = [];
    game.stars = [];
    game.enemy = null;
    game.enemyProjectiles = [];
    game.animationFrame = 0;
    game.recordedPath = [];
    game.pathRecordingActive = false;
    game.lasers = [];
    setGameState('ready');
  };
  
  const handlePurchase = (item) => {
    // Handle coin purchases (from premium packs)
    if (item.itemType === 'coins') {
      setCoins(c => {
        const newCoins = c + item.quantity;
        localStorage.setItem('gameCoins', newCoins.toString());
        return newCoins;
      });
      return;
    }
    
    // Handle regular coin-based purchases
    if (coins >= item.price) {
      setCoins(c => {
        const newCoins = c - item.price;
        localStorage.setItem('gameCoins', newCoins.toString());
        return newCoins;
      });
      
      // When spending coins, reduce earned coins first
      setEarnedCoins(earned => {
        const newEarned = Math.max(0, earned - item.price);
        localStorage.setItem('earnedCoins', newEarned.toString());
        return newEarned;
      });
      
      setOwnedItems(prev => {
        let updated;
        if (item.stackable) {
          const existing = prev.find(i => i.id === item.id);
          if (existing) {
            updated = prev.map(i => 
              i.id === item.id 
                ? { ...i, quantity: i.quantity + 1 }
                : i
            );
          } else {
            updated = [...prev, { ...item, quantity: 1 }];
          }
        } else {
          if (!prev.some(i => i.id === item.id)) {
            updated = [...prev, item];
            // Auto-select themed balls
            if (item.id.includes('_ball')) {
              setSelectedBallTheme(item.id);
              localStorage.setItem('selectedBallTheme', item.id);
            }
          } else {
            updated = prev;
          }
        }
        localStorage.setItem('ownedItems', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setGameState('ready');
    setSessionStats({ bricksDestroyed: 0, powerupsCollected: 0 });
    aimLockedRef.current = false;
    setAimLocked(false);
    const game = gameRef.current;
    game.balls = [];
    game.particles = [];
    game.currentLevel = 1;
    game.initialized = false;
    game.lastBallX = null;
    game.roundCount = 0;
    game.powerUps = [];
    game.activePowerUps = [];
    game.stars = [];
    game.enemy = null;
    game.enemyProjectiles = [];
    game.animationFrame = 0;
  };

  useEffect(() => {
    if (gameState === 'loading') {
      const timer = setTimeout(() => {
        setGameState('menu');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const currentTheme = gameRef.current.themes[Math.floor(gameRef.current.roundCount / 5) % gameRef.current.themes.length];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className={`absolute inset-0 bg-gradient-to-b ${currentTheme.gradient}`} />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {gameState === 'loading' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white flex items-center justify-center z-50"
          >
            <motion.img
              src={logoUrl}
              alt="ROR Games Logo"
              className="w-full h-full object-contain p-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
          </motion.div>
        ) : gameState === 'menu' ? (
          <div className="flex flex-col items-center justify-center min-h-[600px]">
            <h1 className="text-7xl md:text-9xl font-bold mb-16 tracking-wider animate-pulse text-center" style={{
              fontFamily: '"Courier New", monospace',
              color: '#00ffff',
              textShadow: '0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff'
            }}>
              RETRO SMASHER
            </h1>
            
            <div className="space-y-6 w-full max-w-md">
              <Button
                onClick={() => {
                  stopBackgroundMusic();
                  startGame();
                }}
                className="w-full py-8 text-2xl font-bold bg-cyan-500 hover:bg-cyan-600 text-black"
                style={{
                  fontFamily: '"Courier New", monospace',
                  boxShadow: '0 0 30px #00ffff'
                }}
              >
                ▶ PLAY
              </Button>
              
              <Button
                onClick={() => {
                  stopBackgroundMusic();
                  setShowRules(true);
                }}
                className="w-full py-8 text-2xl font-bold bg-blue-500 hover:bg-blue-600 text-black"
                style={{
                  fontFamily: '"Courier New", monospace',
                  boxShadow: '0 0 30px #0099ff'
                }}
              >
                📖 GAME RULES
              </Button>

              <Button
                onClick={() => {
                  stopBackgroundMusic();
                  setShowDailyChallenges(true);
                }}
                className="w-full py-8 text-2xl font-bold bg-orange-500 hover:bg-orange-600 text-black"
                style={{
                  fontFamily: '"Courier New", monospace',
                  boxShadow: '0 0 30px #ff8800'
                }}
              >
                🎯 DAILY CHALLENGES
              </Button>

              <Button
                onClick={() => {
                  stopBackgroundMusic();
                  setShowLevelEditor(true);
                }}
                className="w-full py-8 text-2xl font-bold bg-pink-500 hover:bg-pink-600 text-black"
                style={{
                  fontFamily: '"Courier New", monospace',
                  boxShadow: '0 0 30px #ff1493'
                }}
              >
                🎨 LEVEL EDITOR
              </Button>

              <Button
                onClick={() => {
                  stopBackgroundMusic();
                  setShowAchievements(true);
                }}
                className="w-full py-8 text-2xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                style={{
                  fontFamily: '"Courier New", monospace',
                  boxShadow: '0 0 30px #ffff00'
                }}
              >
                🏆 ACHIEVEMENTS
              </Button>
              
              <Button
                onClick={() => {
                  stopBackgroundMusic();
                  setShowShop(true);
                }}
                className="w-full py-8 text-2xl font-bold bg-green-500 hover:bg-green-600 text-black"
                style={{
                  fontFamily: '"Courier New", monospace',
                  boxShadow: '0 0 30px #00ff00'
                }}
              >
                🛒 SHOP ({coins} COINS)
              </Button>
              
              <Button
                onClick={() => {
                  stopBackgroundMusic();
                  setShowSettings(true);
                }}
                className="w-full py-8 text-2xl font-bold bg-purple-500 hover:bg-purple-600 text-black"
                style={{
                  fontFamily: '"Courier New", monospace',
                  boxShadow: '0 0 30px #ff00ff'
                }}
              >
                ⚙ SETTINGS
              </Button>
              
              <Link to={createPageUrl('PrivacyPolicy')}>
                <Button
                  className="w-full py-8 text-2xl font-bold bg-gray-700 hover:bg-gray-600 text-white"
                  style={{
                    fontFamily: '"Courier New", monospace',
                    boxShadow: '0 0 30px #666666'
                  }}
                >
                  <FileText className="mr-2" />
                  PRIVACY POLICY
                </Button>
              </Link>

              <Button
                onClick={() => {
                  stopBackgroundMusic();
                  window.close();
                }}
                className="w-full py-8 text-2xl font-bold bg-red-500 hover:bg-red-600 text-black"
                style={{
                  fontFamily: '"Courier New", monospace',
                  boxShadow: '0 0 30px #ff0066'
                }}
              >
                ✕ EXIT
              </Button>
            </div>
            
            <div className="text-center mt-12 text-gray-500" style={{ fontFamily: '"Courier New", monospace' }}>
              <div className="text-sm mb-2">HIGH SCORE</div>
              <div className="text-3xl font-bold" style={{
                color: '#00ff00',
                textShadow: '0 0 10px #00ff00'
              }}>
                {highScore.toString().padStart(6, '0')}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-5xl md:text-7xl font-bold mb-2 tracking-wider" style={{
                fontFamily: '"Courier New", monospace',
                color: '#00ffff',
                textShadow: '0 0 20px #00ffff, 0 0 40px #00ffff'
              }}>
                RETRO SMASHER
              </h1>
              <div className="flex justify-center gap-8 mt-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500 tracking-widest" style={{ fontFamily: '"Courier New", monospace' }}>
                    SCORE
                  </div>
                  <div className="text-2xl font-bold" style={{
                    fontFamily: '"Courier New", monospace',
                    color: '#ffff00',
                    textShadow: '0 0 10px #ffff00'
                  }}>
                    {score.toString().padStart(6, '0')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 tracking-widest" style={{ fontFamily: '"Courier New", monospace' }}>
                    LEVEL
                  </div>
                  <div className="text-2xl font-bold" style={{
                    fontFamily: '"Courier New", monospace',
                    color: '#ff00ff',
                    textShadow: '0 0 10px #ff00ff'
                  }}>
                    {level.toString().padStart(2, '0')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 tracking-widest" style={{ fontFamily: '"Courier New", monospace' }}>
                    HIGH SCORE
                  </div>
                  <div className="text-2xl font-bold" style={{
                    fontFamily: '"Courier New", monospace',
                    color: '#00ff00',
                    textShadow: '0 0 10px #00ff00'
                  }}>
                    {highScore.toString().padStart(6, '0')}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-lg" style={{
                boxShadow: `0 0 40px ${currentTheme.border}40, inset 0 0 20px #00000080`
              }} />
              <canvas
                ref={canvasRef}
                className="w-full rounded-lg border-4 relative"
                style={{
                  boxShadow: `0 0 30px ${currentTheme.border}80`,
                  imageRendering: 'pixelated',
                  touchAction: settings.mobileMode ? 'none' : 'auto',
                  cursor: settings.mobileMode ? 'pointer' : 'default',
                  borderColor: currentTheme.border
                }}
              />
              
              {gameState === 'gameover' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 rounded-lg overflow-auto">
                  <div className="text-center px-4 py-6 max-h-full overflow-auto">
                    <div className="text-6xl font-bold mb-4" style={{
                      fontFamily: '"Courier New", monospace',
                      color: '#ff0066',
                      textShadow: '0 0 20px #ff0066'
                    }}>
                      GAME OVER
                    </div>
                    <div className="text-2xl mb-6" style={{
                      fontFamily: '"Courier New", monospace',
                      color: '#00ffff'
                    }}>
                      FINAL SCORE: {score}
                    </div>

                    {!scoreSubmitted ? (
                      <div className="mb-6 space-y-4">
                        <div className="text-lg text-cyan-400" style={{ fontFamily: '"Courier New", monospace' }}>
                          SUBMIT YOUR SCORE
                        </div>
                        <div className="flex gap-2 justify-center">
                          <Input
                            placeholder="Enter your name"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSubmitScore()}
                            className="max-w-xs bg-black border-cyan-500 text-cyan-400"
                            style={{ fontFamily: '"Courier New", monospace' }}
                            maxLength={20}
                          />
                          <Button
                            onClick={handleSubmitScore}
                            disabled={!playerName.trim() || submitScoreMutation.isPending}
                            className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
                            style={{ fontFamily: '"Courier New", monospace' }}
                          >
                            <Trophy className="mr-2" />
                            SUBMIT
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6 text-green-400 text-lg" style={{ fontFamily: '"Courier New", monospace' }}>
                        ✓ SCORE SUBMITTED!
                      </div>
                    )}

                    {showLeaderboard ? (
                      <div className="mb-6 max-w-md mx-auto">
                        <Leaderboard />
                      </div>
                    ) : (
                      <Button
                        onClick={() => setShowLeaderboard(true)}
                        variant="outline"
                        className="mb-6 border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
                        style={{ fontFamily: '"Courier New", monospace' }}
                      >
                        <Trophy className="mr-2" />
                        VIEW LEADERBOARD
                      </Button>
                    )}

                    <div className="flex gap-4 justify-center flex-wrap">
                      <Button
                        onClick={resetGame}
                        className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-8 py-6 text-xl"
                        style={{
                          fontFamily: '"Courier New", monospace',
                          boxShadow: '0 0 20px #00ffff'
                        }}
                      >
                        <RotateCcw className="mr-2" />
                        RESTART
                      </Button>
                      <Button
                        onClick={() => {
                          setShowShop(true);
                        }}
                        className="bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-6 text-xl"
                        style={{
                          fontFamily: '"Courier New", monospace',
                          boxShadow: '0 0 20px #00ff00'
                        }}
                      >
                        <ShoppingBag className="mr-2" />
                        VISIT SHOP TO CONTINUE
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {gameState === 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 rounded-lg pointer-events-none">
                  <div className="text-center px-4">
                    <div className={`font-bold mb-4 animate-pulse ${settings.mobileMode ? 'text-2xl' : 'text-3xl'}`} style={{
                      fontFamily: '"Courier New", monospace',
                      color: '#00ffff',
                      textShadow: '0 0 20px #00ffff'
                    }}>
                      {settings.mobileMode ? (aimLocked ? 'TAP TO LAUNCH' : 'TOUCH TO AIM') : 'AIM AND CLICK TO LAUNCH'}
                    </div>
                    <div className={`text-gray-400 ${settings.mobileMode ? 'text-xs' : 'text-sm'}`} style={{ fontFamily: '"Courier New", monospace' }}>
                      • Launch {Math.min(gameRef.current.currentLevel, 10)} ball{Math.min(gameRef.current.currentLevel, 10) > 1 ? 's' : ''}<br />
                      • ⭐ Gold bricks drop power-ups (+1 ball)<br />
                      • ↔ Purple bricks move horizontally<br />
                      • Hold game screen to speed up balls
                      {gameRef.current.currentLevel >= 11 && (
                        <p className="mt-2 text-red-400 text-base">
                          ⚠ Be ready, an enemy lurks at level 11!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4 mt-6">
              <Button
                onClick={() => setShowPauseMenu(true)}
                variant="outline"
                className={`border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black font-bold ${settings.mobileMode ? 'py-6 text-lg px-8' : 'px-6'}`}
                style={{ fontFamily: '"Courier New", monospace' }}
              >
                <Menu className="mr-2" />
                MENU
              </Button>

              {gameState === 'playing' && gameRef.current.balls.length > 0 && gameRef.current.balls.some(b => !b.stopped) && (
                <Button
                  onClick={recallBalls}
                  className={`bg-purple-600 hover:bg-purple-700 text-white font-bold ${settings.mobileMode ? 'py-6 text-lg px-8' : 'px-8'}`}
                  style={{
                    fontFamily: '"Courier New", monospace',
                    boxShadow: '0 0 20px #a855f7'
                  }}
                >
                  ⏮ RECALL BALLS
                </Button>
              )}
            </div>
            
            {/* Ball Type Selector */}
            <div className="mt-6 p-4 bg-black bg-opacity-60 rounded-lg border-2 border-cyan-500">
              <div className="text-center mb-3 text-cyan-500 font-bold" style={{ fontFamily: '"Courier New", monospace' }}>
                SELECT BALL TYPE
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(gameRef.current.ballTypes).map(([key, type]) => {
                  const isUnlocked = level >= type.unlockLevel;
                  const isCurrent = gameRef.current.currentBallType === key;
                  return (
                    <Button
                      key={key}
                      onClick={() => {
                        if (isUnlocked) {
                          gameRef.current.currentBallType = key;
                        }
                      }}
                      disabled={!isUnlocked}
                      className={`font-bold ${settings.mobileMode ? 'py-6' : 'py-4'} ${
                        isCurrent 
                          ? 'bg-cyan-500 text-black border-2 border-white' 
                          : isUnlocked
                            ? 'bg-gray-800 text-white hover:bg-gray-700'
                            : 'bg-gray-900 text-gray-600 cursor-not-allowed'
                      }`}
                      style={{ 
                        fontFamily: '"Courier New", monospace',
                        borderColor: isCurrent ? type.color : 'transparent',
                        boxShadow: isCurrent ? `0 0 15px ${type.color}` : 'none'
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span style={{ fontSize: '24px' }}>{type.icon}</span>
                        <span className="text-xs">{type.name}</span>
                        {!isUnlocked && (
                          <span className="text-xs text-red-400">Lvl {type.unlockLevel}</span>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
              <div className="mt-3 text-xs text-center text-gray-500" style={{ fontFamily: '"Courier New", monospace' }}>
                {gameRef.current.currentBallType === 'heavy' && '🔶 Pierces through multiple bricks'}
                {gameRef.current.currentBallType === 'exploding' && '💥 Explodes on impact, damaging nearby bricks'}
                {gameRef.current.currentBallType === 'laser' && '⚡ Fires a laser beam on hit'}
                {gameRef.current.currentBallType === 'standard' && '⚪ Standard balanced ball'}
              </div>
            </div>

            {showLeaderboard && gameState !== 'gameover' && (
              <div className="mt-8 p-6 bg-black bg-opacity-60 rounded-lg border-2 border-cyan-500">
                <Leaderboard />
              </div>
            )}

            <div className="text-center mt-8 text-xs text-gray-600" style={{ fontFamily: '"Courier New", monospace' }}>
              © 1982 RETRO ARCADE • INSERT COIN TO CONTINUE
            </div>
          </>
        )}
      </div>

      <GameSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
      
      <AchievementsPanel
        isOpen={showAchievements}
        onClose={() => setShowAchievements(false)}
        unlockedAchievements={unlockedAchievements}
        playerStats={playerStats}
      />
      
      <Shop
        isOpen={showShop}
        onClose={() => setShowShop(false)}
        coins={coins}
        onPurchase={handlePurchase}
        ownedItems={ownedItems}
      />

      <GameRules
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />

      <DailyChallenges
        isOpen={showDailyChallenges}
        onClose={() => setShowDailyChallenges(false)}
        coins={coins}
        onStartChallenge={(challenge) => {
          setActiveChallenge(challenge);
          startGame();
        }}
        onRewardClaim={(rewardCoins) => {
          setCoins(c => {
            const newCoins = c + rewardCoins;
            localStorage.setItem('gameCoins', newCoins.toString());
            return newCoins;
          });
        }}
      />

      <LevelEditor
        isOpen={showLevelEditor}
        onClose={() => setShowLevelEditor(false)}
        onPlayLevel={(layout) => {
          setCustomBrickLayout(layout);
          setCustomLevelMode(true);
          startGame();
        }}
      />

      {/* Pause Menu */}
      <AnimatePresence>
        {showPauseMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPauseMenu(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0a0a1a] rounded-xl border-4 border-cyan-500 p-6 w-full max-w-md relative"
              style={{
                boxShadow: '0 0 40px #00ffff80',
                fontFamily: '"Courier New", monospace'
              }}
            >
              <h2 className="text-3xl font-bold mb-6 text-cyan-500 tracking-wider text-center" style={{
                textShadow: '0 0 10px #00ffff'
              }}>
                ⏸ MENU
              </h2>

              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setShowPauseMenu(false);
                    setShowLeaderboard(!showLeaderboard);
                  }}
                  className="w-full py-6 text-xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                  style={{ fontFamily: '"Courier New", monospace' }}
                >
                  <Trophy className="mr-2" />
                  LEADERBOARD
                </Button>

                <Button
                  onClick={() => {
                    setShowPauseMenu(false);
                    setShowAchievements(true);
                  }}
                  className="w-full py-6 text-xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                  style={{ fontFamily: '"Courier New", monospace' }}
                >
                  <Award className="mr-2" />
                  ACHIEVEMENTS
                </Button>

                <Button
                  onClick={() => {
                    setShowPauseMenu(false);
                    setShowShop(true);
                  }}
                  className="w-full py-6 text-xl font-bold bg-green-500 hover:bg-green-600 text-black"
                  style={{ fontFamily: '"Courier New", monospace' }}
                >
                  <ShoppingBag className="mr-2" />
                  SHOP ({coins} COINS)
                </Button>

                <Button
                  onClick={() => {
                    setShowPauseMenu(false);
                    setShowDailyChallenges(true);
                  }}
                  className="w-full py-6 text-xl font-bold bg-orange-500 hover:bg-orange-600 text-black"
                  style={{ fontFamily: '"Courier New", monospace' }}
                >
                  🎯 DAILY CHALLENGES
                </Button>

                <Button
                  onClick={() => {
                    setShowPauseMenu(false);
                    setShowLevelEditor(true);
                  }}
                  className="w-full py-6 text-xl font-bold bg-pink-500 hover:bg-pink-600 text-black"
                  style={{ fontFamily: '"Courier New", monospace' }}
                >
                  🎨 LEVEL EDITOR
                </Button>

                <Button
                  onClick={() => {
                    setShowPauseMenu(false);
                    setShowSettings(true);
                  }}
                  className="w-full py-6 text-xl font-bold bg-purple-500 hover:bg-purple-600 text-black"
                  style={{ fontFamily: '"Courier New", monospace' }}
                >
                  <Settings className="mr-2" />
                  SETTINGS
                </Button>

                <Button
                  onClick={() => {
                    setShowPauseMenu(false);
                    resetGame();
                  }}
                  className="w-full py-6 text-xl font-bold bg-red-500 hover:bg-red-600 text-black"
                  style={{ fontFamily: '"Courier New", monospace' }}
                >
                  <RotateCcw className="mr-2" />
                  MAIN MENU
                </Button>

                <Button
                  onClick={() => setShowPauseMenu(false)}
                  variant="outline"
                  className="w-full py-4 text-lg font-bold border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black"
                  style={{ fontFamily: '"Courier New", monospace' }}
                >
                  ✕ CLOSE
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      );
      }