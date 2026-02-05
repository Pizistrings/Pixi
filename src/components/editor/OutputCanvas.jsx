import { forwardRef, useRef, useEffect, useState, useImperativeHandle } from 'react';
import { Play, CheckCircle2, Settings as SettingsIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const OutputCanvas = forwardRef(({ 
  image, 
  shape, 
  colors, 
  config, 
  mode,
  isGenerated,
  onGenerate,
  stringPaths,
  onStringPathsChange
}, ref) => {
  const canvasRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pins, setPins] = useState([]);

  useImperativeHandle(ref, () => canvasRef.current);

  // Generate string art
  const generateArt = async () => {
    if (!image) return;
    
    setIsProcessing(true);
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

    ctx.filter = `brightness(${config.brightness}%) contrast(${config.contrast}%)`;
    ctx.drawImage(img, 0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const newPins = generatePins(size, shape);
    setPins(newPins);

    const paths = generatePaths(imageData, newPins, colors, config, mode, size);
    onStringPathsChange(paths);
    setIsProcessing(false);
  };

  useEffect(() => {
    if (isGenerated && image) {
      generateArt();
    }
  }, [isGenerated]);

  // Draw canvas
  useEffect(() => {
    if (!canvasRef.current || pins.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = 400;

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, size, size);

    // Draw frame
    drawFrame(ctx, size, shape);

    // Draw pins
    ctx.fillStyle = '#d4d4d4';
    pins.forEach(pin => {
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw strings
    const colorMap = {};
    colors.forEach(c => colorMap[c.id] = c.hex);

    ctx.lineWidth = config.thickness;
    ctx.globalAlpha = 0.15;

    stringPaths.forEach(path => {
      const fromPin = pins[path.from];
      const toPin = pins[path.to];

      if (fromPin && toPin) {
        ctx.strokeStyle = colorMap[path.color] || '#000000';
        ctx.beginPath();
        ctx.moveTo(fromPin.x, fromPin.y);
        ctx.lineTo(toPin.x, toPin.y);
        ctx.stroke();
      }
    });

    ctx.globalAlpha = 1;
  }, [pins, stringPaths, shape, colors, config.thickness]);

  return (
    <Card className="p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Output canvas</h3>
        <div className="flex gap-2">
          <Button
            onClick={onGenerate}
            disabled={!image || isProcessing}
            className="bg-[#ff6b35] hover:bg-[#e55a2b]"
          >
            <Play className="w-4 h-4 mr-2" />
            Generate
          </Button>
          <Button variant="outline" size="sm">
            <SettingsIcon className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <CheckCircle2 className="w-4 h-4" />
            Draft
          </Button>
          <Button className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Create
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="border-2 border-dashed border-[#ff6b35] rounded-lg aspect-square mb-4 bg-gray-50 flex items-center justify-center">
        {isProcessing ? (
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Generating...</p>
          </div>
        ) : stringPaths.length > 0 ? (
          <canvas ref={canvasRef} width={400} height={400} className="max-w-full max-h-full" />
        ) : (
          <div className="text-center text-gray-400 p-8">
            <p className="text-sm">Click Generate to create string art</p>
          </div>
        )}
      </div>

      {/* Output Controls */}
      {stringPaths.length > 0 && (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs text-gray-600">Line Thickness</Label>
              <span className="text-xs text-[#ff6b35] font-medium">{config.thickness}</span>
            </div>
            <Slider
              value={[config.thickness]}
              onValueChange={([v]) => onGenerate.onConfigChange?.({ ...config, thickness: v })}
              min={1}
              max={3}
              className="w-full"
            />
          </div>
        </div>
      )}
    </Card>
  );
});

// Helper functions
function generatePins(size, shape) {
  const pins = [];
  const centerX = size / 2;
  const centerY = size / 2;
  const padding = 20;
  const numPins = shape.pins;

  if (shape.type === 'circle') {
    const radius = (size / 2) - padding;
    for (let i = 0; i < numPins; i++) {
      const angle = (2 * Math.PI * i) / numPins;
      pins.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        index: i
      });
    }
  } else if (shape.type === 'square') {
    const sideLength = size - (padding * 2);
    const pinsPerSide = Math.floor(numPins / 4);
    
    for (let i = 0; i < numPins; i++) {
      const side = Math.floor(i / pinsPerSide);
      const posOnSide = (i % pinsPerSide) / pinsPerSide;
      
      if (side === 0) {
        pins.push({ x: padding + posOnSide * sideLength, y: padding, index: i });
      } else if (side === 1) {
        pins.push({ x: size - padding, y: padding + posOnSide * sideLength, index: i });
      } else if (side === 2) {
        pins.push({ x: size - padding - posOnSide * sideLength, y: size - padding, index: i });
      } else {
        pins.push({ x: padding, y: size - padding - posOnSide * sideLength, index: i });
      }
    }
  } else if (shape.type === 'rectangle') {
    const width = size - (padding * 2);
    const height = (size * 0.7) - (padding * 2);
    const offsetY = (size - height - padding * 2) / 2;
    
    const perimeter = 2 * (width + height);
    const pinsTop = Math.floor((width / perimeter) * numPins);
    const pinsRight = Math.floor((height / perimeter) * numPins);
    const pinsBottom = pinsTop;
    const pinsLeft = numPins - pinsTop - pinsRight - pinsBottom;
    
    let pinIndex = 0;
    for (let i = 0; i < pinsTop; i++, pinIndex++) {
      pins.push({ x: padding + (i / pinsTop) * width, y: padding + offsetY, index: pinIndex });
    }
    for (let i = 0; i < pinsRight; i++, pinIndex++) {
      pins.push({ x: size - padding, y: padding + offsetY + (i / pinsRight) * height, index: pinIndex });
    }
    for (let i = 0; i < pinsBottom; i++, pinIndex++) {
      pins.push({ x: size - padding - (i / pinsBottom) * width, y: padding + offsetY + height, index: pinIndex });
    }
    for (let i = 0; i < pinsLeft; i++, pinIndex++) {
      pins.push({ x: padding, y: padding + offsetY + height - (i / pinsLeft) * height, index: pinIndex });
    }
  }

  return pins;
}

function generatePaths(imageData, pins, colors, config, mode, size) {
  const paths = [];
  const workingData = {};
  
  const activeColors = mode === 'mono' ? [colors[0]] : colors.filter(c => c.distribution !== undefined);
  
  activeColors.forEach(color => {
    workingData[color.id] = new Float32Array(size * size);
  });

  for (let i = 0; i < size * size; i++) {
    const r = imageData.data[i * 4];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    
    if (mode === 'mono') {
      workingData[activeColors[0].id][i] = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    } else {
      activeColors.forEach(color => {
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
  }

  for (const color of activeColors) {
    let currentPin = Math.floor(Math.random() * pins.length);
    const stringsForColor = Math.floor(config.steps / activeColors.length);
    
    for (let s = 0; s < stringsForColor; s++) {
      let bestPin = -1;
      let bestScore = -Infinity;
      
      for (let nextPin = 0; nextPin < pins.length; nextPin++) {
        if (nextPin === currentPin) continue;
        
        const pinDist = Math.abs(nextPin - currentPin);
        if (pinDist < config.minDistance && pinDist > pins.length - config.minDistance) continue;
        
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
            score += workingData[color.id][y * size + x];
          }
        }
        score /= steps;
        
        if (score > bestScore) {
          bestScore = score;
          bestPin = nextPin;
        }
      }
      
      if (bestPin === -1) break;
      
      paths.push({
        from: currentPin,
        to: bestPin,
        color: color.id,
        step: paths.length
      });
      
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
          workingData[color.id][y * size + x] = Math.max(0, workingData[color.id][y * size + x] - (config.fade / 100));
        }
      }
      
      currentPin = bestPin;
    }
  }

  return paths;
}

function drawFrame(ctx, size, shape) {
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  const centerX = size / 2;
  const centerY = size / 2;
  
  if (shape.type === 'circle') {
    const radius = (size / 2) - 15;
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  } else if (shape.type === 'square') {
    const sideLength = size - 30;
    ctx.rect(15, 15, sideLength, sideLength);
  } else if (shape.type === 'rectangle') {
    const width = size - 30;
    const height = (size * 0.7) - 10;
    const offsetY = (size - height) / 2;
    ctx.rect(15, offsetY, width, height);
  }
  ctx.stroke();
}

OutputCanvas.displayName = 'OutputCanvas';

export default OutputCanvas;