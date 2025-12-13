import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Target, Zap, Star, Palette } from 'lucide-react';

export default function GameRules({ isOpen, onClose }) {
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
            className="bg-[#0a0a1a] rounded-xl border-4 border-cyan-500 p-6 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto"
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

            <h2 className="text-4xl font-bold text-cyan-500 tracking-wider mb-6 text-center" style={{
              textShadow: '0 0 10px #00ffff'
            }}>
              📖 GAME RULES
            </h2>

            <div className="space-y-6">
              {/* How to Play */}
              <div className="bg-gray-900 bg-opacity-50 p-4 rounded-lg border-2 border-cyan-500">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-6 h-6 text-cyan-400" />
                  <h3 className="text-2xl font-bold text-cyan-400">HOW TO PLAY</h3>
                </div>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Aim and launch balls to destroy all bricks</li>
                  <li>• Each brick shows its health number</li>
                  <li>• Balls return to a position below where they land</li>
                  <li>• Gain +1 ball each round (max 20)</li>
                  <li>• Clear all bricks to advance to the next level</li>
                  <li>• Game over if bricks reach the bottom line</li>
                  <li>• Higher levels = tougher bricks and more challenges</li>
                  <li>• Earn coins by destroying bricks (5 coins per 10 points)</li>
                  <li>• Maximum 1500 coins can be earned from gameplay</li>
                </ul>
              </div>

              {/* Ball Types */}
              <div className="bg-gray-900 bg-opacity-50 p-4 rounded-lg border-2 border-yellow-500">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-2xl font-bold text-yellow-400">BALL TYPES</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-black bg-opacity-40 p-3 rounded">
                    <div className="text-cyan-400 font-bold">⚪ STANDARD (Level 1+)</div>
                    <div className="text-gray-400">Balanced speed and power</div>
                  </div>
                  <div className="bg-black bg-opacity-40 p-3 rounded">
                    <div className="text-orange-400 font-bold">🔶 HEAVY (Level 5+)</div>
                    <div className="text-gray-400">Slower but pierces 3 bricks</div>
                  </div>
                  <div className="bg-black bg-opacity-40 p-3 rounded">
                    <div className="text-red-400 font-bold">💥 EXPLODING (Level 10+)</div>
                    <div className="text-gray-400">Explodes on impact, area damage</div>
                  </div>
                  <div className="bg-black bg-opacity-40 p-3 rounded">
                    <div className="text-green-400 font-bold">⚡ LASER (Level 15+)</div>
                    <div className="text-gray-400">Fires laser beam through bricks</div>
                  </div>
                </div>
              </div>

              {/* Power-ups */}
              <div className="bg-gray-900 bg-opacity-50 p-4 rounded-lg border-2 border-purple-500">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-6 h-6 text-purple-400" />
                  <h3 className="text-2xl font-bold text-purple-400">POWER-UPS</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-black bg-opacity-40 p-3 rounded">
                    <div className="text-yellow-400 font-bold">➕ EXTRA BALL</div>
                    <div className="text-gray-400">+1 ball for next round</div>
                  </div>
                  <div className="bg-black bg-opacity-40 p-3 rounded">
                    <div className="text-cyan-400 font-bold">✖ MULTI-BALL</div>
                    <div className="text-gray-400">Splits all active balls x3</div>
                  </div>
                  <div className="bg-black bg-opacity-40 p-3 rounded">
                    <div className="text-purple-400 font-bold">⚡ SPEED BOOST</div>
                    <div className="text-gray-400">1.5x speed for 5 seconds</div>
                  </div>
                  <div className="bg-black bg-opacity-40 p-3 rounded">
                    <div className="text-blue-400 font-bold">❄ BRICK FREEZE</div>
                    <div className="text-gray-400">Stop moving bricks for 3 seconds</div>
                  </div>
                  <div className="bg-black bg-opacity-40 p-3 rounded">
                    <div className="text-orange-400 font-bold">💥 BALL SIZE</div>
                    <div className="text-gray-400">Larger balls for 4 seconds</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  ⭐ Gold bricks drop power-ups when destroyed
                </div>
              </div>

              {/* Brick Types */}
              <div className="bg-gray-900 bg-opacity-50 p-4 rounded-lg border-2 border-green-500">
                <h3 className="text-2xl font-bold text-green-400 mb-3">BRICK TYPES</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-black bg-opacity-40 p-3 rounded">
                    <div className="text-gray-300 font-bold">NORMAL BRICKS</div>
                    <div className="text-gray-400">Standard bricks with health numbers</div>
                  </div>
                  <div className="bg-black bg-opacity-40 p-3 rounded">
                    <div className="text-yellow-400 font-bold">⭐ POWER-UP BRICKS</div>
                    <div className="text-gray-400">Gold bricks that drop power-ups</div>
                  </div>
                  <div className="bg-black bg-opacity-40 p-3 rounded">
                    <div className="text-purple-400 font-bold">↔ MOVING BRICKS</div>
                    <div className="text-gray-400">Purple bricks that move horizontally</div>
                  </div>
                  <div className="bg-black bg-opacity-40 p-3 rounded">
                    <div className="text-white font-bold">🛡 ULTRA BRICKS</div>
                    <div className="text-gray-400">White bricks with 50 health</div>
                  </div>
                </div>
              </div>

              {/* Themes */}
              <div className="bg-gray-900 bg-opacity-50 p-4 rounded-lg border-2 border-pink-500">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-6 h-6 text-pink-400" />
                  <h3 className="text-2xl font-bold text-pink-400">COLOR THEMES</h3>
                </div>
                <div className="text-gray-300 text-sm space-y-2">
                  <p>• Themes automatically change every 5 rounds</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                    <div className="bg-gradient-to-r from-cyan-500 to-magenta-500 p-2 rounded text-center font-bold text-black">CYAN</div>
                    <div className="bg-gradient-to-r from-green-500 to-lime-500 p-2 rounded text-center font-bold text-black">NEON GREEN</div>
                    <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-2 rounded text-center font-bold text-black">HOT PINK</div>
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded text-center font-bold text-black">ELECTRIC BLUE</div>
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded text-center font-bold text-black">SUNSET</div>
                  </div>
                </div>
              </div>

              {/* Special Features */}
              <div className="bg-gray-900 bg-opacity-50 p-4 rounded-lg border-2 border-red-500">
                <h3 className="text-2xl font-bold text-red-400 mb-3">SPECIAL FEATURES</h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• <span className="text-red-400 font-bold">ENEMY</span> - Appears at Level 11+ and bounces around the screen</li>
                  <li>• <span className="text-purple-400 font-bold">RECALL BALLS</span> - End round early and reposition balls</li>
                  <li>• <span className="text-green-400 font-bold">MOBILE MODE</span> - Tap to aim, tap again to launch</li>
                  <li>• <span className="text-yellow-400 font-bold">DIFFICULTY</span> - Easy/Normal/Hard affect brick health and speed</li>
                  <li>• <span className="text-cyan-400 font-bold">BALL TRAILS</span> - Visual trails follow the main ball</li>
                </ul>
              </div>

              {/* Shop Info */}
              <div className="bg-gray-900 bg-opacity-50 p-4 rounded-lg border-2 border-yellow-500">
                <h3 className="text-2xl font-bold text-yellow-400 mb-3">🛒 SHOP</h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• <span className="text-yellow-400 font-bold">THEMED BALLS</span> - Cosmetic ball skins (Fire, Ice, Lightning, etc.)</li>
                  <li>• <span className="text-green-400 font-bold">EXTRA LIFE</span> - Removes bottom brick layer when you lose</li>
                  <li>• <span className="text-purple-400 font-bold">PREMIUM PACKS</span> - Purchase with real money for coins or special balls</li>
                </ul>
              </div>
            </div>

            <Button
              onClick={onClose}
              className="w-full mt-6 bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-4 text-lg"
              style={{ fontFamily: '"Courier New", monospace' }}
            >
              ✓ GOT IT!
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}