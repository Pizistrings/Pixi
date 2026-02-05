import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download, Settings, RefreshCw, FileText, QrCode, Mic, MicOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
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
  const [numColors, setNumColors] = useState(4);
  const [selectedColors, setSelectedColors] = useState([
    { name: 'Cyan', hex: '#00b4d8', id: 'C' },
    { name: 'Magenta', hex: '#e63946', id: 'M' },
    { name: 'Yellow', hex: '#ffd60a', id: 'Y' },
    { name: 'Black', hex: '#1a1a1a', id: 'K' },
    { name: 'Red', hex: '#dc2626', id: 'R' },
    { name: 'Green', hex: '#16a34a', id: 'G' },
    { name: 'Blue', hex: '#2563eb', id: 'B' },
    { name: 'Orange', hex: '#ea580c', id: 'O' }
  ]);
  const [colorDistribution, setColorDistribution] = useState({
    C: 100,
    M: 100,
    Y: 100,
    K: 150
  });
  const [shape, setShape] = useState('circle'); // 'circle', 'square', 'rectangle'
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [sharpness, setSharpness] = useState(0);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [isGenerated, setIsGenerated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImageSettings, setShowImageSettings] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceDelay, setVoiceDelay] = useState(3);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [minPinDistance, setMinPinDistance] = useState(30);
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);

  // Color configuration for string art
  const colors = mode === 'mono' 
    ? [{ name: 'Black', hex: '#1a1a1a', id: 'K' }]
    : selectedColors.slice(0, numColors);

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
    
    // Apply crop
    const cropX = (img.width * cropArea.x) / 100;
    const cropY = (img.height * cropArea.y) / 100;
    const cropW = (img.width * cropArea.width) / 100;
    const cropH = (img.height * cropArea.height) / 100;
    
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, size, size);
    
    // Apply sharpness
    if (sharpness > 0) {
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      const factor = sharpness / 10;
      
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
    
    // Generate pin positions based on shape
    const pins = [];
    const centerX = size / 2;
    const centerY = size / 2;
    const padding = 20;
    
    if (shape === 'circle') {
      const radius = (size / 2) - padding;
      for (let i = 0; i < numPins; i++) {
        const angle = (2 * Math.PI * i) / numPins;
        pins.push({
          x: Math.round(centerX + radius * Math.cos(angle)),
          y: Math.round(centerY + radius * Math.sin(angle)),
          index: i
        });
      }
    } else if (shape === 'square') {
      const sideLength = size - (padding * 2);
      const pinsPerSide = Math.floor(numPins / 4);
      
      for (let i = 0; i < numPins; i++) {
        const side = Math.floor(i / pinsPerSide);
        const posOnSide = (i % pinsPerSide) / pinsPerSide;
        
        if (side === 0) { // Top
          pins.push({ x: Math.round(padding + posOnSide * sideLength), y: padding, index: i });
        } else if (side === 1) { // Right
          pins.push({ x: size - padding, y: Math.round(padding + posOnSide * sideLength), index: i });
        } else if (side === 2) { // Bottom
          pins.push({ x: Math.round(size - padding - posOnSide * sideLength), y: size - padding, index: i });
        } else { // Left
          pins.push({ x: padding, y: Math.round(size - padding - posOnSide * sideLength), index: i });
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
        pins.push({ x: Math.round(padding + (i / pinsTop) * width), y: padding + offsetY, index: pinIndex });
      }
      for (let i = 0; i < pinsRight; i++, pinIndex++) {
        pins.push({ x: size - padding, y: Math.round(padding + offsetY + (i / pinsRight) * height), index: pinIndex });
      }
      for (let i = 0; i < pinsBottom; i++, pinIndex++) {
        pins.push({ x: Math.round(size - padding - (i / pinsBottom) * width), y: padding + offsetY + height, index: pinIndex });
      }
      for (let i = 0; i < pinsLeft; i++, pinIndex++) {
        pins.push({ x: padding, y: Math.round(padding + offsetY + height - (i / pinsLeft) * height), index: pinIndex });
      }
    }
    
    // Generate string paths using a greedy algorithm
    const paths = [];
    const layerCounts = {};
    
    // Create working copy of image data for each color channel
    const workingData = {};
    colors.forEach(color => {
      workingData[color.id] = new Float32Array(size * size);
    });
    
    // Calculate color similarity for each pixel
    for (let i = 0; i < size * size; i++) {
      const r = imageData.data[i * 4];
      const g = imageData.data[i * 4 + 1];
      const b = imageData.data[i * 4 + 2];
      
      colors.forEach(color => {
        // Parse hex color
        const targetR = parseInt(color.hex.slice(1, 3), 16);
        const targetG = parseInt(color.hex.slice(3, 5), 16);
        const targetB = parseInt(color.hex.slice(5, 7), 16);
        
        // Calculate color distance (inverted so closer = higher value)
        const distance = Math.sqrt(
          Math.pow(r - targetR, 2) +
          Math.pow(g - targetG, 2) +
          Math.pow(b - targetB, 2)
        );
        
        // Convert to similarity (0-1 range)
        workingData[color.id][i] = Math.max(0, 1 - distance / 441); // 441 = sqrt(255^2 * 3)
      });
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
    
    const activeColors = mode === 'mono' ? ['K'] : colors.map(c => c.id);
    
    // Use color run to alternate between colors
    const colorRunLengths = {};
    if (mode === 'mono') {
      colorRunLengths.K = numStrings;
    } else {
      activeColors.forEach(id => {
        colorRunLengths[id] = colorDistribution[id] || 100;
      });
    }
    
    let currentColorIndex = 0;
    let stringsInCurrentRun = 0;
    let currentPin = Math.floor(Math.random() * numPins);
    
    // Define color line ranges with mixed approach
    const firstColorLines = 1000;
    const lastOutlineLines = 8000;
    const midSectionLines = numStrings - firstColorLines - lastOutlineLines;
    const colorOnlyIds = mode === 'mono' ? ['K'] : activeColors.filter(id => id !== 'K');
    
    for (let totalStringsDrawn = 0; totalStringsDrawn < numStrings; totalStringsDrawn++) {
      let colorId;
      
      // First 1000 lines: mix of 3 colors + black for details
      if (totalStringsDrawn < firstColorLines) {
        if (stringsInCurrentRun >= colorRunLengths[activeColors[currentColorIndex]]) {
          currentColorIndex = (currentColorIndex + 1) % activeColors.length;
          stringsInCurrentRun = 0;
        }
        colorId = activeColors[currentColorIndex];
        stringsInCurrentRun++;
      }
      // Middle section: more colors with black
      else if (totalStringsDrawn < firstColorLines + midSectionLines) {
        const shouldUseBlack = Math.random() < 0.3; // 30% black
        if (shouldUseBlack) {
          colorId = 'K';
        } else {
          if (stringsInCurrentRun >= colorRunLengths[activeColors[currentColorIndex]]) {
            currentColorIndex = (currentColorIndex + 1) % activeColors.length;
            stringsInCurrentRun = 0;
          }
          colorId = activeColors[currentColorIndex];
          stringsInCurrentRun++;
        }
      }
      // Last 7-9k lines: mostly black with outline emphasis
      else {
        const shouldUseColor = Math.random() < 0.15; // 15% color for detail
        if (shouldUseColor) {
          colorId = activeColors[Math.floor(Math.random() * activeColors.length)];
        } else {
          colorId = 'K';
        }
      }
      
      let bestPin = -1;
      let bestScore = -Infinity;
      
      // Find the best next pin
      for (let nextPin = 0; nextPin < numPins; nextPin++) {
        if (nextPin === currentPin) continue;
        
        // Skip nearby pins with proper wrapping
        const pinDist = Math.abs(nextPin - currentPin);
        const wrappedDist = Math.min(pinDist, numPins - pinDist);
        if (wrappedDist < minPinDistance) continue;
        
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
      layerCounts[colorId] = (layerCounts[colorId] || 0) + 1;
      
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
  }, [image, mode, numPins, numStrings, colors, colorDistribution, shape, brightness, contrast, sharpness, cropArea, minPinDistance]);

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

  const downloadPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageHeight = pdf.internal.pageSize.height;
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 10;
    const colWidth = 28;
    const rowHeight = 5;
    
    // Group consecutive color runs
    const colorRuns = [];
    let currentRun = null;
    
    stringPaths.forEach((path, idx) => {
      if (!currentRun || currentRun.colorId !== path.color) {
        if (currentRun) {
          colorRuns.push(currentRun);
        }
        const color = colorLayers.find(l => l.id === path.color);
        currentRun = {
          colorId: path.color,
          colorName: color?.name || 'Unknown',
          colorHex: color?.hex || '#000000',
          startStep: idx + 1,
          steps: []
        };
      }
      currentRun.steps.push({ stepNum: idx + 1, toPin: path.to });
    });
    if (currentRun) {
      colorRuns.push(currentRun);
    }
    
    let currentY = margin;
    
    colorRuns.forEach((run) => {
      const rgb = hexToRgb(run.colorHex);
      const endStep = run.startStep + run.steps.length - 1;
      const headerHeight = 16;
      const itemsPerRow = Math.floor((pageWidth - 2 * margin) / colWidth);
      const rowsNeeded = Math.ceil(run.steps.length / itemsPerRow);
      const sectionHeight = headerHeight + (rowsNeeded * rowHeight) + 8;
      
      // Check if section fits on current page
      if (currentY + sectionHeight > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
      }
      
      // Color header
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.circle(margin + 3, currentY + 3, 3, 'F');
      pdf.setFontSize(12);
      pdf.setTextColor(rgb.r, rgb.g, rgb.b);
      pdf.text(`${run.colorName} (${run.startStep}-${endStep})`, margin + 8, currentY + 5);
      currentY += headerHeight;
      
      // Print steps
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      
      run.steps.forEach((step, idx) => {
        const col = idx % itemsPerRow;
        const row = Math.floor(idx / itemsPerRow);
        const x = margin + (col * colWidth);
        const y = currentY + (row * rowHeight);
        
        pdf.text(`${step.stepNum}→${step.toPin}`, x, y);
      });
      
      currentY += (rowsNeeded * rowHeight) + 8;
    });
    
    pdf.save('string-art-pattern.pdf');
  };
  
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const generateQRCode = async () => {
    if (!canvasRef.current) return;
    
    try {
      const QRCode = (await import('qrcode')).default;
      const { base44 } = await import('@/api/base44Client');
      
      // Upload the canvas image
      const blob = await new Promise(resolve => canvasRef.current.toBlob(resolve, 'image/jpeg', 0.7));
      const imageFile = new File([blob], 'string-art.jpg', { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
      
      // Create pattern data
      const patternData = {
        img: file_url,
        colors: colorLayers.map(c => ({ n: c.name, h: c.hex, c: c.count, id: c.id })),
        pins: numPins,
        total: totalSteps,
        paths: stringPaths.map(p => ({ f: p.from, t: p.to, c: p.color }))
      };
      
      // Upload pattern data as JSON file
      const jsonBlob = new Blob([JSON.stringify(patternData)], { type: 'application/json' });
      const jsonFile = new File([jsonBlob], 'pattern.json', { type: 'application/json' });
      const { file_url: patternUrl } = await base44.integrations.Core.UploadFile({ file: jsonFile });
      
      // Create short shareable URL
      const shareUrl = `${window.location.origin}${window.location.pathname}#pattern/${encodeURIComponent(patternUrl)}`;
      
      // Generate QR code
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, shareUrl, { width: 300, margin: 2, errorCorrectionLevel: 'L' });
      
      // Open QR code in new window
      const qrWindow = window.open('', '_blank');
      qrWindow.document.write(`
        <html>
          <head>
            <title>String Art Pattern QR Code</title>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: system-ui, -apple-system, sans-serif;
                background: #f5f5f5;
                padding: 1rem;
              }
              .container {
                background: white;
                padding: 2rem;
                border-radius: 1rem;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 400px;
                width: 100%;
              }
              h1 {
                margin: 0 0 1rem 0;
                font-size: 1.5rem;
                color: #333;
              }
              p {
                margin: 0.5rem 0;
                color: #666;
                font-size: 0.9rem;
              }
              canvas {
                margin: 1rem 0;
                max-width: 100%;
                height: auto;
              }
              .voice-note {
                background: #fff3cd;
                padding: 1rem;
                border-radius: 0.5rem;
                margin-top: 1rem;
                font-size: 0.85rem;
                text-align: left;
              }
              .voice-note strong { color: #856404; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🧵 String Art Pattern</h1>
              <p>Scan this QR code to view and follow the pattern on your phone</p>
              ${qrCanvas.outerHTML}
              <p><small>${totalSteps.toLocaleString()} steps • ${colorLayers.length} colors</small></p>
              <div class="voice-note">
                <strong>📱 Voice Control Enabled!</strong>
                <p>Use voice commands on your phone:</p>
                <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                  <li>"Next step"</li>
                  <li>"Color next"</li>
                  <li>"Play" / "Pause"</li>
                </ul>
                <p style="margin-top: 0.5rem;"><small>Delay: 1-10 seconds (adjustable in settings)</small></p>
              </div>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('QR generation error:', error);
      alert('Failed to generate QR code. The pattern might be too large.');
    }
  };

  // Voice commands
  useEffect(() => {
    if (!voiceEnabled) {
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
      
      setTimeout(() => {
        if (command.includes('next step') || command.includes('next')) {
          setCurrentStep(prev => Math.min(prev + 1, totalSteps));
        } else if (command.includes('color next') || command.includes('next color')) {
          const nextColorStep = stringPaths.findIndex((p, i) => 
            i > currentStep && p.color !== stringPaths[currentStep]?.color
          );
          if (nextColorStep !== -1) {
            setCurrentStep(nextColorStep);
          }
        } else if (command.includes('change') || command.includes('change color')) {
          const nextColorStep = stringPaths.findIndex((p, i) => 
            i > currentStep && p.color !== stringPaths[currentStep]?.color
          );
          if (nextColorStep !== -1) {
            setCurrentStep(nextColorStep);
          }
        } else if (command.includes('play')) {
          setIsPlaying(true);
        } else if (command.includes('pause') || command.includes('stop')) {
          setIsPlaying(false);
        } else if (command.includes('reset')) {
          setCurrentStep(0);
          setIsPlaying(false);
        }
      }, voiceDelay * 1000);
    };

    recognition.start();
    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [voiceEnabled, voiceDelay, currentStep, totalSteps, stringPaths]);

  // Edit color after generation
  const handleEditColor = (colorId, newHex) => {
    const updatedLayers = colorLayers.map(layer => 
      layer.id === colorId ? { ...layer, hex: newHex } : layer
    );
    setColorLayers(updatedLayers);
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
                    shape={shape}
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

                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setVoiceEnabled(!voiceEnabled)}
                        disabled={!isGenerated}
                        className={`hover:bg-white ${voiceEnabled ? 'bg-[#ff6b35] text-white hover:bg-[#e55a2b]' : ''}`}
                      >
                        {voiceEnabled ? (
                          <Mic className="w-4 h-4" />
                        ) : (
                          <MicOff className="w-4 h-4" />
                        )}
                      </Button>
                      {voiceEnabled && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    
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
                  <div className="relative">
                    <Button
                      variant="outline"
                      onClick={() => setShowExportMenu(!showExportMenu)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    {showExportMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 min-w-[180px]"
                      >
                        <button
                          onClick={() => {
                            downloadCanvas();
                            setShowExportMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Save Image
                        </button>
                        <button
                          onClick={() => {
                            downloadPDF();
                            setShowExportMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Download PDF
                        </button>
                        <button
                          onClick={() => {
                            generateQRCode();
                            setShowExportMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <QrCode className="w-4 h-4" />
                          Share QR Code
                        </button>
                      </motion.div>
                    )}
                  </div>
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
                      
                      <div className="text-xs text-gray-500 pt-2 border-t">
                        Total Pins: <span className="font-medium text-gray-700">{numPins}</span>
                      </div>
                      
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
                mode={mode}
                colorDistribution={colorDistribution}
                onColorDistributionChange={setColorDistribution}
                totalStrings={numStrings}
                selectedColors={selectedColors}
                setSelectedColors={setSelectedColors}
                numColors={numColors}
                onEditColor={handleEditColor}
                isGenerated={isGenerated}
              />

              {/* Voice Control Settings */}
              {voiceEnabled && (
                <Card className="bg-white border-0 shadow-sm p-6">
                  <h3 className="text-sm text-gray-500 mb-3">Voice Control</h3>
                  <div className="space-y-3">
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>• "Next step" - Move to next step</p>
                      <p>• "Color next" - Jump to next color</p>
                      <p>• "Change" - Change to next color</p>
                      <p>• "Play" / "Pause" - Control playback</p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-xs text-gray-500">Command Delay</Label>
                        <span className="text-xs text-gray-700 font-medium">{voiceDelay}s</span>
                      </div>
                      <Slider
                        value={[voiceDelay]}
                        onValueChange={([v]) => setVoiceDelay(v)}
                        min={1}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </Card>
              )}

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
                  {/* Shape Selection */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block">Shape</Label>
                    <Tabs value={shape} onValueChange={setShape}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="circle">Circle</TabsTrigger>
                        <TabsTrigger value="square">Square</TabsTrigger>
                        <TabsTrigger value="rectangle">Rectangle</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

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

                  {/* Image Adjustments Toggle */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowImageSettings(!showImageSettings)}
                      className="w-full justify-between"
                    >
                      <span className="text-xs">Image Adjustments</span>
                      <span className="text-xs">{showImageSettings ? '−' : '+'}</span>
                    </Button>
                  </div>

                  <AnimatePresence>
                    {showImageSettings && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden"
                      >
                        {/* Brightness */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-xs text-gray-500">Brightness</Label>
                            <span className="text-xs text-gray-700 font-medium">{brightness}%</span>
                          </div>
                          <Slider
                            value={[brightness]}
                            onValueChange={([v]) => setBrightness(v)}
                            min={50}
                            max={150}
                            step={5}
                            className="w-full"
                          />
                        </div>

                        {/* Contrast */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-xs text-gray-500">Contrast</Label>
                            <span className="text-xs text-gray-700 font-medium">{contrast}%</span>
                          </div>
                          <Slider
                            value={[contrast]}
                            onValueChange={([v]) => setContrast(v)}
                            min={50}
                            max={200}
                            step={5}
                            className="w-full"
                          />
                        </div>

                        {/* Sharpness */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-xs text-gray-500">Sharpness</Label>
                            <span className="text-xs text-gray-700 font-medium">{sharpness}</span>
                          </div>
                          <Slider
                            value={[sharpness]}
                            onValueChange={([v]) => setSharpness(v)}
                            min={0}
                            max={10}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                           min={200}
                           max={1000}
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

                        {/* Number of Colors */}
                        {mode === 'color' && (
                          <div>
                            <div className="flex justify-between mb-2">
                              <Label className="text-xs text-gray-500">Number of Colors</Label>
                              <span className="text-xs text-gray-700 font-medium">{numColors}</span>
                            </div>
                            <Slider
                              value={[numColors]}
                              onValueChange={([v]) => {
                                setNumColors(v);
                                const newDist = {};
                                const activeColors = selectedColors.slice(0, v);
                                activeColors.forEach((color, idx) => {
                                  newDist[color.id] = idx === v - 1 ? 150 : 100;
                                });
                                setColorDistribution(newDist);
                              }}
                              min={2}
                              max={Math.min(8, selectedColors.length)}
                              step={1}
                              className="w-full"
                            />
                          </div>
                        )}

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

                        {/* Minimum Pin Distance */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-xs text-gray-500">Min Pin Distance</Label>
                            <span className="text-xs text-gray-700 font-medium">{minPinDistance}</span>
                          </div>
                          <Slider
                            value={[minPinDistance]}
                            onValueChange={([v]) => setMinPinDistance(v)}
                            min={15}
                            max={50}
                            step={5}
                            className="w-full"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Editable Lines (After Generation) */}
                  {isGenerated && (
                    <div className="pt-4 border-t border-gray-100">
                      <div className="text-center mb-3">
                        <span className="text-2xl font-light text-[#ff6b35]">
                          {currentStep.toLocaleString()}
                        </span>
                        <span className="text-xl text-gray-400"> / </span>
                        <span className="text-xl text-gray-600">
                          {totalSteps.toLocaleString()}
                        </span>
                      </div>
                      
                      <Slider
                        value={[currentStep]}
                        onValueChange={([v]) => {
                          setCurrentStep(v);
                          setIsPlaying(false);
                        }}
                        min={0}
                        max={totalSteps}
                        step={1}
                        className="w-full mb-3"
                      />
                      
                      {/* Jump to specific line */}
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Jump to..."
                          min={0}
                          max={totalSteps}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const value = parseInt(e.target.value);
                              if (value >= 0 && value <= totalSteps) {
                                setCurrentStep(value);
                                setIsPlaying(false);
                                e.target.value = '';
                              }
                            }
                          }}
                          className="text-sm h-8"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            const input = e.target.closest('div').querySelector('input');
                            const value = parseInt(input.value);
                            if (value >= 0 && value <= totalSteps) {
                              setCurrentStep(value);
                              setIsPlaying(false);
                              input.value = '';
                            }
                          }}
                          className="h-8 px-3 text-xs"
                        >
                          Go
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}