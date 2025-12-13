import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, ShoppingCart, Coins, CreditCard, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Shop({ isOpen, onClose, coins, onPurchase, ownedItems }) {
  const [selectedCategory, setSelectedCategory] = useState('balls');
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPremiumPack, setSelectedPremiumPack] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [processing, setProcessing] = useState(false);

  const shopItems = {
    balls: [
      { id: 'fire_ball', name: 'Fire Ball', price: 500, color: '#ff4500', icon: '🔥', gradient: 'from-red-500 to-orange-500' },
      { id: 'ice_ball', name: 'Ice Ball', price: 500, color: '#00bfff', icon: '❄️', gradient: 'from-cyan-400 to-blue-500' },
      { id: 'lightning_ball', name: 'Lightning Ball', price: 750, color: '#ffff00', icon: '⚡', gradient: 'from-yellow-400 to-yellow-600' },
      { id: 'shadow_ball', name: 'Shadow Ball', price: 750, color: '#4b0082', icon: '🌑', gradient: 'from-purple-900 to-black' },
      { id: 'rainbow_ball', name: 'Rainbow Ball', price: 1000, color: '#ff00ff', icon: '🌈', gradient: 'from-pink-500 via-purple-500 to-cyan-500' },
      { id: 'galaxy_ball', name: 'Galaxy Ball', price: 1500, color: '#8b00ff', icon: '🌌', gradient: 'from-indigo-900 via-purple-600 to-pink-500' },
      { id: 'golden_ball', name: 'Golden Ball', price: 2000, color: '#ffd700', icon: '👑', gradient: 'from-yellow-400 to-yellow-600' },
      { id: 'diamond_ball', name: 'Diamond Ball', price: 3000, color: '#b9f2ff', icon: '💎', gradient: 'from-cyan-200 to-blue-300' },
    ],
    powerups: [
      { id: 'extra_life', name: 'Extra Life', price: 300, icon: '💚', description: 'Removes bottom brick layer when you lose', stackable: true },
    ],
    premium: [
    { id: 'starter_pack', name: 'Starter Pack', price: 1.99, icon: '🪙', description: 'Get 500 in-game coins', quantity: 500, itemType: 'coins' },
    { id: 'coin_booster', name: 'Coin Booster Pack', price: 4.99, icon: '💰', description: 'Get 1000 in-game coins', quantity: 1000, itemType: 'coins' },
    { id: 'ultimate_pack', name: 'Ultimate Pack', price: 9.99, icon: '👑', description: 'Get 2500 in-game coins', quantity: 2500, itemType: 'coins' },
    ]
  };

  const handlePurchase = (item) => {
    if (coins >= item.price) {
      onPurchase(item);
    }
  };

  const isOwned = (itemId) => {
    return ownedItems?.some(i => i.id === itemId);
  };

  const getExtraLifeCount = () => {
    const lifeItem = ownedItems?.find(i => i.id === 'extra_life');
    return lifeItem?.quantity || 0;
  };

  const handlePremiumPurchase = async (pack) => {
    setProcessing(true);
    
    try {
      const { data } = await base44.functions.invoke('createCheckout', {
        itemId: pack.id,
        coins: pack.quantity || 0
      });
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  const getBallPackCount = (packId) => {
    const pack = ownedItems?.find(i => i.id === packId);
    return pack?.quantity || 0;
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
            className="bg-[#0a0a1a] rounded-xl border-4 border-yellow-500 p-6 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto"
            style={{
              boxShadow: '0 0 40px #ffd70080',
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

            <div className="mb-6">
              <h2 className="text-4xl font-bold text-yellow-500 tracking-wider mb-4" style={{
                textShadow: '0 0 10px #ffd700'
              }}>
                <ShoppingCart className="inline-block mr-2 mb-1" />
                SHOP
              </h2>
              <div className="flex items-center gap-2 text-2xl font-bold text-green-400">
                <Coins className="w-6 h-6" />
                <span>{coins.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
              <Button
                onClick={() => setSelectedCategory('balls')}
                className={`font-bold ${
                  selectedCategory === 'balls'
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                style={{ fontFamily: '"Courier New", monospace' }}
              >
                THEMED BALLS
              </Button>
              <Button
                onClick={() => setSelectedCategory('powerups')}
                className={`font-bold ${
                  selectedCategory === 'powerups'
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                style={{ fontFamily: '"Courier New", monospace' }}
              >
                POWER-UPS
              </Button>
              <Button
                onClick={() => setSelectedCategory('premium')}
                className={`font-bold ${
                  selectedCategory === 'premium'
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                style={{ fontFamily: '"Courier New", monospace' }}
              >
                💳 PREMIUM PACKS
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shopItems[selectedCategory].map((item) => {
                const owned = isOwned(item.id);
                const canAfford = selectedCategory === 'premium' ? true : coins >= item.price;
                const isLife = item.id === 'extra_life';
                const lifeCount = isLife ? getExtraLifeCount() : 0;
                const isPremium = selectedCategory === 'premium';
                const packCount = isPremium ? getBallPackCount(item.id) : 0;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border-2 ${
                      owned && !item.stackable
                        ? 'bg-green-900 bg-opacity-30 border-green-500'
                        : isPremium
                        ? 'bg-purple-900 bg-opacity-20 border-purple-500'
                        : 'bg-gray-900 bg-opacity-50 border-gray-700'
                    }`}
                  >
                    {selectedCategory === 'balls' && (
                      <div className={`w-16 h-16 rounded-full mx-auto mb-3 bg-gradient-to-br ${item.gradient} flex items-center justify-center text-3xl`}>
                        {item.icon}
                      </div>
                    )}
                    
                    {(selectedCategory === 'powerups' || selectedCategory === 'premium') && (
                      <div className="text-5xl text-center mb-3">{item.icon}</div>
                    )}

                    <h3 className="text-lg font-bold text-cyan-400 text-center mb-2">
                      {item.name}
                    </h3>

                    {item.description && (
                      <p className="text-xs text-gray-400 text-center mb-3">
                        {item.description}
                      </p>
                    )}

                    {isLife && lifeCount > 0 && (
                      <div className="text-center text-green-400 text-sm mb-2">
                        Owned: {lifeCount}
                      </div>
                    )}

                    {isPremium && packCount > 0 && (
                      <div className="text-center text-green-400 text-sm mb-2">
                        Owned: {packCount} balls
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-2 mb-3">
                      {isPremium ? (
                        <>
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <span className="text-xl font-bold text-green-400">
                            ${item.price.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-4 h-4 text-yellow-500" />
                          <span className="text-xl font-bold text-yellow-400">
                            {item.price.toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>

                    {owned && !item.stackable ? (
                      <Button
                        disabled
                        className="w-full bg-green-700 text-white font-bold cursor-not-allowed"
                        style={{ fontFamily: '"Courier New", monospace' }}
                      >
                        ✓ OWNED
                      </Button>
                    ) : isPremium ? (
                     <Button
                       onClick={() => handlePremiumPurchase(item)}
                       disabled={processing}
                       className="w-full font-bold bg-green-600 hover:bg-green-700 text-white"
                       style={{ fontFamily: '"Courier New", monospace' }}
                     >
                       <CreditCard className="mr-2 w-4 h-4" />
                       {processing ? 'REDIRECTING...' : 'BUY NOW'}
                     </Button>
                    ) : (
                      <Button
                        onClick={() => handlePurchase(item)}
                        disabled={!canAfford}
                        className={`w-full font-bold ${
                          canAfford
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                        style={{ fontFamily: '"Courier New", monospace' }}
                      >
                        {canAfford ? 'BUY' : 'NOT ENOUGH COINS'}
                      </Button>
                    )}
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