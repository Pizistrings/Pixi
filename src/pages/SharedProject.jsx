import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, Volume2, VolumeX, Download, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import StringArtCanvas from '@/components/string-art/StringArtCanvas';

export default function SharedProject() {
  const urlParams = new URLSearchParams(window.location.search);
  const shareToken = window.location.pathname.split('/').pop();

  const { data: project, isLoading } = useQuery({
    queryKey: ['shared-project', shareToken],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ 
        share_token: shareToken,
        is_public: true 
      });
      return projects[0];
    },
    enabled: !!shareToken
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioRef = useRef(null);

  const stringPaths = project?.string_paths || [];
  const totalSteps = stringPaths.length;
  const settings = project?.settings || {};
  const colors = settings.mode === 'single' ? [settings.colors?.[0]] : (settings.colors || []);

  useEffect(() => {
    if (project?.current_step) {
      setCurrentStep(project.current_step);
    }
  }, [project]);

  useEffect(() => {
    if (isPlaying && currentStep < totalSteps) {
      const interval = Math.max(1, 100 / speed);
      animationRef.current = setTimeout(() => {
        setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      }, interval);
    } else if (currentStep >= totalSteps) {
      setIsPlaying(false);
    }
    
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isPlaying, currentStep, totalSteps, speed]);

  const handlePlayPause = () => {
    if (currentStep >= totalSteps) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const playVoiceNote = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlayingVoice(true);
    }
  };

  const getNumPins = () => {
    if (settings.shape?.startsWith('circle_')) {
      return parseInt(settings.shape.split('_')[1]);
    }
    return 240;
  };

  const downloadCanvas = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `${project?.title || 'string-art'}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#ff6b35] mx-auto mb-4" />
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h1>
          <p className="text-gray-600">This project may be private or doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Shared String Art Project
            </p>
          </div>
          <Button
            variant="outline"
            onClick={downloadCanvas}
            disabled={!stringPaths.length}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Voice Note */}
          {project.voice_note_url && (
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={playVoiceNote}
                  disabled={isPlayingVoice}
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  {isPlayingVoice ? 'Playing...' : 'Play Voice Note'} ({project.voice_note_duration}s)
                </Button>
                <audio
                  ref={audioRef}
                  src={project.voice_note_url}
                  onEnded={() => setIsPlayingVoice(false)}
                  className="hidden"
                />
              </div>
            </Card>
          )}

          {/* Canvas */}
          <Card className="p-6">
            <StringArtCanvas
              ref={canvasRef}
              stringPaths={stringPaths}
              currentStep={currentStep}
              numPins={getNumPins()}
              colors={colors}
              isProcessing={false}
              sourceImage={project.source_image_url}
            />

            {/* Progress */}
            <div className="mt-4">
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#ff6b35]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span className="text-[#ff6b35] font-medium">
                  {currentStep} / {totalSteps}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-lg p-3 mt-4">
              <Button variant="ghost" size="icon" onClick={handleReset}>
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePlayPause} className="w-12 h-12">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
              <Select value={speed.toString()} onValueChange={(v) => setSpeed(Number(v))}>
                <SelectTrigger className="w-24 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">⏱ 1x</SelectItem>
                  <SelectItem value="5">⏱ 5x</SelectItem>
                  <SelectItem value="10">⏱ 10x</SelectItem>
                  <SelectItem value="25">⏱ 25x</SelectItem>
                  <SelectItem value="50">⏱ 50x</SelectItem>
                  <SelectItem value="100">⏱ 100x</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
            </div>
          </Card>

          {/* Source Image */}
          {project.source_image_url && (
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Original Image</h3>
              <img
                src={project.source_image_url}
                alt="Source"
                className="w-full max-w-md mx-auto rounded-lg"
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}