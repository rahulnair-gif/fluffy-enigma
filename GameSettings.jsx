import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Volume2, VolumeX, Music, Sparkles, Zap, Smartphone, Waves } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GameSettings({ isOpen, onClose, settings, onSettingsChange }) {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0a0a1a] rounded-xl border-4 border-cyan-500 p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto"
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

            <h2 className="text-3xl font-bold mb-6 text-cyan-500 tracking-wider" style={{
              textShadow: '0 0 10px #00ffff'
            }}>
              ⚙ SETTINGS
            </h2>

            <div className="space-y-6">
              {/* Sound Effects Volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {localSettings.sfxVolume > 0 ? (
                      <Volume2 className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <VolumeX className="h-5 w-5 text-gray-500" />
                    )}
                    <label className="text-sm text-cyan-400 font-bold">SOUND FX</label>
                  </div>
                  <span className="text-xs text-gray-400">{Math.round(localSettings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={localSettings.sfxVolume}
                  onChange={(e) => handleChange('sfxVolume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    accentColor: '#00ffff'
                  }}
                />
              </div>

              {/* Background Music Volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {localSettings.musicVolume > 0 ? (
                      <Music className="h-5 w-5 text-purple-500" />
                    ) : (
                      <VolumeX className="h-5 w-5 text-gray-500" />
                    )}
                    <label className="text-sm text-cyan-400 font-bold">MUSIC</label>
                  </div>
                  <span className="text-xs text-gray-400">{Math.round(localSettings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={localSettings.musicVolume}
                  onChange={(e) => handleChange('musicVolume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    accentColor: '#ff00ff'
                  }}
                />
              </div>

              {/* Mobile Controls */}
              <div className="border-t-2 border-gray-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-green-500" />
                    <label className="text-sm text-cyan-400 font-bold">MOBILE MODE</label>
                  </div>
                  <button
                    onClick={() => handleChange('mobileMode', !localSettings.mobileMode)}
                    className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${
                      localSettings.mobileMode
                        ? 'bg-cyan-500 text-black'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {localSettings.mobileMode ? 'ON' : 'OFF'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Larger touch targets and simplified controls
                </p>
              </div>

              {/* Visual Effects */}
              <div className="border-t-2 border-gray-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    <label className="text-sm text-cyan-400 font-bold">PARTICLES</label>
                  </div>
                  <button
                    onClick={() => handleChange('particles', !localSettings.particles)}
                    className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${
                      localSettings.particles
                        ? 'bg-cyan-500 text-black'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {localSettings.particles ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <label className="text-sm text-cyan-400 font-bold">SCREEN SHAKE</label>
                  </div>
                  <button
                    onClick={() => handleChange('screenShake', !localSettings.screenShake)}
                    className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${
                      localSettings.screenShake
                        ? 'bg-cyan-500 text-black'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {localSettings.screenShake ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Ball Trails */}
              <div className="border-t-2 border-gray-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Waves className="h-5 w-5 text-cyan-500" />
                    <label className="text-sm text-cyan-400 font-bold">BALL TRAILS</label>
                  </div>
                  <button
                    onClick={() => handleChange('ballTrails', !localSettings.ballTrails)}
                    className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${
                      localSettings.ballTrails
                        ? 'bg-cyan-500 text-black'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {localSettings.ballTrails ? 'ON' : 'OFF'}
                  </button>
                </div>

                {localSettings.ballTrails && (
                  <>
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-cyan-400 font-bold">TRAIL LENGTH</label>
                        <span className="text-xs text-gray-400">{localSettings.trailLength}</span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max="20"
                        step="1"
                        value={localSettings.trailLength}
                        onChange={(e) => handleChange('trailLength', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        style={{
                          accentColor: '#00ffff'
                        }}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-cyan-400 font-bold">TRAIL OPACITY</label>
                        <span className="text-xs text-gray-400">{Math.round(localSettings.trailOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="1"
                        step="0.1"
                        value={localSettings.trailOpacity}
                        onChange={(e) => handleChange('trailOpacity', parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        style={{
                          accentColor: '#00ffff'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Difficulty */}
              <div className="border-t-2 border-gray-800 pt-4">
                <label className="text-sm text-cyan-400 font-bold mb-3 block">DIFFICULTY</label>
                <div className="grid grid-cols-3 gap-2">
                  {['easy', 'normal', 'hard'].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => handleChange('difficulty', diff)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all uppercase ${
                        localSettings.difficulty === diff
                          ? 'bg-cyan-500 text-black'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {localSettings.difficulty === 'easy' && '• Slower bricks, more power-ups'}
                  {localSettings.difficulty === 'normal' && '• Standard game balance'}
                  {localSettings.difficulty === 'hard' && '• Faster bricks, fewer power-ups'}
                </p>
              </div>
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