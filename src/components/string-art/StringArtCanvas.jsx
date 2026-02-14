import { forwardRef, useEffect, useRef, useState, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const StringArtCanvas = forwardRef(({ 
  stringPaths, 
  currentStep, 
  numPins, 
  colors,
  isProcessing,
  sourceImage,
  lineWidth = 0.3,
  lineOpacity = 0.15,
  shape = 'circle'
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pins, setPins] = useState([]);
  const [size, setSize] = useState(500);

  useImperativeHandle(ref, () => canvasRef.current);

  // Generate pin positions
  useEffect(() => {
    const newPins = [];
    const centerX = size / 2;
    const centerY = size / 2;
    const padding = 15;

    if (shape === 'circle') {
      const radius = (size / 2) - padding;
      for (let i = 0; i < numPins; i++) {
        const angle = (2 * Math.PI * i) / numPins;
        newPins.push({
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          index: i
        });
      }
    } else if (shape === 'square') {
      const sideLength = size - (padding * 2);
      const pinsPerSide = Math.floor(numPins / 4);
      
      for (let i = 0; i < numPins; i++) {
        const side = Math.floor(i / pinsPerSide);
        const posOnSide = (i % pinsPerSide) / pinsPerSide;
        
        if (side === 0) {
          newPins.push({ x: padding + posOnSide * sideLength, y: padding, index: i });
        } else if (side === 1) {
          newPins.push({ x: size - padding, y: padding + posOnSide * sideLength, index: i });
        } else if (side === 2) {
          newPins.push({ x: size - padding - posOnSide * sideLength, y: size - padding, index: i });
        } else {
          newPins.push({ x: padding, y: size - padding - posOnSide * sideLength, index: i });
        }
      }
    } else if (shape === 'rectangle') {
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
        newPins.push({ x: padding + (i / pinsTop) * width, y: padding + offsetY, index: pinIndex });
      }
      for (let i = 0; i < pinsRight; i++, pinIndex++) {
        newPins.push({ x: size - padding, y: padding + offsetY + (i / pinsRight) * height, index: pinIndex });
      }
      for (let i = 0; i < pinsBottom; i++, pinIndex++) {
        newPins.push({ x: size - padding - (i / pinsBottom) * width, y: padding + offsetY + height, index: pinIndex });
      }
      for (let i = 0; i < pinsLeft; i++, pinIndex++) {
        newPins.push({ x: padding, y: padding + offsetY + height - (i / pinsLeft) * height, index: pinIndex });
      }
    }
    
    setPins(newPins);
  }, [numPins, size, shape]);

  // Draw string art
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pins.length === 0) return;

    const ctx = canvas.getContext('2d');
    
    // Clear and set background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, size, size);

    // Draw source image as subtle overlay
    if (sourceImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = sourceImage;
      if (img.complete) {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(img, 0, 0, size, size);
        ctx.globalAlpha = 1;
      }
    }

    // Draw frame border (subtle)
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const centerX = size / 2;
    const centerY = size / 2;
    
    if (shape === 'circle') {
      const radius = (size / 2) - 10;
      ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI);
    } else if (shape === 'square') {
      const sideLength = size - 20;
      ctx.rect(10, 10, sideLength + 10, sideLength + 10);
    } else if (shape === 'rectangle') {
      const width = size - 20;
      const height = (size * 0.7);
      const offsetY = (size - height) / 2;
      ctx.rect(10, offsetY, width + 10, height + 10);
    }
    ctx.stroke();

    // Draw pins as small dots with numbers
    ctx.fillStyle = '#d4d4d4';
    pins.forEach(pin => {
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw pin numbers outside the frame
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    pins.forEach(pin => {
      // Calculate offset direction (outward from center)
      const dx = pin.x - centerX;
      const dy = pin.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        // Place number 12 pixels outside the pin
        const offsetX = (dx / dist) * 12;
        const offsetY = (dy / dist) * 12;
        ctx.fillText(pin.index.toString(), pin.x + offsetX, pin.y + offsetY);
      }
    });

    // Create color map
    const colorMap = {};
    colors.forEach(c => {
      colorMap[c.id] = c.hex;
    });

    // Draw strings up to current step
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = lineOpacity;

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

    // Draw current string being added (highlighted)
    if (currentStep > 0 && currentStep <= stringPaths.length) {
      const currentPath = stringPaths[currentStep - 1];
      const fromPin = pins[currentPath?.from];
      const toPin = pins[currentPath?.to];

      if (fromPin && toPin) {
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(fromPin.x, fromPin.y);
        ctx.lineTo(toPin.x, toPin.y);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Draw indicator arrow
        const midX = (fromPin.x + toPin.x) / 2;
        const midY = (fromPin.y + toPin.y) / 2;
        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.arc(toPin.x, toPin.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }, [stringPaths, currentStep, pins, colors, size, lineWidth, lineOpacity, shape]);

  return (
    <div ref={containerRef} className="relative aspect-square w-full max-w-[500px] mx-auto">
      {/* Background pattern */}
      <div 
        className="absolute inset-0 rounded-lg"
        style={{
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 10px,
              rgba(0,0,0,0.02) 10px,
              rgba(0,0,0,0.02) 11px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 10px,
              rgba(0,0,0,0.02) 10px,
              rgba(0,0,0,0.02) 11px
            )
          `
        }}
      />
      
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="w-full h-full rounded-lg shadow-inner relative z-10"
        style={{ background: '#fafafa' }}
      />

      {/* Processing overlay */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-20"
        >
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#ff6b35] mx-auto mb-3" />
            <p className="text-sm text-gray-600">Calculating string paths...</p>
            <p className="text-xs text-gray-400 mt-1">This may take a moment</p>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!isProcessing && stringPaths.length === 0 && sourceImage && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-center p-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <img 
                src={sourceImage} 
                alt="Source" 
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-sm text-gray-500">
              Click "Generate" to create string art
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

StringArtCanvas.displayName = 'StringArtCanvas';

export default StringArtCanvas;