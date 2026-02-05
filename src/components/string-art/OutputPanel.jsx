import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OutputPanel({
  image,
  settings,
  stringPaths,
  colorLayers,
  currentStep,
  isPlaying,
  isProcessing,
  onGenerate,
  onPlayPause,
  onReset,
  onSkipToEnd,
  onStepChange,
  onProcessingChange
}) {
  const canvasRef = useRef(null);
  const [pins, setPins] = useState([]);
  const [speed, setSpeed] = useState(10);
  const animationRef = useRef(null);
  const size = 500;

  const colors = settings.mode === 'mono' 
    ? [{ name: 'Black', hex: '#1a1a1a', id: 'K' }]
    : settings.selectedColors.slice(0, settings.numColors);

  // Generate pins
  useEffect(() => {
    const newPins = [];
    const centerX = size / 2;
    const centerY = size / 2;
    const padding = 15;

    if (settings.shape === 'circle') {
      const radius = (size / 2) - padding;
      for (let i = 0; i < settings.numPins; i++) {
        const angle = (2 * Math.PI * i) / settings.numPins;
        newPins.push({
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        });
      }
    } else if (settings.shape === 'square') {
      const sideLength = size - (padding * 2);
      const pinsPerSide = Math.floor(settings.numPins / 4);
      
      for (let i = 0; i < settings.numPins; i++) {
        const side = Math.floor(i / pinsPerSide);
        const posOnSide = (i % pinsPerSide) / pinsPerSide;
        
        if (side === 0) {
          newPins.push({ x: padding + posOnSide * sideLength, y: padding });
        } else if (side === 1) {
          newPins.push({ x: size - padding, y: padding + posOnSide * sideLength });
        } else if (side === 2) {
          newPins.push({ x: size - padding - posOnSide * sideLength, y: size - padding });
        } else {
          newPins.push({ x: padding, y: size - padding - posOnSide * sideLength });
        }
      }
    } else if (settings.shape === 'rectangle') {
      const width = size - (padding * 2);
      const height = (size * 0.7) - (padding * 2);
      const offsetY = (size - height - padding * 2) / 2;
      
      const perimeter = 2 * (width + height);
      const pinsTop = Math.floor((width / perimeter) * settings.numPins);
      const pinsRight = Math.floor((height / perimeter) * settings.numPins);
      const pinsBottom = pinsTop;
      const pinsLeft = settings.numPins - pinsTop - pinsRight - pinsBottom;
      
      let pinIndex = 0;
      for (let i = 0; i < pinsTop; i++, pinIndex++) {
        newPins.push({ x: padding + (i / pinsTop) * width, y: padding + offsetY });
      }
      for (let i = 0; i < pinsRight; i++, pinIndex++) {
        newPins.push({ x: size - padding, y: padding + offsetY + (i / pinsRight) * height });
      }
      for (let i = 0; i < pinsBottom; i++, pinIndex++) {
        newPins.push({ x: size - padding - (i / pinsBottom) * width, y: padding + offsetY + height });
      }
      for (let i = 0; i < pinsLeft; i++, pinIndex++) {
        newPins.push({ x: padding, y: padding + offsetY + height - (i / pinsLeft) * height });
      }
    }
    
    setPins(newPins);
  }, [settings.numPins, settings.shape]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pins.length === 0) return;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, size, size);

    // Draw frame
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const centerX = size / 2;
    const centerY = size / 2;
    const padding = 15;
    
    if (settings.shape === 'circle') {
      const radius = (size / 2) - 10;
      ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI);
    } else if (settings.shape === 'square') {
      ctx.rect(10, 10, size - 20, size - 20);
    } else if (settings.shape === 'rectangle') {
      const height = size * 0.7;
      const offsetY = (size - height) / 2;
      ctx.rect(10, offsetY, size - 20, height);
    }
    ctx.stroke();

    // Draw pins
    ctx.fillStyle = '#d4d4d4';
    pins.forEach(pin => {
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw strings
    const colorMap = {};
    colors.forEach(c => { colorMap[c.id] = c.hex; });

    ctx.lineWidth = settings.lineWidth;
    ctx.globalAlpha = settings.lineOpacity;

    for (let i = 0; i < currentStep && i < stringPaths.length; i++) {
      const path = stringPaths[i];
      const fromPin = pins[path.from];
      const toPin = pins[path.to];

      if (fromPin && toPin) {
        ctx.strokeStyle = colorMap[path.color] || '#1a1a1a';
        ctx.beginPath();
        ctx.moveTo(fromPin.x, fromPin.y);
        ctx.lineTo(toPin.x, toPin.y);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
  }, [stringPaths, currentStep, pins, colors, settings]);

  // Animation
  useEffect(() => {
    if (isPlaying && currentStep < stringPaths.length) {
      const interval = Math.max(1, 100 / speed);
      animationRef.current = setTimeout(() => {
        onStepChange(prev => Math.min(prev + 1, stringPaths.length));
      }, interval);
    } else if (currentStep >= stringPaths.length) {
      onPlayPause();
    }
    
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isPlaying, currentStep, stringPaths.length, speed]);

  const generateStringArt = useCallback(async () => {
    if (!image) return;
    
    onProcessingChange(true);
    onReset();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = image;
    });
    
    const cropX = (img.width * settings.cropArea.x) / 100;
    const cropY = (img.height * settings.cropArea.y) / 100;
    const cropW = (img.width * settings.cropArea.width) / 100;
    const cropH = (img.height * settings.cropArea.height) / 100;
    
    ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%)`;
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, size, size);
    
    if (settings.sharpness > 0) {
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      const factor = settings.sharpness / 10;
      
      for (let i = 0; i < data.length; i += 4) {
        const index = i / 4;
        const x = index % size;
        const y = Math.floor(index / size);
        
        if (x > 0 && x < size - 1 && y > 0 && y < size - 1) {
          for (let c = 0; c < 3; c++) {
            const center = data[i + c];
            const neighbors = 
              data[((y - 1) * size + x) * 4 + c] +
              data[((y + 1) * size + x) * 4 + c] +
              data[(y * size + (x - 1)) * 4 + c] +
              data[(y * size + (x + 1)) * 4 + c];
            data[i + c] = Math.max(0, Math.min(255, center + factor * (center - neighbors / 4)));
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
    
    const imageData = ctx.getImageData(0, 0, size, size);
    
    const workingData = {};
    colors.forEach(color => {
      workingData[color.id] = new Float32Array(size * size);
    });
    
    for (let i = 0; i < size * size; i++) {
      const r = imageData.data[i * 4];
      const g = imageData.data[i * 4 + 1];
      const b = imageData.data[i * 4 + 2];
      
      colors.forEach(color => {
        const targetR = parseInt(color.hex.slice(1, 3), 16);
        const targetG = parseInt(color.hex.slice(3, 5), 16);
        const targetB = parseInt(color.hex.slice(5, 7), 16);
        
        const distance = Math.sqrt(
          Math.pow(r - targetR, 2) +
          Math.pow(g - targetG, 2) +
          Math.pow(b - targetB, 2)
        );
        
        workingData[color.id][i] = Math.max(0, 1 - distance / 441);
      });
    }
    
    if (settings.mode === 'mono') {
      for (let i = 0; i < size * size; i++) {
        const r = imageData.data[i * 4];
        const g = imageData.data[i * 4 + 1];
        const b = imageData.data[i * 4 + 2];
        workingData.K[i] = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      }
    }
    
    const paths = [];
    const layerCounts = {};
    const activeColors = settings.mode === 'mono' ? ['K'] : colors.map(c => c.id);
    
    const stringsPerColorMap = {};
    if (settings.mode === 'mono') {
      stringsPerColorMap.K = settings.numStrings;
    } else {
      const totalPercent = activeColors.reduce((sum, id) => sum + settings.colorDistribution[id], 0);
      activeColors.forEach(id => {
        stringsPerColorMap[id] = Math.floor((settings.colorDistribution[id] / totalPercent) * settings.numStrings);
      });
    }
    
    for (const colorId of activeColors) {
      const stringsForThisColor = stringsPerColorMap[colorId];
      layerCounts[colorId] = 0;
      let currentPin = Math.floor(Math.random() * settings.numPins);
      
      for (let s = 0; s < stringsForThisColor; s++) {
        let bestPin = -1;
        let bestScore = -Infinity;
        
        for (let nextPin = 0; nextPin < settings.numPins; nextPin++) {
          if (nextPin === currentPin) continue;
          
          const pinDist = Math.abs(nextPin - currentPin);
          if (pinDist < 20 && pinDist > settings.numPins - 20) continue;
          
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
        
        paths.push({ from: currentPin, to: bestPin, color: colorId });
        layerCounts[colorId]++;
        
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
    
    const layers = colors.map(color => ({
      ...color,
      count: layerCounts[color.id] || 0
    }));
    
    onGenerate(paths, layers);
    onProcessingChange(false);
  }, [image, settings, pins]);

  const downloadCanvas = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'string-art.png';
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  const getCurrentColor = () => {
    if (!stringPaths[currentStep - 1]) return null;
    const colorId = stringPaths[currentStep - 1].color;
    return colors.find(c => c.id === colorId);
  };

  return (
    <div className="space-y-6">
      {/* Output Canvas */}
      <Card className="border-2 border-dashed border-orange-300 bg-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Output canvas</h2>
            <Button
              onClick={generateStringArt}
              disabled={!image || isProcessing}
              className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>

          <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className="w-full rounded-lg border border-gray-200"
            style={{ background: '#fafafa' }}
          />

          {/* Progress */}
          {stringPaths.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-2">
                {currentStep.toLocaleString()} / {stringPaths.length.toLocaleString()}
              </div>
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ff6b35] transition-all"
                  style={{ width: `${(currentStep / stringPaths.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Controls */}
          {stringPaths.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Button variant="outline" size="icon" onClick={onReset}>
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={onPlayPause}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Select value={speed.toString()} onValueChange={(v) => setSpeed(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="10">10x</SelectItem>
                  <SelectItem value="25">25x</SelectItem>
                  <SelectItem value="50">50x</SelectItem>
                  <SelectItem value="100">100x</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={onSkipToEnd}>
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={downloadCanvas} className="ml-auto">
                <Download className="w-4 h-4 mr-2" />
                Export PNG
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Current Step & Step List */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-white p-6">
          <h3 className="text-sm text-gray-500 mb-4">Current step</h3>
          {stringPaths.length > 0 ? (
            <div className="space-y-4">
              <div className="text-6xl font-light text-gray-900">{currentStep}</div>
              {getCurrentColor() && (
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full shadow-md"
                    style={{ backgroundColor: getCurrentColor().hex }}
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{getCurrentColor().name}</div>
                    <div className="text-xs text-gray-500 font-mono">{getCurrentColor().hex}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">Generate to see progress</div>
          )}
        </Card>

        <Card className="bg-white p-6">
          <h3 className="text-sm text-gray-500 mb-4">Step list</h3>
          {colorLayers.length > 0 ? (
            <div className="space-y-2">
              {colorLayers.map((layer) => (
                <div key={layer.id} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: layer.hex }}
                  />
                  <span className="text-sm text-gray-700">{layer.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">Steps will appear here</div>
          )}
        </Card>
      </div>

      {/* Configuration */}
      <Card className="bg-white p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Generator configuration</h3>
        
        <div className="space-y-4">
          {/* Shape */}
          <div>
            <Label className="text-xs text-gray-600 mb-2 block">Shape</Label>
            <Tabs value={settings.shape} onValueChange={(v) => onGenerate([], [])}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="circle" onClick={() => settings.shape = 'circle'}>
                  Circle {settings.numPins}
                </TabsTrigger>
                <TabsTrigger value="square" onClick={() => settings.shape = 'square'}>
                  Square {settings.numPins}
                </TabsTrigger>
                <TabsTrigger value="rectangle" onClick={() => settings.shape = 'rectangle'}>
                  Rectangle
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Mode */}
          <div>
            <Label className="text-xs text-gray-600 mb-2 block">Color mode</Label>
            <Tabs value={settings.mode} onValueChange={(v) => { settings.mode = v; onGenerate([], []); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mono">Single-color</TabsTrigger>
                <TabsTrigger value="color">Multi-color</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Steps */}
          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-xs text-gray-600">Steps</Label>
              <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded font-medium">
                {settings.numStrings}
              </span>
            </div>
            <Slider
              value={[settings.numStrings]}
              onValueChange={([v]) => { settings.numStrings = v; }}
              min={1000}
              max={9000}
              step={500}
              className="w-full"
            />
          </div>

          {/* Thickness */}
          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-xs text-gray-600">Thickness</Label>
              <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded font-medium">
                {settings.lineWidth.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[settings.lineWidth]}
              onValueChange={([v]) => { settings.lineWidth = v; }}
              min={0.1}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Color Palette */}
      {settings.mode === 'color' && (
        <Card className="bg-white p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Color palette</h3>
          <div className="space-y-3">
            {settings.selectedColors.slice(0, settings.numColors).map((color, idx) => (
              <div key={color.id} className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full shadow-md"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{color.name}</div>
                  <div className="text-xs text-gray-500 font-mono">{color.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}