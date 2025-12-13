import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          onClick={() => navigate(-1)}
          className="mb-6 bg-cyan-500 hover:bg-cyan-600 text-black"
          style={{ fontFamily: '"Courier New", monospace' }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          BACK TO GAME
        </Button>

        <div style={{ fontFamily: '"Courier New", monospace' }}>
          <h1 className="text-4xl font-bold mb-8 text-cyan-500" style={{
            textShadow: '0 0 20px #00ffff'
          }}>
            PRIVACY POLICY
          </h1>

          <div className="space-y-6 text-gray-300 text-sm">
            <p className="text-gray-400">
              Last Updated: December 12, 2025
            </p>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-3">1. Introduction</h2>
              <p>
                Welcome to Retro Smash ("the Game"). This Privacy Policy explains how we collect, use, and protect your information when you play our game.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-3">2. Information We Collect</h2>
              <h3 className="text-xl font-bold text-yellow-400 mb-2">2.1 Information You Provide</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li><strong>Player Name:</strong> When you submit scores to the leaderboard</li>
                <li><strong>Payment Information:</strong> When purchasing coin packs through Stripe (credit card details are handled securely by Stripe and never stored by us)</li>
                <li><strong>Email:</strong> If you create an account</li>
              </ul>

              <h3 className="text-xl font-bold text-yellow-400 mb-2 mt-4">2.2 Automatically Collected Information</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li><strong>Game Progress:</strong> High scores, levels reached, achievements, coins earned</li>
                <li><strong>Local Storage Data:</strong> Game settings, owned items, and preferences stored on your device</li>
                <li><strong>Gameplay Statistics:</strong> Bricks destroyed, power-ups collected, games played</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-3">3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc ml-6 space-y-2 mt-2">
                <li>Maintain leaderboards and track high scores</li>
                <li>Process in-game purchases through Stripe</li>
                <li>Save your game progress and settings</li>
                <li>Track achievements and statistics</li>
                <li>Improve game features and user experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-3">4. Data Storage</h2>
              <h3 className="text-xl font-bold text-yellow-400 mb-2">4.1 Local Storage</h3>
              <p>
                Most game data is stored locally on your device using browser local storage, including:
              </p>
              <ul className="list-disc ml-6 space-y-2 mt-2">
                <li>High scores</li>
                <li>Coins and earned coins</li>
                <li>Purchased items</li>
                <li>Game settings and preferences</li>
                <li>Selected ball themes</li>
              </ul>

              <h3 className="text-xl font-bold text-yellow-400 mb-2 mt-4">4.2 Server Storage</h3>
              <p>
                The following data is stored on our servers:
              </p>
              <ul className="list-disc ml-6 space-y-2 mt-2">
                <li>Leaderboard entries (player name, score, level)</li>
                <li>Player statistics (if logged in)</li>
                <li>Achievements (if logged in)</li>
                <li>Custom levels created in the Level Editor</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-3">5. Payment Processing</h2>
              <p>
                All payment transactions are processed securely by Stripe. We do not store your credit card information. Stripe's privacy policy applies to payment processing: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">https://stripe.com/privacy</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-3">6. Data Sharing</h2>
              <p>
                We do not sell, trade, or share your personal information with third parties except:
              </p>
              <ul className="list-disc ml-6 space-y-2 mt-2">
                <li>With Stripe for payment processing</li>
                <li>When required by law</li>
                <li>Leaderboard information (player names and scores) is publicly visible to other players</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-3">7. Children's Privacy</h2>
              <p>
                Our game is suitable for all ages. We do not knowingly collect personal information from children under 13 without parental consent. If you are a parent and believe your child has provided us with personal information, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-3">8. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc ml-6 space-y-2 mt-2">
                <li>Clear your local game data by clearing browser storage</li>
                <li>Request deletion of your server-stored data</li>
                <li>Access your personal information</li>
                <li>Opt out of leaderboard participation by not submitting scores</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-3">9. Cookies and Tracking</h2>
              <p>
                We use browser local storage (not cookies) to save your game progress. We do not use tracking technologies or analytics services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-3">10. Security</h2>
              <p>
                We implement reasonable security measures to protect your information. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-3">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last Updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-3">12. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, please contact us through the game's support channels.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-6 border-t-2 border-cyan-500">
            <p className="text-center text-gray-500 text-xs">
              © 2025 Retro Smash. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}