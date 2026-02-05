import { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Upload, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ImagePrep({
  image,
  shape = 'circle',
  cropArea,
  brightness,
  contrast,
  sharpness,
  onImageChange,
  onCropChange,
  onBrightnessChange,
  onContrastChange,
  onSharpnessChange,
  onComplete
}) {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [localCrop, setLocalCrop] = useState(cropArea);

  useEffect(() => {
    setLocalCrop(cropArea);
  }, [cropArea]);

  // Draw preview with crop area overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      // Apply filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      
      // Draw image
      const cropX = (img.width * localCrop.x) / 100;
      const cropY = (img.height * localCrop.y) / 100;
      const cropW = (img.width * localCrop.width) / 100;
      const cropH = (img.height * localCrop.height) / 100;
      
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
      
      // Draw shape overlay
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 2;
      
      const centerX = size / 2;
      const centerY = size / 2;
      
      if (shape === 'circle') {
        const radius = (size / 2) * 0.9;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (shape === 'square') {
        const sideLength = size * 0.8;
        const offset = (size - sideLength) / 2;
        ctx.strokeRect(offset, offset, sideLength, sideLength);
      } else if (shape === 'rectangle') {
        const width = size * 0.8;
        const height = size * 0.6;
        const offsetX = (size - width) / 2;
        const offsetY = (size - height) / 2;
        ctx.strokeRect(offsetX, offsetY, width, height);
      }
    };
    
    img.src = image;
  }, [image, localCrop, shape, brightness, contrast, sharpness]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onImageChange(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropSlider = (field, value) => {
    const newCrop = { ...localCrop, [field]: value };
    setLocalCrop(newCrop);
    onCropChange(newCrop);
  };

  const handleReset = () => {
    setLocalCrop({ x: 0, y: 0, width: 100, height: 100 });
    onCropChange({ x: 0, y: 0, width: 100, height: 100 });
    onBrightnessChange(100);
    onContrastChange(100);
    onSharpnessChange(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="text-gray-500 hover:text-gray-700"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Preview */}
        <div className="p-6 bg-gray-50 flex items-center justify-center min-h-[420px]">
          {image ? (
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full"
            />
          ) : (
            <div className="text-center text-gray-400">
              <Upload className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Upload an image to get started</p>
            </div>
          )}
        </div>

        {/* Adjustments */}
        {image && (
          <div className="p-6 space-y-4 bg-white">
            {/* Brightness */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600 w-8">B</span>
              <Slider
                value={[brightness]}
                onValueChange={([v]) => onBrightnessChange(v)}
                min={50}
                max={150}
                step={5}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-10 text-right">{brightness}%</span>
            </div>

            {/* Contrast */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600 w-8">C</span>
              <Slider
                value={[contrast]}
                onValueChange={([v]) => onContrastChange(v)}
                min={50}
                max={200}
                step={5}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-10 text-right">{contrast}%</span>
            </div>

            {/* Sharpness */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600 w-8">S</span>
              <Slider
                value={[sharpness]}
                onValueChange={([v]) => onSharpnessChange(v)}
                min={0}
                max={10}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-10 text-right">{sharpness}</span>
            </div>

            {/* Crop Controls */}
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
              <p className="text-xs text-gray-500 font-medium">Crop Position</p>
              
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-600 w-8">X</span>
                <Slider
                  value={[localCrop.x]}
                  onValueChange={([v]) => handleCropSlider('x', v)}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-gray-500 w-10 text-right">{localCrop.x}%</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-600 w-8">Y</span>
                <Slider
                  value={[localCrop.y]}
                  onValueChange={([v]) => handleCropSlider('y', v)}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-gray-500 w-10 text-right">{localCrop.y}%</span>
              </div>

              <p className="text-xs text-gray-500 font-medium mt-4">Crop Size</p>

              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-600 w-8">W</span>
                <Slider
                  value={[localCrop.width]}
                  onValueChange={([v]) => handleCropSlider('width', v)}
                  min={20}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-gray-500 w-10 text-right">{localCrop.width}%</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-600 w-8">H</span>
                <Slider
                  value={[localCrop.height]}
                  onValueChange={([v]) => handleCropSlider('height', v)}
                  min={20}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-gray-500 w-10 text-right">{localCrop.height}%</span>
              </div>
            </div>

            <Button
              onClick={onComplete}
              className="w-full mt-6 bg-[#ff6b35] hover:bg-[#e55a2b] text-white"
            >
              Continue
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}