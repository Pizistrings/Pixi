import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Home, Mic, MicOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function LiveView() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(5);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceDelay, setVoiceDelay] = useState(3);
  const [pattern, setPattern] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const animationRef = useRef(null);
  const recognitionRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Load pattern from localStorage (set from StringArt page)
  useEffect(() => {
    const loadPattern = () => {
      try {
        const savedPattern = localStorage.getItem('currentPattern');
        if (savedPattern) {
          const data = JSON.parse(savedPattern);
          setPattern(data);
          
          // Restore last step
          const lastStep = parseInt(localStorage.getItem('liveViewStep') || '0');
          setCurrentStep(lastStep);
        }
      } catch (error) {
        console.error('Failed to load pattern:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPattern();
  }, []);

  // Save current step
  useEffect(() => {
    if (pattern) {
      localStorage.setItem('liveViewStep', currentStep.toString());
    }
  }, [currentStep, pattern]);

  // Animation loop
  useEffect(() => {
    if (isPlaying && pattern && currentStep < pattern.totalSteps) {
      const interval = Math.max(1, 1000 / speed);
      animationRef.current = setTimeout(() => {
        setCurrentStep(prev => Math.min(prev + 1, pattern.totalSteps));
      }, interval);
    } else if (currentStep >= pattern?.totalSteps) {
      setIsPlaying(false);
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isPlaying, currentStep, pattern, speed]);

  // Voice guidance
  useEffect(() => {
    if (!voiceEnabled || !pattern || currentStep === 0) return;

    const path = pattern.paths[currentStep - 1];
    if (!path) return;

    const currentColor = pattern.colors.find(c => c.id === path.c);
    let message = `Pin ${path.t}`;

    // Check if color is changing
    if (currentStep > 1) {
      const prevPath = pattern.paths[currentStep - 2];
      if (prevPath.c !== path.c && currentColor) {
        message = `Change to ${currentColor.n}. Pin ${path.t}`;
      }
    }

    if ('speechSynthesis' in window) {
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 1.0;
        speechSynthesis.speak(utterance);
      }, voiceDelay * 1000);
    }
  }, [voiceEnabled, currentStep, pattern, voiceDelay]);

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

      if (command.includes('next')) {
        setCurrentStep(prev => Math.min(prev + 1, pattern.totalSteps));
      } else if (command.includes('previous') || command.includes('back')) {
        setCurrentStep(prev => Math.max(prev - 1, 0));
      } else if (command.includes('repeat')) {
        const path = pattern.paths[currentStep - 1];
        if (path && 'speechSynthesis' in window) {
          const message = `Pin ${path.t}`;
          const utterance = new SpeechSynthesisUtterance(message);
          speechSynthesis.speak(utterance);
        }
      } else if (command.includes('play')) {
        setIsPlaying(true);
      } else if (command.includes('pause') || command.includes('stop')) {
        setIsPlaying(false);
      } else if (command.includes('reset')) {
        setCurrentStep(0);
        setIsPlaying(false);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [voiceEnabled, currentStep, pattern]);

  // Wake lock
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.log('Wake lock error:', err);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading pattern...</p>
        </div>
      </div>
    );
  }

  if (!pattern) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">No Pattern Found</h2>
          <p className="text-gray-600 mb-6">Generate a pattern first to use Live View</p>
          <Link to={createPageUrl('StringArt')}>
            <Button className="bg-[#ff6b35] hover:bg-[#e55a2b]">
              <Home className="w-4 h-4 mr-2" />
              Go to Generator
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const currentPath = pattern.paths[currentStep - 1];
  const currentColor = currentPath ? pattern.colors.find(c => c.id === currentPath.c) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to={createPageUrl('StringArt')}>
            <Button variant="ghost" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Live View</h1>
          <div className="w-20" /> {/* Spacer */}
        </div>

        {/* Current Step Display */}
        <Card className="bg-white border-0 shadow-sm p-8 mb-6">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">Step</div>
            <motion.div
              key={currentStep}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-8xl font-light text-gray-900 mb-4"
            >
              {currentStep}
            </motion.div>
            <div className="text-sm text-gray-400">
              of {pattern.totalSteps.toLocaleString()}
            </div>
          </div>

          {currentPath && (
            <motion.div
              key={`${currentStep}-info`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 pt-6 border-t border-gray-100"
            >
              {/* Color indicator */}
              {currentColor && (
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div
                    className="w-12 h-12 rounded-full shadow-lg"
                    style={{ backgroundColor: currentColor.h }}
                  />
                  <div>
                    <div className="text-xs text-gray-500">Color</div>
                    <div className="text-lg font-medium text-gray-900">{currentColor.n}</div>
                  </div>
                </div>
              )}

              {/* Pin numbers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">From Pin</div>
                  <div className="text-3xl font-semibold text-gray-700">{currentPath.f}</div>
                </div>
                <div className="text-center p-4 bg-[#ff6b35] bg-opacity-10 rounded-lg">
                  <div className="text-xs text-[#ff6b35] mb-1">To Pin</div>
                  <div className="text-3xl font-semibold text-[#ff6b35]">{currentPath.t}</div>
                </div>
              </div>
            </motion.div>
          )}
        </Card>

        {/* Progress */}
        <Card className="bg-white border-0 shadow-sm p-4 mb-6">
          <div className="mb-2">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ff6b35] transition-all duration-300"
                style={{ width: `${(currentStep / pattern.totalSteps) * 100}%` }}
              />
            </div>
          </div>
          <Slider
            value={[currentStep]}
            onValueChange={([v]) => {
              setCurrentStep(v);
              setIsPlaying(false);
            }}
            min={0}
            max={pattern.totalSteps}
            step={1}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{currentStep.toLocaleString()}</span>
            <span>{Math.round((currentStep / pattern.totalSteps) * 100)}%</span>
            <span>{pattern.totalSteps.toLocaleString()}</span>
          </div>
        </Card>

        {/* Controls */}
        <Card className="bg-white border-0 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setCurrentStep(0);
                setIsPlaying(false);
              }}
              className="h-12 w-12"
            >
              <SkipBack className="w-5 h-5" />
            </Button>

            <Button
              size="icon"
              onClick={() => {
                if (currentStep >= pattern.totalSteps) {
                  setCurrentStep(0);
                }
                setIsPlaying(!isPlaying);
              }}
              className="h-16 w-16 bg-[#ff6b35] hover:bg-[#e55a2b]"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 ml-1" />
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentStep(pattern.totalSteps)}
              className="h-12 w-12"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Speed */}
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-sm">Speed</Label>
                <span className="text-sm text-gray-600">{speed}x</span>
              </div>
              <Select value={speed.toString()} onValueChange={(v) => setSpeed(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="3">3x</SelectItem>
                  <SelectItem value="5">5x</SelectItem>
                  <SelectItem value="10">10x</SelectItem>
                  <SelectItem value="25">25x</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Voice */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {voiceEnabled ? <Mic className="w-4 h-4 text-[#ff6b35]" /> : <MicOff className="w-4 h-4 text-gray-400" />}
                <span className="text-sm font-medium">Voice Guide</span>
              </div>
              <Button
                variant={voiceEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={voiceEnabled ? "bg-[#ff6b35] hover:bg-[#e55a2b]" : ""}
              >
                {voiceEnabled ? 'On' : 'Off'}
              </Button>
            </div>

            {voiceEnabled && (
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-xs text-gray-500">Voice Delay</Label>
                  <span className="text-xs text-gray-600">{voiceDelay}s</span>
                </div>
                <Slider
                  value={[voiceDelay]}
                  onValueChange={([v]) => setVoiceDelay(v)}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Voice Commands */}
        {voiceEnabled && (
          <Card className="bg-blue-50 border-blue-200 p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Voice Commands</h3>
            <div className="text-xs text-blue-800 space-y-1">
              <p>• "Next" - Next step</p>
              <p>• "Previous" / "Back" - Previous step</p>
              <p>• "Repeat" - Repeat current pin</p>
              <p>• "Play" - Start auto-play</p>
              <p>• "Pause" / "Stop" - Pause</p>
              <p>• "Reset" - Go to start</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}