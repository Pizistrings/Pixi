import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Home, Mic, MicOff, Download, Video } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import StringArtCanvas from '@/components/string-art/StringArtCanvas';
import { toast } from 'sonner';

export default function LiveView() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(5);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceDelay, setVoiceDelay] = useState(3);
  const [pattern, setPattern] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [showCanvas, setShowCanvas] = useState(true);
  
  const animationRef = useRef(null);
  const recognitionRef = useRef(null);
  const wakeLockRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Load pattern from localStorage or URL hash
  useEffect(() => {
    const loadPattern = async () => {
      try {
        // Check URL hash for shared pattern
        const hash = window.location.hash;
        if (hash.startsWith('#pattern/')) {
          const patternUrl = decodeURIComponent(hash.replace('#pattern/', ''));
          const response = await fetch(patternUrl);
          const data = await response.json();
          
          // Convert compact format to full format if needed
          const fullPattern = {
            paths: data.paths?.map(p => ({ f: p.f, t: p.t, c: p.c })) || [],
            colors: data.colors?.map(c => ({ n: c.n, h: c.h, c: c.c, id: c.id })) || [],
            pins: data.pins || 370,
            totalSteps: data.total || data.totalSteps || data.paths?.length || 0
          };
          setPattern(fullPattern);
        } else {
          // Load from localStorage
          const savedPattern = localStorage.getItem('currentPattern');
          if (savedPattern) {
            const data = JSON.parse(savedPattern);
            setPattern(data);
            
            // Restore last step
            const lastStep = parseInt(localStorage.getItem('liveViewStep') || '0');
            setCurrentStep(lastStep);
          }
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
    } else if (pattern && currentStep >= pattern.totalSteps) {
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

    const message = `${path.t}`;

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

      if (command.includes('next') && pattern) {
        setCurrentStep(prev => Math.min(prev + 1, pattern.totalSteps));
      } else if (command.includes('previous') || command.includes('back')) {
        setCurrentStep(prev => Math.max(prev - 1, 0));
      } else if (command.includes('repeat') && pattern) {
        const path = pattern.paths[currentStep - 1];
        if (path && 'speechSynthesis' in window) {
          const message = `${path.t}`;
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

  // Video recording functions
  const startRecording = async () => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const stream = canvas.captureStream(30); // 30 FPS
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `string-art-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Video saved!');
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPlaying(false);
    }
  };

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

  const currentPath = pattern?.paths?.[currentStep - 1];
  const currentColor = currentPath && pattern ? pattern.colors.find(c => c.id === currentPath.c) : null;

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
          <div className="flex gap-2">
            {isRecording ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={stopRecording}
              >
                <div className="w-2 h-2 rounded-full bg-white animate-pulse mr-2" />
                Stop Recording
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={startRecording}
                disabled={!pattern}
              >
                <Video className="w-4 h-4 mr-2" />
                Record
              </Button>
            )}
          </div>
        </div>

        {/* Canvas Display */}
        {pattern && (
          <Card className="bg-white border-0 shadow-sm p-6 mb-6">
            <StringArtCanvas
              ref={canvasRef}
              stringPaths={pattern.paths}
              currentStep={currentStep}
              numPins={pattern.pins}
              colors={pattern.colors.map(c => ({ name: c.n, hex: c.h, id: c.id }))}
              isProcessing={false}
              lineWidth={1}
              lineOpacity={0.08}
              shape="circle"
            />
          </Card>
        )}

        {/* Pin to Pin Display */}
        {currentPath && (
          <Card className="bg-white border-0 shadow-sm p-6 mb-6">
            <motion.div
              key={`${currentStep}-info`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Color indicator */}
              {currentColor && (
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div
                    className="w-16 h-16 rounded-full shadow-lg"
                    style={{ backgroundColor: currentColor.h }}
                  />
                  <div>
                    <div className="text-sm text-gray-500">Current Color</div>
                    <div className="text-2xl font-semibold text-gray-900">{currentColor.n}</div>
                  </div>
                </div>
              )}

              {/* Pin numbers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-6 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-2">From Pin</div>
                  <div className="text-5xl font-bold text-gray-700">{currentPath.f}</div>
                </div>
                <div className="text-center p-6 bg-[#ff6b35] bg-opacity-10 rounded-lg">
                  <div className="text-sm text-[#ff6b35] mb-2">To Pin</div>
                  <div className="text-5xl font-bold text-[#ff6b35]">{currentPath.t}</div>
                </div>
              </div>
            </motion.div>
          </Card>
        )}

        {/* Progress */}
        <Card className="bg-white border-0 shadow-sm p-4 mb-6">
          <div className="mb-2">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ff6b35] transition-all duration-300"
                style={{ width: `${pattern ? (currentStep / pattern.totalSteps) * 100 : 0}%` }}
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
            max={pattern?.totalSteps || 0}
            step={1}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{currentStep.toLocaleString()}</span>
            <span>{pattern ? Math.round((currentStep / pattern.totalSteps) * 100) : 0}%</span>
            <span>{pattern?.totalSteps.toLocaleString() || 0}</span>
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
                if (pattern && currentStep >= pattern.totalSteps) {
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
              onClick={() => pattern && setCurrentStep(pattern.totalSteps)}
              className="h-12 w-12"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Voice Delay */}
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-sm">Voice Delay</Label>
                <span className="text-sm text-gray-600">{voiceDelay} seconds</span>
              </div>
              <Slider
                value={[voiceDelay]}
                onValueChange={([v]) => setVoiceDelay(v)}
                min={1}
                max={10}
                step={1}
              />
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


          </div>
        </Card>

        {/* Voice Commands */}
        {voiceEnabled && (
          <Card className="bg-blue-50 border-blue-200 p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Voice Commands</h3>
            <div className="text-xs text-blue-800 space-y-1">
              <p>• Voice says pin number only (e.g., "245", "390")</p>
              <p>• Delay: {voiceDelay} seconds between announcements</p>
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