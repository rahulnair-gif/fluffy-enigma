import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Image as ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function LogoDownload() {
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [error, setError] = useState(null);

  const generateLogo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: 'Bold retro arcade logo design with the text "RETRO SMASH" in large blocky pixel-art style letters. Vibrant cyan and magenta neon colors with a glowing effect. Black background. 1980s arcade game aesthetic with geometric shapes and stars. High contrast, electric energy, retro gaming vibe. Professional logo quality, centered composition.'
      });
      
      if (result.url) {
        setLogoUrl(result.url);
      } else {
        setError('Failed to generate logo');
      }
    } catch (err) {
      setError(err.message || 'Failed to generate logo');
    } finally {
      setLoading(false);
    }
  };

  const downloadLogo = () => {
    if (!logoUrl) return;
    
    const link = document.createElement('a');
    link.href = logoUrl;
    link.download = 'retro-smash-logo.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 text-cyan-500" style={{
            fontFamily: '"Courier New", monospace',
            textShadow: '0 0 20px #00ffff'
          }}>
            RETRO SMASH LOGO
          </h1>
          <p className="text-gray-400" style={{ fontFamily: '"Courier New", monospace' }}>
            Generate and download your game logo
          </p>
        </div>

        <div className="bg-[#0a0a1a] rounded-xl border-4 border-cyan-500 p-8" style={{
          boxShadow: '0 0 40px #00ffff40'
        }}>
          {!logoUrl && !loading && (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-500 mb-6" style={{ fontFamily: '"Courier New", monospace' }}>
                Click the button below to generate your logo
              </p>
              <Button
                onClick={generateLogo}
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-8 py-6 text-xl"
                style={{
                  fontFamily: '"Courier New", monospace',
                  boxShadow: '0 0 20px #00ffff'
                }}
              >
                <ImageIcon className="mr-2" />
                GENERATE LOGO
              </Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-cyan-500 animate-spin" />
              <p className="text-cyan-500" style={{ fontFamily: '"Courier New", monospace' }}>
                Generating your logo...
              </p>
              <p className="text-gray-500 text-sm mt-2" style={{ fontFamily: '"Courier New", monospace' }}>
                This may take 5-10 seconds
              </p>
            </div>
          )}

          {logoUrl && (
            <div className="text-center">
              <div className="mb-6">
                <img 
                  src={logoUrl} 
                  alt="Retro Smash Logo" 
                  className="max-w-full h-auto rounded-lg border-2 border-cyan-500"
                  style={{ boxShadow: '0 0 30px #00ffff80' }}
                />
              </div>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={downloadLogo}
                  className="bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-6 text-xl"
                  style={{
                    fontFamily: '"Courier New", monospace',
                    boxShadow: '0 0 20px #00ff00'
                  }}
                >
                  <Download className="mr-2" />
                  DOWNLOAD
                </Button>
                <Button
                  onClick={() => {
                    setLogoUrl(null);
                    setError(null);
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-6 text-xl"
                  style={{ fontFamily: '"Courier New", monospace' }}
                >
                  REGENERATE
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-4" style={{ fontFamily: '"Courier New", monospace' }}>
                Right-click the image and "Save As" to download
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4" style={{ fontFamily: '"Courier New", monospace' }}>
                ERROR: {error}
              </p>
              <Button
                onClick={generateLogo}
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
                style={{ fontFamily: '"Courier New", monospace' }}
              >
                TRY AGAIN
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}