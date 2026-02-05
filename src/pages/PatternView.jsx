import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Mic, MicOff, Image as ImageIcon, Settings2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from 'framer-motion';

export default function PatternView() {
  const { data } = useParams();
  const [pattern, setPattern] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  const recognitionRef = useRef(null);
  const lastSpokenStepRef = useRef(-1);
  const lastSpokenColorRef = useRef(null);

  // Keep screen awake
  useEffect(() => {
    let wakeLock = null;
    
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.log('Wake lock not supported');
      }
    };
    
    requestWakeLock();
    
    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

  // Fetch pattern data from URL
  useEffect(() => {
    if (data) {
      const patternUrl = decodeURIComponent(data);
      
      fetch(patternUrl)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch pattern');
          return res.json();
        })
        .then(decoded => {
          // Transform compact format to full format
          const fullPattern = {
            image: decoded.img,
            colors: decoded.colors.map(c => ({ name: c.n, hex: c.h, count: c.c, id: c.id })),
            numPins: decoded.pins,
            totalSteps: decoded.total,
            paths: decoded.paths.map(p => ({ from: p.f, to: p.t, color: p.c }))
          };
          setPattern(fullPattern);
          
          // Resume from last step if available
          const savedStep = localStorage.getItem(`pattern_step_${patternUrl}`);
          if (savedStep) {
            setCurrentStep(parseInt(savedStep));
          }
        })
        .catch(e => {
          console.error('Failed to load pattern:', e);
        });
    }
  }, [data]);
  
  // Save progress
  useEffect(() => {
    if (pattern && data) {
      const patternUrl = decodeURIComponent(data);
      localStorage.setItem(`pattern_step_${patternUrl}`, currentStep.toString());
    }
  }, [currentStep, pattern, data]);

  // Auto-play
  useEffect(() => {
    if (isPlaying && pattern && currentStep < pattern.totalSteps) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, speed * 1000);
      
      return () => clearTimeout(timer);
    } else if (currentStep >= pattern?.totalSteps) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStep, pattern, speed]);
  
  // Voice guidance - speak pin numbers
  useEffect(() => {
    if (!voiceEnabled || !pattern || currentStep === 0) return;
    if (lastSpokenStepRef.current === currentStep) return;
    
    const currentPath = pattern.paths[currentStep - 1];
    if (!currentPath) return;
    
    const currentColor = pattern.colors.find(c => c.id === currentPath.color);
    const previousPath = currentStep > 1 ? pattern.paths[currentStep - 2] : null;
    const previousColor = previousPath ? pattern.colors.find(c => c.id === previousPath.color) : null;
    
    let message = '';
    
    // Check if color changed
    if (!previousColor || previousColor.id !== currentColor.id) {
      message = `Change color to ${currentColor.name}. `;
      lastSpokenColorRef.current = currentColor.id;
    }
    
    message += `From pin ${currentPath.from} to pin ${currentPath.to}`;
    
    // Speak the instruction
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      speechSynthesis.speak(utterance);
    }
    
    lastSpokenStepRef.current = currentStep;
  }, [currentStep, pattern, voiceEnabled]);
  
  // Voice commands
  useEffect(() => {
    if (!voiceEnabled || !pattern) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.toLowerCase().trim();
      
      if (command.includes('repeat')) {
        lastSpokenStepRef.current = -1; // Force re-speak
        setCurrentStep(prev => prev);
      } else if (command.includes('next')) {
        setCurrentStep(prev => Math.min(prev + 1, pattern.totalSteps));
      } else if (command.includes('previous') || command.includes('back')) {
        setCurrentStep(prev => Math.max(0, prev - 1));
      } else if (command.includes('pause') || command.includes('stop')) {
        setIsPlaying(false);
      } else if (command.includes('continue') || command.includes('play')) {
        setIsPlaying(true);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [voiceEnabled, pattern]);

  if (!pattern) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#ff6b35] border-t-transparent mx-auto mb-4" />
          <p className="text-white text-lg">Loading pattern...</p>
        </div>
      </div>
    );
  }

  const getCurrentColor = () => {
    if (!pattern.paths[currentStep - 1]) return null;
    const colorId = pattern.paths[currentStep - 1].color;
    return pattern.colors.find(c => c.id === colorId);
  };
  
  const getCurrentPin = () => {
    if (!pattern.paths[currentStep - 1]) return { from: null, to: null };
    const path = pattern.paths[currentStep - 1];
    return { from: path.from, to: path.to };
  };

  const colorChanged = () => {
    if (!pattern || currentStep <= 1) return false;
    const currentPath = pattern.paths[currentStep - 1];
    const previousPath = pattern.paths[currentStep - 2];
    return currentPath && previousPath && currentPath.color !== previousPath.color;
  };

  const currentColor = getCurrentColor();
  const { from, to } = getCurrentPin();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white select-none">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-light tracking-wide">String Art Pattern</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <Settings2 className="w-5 h-5" />
          </Button>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-6 overflow-hidden"
            >
              <div className="space-y-6">
                {/* Preview Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-white/90">Show Preview</Label>
                  <Switch
                    checked={showPreview}
                    onCheckedChange={setShowPreview}
                  />
                </div>
                
                {/* Voice Control */}
                <div className="flex items-center justify-between">
                  <Label className="text-white/90">Voice Guidance</Label>
                  <Switch
                    checked={voiceEnabled}
                    onCheckedChange={setVoiceEnabled}
                  />
                </div>
                
                {/* Speed */}
                <div>
                  <div className="flex justify-between mb-3">
                    <Label className="text-white/90">Auto-play Speed</Label>
                    <span className="text-[#ff6b35] font-medium">{speed}s</span>
                  </div>
                  <Slider
                    value={[speed]}
                    onValueChange={([v]) => setSpeed(v)}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                {/* Voice Commands */}
                {voiceEnabled && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <div className="text-amber-400 text-xs font-medium mb-2">Voice Commands:</div>
                    <div className="text-white/60 text-xs space-y-1">
                      <div>• "Next" - Next step</div>
                      <div>• "Previous" - Previous step</div>
                      <div>• "Repeat" - Repeat instruction</div>
                      <div>• "Play" / "Pause" - Control playback</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview Image - VIEW ONLY, WATERMARKED */}
        <AnimatePresence>
          {showPreview && pattern.image && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="relative">
                <img 
                  src={pattern.image} 
                  alt="String art preview" 
                  className="w-full h-auto pointer-events-none"
                  style={{ touchAction: 'none' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                <div className="absolute top-3 right-3 bg-white/10 backdrop-blur-md rounded-full px-3 py-1">
                  <ImageIcon className="w-4 h-4 text-white/70 inline mr-1" />
                  <span className="text-xs text-white/70">Reference Only</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Step Display - LARGE, HIGH CONTRAST, TOUCH FRIENDLY */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-3xl shadow-2xl p-8 mb-6 border border-white/10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Color Change Alert */}
              {colorChanged() && currentColor && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mb-6 bg-[#ff6b35] rounded-2xl p-4"
                >
                  <div className="text-white text-sm font-medium mb-2">⚠️ CHANGE COLOR</div>
                  <div className="flex items-center justify-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full shadow-lg border-2 border-white"
                      style={{ backgroundColor: currentColor.hex }}
                    />
                    <span className="text-white font-semibold text-lg">{currentColor.name}</span>
                  </div>
                </motion.div>
              )}
              
              {/* Step Number - LARGE */}
              <div className="mb-2">
                <div className="text-white/50 text-sm font-medium tracking-wider uppercase mb-2">Step</div>
                <div className="text-8xl font-bold bg-gradient-to-br from-[#ff6b35] to-[#ff8c5a] bg-clip-text text-transparent">
                  {currentStep}
                </div>
                <div className="text-white/40 text-lg mt-2">
                  of {pattern.totalSteps.toLocaleString()}
                </div>
              </div>
              
              {/* Pin Instructions - CLEAR AND LARGE */}
              {currentStep > 0 && from !== null && to !== null && (
                <div className="mt-8 space-y-6">
                  {/* Current Color Indicator */}
                  {currentColor && (
                    <div className="flex items-center justify-center gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl shadow-2xl border-4 border-white/20"
                        style={{ backgroundColor: currentColor.hex }}
                      />
                      <div className="text-left">
                        <div className="text-white/50 text-xs uppercase tracking-wider">Thread Color</div>
                        <div className="text-white text-2xl font-semibold">{currentColor.name}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Pin Direction - LARGE AND CLEAR */}
                  <div className="bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <div className="text-white/50 text-xs uppercase tracking-wider mb-2">From Pin</div>
                        <div className="text-5xl font-bold text-white">{from}</div>
                      </div>
                      
                      <div className="text-4xl text-[#ff6b35]">→</div>
                      
                      <div className="text-center">
                        <div className="text-white/50 text-xs uppercase tracking-wider mb-2">To Pin</div>
                        <div className="text-5xl font-bold text-[#ff6b35]">{to}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {currentStep === 0 && (
                <div className="mt-6 text-white/60 text-lg">
                  Press Play to start
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          
          {/* Progress Bar */}
          <div className="mt-8">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#ff6b35] to-[#ff8c5a]"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / pattern.totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-white/40">
              <span>{((currentStep / pattern.totalSteps) * 100).toFixed(1)}%</span>
              <span>{(pattern.totalSteps - currentStep).toLocaleString()} remaining</span>
            </div>
          </div>
        </div>

        {/* Controls - FIXED AT BOTTOM, TOUCH FRIENDLY */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent backdrop-blur-lg border-t border-white/10 p-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
              >
                <SkipBack className="w-6 h-6" />
              </Button>
              
              <Button
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={currentStep >= pattern.totalSteps}
                className="h-20 w-20 rounded-full bg-gradient-to-br from-[#ff6b35] to-[#ff8c5a] hover:from-[#e55a2b] hover:to-[#ff7a45] shadow-2xl shadow-[#ff6b35]/50"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentStep(Math.min(pattern.totalSteps, currentStep + 1))}
                disabled={currentStep >= pattern.totalSteps}
                className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
              >
                <SkipForward className="w-6 h-6" />
              </Button>
            </div>
            
            {/* Voice Indicator */}
            {voiceEnabled && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2">
                  <Mic className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-xs font-medium">Voice Guidance Active</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}