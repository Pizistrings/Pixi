import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download, Settings, RefreshCw, Image as ImageIcon, Trash2, FileText, Star, Plus, Palette } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import StringArtCanvas from '@/components/string-art/StringArtCanvas';
import StepList from '@/components/string-art/StepList';
import ImageUploader from '@/components/string-art/ImageUploader';
import ShapeSelector from '@/components/string-art/ShapeSelector';
import ColorPalette from '@/components/string-art/ColorPalette';

export default function StringArt() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');
  const queryClient = useQueryClient();

  // Load project if ID is provided
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.get(projectId),
    enabled: !!projectId
  });

  const [image, setImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [speed, setSpeed] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [stringPaths, setStringPaths] = useState([]);
  const [colorLayers, setColorLayers] = useState([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [showColorDialog, setShowColorDialog] = useState(false);
  const [showShapeDialog, setShowShapeDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Settings from project or defaults
  const [shape, setShape] = useState('circle_240');
  const [mode, setMode] = useState('multi');
  const [steps, setSteps] = useState(3000);
  const [fade, setFade] = useState(30);
  const [minDistance, setMinDistance] = useState(30);
  const [colorRun, setColorRun] = useState(100);
  const [thickness, setThickness] = useState(0.3);
  const [lineOpacity, setLineOpacity] = useState(15);
  const [darknessFactor, setDarknessFactor] = useState(20);
  const [selectedColors, setSelectedColors] = useState([
    { hex: '#000000', name: 'Black', brightness: 0, favorite: true },
    { hex: '#f60404', name: '#f60404', brightness: -100, favorite: false },
    { hex: '#f4fcfc', name: '#f4fcfc', brightness: -98, favorite: false }
  ]);
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Load project data when available
  useEffect(() => {
    if (project) {
      if (project.source_image_url) setImage(project.source_image_url);
      if (project.current_step) setCurrentStep(project.current_step);
      if (project.string_paths) {
        setStringPaths(project.string_paths);
        setIsGenerated(true);
        setTotalSteps(project.string_paths.length);
      }
      if (project.settings) {
        if (project.settings.shape) setShape(project.settings.shape);
        if (project.settings.mode) setMode(project.settings.mode);
        if (project.settings.steps) setSteps(project.settings.steps);
        if (project.settings.fade) setFade(project.settings.fade);
        if (project.settings.min_distance) setMinDistance(project.settings.min_distance);
        if (project.settings.color_run) setColorRun(project.settings.color_run);
        if (project.settings.thickness) setThickness(project.settings.thickness);
        if (project.settings.line_opacity) setLineOpacity(project.settings.line_opacity);
        if (project.settings.darkness_factor) setDarknessFactor(project.settings.darkness_factor);
        if (project.settings.colors) setSelectedColors(project.settings.colors);
      }
    }
  }, [project]);

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    }
  });

  const getNumPins = () => {
    if (shape.startsWith('circle_')) {
      return parseInt(shape.split('_')[1]);
    }
    return 240;
  };

  const colors = mode === 'single' ? [selectedColors[0]] : selectedColors;

  const extractColorsFromImage = async (imageUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(img, 0, 0, 100, 100);
        const imageData = ctx.getImageData(0, 0, 100, 100);
        
        // Extract dominant colors using simple clustering
        const colorMap = {};
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          
          // Group similar colors
          const key = `${Math.floor(r/40)*40}-${Math.floor(g/40)*40}-${Math.floor(b/40)*40}`;
          colorMap[key] = (colorMap[key] || 0) + 1;
        }
        
        // Sort by frequency and get top colors
        const sortedColors = Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([key]) => {
            const [r, g, b] = key.split('-').map(Number);
            const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return {
              hex,
              name: hex,
              brightness: brightness > 128 ? -80 : -20,
              favorite: false
            };
          });
        
        resolve(sortedColors);
      };
      img.src = imageUrl;
    });
  };

  const handleImageUpload = async (uploadedImage) => {
    setImage(uploadedImage);
    setIsGenerated(false);
    setStringPaths([]);
    setCurrentStep(0);
    setIsPlaying(false);
    setShowUploadDialog(false);
    
    // Auto-detect colors from image
    const detectedColors = await extractColorsFromImage(uploadedImage);
    if (detectedColors.length > 0) {
      setSelectedColors(detectedColors);
    }
    
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
        line_opacity: lineOpacity,
        darkness_factor: darknessFactor,
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
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 500;
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
    
    // Generate pins
    const pins = [];
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size / 2) - 20;
    
    for (let i = 0; i < numPins; i++) {
      const angle = (2 * Math.PI * i) / numPins;
      pins.push({
        x: Math.round(centerX + radius * Math.cos(angle)),
        y: Math.round(centerY + radius * Math.sin(angle)),
        index: i
      });
    }
    
    // Create working images for each color channel
    const workingImages = activeColors.map(() => new Uint8Array(size * size));
    
    // Initialize working images based on color similarity
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const r = imageData.data[idx];
        const g = imageData.data[idx + 1];
        const b = imageData.data[idx + 2];
        
        // For each color, calculate how well this pixel matches
        activeColors.forEach((colorIdx, i) => {
          const targetColor = colors[colorIdx];
          const tr = parseInt(targetColor.hex.slice(1, 3), 16);
          const tg = parseInt(targetColor.hex.slice(3, 5), 16);
          const tb = parseInt(targetColor.hex.slice(5, 7), 16);
          
          // Color distance (inverse)
          const colorDist = Math.sqrt((r-tr)**2 + (g-tg)**2 + (b-tb)**2);
          const similarity = Math.max(0, 255 - colorDist);
          
          workingImages[i][y * size + x] = similarity;
        });
      }
    }
    
    // Helper to get line pixels using Bresenham's algorithm
    const getLinePixels = (x0, y0, x1, y1) => {
      const pixels = [];
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;
      
      let x = x0;
      let y = y0;
      
      while (true) {
        if (x >= 0 && x < size && y >= 0 && y < size) {
          pixels.push({ x, y });
        }
        
        if (x === x1 && y === y1) break;
        
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
      }
      
      return pixels;
    };
    
    const paths = [];
    const layerCounts = {};
    const activeColors = mode === 'single' ? [0] : selectedColors.map((_, idx) => idx);
    
    // Initialize counts
    activeColors.forEach(idx => layerCounts[idx] = 0);
    
    // Alternate between colors
    let currentPin = Math.floor(Math.random() * numPins);
    let colorIdx = 0;
    let stringsInCurrentColor = 0;
    
    for (let s = 0; s < steps; s++) {
      const currentColorIdx = activeColors[colorIdx];
      const workingImageIdx = colorIdx;
      
      let bestPin = -1;
      let bestScore = -1;
      
      // Try every pin as next destination
      for (let nextPin = 0; nextPin < numPins; nextPin++) {
        // Skip same pin and nearby pins (min distance)
        const pinDist = Math.abs(nextPin - currentPin);
        if (pinDist < minDistance && pinDist > numPins - minDistance) continue;
        
        const linePixels = getLinePixels(
          pins[currentPin].x,
          pins[currentPin].y,
          pins[nextPin].x,
          pins[nextPin].y
        );
        
        // Calculate score for current color channel
        let score = 0;
        for (const pixel of linePixels) {
          score += workingImages[workingImageIdx][pixel.y * size + pixel.x];
        }
        score = score / linePixels.length; // Average
        
        if (score > bestScore) {
          bestScore = score;
          bestPin = nextPin;
        }
      }
      
      if (bestPin === -1) break;
      
      // Add the string
      paths.push({
        from: currentPin,
        to: bestPin,
        color: currentColorIdx,
        step: paths.length
      });
      layerCounts[currentColorIdx]++;
      
      // Subtract the line from ALL working images (affects all color channels)
      const linePixels = getLinePixels(
        pins[currentPin].x,
        pins[currentPin].y,
        pins[bestPin].x,
        pins[bestPin].y
      );
      
      for (const pixel of linePixels) {
        const idx = pixel.y * size + pixel.x;
        // Reduce intensity in current color's working image more
        workingImages[workingImageIdx][idx] = Math.max(0, workingImages[workingImageIdx][idx] - darknessFactor);
        // Slightly reduce in other color channels too
        activeColors.forEach((_, i) => {
          if (i !== workingImageIdx) {
            workingImages[i][idx] = Math.max(0, workingImages[i][idx] - (darknessFactor * 0.3));
          }
        });
      }
      
      currentPin = bestPin;
      stringsInCurrentColor++;
      
      // Switch color after colorRun strings
      if (mode === 'multi' && stringsInCurrentColor >= colorRun) {
        colorIdx = (colorIdx + 1) % activeColors.length;
        stringsInCurrentColor = 0;
      }
    }
    
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
    
    setTimeout(() => saveProject(), 1000);
  }, [image, mode, steps, selectedColors, shape, fade, minDistance, colorRun, darknessFactor, getNumPins]);

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
            Export as PNG
          </Button>
        </div>
      </div>

      <div className="p-6">
        {!image || !isGenerated ? (
          <div className="max-w-4xl mx-auto">
            {!image ? (
              <Card className="border-2 border-dashed border-gray-300 mb-6">
                <CardContent className="p-12">
                  <div className="text-center">
                    <div
                      onClick={() => setShowUploadDialog(true)}
                      className="w-24 h-24 mx-auto mb-6 bg-[#ff6b35] hover:bg-[#e55a2b] rounded-2xl flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Plus className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">UPLOAD</h3>
                    <p className="text-gray-500 mb-6">Project images</p>
                    <div className="flex items-center gap-2 justify-center">
                      <Switch id="reset-params" defaultChecked />
                      <Label htmlFor="reset-params" className="text-sm text-gray-600">
                        Reset parameters when image changes
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    <img src={image} alt="Input" className="w-48 h-48 object-cover rounded-lg" />
                    <div className="flex-1">
                      <h3 className="font-medium mb-4">Configure Generation</h3>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs mb-2 block">Shape</Label>
                          <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => setShowShapeDialog(true)}
                          >
                            <span>{shape.replace('_', ' ')}</span>
                          </Button>
                        </div>
                        <div>
                          <Label className="text-xs mb-2 block">Color mode</Label>
                          <Tabs value={mode} onValueChange={setMode}>
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="single">Single-color</TabsTrigger>
                              <TabsTrigger value="multi">Multi-color</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-xs">Steps</Label>
                            <span className="text-xs font-medium text-[#ff6b35]">{steps}</span>
                          </div>
                          <Slider value={[steps]} onValueChange={([v]) => setSteps(v)} min={1000} max={9000} step={100} />
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowColorDialog(true)}
                        >
                          <Palette className="w-4 h-4 mr-2" />
                          Thread Colors ({selectedColors.length})
                        </Button>
                        
                        <div className="pt-2 border-t">
                          <Label className="text-xs text-gray-500 mb-3 block">Advanced Settings</Label>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between mb-2">
                                <Label className="text-xs">Line Thickness</Label>
                                <span className="text-xs font-medium text-[#ff6b35]">{thickness.toFixed(1)}</span>
                              </div>
                              <Slider value={[thickness]} onValueChange={([v]) => setThickness(v)} min={0.1} max={2} step={0.1} />
                            </div>
                            
                            <div>
                              <div className="flex justify-between mb-2">
                                <Label className="text-xs">Line Opacity</Label>
                                <span className="text-xs font-medium text-[#ff6b35]">{lineOpacity}%</span>
                              </div>
                              <Slider value={[lineOpacity]} onValueChange={([v]) => setLineOpacity(v)} min={5} max={50} step={1} />
                            </div>
                            
                            <div>
                              <div className="flex justify-between mb-2">
                                <Label className="text-xs">Min Pin Distance</Label>
                                <span className="text-xs font-medium text-[#ff6b35]">{minDistance}</span>
                              </div>
                              <Slider value={[minDistance]} onValueChange={([v]) => setMinDistance(v)} min={10} max={80} step={5} />
                            </div>
                            
                            <div>
                              <div className="flex justify-between mb-2">
                                <Label className="text-xs">Darkness Factor</Label>
                                <span className="text-xs font-medium text-[#ff6b35]">{darknessFactor}</span>
                              </div>
                              <Slider value={[darknessFactor]} onValueChange={([v]) => setDarknessFactor(v)} min={5} max={50} step={1} />
                            </div>
                            
                            {mode === 'multi' && (
                              <div>
                                <div className="flex justify-between mb-2">
                                  <Label className="text-xs">Color Switch Rate</Label>
                                  <span className="text-xs font-medium text-[#ff6b35]">{colorRun}</span>
                                </div>
                                <Slider value={[colorRun]} onValueChange={([v]) => setColorRun(v)} min={20} max={200} step={10} />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          onClick={generateStringArt}
                          disabled={isProcessing}
                          className="w-full bg-[#ff6b35] hover:bg-[#e55a2b] text-white"
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Generate String Art
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Card className="border-2 border-[#ff6b35] border-dashed">
                <div className="aspect-square flex items-center justify-center p-8">
                  <img src={image} alt="Input" className="max-w-full max-h-full rounded-lg" />
                </div>
              </Card>
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
                  <Button variant="outline" size="icon" className="h-8 w-8">
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
                    thickness={thickness}
                    lineOpacity={lineOpacity}
                  />
                </div>
                
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
                      <span className="text-[#ff6b35] font-medium">
                        {currentStep} / {totalSteps}
                      </span>
                      <span>⏱ {getElapsedTime()}</span>
                    </div>
                  </div>
                )}

                <div className="px-6 pb-6">
                  <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-lg p-3">
                    <Button variant="ghost" size="icon" onClick={handleReset} disabled={!isGenerated}>
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handlePlayPause} disabled={!isGenerated} className="w-12 h-12">
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
                    <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} disabled={!isGenerated}>
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleSkipToEnd} disabled={!isGenerated}>
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 grid lg:grid-cols-3 gap-6">
              {/* Current Step */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm text-gray-500 mb-3">Current step</h3>
                  {isGenerated ? (
                    <div>
                      <div className="text-5xl font-light mb-4">{currentStep}</div>
                      {getCurrentColor() && (
                        <>
                          <div className="text-[#ff6b35] text-sm mb-2">⚠ Change color!</div>
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full" style={{ backgroundColor: getCurrentColor()?.hex }} />
                            <span className="font-medium">{getCurrentColor()?.name}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400">Generate to see progress</p>
                  )}
                </CardContent>
              </Card>

              {/* Step List */}
              <StepList colorLayers={colorLayers} currentStep={currentStep} stringPaths={stringPaths} />

              {/* Configuration */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label className="text-xs mb-2 block">Shape</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => setShowShapeDialog(true)}
                    >
                      <span>{shape.replace('_', ' ')}</span>
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs mb-2 block">Color mode</Label>
                    <Tabs value={mode} onValueChange={setMode}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="single">Single-color</TabsTrigger>
                        <TabsTrigger value="multi">Multi-color</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-xs">Steps</Label>
                      <span className="text-xs font-medium text-[#ff6b35]">{steps}</span>
                    </div>
                    <Slider value={[steps]} onValueChange={([v]) => setSteps(v)} min={1000} max={9000} step={100} />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowColorDialog(true)}
                  >
                    <Palette className="w-4 h-4 mr-2" />
                    Colors ({selectedColors.length})
                  </Button>
                  
                  <div className="pt-4 border-t space-y-3">
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-xs">Thickness</Label>
                        <span className="text-xs font-medium text-[#ff6b35]">{thickness.toFixed(1)}</span>
                      </div>
                      <Slider value={[thickness]} onValueChange={([v]) => setThickness(v)} min={0.1} max={2} step={0.1} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-xs">Opacity</Label>
                        <span className="text-xs font-medium text-[#ff6b35]">{lineOpacity}%</span>
                      </div>
                      <Slider value={[lineOpacity]} onValueChange={([v]) => setLineOpacity(v)} min={5} max={50} step={1} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-xs">Pin Gap</Label>
                        <span className="text-xs font-medium text-[#ff6b35]">{minDistance}</span>
                      </div>
                      <Slider value={[minDistance]} onValueChange={([v]) => setMinDistance(v)} min={10} max={80} step={5} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-xs">Darkness</Label>
                        <span className="text-xs font-medium text-[#ff6b35]">{darknessFactor}</span>
                      </div>
                      <Slider value={[darknessFactor]} onValueChange={([v]) => setDarknessFactor(v)} min={5} max={50} step={1} />
                    </div>
                    
                    {mode === 'multi' && (
                      <div>
                        <div className="flex justify-between mb-2">
                          <Label className="text-xs">Color Rate</Label>
                          <span className="text-xs font-medium text-[#ff6b35]">{colorRun}</span>
                        </div>
                        <Slider value={[colorRun]} onValueChange={([v]) => setColorRun(v)} min={20} max={200} step={10} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <ImageUploader onUpload={handleImageUpload} />
        </DialogContent>
      </Dialog>

      <ShapeSelector
        open={showShapeDialog}
        onOpenChange={setShowShapeDialog}
        selected={shape}
        onSelect={(s) => {
          setShape(s);
          setShowShapeDialog(false);
        }}
      />

      <ColorPalette
        open={showColorDialog}
        onOpenChange={setShowColorDialog}
        selectedColors={selectedColors}
        onColorsChange={setSelectedColors}
      />
    </div>
  );
}