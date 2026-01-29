import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download, Settings, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import StringArtCanvas from '@/components/string-art/StringArtCanvas';
import StepList from '@/components/string-art/StepList';
import ImageUploader from '@/components/string-art/ImageUploader';

export default function StringArt() {
  const [image, setImage] = useState(project?.source_image_url || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(project?.current_step || 0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [speed, setSpeed] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [stringPaths, setStringPaths] = useState(project?.string_paths || []);
  const [colorLayers, setColorLayers] = useState([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [showColorDialog, setShowColorDialog] = useState(false);
  const [showShapeDialog, setShowShapeDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Settings from project or defaults
  const [shape, setShape] = useState(project?.settings?.shape || 'circle_240');
  const [mode, setMode] = useState(project?.settings?.mode || 'multi');
  const [steps, setSteps] = useState(project?.settings?.steps || 3000);
  const [fade, setFade] = useState(project?.settings?.fade || 30);
  const [minDistance, setMinDistance] = useState(project?.settings?.min_distance || 30);
  const [colorRun, setColorRun] = useState(project?.settings?.color_run || 100);
  const [thickness, setThickness] = useState(project?.settings?.thickness || 1);
  const [selectedColors, setSelectedColors] = useState(project?.settings?.colors || [
    { hex: '#000000', name: 'Black', brightness: 0, favorite: true },
    { hex: '#f60404', name: '#f60404', brightness: -100, favorite: false },
    { hex: '#f4fcfc', name: '#f4fcfc', brightness: -98, favorite: false }
  ]);
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    }
  });

  // Parse shape to get pin count
  const getNumPins = () => {
    if (shape.startsWith('circle_')) {
      return parseInt(shape.split('_')[1]);
    }
    return 240;
  };

  // Prepare colors for rendering
  const colors = mode === 'single' 
    ? [selectedColors[0]]
    : selectedColors;

  const handleImageUpload = async (uploadedImage) => {
    setImage(uploadedImage);
    setIsGenerated(false);
    setStringPaths([]);
    setCurrentStep(0);
    setIsPlaying(false);
    setShowUploadDialog(false);
    
    if (projectId) {
      updateProjectMutation.mutate({ source_image_url: uploadedImage });
    }
  };

  const saveProject = async () => {
    if (!projectId) return;
    
    const canvas = canvasRef.current;
    let thumbnailUrl = project?.thumbnail_url;
    
    if (canvas) {
      thumbnailUrl = canvas.toDataURL();
    }
    
    updateProjectMutation.mutate({
      thumbnail_url: thumbnailUrl,
      result_image_url: thumbnailUrl,
      current_step: currentStep,
      string_paths: stringPaths,
      settings: {
        shape,
        mode,
        steps,
        fade,
        min_distance: minDistance,
        color_run: colorRun,
        thickness,
        colors: selectedColors
      },
      status: isGenerated ? 'completed' : 'draft'
    });
  };

  const generateStringArt = useCallback(async () => {
    if (!image) return;
    
    setIsProcessing(true);
    setCurrentStep(0);
    setIsPlaying(false);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 400;
    const numPins = getNumPins();
    canvas.width = size;
    canvas.height = size;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = image;
    });
    
    ctx.drawImage(img, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    
    // Generate pin positions around the frame
    const pins = [];
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size / 2) - 10;
    
    for (let i = 0; i < numPins; i++) {
      const angle = (2 * Math.PI * i) / numPins;
      pins.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        index: i
      });
    }
    
    // Generate string paths using a greedy algorithm
    const paths = [];
    const layerCounts = {};
    
    // Create working copy of image data for each color channel
    const workingData = {
      C: new Float32Array(size * size),
      M: new Float32Array(size * size),
      Y: new Float32Array(size * size),
      K: new Float32Array(size * size)
    };
    
    // Convert RGB to CMYK-like values
    for (let i = 0; i < size * size; i++) {
      const r = imageData.data[i * 4] / 255;
      const g = imageData.data[i * 4 + 1] / 255;
      const b = imageData.data[i * 4 + 2] / 255;
      
      const k = 1 - Math.max(r, g, b);
      const c = k < 1 ? (1 - r - k) / (1 - k) : 0;
      const m = k < 1 ? (1 - g - k) / (1 - k) : 0;
      const y = k < 1 ? (1 - b - k) / (1 - k) : 0;
      
      workingData.K[i] = k;
      workingData.C[i] = c * (1 - k);
      workingData.M[i] = m * (1 - k);
      workingData.Y[i] = y * (1 - k);
    }
    
    // For monochrome, use grayscale
    if (mode === 'mono') {
      for (let i = 0; i < size * size; i++) {
        const r = imageData.data[i * 4];
        const g = imageData.data[i * 4 + 1];
        const b = imageData.data[i * 4 + 2];
        workingData.K[i] = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      }
    }
    
    const activeColors = mode === 'single' ? [0] : selectedColors.map((_, idx) => idx);
    const stringsPerColor = Math.floor(steps / activeColors.length);
    
    for (const colorIdx of activeColors) {
      layerCounts[colorIdx] = 0;
      let currentPin = 0;
      const usedConnections = new Set();
      
      for (let s = 0; s < stringsPerColor; s++) {
        let bestPin = -1;
        let bestScore = -Infinity;
        
        // Find the best next pin
        for (let nextPin = 0; nextPin < numPins; nextPin++) {
          if (nextPin === currentPin) continue;
          
          const connectionKey = `${Math.min(currentPin, nextPin)}-${Math.max(currentPin, nextPin)}`;
          if (usedConnections.has(connectionKey)) continue;
          
          // Calculate line score
          const x1 = pins[currentPin].x;
          const y1 = pins[currentPin].y;
          const x2 = pins[nextPin].x;
          const y2 = pins[nextPin].y;
          
          const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const steps = Math.ceil(dist);
          
          let score = 0;
          for (let t = 0; t < steps; t++) {
            const x = Math.floor(x1 + (x2 - x1) * t / steps);
            const y = Math.floor(y1 + (y2 - y1) * t / steps);
            if (x >= 0 && x < size && y >= 0 && y < size) {
              score += workingData[colorId][y * size + x];
            }
          }
          score /= steps;
          
          if (score > bestScore) {
            bestScore = score;
            bestPin = nextPin;
          }
        }
        
        if (bestPin === -1 || bestScore < 0.01) break;
        
        // Add the string path
        paths.push({
          from: currentPin,
          to: bestPin,
          color: colorIdx,
          step: paths.length
        });
        layerCounts[colorIdx]++;
        
        // Subtract the drawn line from working data
        const x1 = pins[currentPin].x;
        const y1 = pins[currentPin].y;
        const x2 = pins[bestPin].x;
        const y2 = pins[bestPin].y;
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const steps = Math.ceil(dist);
        
        for (let t = 0; t < steps; t++) {
          const x = Math.floor(x1 + (x2 - x1) * t / steps);
          const y = Math.floor(y1 + (y2 - y1) * t / steps);
          if (x >= 0 && x < size && y >= 0 && y < size) {
            workingData[colorId][y * size + x] = Math.max(0, workingData[colorId][y * size + x] - 0.1);
          }
        }
        
        const connectionKey = `${Math.min(currentPin, bestPin)}-${Math.max(currentPin, bestPin)}`;
        usedConnections.add(connectionKey);
        currentPin = bestPin;
      }
    }
    
    // Create color layers summary
    const layers = colors.map((color, idx) => ({
      ...color,
      id: idx,
      count: layerCounts[idx] || 0
    }));
    
    setStringPaths(paths);
    setColorLayers(layers);
    setTotalSteps(paths.length);
    setIsGenerated(true);
    setIsProcessing(false);
    
    // Auto-save
    setTimeout(() => saveProject(), 1000);
  }, [image, mode, steps, selectedColors]);

  // Animation loop
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

  const handleSkipToEnd = () => {
    setCurrentStep(totalSteps);
    setIsPlaying(false);
  };

  const getCurrentColor = () => {
    if (currentStep === 0 || !stringPaths[currentStep - 1]) return null;
    const colorIdx = stringPaths[currentStep - 1].color;
    return colors[colorIdx];
  };

  const toggleFavorite = async () => {
    if (!projectId) return;
    updateProjectMutation.mutate({
      is_favorite: !project?.is_favorite
    });
  };

  const getElapsedTime = () => {
    const seconds = Math.floor(currentStep / speed);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  };

  const downloadCanvas = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'string-art.png';
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-medium text-gray-900">
            {project?.title || 'String Art Project'}
          </h1>
          {projectId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFavorite}
              className="h-8 w-8"
            >
              <Star className={`w-4 h-4 ${project?.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={saveProject}
            disabled={!projectId}
          >
            <FileText className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCanvas}
            disabled={!isGenerated}
          >
            <Download className="w-4 h-4 mr-2" />
            Export PNG
          </Button>
        </div>
      </div>

      <div className="p-6">
        {!image ? (
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-12">
                <div className="text-center">
                  <div
                    onClick={() => setShowUploadDialog(true)}
                    className="w-24 h-24 mx-auto mb-6 bg-[#ff6b35] hover:bg-[#e55a2b] rounded-2xl flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Plus className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Project images</h3>
                  <p className="text-gray-500 mb-4">Upload an image to get started</p>
                  <div className="flex items-center gap-2 justify-center">
                    <Switch
                      id="reset-params"
                      defaultChecked
                    />
                    <Label htmlFor="reset-params" className="text-sm text-gray-600">
                      Reset parameters when image changes
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Canvas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Input canvas</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUploadDialog(true)}
                    className="text-[#ff6b35] border-[#ff6b35]"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Card className="border-2 border-[#ff6b35] border-dashed">
                <div className="aspect-square flex items-center justify-center p-8">
                  <img src={image} alt="Input" className="max-w-full max-h-full rounded-lg" />
                </div>
              </Card>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-[#ff6b35]/20 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-[#ff6b35]" />
                  </div>
                  <Slider value={[50]} onValueChange={() => {}} className="flex-1" />
                  <span className="text-sm text-gray-600 w-8 text-right">0</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#ff6b35]/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#ff6b35]" />
                  </div>
                  <Slider value={[50]} onValueChange={() => {}} className="flex-1" />
                  <span className="text-sm text-gray-600 w-8 text-right">0</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#ff6b35] font-bold text-lg w-6 text-center">C</span>
                  <Slider value={[50]} onValueChange={() => {}} className="flex-1" />
                  <span className="text-sm text-gray-600 w-8 text-right">0</span>
                </div>
              </div>
            </div>

            {/* Output Canvas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Output canvas</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={generateStringArt}
                    disabled={isProcessing}
                    size="sm"
                    className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Generate
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Card className="border-2 border-gray-300 border-dashed">
                <div className="p-6">
                  <StringArtCanvas
                    ref={canvasRef}
                    stringPaths={stringPaths}
                    currentStep={currentStep}
                    numPins={getNumPins()}
                    colors={colors}
                    isProcessing={isProcessing}
                    sourceImage={image}
                  />
                </div>
                
                {/* Progress bar */}
                {isGenerated && (
                  <div className="px-6 pb-2">
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-[#ff6b35]"
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-400">
                      <span className="text-[#ff6b35] font-medium">{currentStep.toLocaleString()} / {totalSteps.toLocaleString()}</span>
                      <span>⏱ {getElapsedTime()}</span>
                    </div>
                  </div>
                )}

                {/* Controls */}
                <div className="px-6 pb-6">
                  <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-lg p-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleReset}
                      disabled={!isGenerated}
                      className="hover:bg-white"
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePlayPause}
                      disabled={!isGenerated}
                      className="hover:bg-white w-12 h-12"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </Button>
                    
                    <Select value={speed.toString()} onValueChange={(v) => setSpeed(Number(v))}>
                      <SelectTrigger className="w-24 bg-white border-gray-200">
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
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      disabled={!isGenerated}
                      className="hover:bg-white"
                    >
                      {soundEnabled ? (
                        <Volume2 className="w-4 h-4" />
                      ) : (
                        <VolumeX className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSkipToEnd}
                      disabled={!isGenerated}
                      className="hover:bg-white"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Action buttons */}
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImage(null);
                    setIsGenerated(false);
                    setStringPaths([]);
                  }}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  New Image
                </Button>
                
                <Button
                  onClick={generateStringArt}
                  disabled={isProcessing}
                  className="flex-1 bg-[#ff6b35] hover:bg-[#e55a2b] text-white"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {isGenerated ? 'Regenerate' : 'Generate'}
                    </>
                  )}
                </Button>
                
                {isGenerated && (
                  <Button
                    variant="outline"
                    onClick={downloadCanvas}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                )}
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-4">
              {/* Current Step Info */}
              <Card className="bg-white border-0 shadow-sm p-6">
                <h3 className="text-sm text-gray-500 mb-3">Current step</h3>
                
                {isGenerated ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <span className="text-5xl font-light text-gray-900">
                        {currentStep}
                      </span>
                      
                      {getCurrentColor() && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-[#ff6b35] text-sm">
                            <span className="text-lg">⚠</span>
                            <span className="font-medium">Change color!</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full shadow-inner"
                              style={{ backgroundColor: getCurrentColor()?.hex }}
                            />
                            <span className="font-medium text-gray-700">
                              {getCurrentColor()?.name}
                            </span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="text-gray-400 text-sm">
                    Generate string art to see progress
                  </div>
                )}
              </Card>

              {/* Step List */}
              <StepList
                colorLayers={colorLayers}
                currentStep={currentStep}
                stringPaths={stringPaths}
              />

              {/* Settings */}
              <Card className="bg-white border-0 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm text-gray-500">Settings</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(!showSettings)}
                    className="h-8 w-8"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Mode Toggle */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block">Mode</Label>
                    <Tabs value={mode} onValueChange={setMode}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="color">Color</TabsTrigger>
                        <TabsTrigger value="mono">Monochrome</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <AnimatePresence>
                    {showSettings && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden"
                      >
                        {/* Number of Pins */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-xs text-gray-500">Pins</Label>
                            <span className="text-xs text-gray-700 font-medium">{numPins}</span>
                          </div>
                          <Slider
                            value={[numPins]}
                            onValueChange={([v]) => setNumPins(v)}
                            min={100}
                            max={300}
                            step={10}
                            className="w-full"
                          />
                        </div>

                        {/* Number of Strings */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-xs text-gray-500">Strings</Label>
                            <span className="text-xs text-gray-700 font-medium">{numStrings.toLocaleString()}</span>
                          </div>
                          <Slider
                            value={[numStrings]}
                            onValueChange={([v]) => setNumStrings(v)}
                            min={1000}
                            max={9000}
                            step={500}
                            className="w-full"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}