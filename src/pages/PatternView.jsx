import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from 'framer-motion';

export default function PatternView() {
  const { data } = useParams();
  const [pattern, setPattern] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceDelay, setVoiceDelay] = useState(3);
  const [showPreview, setShowPreview] = useState(true);
  const [lastAnnouncedStep, setLastAnnouncedStep] = useState(-1);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (data) {
      const patternUrl = decodeURIComponent(data);
      console.log('Loading pattern from:', patternUrl);
      
      fetch(patternUrl)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch pattern');
          return res.json();
        })
        .then(decoded => {
          console.log('Pattern loaded:', decoded);
          const fullPattern = {
            image: decoded.img,
            colors: decoded.colors.map(c => ({ name: c.n, hex: c.h, count: c.c, id: c.id })),
            numPins: decoded.pins,
            totalSteps: decoded.total,
            paths: decoded.paths.map(p => ({ from: p.f, to: p.t, color: p.c }))
          };
          setPattern(fullPattern);
          
          const savedStep = localStorage.getItem('stringArtStep');
          if (savedStep) {
            setCurrentStep(parseInt(savedStep));
          }
        })
        .catch(e => {
          console.error('Failed to load pattern data:', e);
          alert('Failed to load pattern. The link may be invalid or expired.');
        });
    }
  }, [data]);

  useEffect(() => {
    if (pattern && currentStep > 0) {
      localStorage.setItem('stringArtStep', currentStep.toString());
    }
  }, [currentStep, pattern]);

  useEffect(() => {
    if (!voiceEnabled || !pattern || currentStep === lastAnnouncedStep || currentStep === 0) return;
    
    const announcementTimer = setTimeout(() => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        const currentPath = pattern.paths[currentStep - 1];
        if (!currentPath) return;
        
        const currentColor = pattern.colors.find(c => c.id === currentPath.color);
        const previousPath = pattern.paths[currentStep - 2];
        
        let text = '';
        
        if (!previousPath || previousPath.color !== currentPath.color) {
          text = `Change color to ${currentColor?.name || 'unknown'}. `;
        }
        
        text += `From pin ${currentPath.from} to pin ${currentPath.to}`;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        
        setLastAnnouncedStep(currentStep);
      }
    }, voiceDelay * 1000);
    
    return () => clearTimeout(announcementTimer);
  }, [currentStep, voiceEnabled, voiceDelay, pattern, lastAnnouncedStep]);

  useEffect(() => {
    let wakeLock = null;
    
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.log('Wake lock failed:', err);
      }
    };
    
    requestWakeLock();
    
    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying && pattern && currentStep < pattern.totalSteps) {
      const interval = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 1000 / speed);
      return () => clearTimeout(interval);
    } else if (currentStep >= pattern.totalSteps) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStep, pattern, speed]);

  if (!pattern) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pattern...</p>
        </div>
      </div>
    );
  }

  const currentPath = pattern.paths[currentStep - 1];
  const currentColor = currentPath ? pattern.colors.find(c => c.id === currentPath.color) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 touch-manipulation select-none">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="text-lg font-semibold text-gray-900">String Art Guide</h1>
              <p className="text-xs text-gray-500">{pattern.numPins} pins • {pattern.colors.length} colors</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`rounded-full ${voiceEnabled ? 'bg-[#ff6b35] text-white' : ''}`}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Preview Toggle */}
        {showPreview && (
          <motion.div
            initial={{ height: 'auto' }}
            animate={{ height: 'auto' }}
            className="bg-white border-b border-gray-200 overflow-hidden"
          >
            <div className="relative">
              <img
                src={pattern.image}
                alt="String Art Preview"
                className="w-full h-auto opacity-80"
                style={{ touchAction: 'none', pointerEvents: 'none' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              <div className="absolute top-2 right-2 bg-black/20 text-white text-xs px-2 py-1 rounded">
                Reference Only
              </div>
            </div>
          </motion.div>
        )}

        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full bg-gray-100 py-2 flex items-center justify-center gap-2 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
        >
          {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>

        {/* Main Content */}
        <div className="p-4 space-y-4">
          {/* Current Step Card */}
          <Card className="bg-white shadow-lg border-2 border-[#ff6b35]/20">
            <div className="p-6">
              {/* Progress */}
              <div className="mb-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#ff6b35]"
                    animate={{ width: `${(currentStep / pattern.totalSteps) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span className="font-medium text-[#ff6b35]">Step {currentStep}</span>
                  <span>{pattern.totalSteps.toLocaleString()} total</span>
                </div>
              </div>

              {/* Color Indicator */}
              {currentColor && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentColor.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-white rounded-xl border border-orange-200"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full shadow-lg border-4 border-white"
                        style={{ backgroundColor: currentColor.hex }}
                      />
                      <div>
                        <div className="text-lg font-bold text-gray-900">{currentColor.name}</div>
                        <div className="text-xs text-gray-500">Current thread color</div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Pin Instructions */}
              {currentPath && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="bg-gray-50 rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-500 mb-2">FROM PIN</div>
                        <div className="text-5xl font-bold text-gray-900">{currentPath.from}</div>
                      </div>
                      <div className="text-4xl text-[#ff6b35] font-bold">→</div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-500 mb-2">TO PIN</div>
                        <div className="text-5xl font-bold text-[#ff6b35]">{currentPath.to}</div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              {currentStep === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-lg mb-2">Ready to start</p>
                  <p className="text-sm">Tap Next to begin</p>
                </div>
              )}
            </div>
          </Card>

          {/* Controls */}
          <Card className="bg-white shadow-md">
            <div className="p-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="h-14 w-14 rounded-full shadow-sm"
                >
                  <SkipBack className="w-6 h-6" />
                </Button>

                <Button
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-[#ff6b35] hover:bg-[#e55a2b] h-16 w-16 rounded-full shadow-lg"
                >
                  {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentStep(Math.min(pattern.totalSteps, currentStep + 1))}
                  disabled={currentStep >= pattern.totalSteps}
                  className="h-14 w-14 rounded-full shadow-sm"
                >
                  <SkipForward className="w-6 h-6" />
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Playback Speed</span>
                  <div className="flex gap-1">
                    {[1, 5, 10, 25].map(s => (
                      <Button
                        key={s}
                        variant={speed === s ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSpeed(s)}
                        className={`text-xs h-8 px-3 ${speed === s ? 'bg-[#ff6b35] hover:bg-[#e55a2b]' : ''}`}
                      >
                        {s}x
                      </Button>
                    ))}
                  </div>
                </div>

                {voiceEnabled && (
                  <div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-gray-600">Voice Delay</span>
                      <span className="text-gray-900 font-medium">{voiceDelay}s</span>
                    </div>
                    <Slider
                      value={[voiceDelay]}
                      onValueChange={([v]) => setVoiceDelay(v)}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Voice Guide Info */}
          {voiceEnabled && (
            <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="w-5 h-5 text-[#ff6b35]" />
                  <h3 className="font-semibold text-gray-900">Voice Guide Active</h3>
                </div>
                <p className="text-sm text-gray-700 mb-2">
                  Voice will announce color changes and pin numbers with {voiceDelay}s delay
                </p>
                <div className="text-xs text-gray-600 space-y-1 bg-white/50 rounded p-2">
                  <p>• Color changes are announced first</p>
                  <p>• Then "From pin X to pin Y"</p>
                  <p>• Progress saved automatically</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}