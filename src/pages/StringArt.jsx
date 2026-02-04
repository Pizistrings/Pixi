import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [image, setImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [mode, setMode] = useState('color'); // 'mono' or 'color'
  const [speed, setSpeed] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [stringPaths, setStringPaths] = useState([]);
  const [colorLayers, setColorLayers] = useState([]);
  const [numPins, setNumPins] = useState(200);
  const [numStrings, setNumStrings] = useState(3000);
  const [lineWidth, setLineWidth] = useState(0.3);
  const [lineOpacity, setLineOpacity] = useState(0.15);
  const [isGenerated, setIsGenerated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioRef = useRef(null);

  // Color configuration for CMYK-style string art
  const colors = mode === 'mono' 
    ? [{ name: 'Black', hex: '#1a1a1a', id: 'K' }]
    : [
        { name: 'Cyan', hex: '#00b4d8', id: 'C' },
        { name: 'Magenta', hex: '#e63946', id: 'M' },
        { name: 'Yellow', hex: '#ffd60a', id: 'Y' },
        { name: 'Black', hex: '#1a1a1a', id: 'K' }
      ];

  const handleImageUpload = (uploadedImage) => {
    setImage(uploadedImage);
    setIsGenerated(false);
    setStringPaths([]);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const generateStringArt = useCallback(async () => {
    if (!image) return;
    
    setIsProcessing(true);
    setCurrentStep(0);
    setIsPlaying(false);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 400;
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
    
    const activeColors = mode === 'mono' ? ['K'] : ['C', 'M', 'Y', 'K'];
    const stringsPerColor = Math.floor(numStrings / activeColors.length);
    
    for (const colorId of activeColors) {
      layerCounts[colorId] = 0;
      let currentPin = Math.floor(Math.random() * numPins);
      
      for (let s = 0; s < stringsPerColor; s++) {
        let bestPin = -1;
        let bestScore = -Infinity;
        
        // Find the best next pin
        for (let nextPin = 0; nextPin < numPins; nextPin++) {
          if (nextPin === currentPin) continue;
          
          // Skip nearby pins (minimum distance of 20)
          const pinDist = Math.abs(nextPin - currentPin);
          if (pinDist < 20 && pinDist > numPins - 20) continue;
          
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
        
        if (bestPin === -1) break;
        
        // Add the string path
        paths.push({
          from: currentPin,
          to: bestPin,
          color: colorId,
          step: paths.length
        });
        layerCounts[colorId]++;
        
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
            workingData[colorId][y * size + x] = Math.max(0, workingData[colorId][y * size + x] - 0.05);
          }
        }
        
        currentPin = bestPin;
      }
    }
    
    // Create color layers summary
    const layers = colors.map(color => ({
      ...color,
      count: layerCounts[color.id] || 0
    }));
    
    setStringPaths(paths);
    setColorLayers(layers);
    setTotalSteps(paths.length);
    setIsGenerated(true);
    setIsProcessing(false);
  }, [image, mode, numPins, numStrings, colors]);

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
    const colorId = stringPaths[currentStep - 1].color;
    return colors.find(c => c.id === colorId);
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
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-light text-gray-900 tracking-tight mb-2">
            String Art Generator
          </h1>
          <p className="text-gray-500 text-sm">
            Transform your photos into beautiful thread art
          </p>
        </motion.div>

        {!image ? (
          <ImageUploader onUpload={handleImageUpload} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Canvas Area */}
            <div className="lg:col-span-2">
              <Card className="bg-white border-0 shadow-sm overflow-hidden">
                <div className="p-6">
                  <StringArtCanvas
                    ref={canvasRef}
                    stringPaths={stringPaths}
                    currentStep={currentStep}
                    numPins={numPins}
                    colors={colors}
                    isProcessing={isProcessing}
                    sourceImage={image}
                    lineWidth={lineWidth}
                    lineOpacity={lineOpacity}
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

                        {/* Line Thickness */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-xs text-gray-500">Line Thickness</Label>
                            <span className="text-xs text-gray-700 font-medium">{lineWidth.toFixed(1)}px</span>
                          </div>
                          <Slider
                            value={[lineWidth]}
                            onValueChange={([v]) => setLineWidth(v)}
                            min={0.1}
                            max={2}
                            step={0.1}
                            className="w-full"
                          />
                        </div>

                        {/* Line Opacity */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-xs text-gray-500">Line Opacity</Label>
                            <span className="text-xs text-gray-700 font-medium">{Math.round(lineOpacity * 100)}%</span>
                          </div>
                          <Slider
                            value={[lineOpacity]}
                            onValueChange={([v]) => setLineOpacity(v)}
                            min={0.05}
                            max={0.5}
                            step={0.05}
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