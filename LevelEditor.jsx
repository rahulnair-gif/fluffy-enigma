import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Save, Play, Trash2, Grid } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function LevelEditor({ isOpen, onClose, onPlayLevel }) {
  const [editorMode, setEditorMode] = useState('create'); // 'create' or 'browse'
  const [levelName, setLevelName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [bricks, setBricks] = useState([]);
  const [selectedBrickType, setSelectedBrickType] = useState('normal');
  const [gridSize] = useState({ cols: 7, rows: 8 });
  const queryClient = useQueryClient();

  const { data: customLevels = [] } = useQuery({
    queryKey: ['customLevels'],
    queryFn: async () => {
      return await base44.entities.CustomLevel.list('-created_date', 20);
    },
    enabled: editorMode === 'browse'
  });

  const saveLevelMutation = useMutation({
    mutationFn: async (levelData) => {
      return await base44.entities.CustomLevel.create(levelData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customLevels'] });
      setLevelName('');
      setDescription('');
      setBricks([]);
      setEditorMode('browse');
    }
  });

  const likeLevelMutation = useMutation({
    mutationFn: async ({ id, likes }) => {
      return await base44.entities.CustomLevel.update(id, { likes: likes + 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customLevels'] });
    }
  });

  const deleteLevelMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.CustomLevel.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customLevels'] });
    }
  });

  const brickTypes = [
    { id: 'normal', name: 'Normal', color: '#00ffff', health: 5 },
    { id: 'powerup', name: 'Power-Up', color: '#ffd700', health: 3 },
    { id: 'moving', name: 'Moving', color: '#ff00ff', health: 5 },
    { id: 'ultra', name: 'Ultra', color: '#ffffff', health: 10 }
  ];

  const toggleBrick = (row, col) => {
    const existingIndex = bricks.findIndex(b => b.row === row && b.col === col);
    if (existingIndex >= 0) {
      setBricks(bricks.filter((_, i) => i !== existingIndex));
    } else {
      const type = brickTypes.find(t => t.id === selectedBrickType);
      setBricks([...bricks, {
        row,
        col,
        type: selectedBrickType,
        health: type.health,
        color: type.color
      }]);
    }
  };

  const handleSave = () => {
    if (!levelName.trim()) return;
    
    saveLevelMutation.mutate({
      level_name: levelName,
      description: description,
      brick_layout: JSON.stringify(bricks),
      difficulty: difficulty
    });
  };

  const handlePlayCustomLevel = (level) => {
    try {
      const layout = JSON.parse(level.brick_layout);
      onPlayLevel(layout);
      onClose();
    } catch (err) {
      console.error('Failed to load level:', err);
    }
  };

  const getBrickAtPosition = (row, col) => {
    return bricks.find(b => b.row === row && b.col === col);
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
            className="bg-[#0a0a1a] rounded-xl border-4 border-purple-500 p-6 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto"
            style={{
              boxShadow: '0 0 40px #ff00ff80',
              fontFamily: '"Courier New", monospace'
            }}
          >
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-purple-500 hover:text-purple-400"
            >
              <X className="h-6 w-6" />
            </Button>

            <h2 className="text-4xl font-bold text-purple-500 tracking-wider mb-6 text-center" style={{
              textShadow: '0 0 10px #ff00ff'
            }}>
              🎨 LEVEL EDITOR
            </h2>

            <div className="flex gap-2 mb-6">
              <Button
                onClick={() => setEditorMode('create')}
                className={`flex-1 ${editorMode === 'create' ? 'bg-purple-500' : 'bg-gray-700'} text-white`}
              >
                <Grid className="mr-2 h-4 w-4" />
                CREATE
              </Button>
              <Button
                onClick={() => setEditorMode('browse')}
                className={`flex-1 ${editorMode === 'browse' ? 'bg-purple-500' : 'bg-gray-700'} text-white`}
              >
                <Play className="mr-2 h-4 w-4" />
                BROWSE LEVELS
              </Button>
            </div>

            {editorMode === 'create' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">LEVEL NAME</label>
                    <Input
                      value={levelName}
                      onChange={(e) => setLevelName(e.target.value)}
                      placeholder="Enter level name"
                      className="bg-gray-900 border-purple-500 text-white"
                      maxLength={30}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">DIFFICULTY</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full p-2 bg-gray-900 border-2 border-purple-500 rounded text-white"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">DESCRIPTION</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your level..."
                    className="bg-gray-900 border-purple-500 text-white h-20"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">BRICK TYPE</label>
                  <div className="grid grid-cols-4 gap-2">
                    {brickTypes.map(type => (
                      <Button
                        key={type.id}
                        onClick={() => setSelectedBrickType(type.id)}
                        className={`${selectedBrickType === type.id ? 'ring-2 ring-white' : ''}`}
                        style={{ backgroundColor: type.color, color: '#000' }}
                      >
                        {type.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">CLICK TO PLACE/REMOVE BRICKS</label>
                  <div className="bg-gray-900 p-4 rounded-lg border-2 border-purple-500">
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)` }}>
                      {Array.from({ length: gridSize.rows }).map((_, row) =>
                        Array.from({ length: gridSize.cols }).map((_, col) => {
                          const brick = getBrickAtPosition(row, col);
                          return (
                            <button
                              key={`${row}-${col}`}
                              onClick={() => toggleBrick(row, col)}
                              className="aspect-[2/1] border border-gray-700 hover:border-purple-500 transition-all rounded"
                              style={{
                                backgroundColor: brick ? brick.color : '#1a1a1a'
                              }}
                            >
                              {brick && <span className="text-xs text-black font-bold">{brick.health}</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setBricks([])}
                    variant="outline"
                    className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    CLEAR
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!levelName.trim() || bricks.length === 0 || saveLevelMutation.isPending}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    SAVE LEVEL
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {customLevels.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No custom levels yet. Create one!
                  </div>
                ) : (
                  customLevels.map(level => (
                    <div
                      key={level.id}
                      className="p-4 bg-gray-900 bg-opacity-50 rounded-lg border-2 border-purple-500"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-purple-400">{level.level_name}</h3>
                          <p className="text-sm text-gray-400">{level.description}</p>
                          <div className="flex gap-3 mt-2 text-xs text-gray-500">
                            <span>Difficulty: {level.difficulty}</span>
                            <span>👍 {level.likes}</span>
                            <span>▶ {level.plays} plays</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => likeLevelMutation.mutate({ id: level.id, likes: level.likes })}
                            size="sm"
                            variant="outline"
                            className="border-purple-500 text-purple-500"
                          >
                            👍
                          </Button>
                          <Button
                            onClick={() => handlePlayCustomLevel(level)}
                            size="sm"
                            className="bg-purple-500 hover:bg-purple-600"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}