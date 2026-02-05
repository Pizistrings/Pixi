import { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';

export default function ImageCropper({ 
  image, 
  shape = 'circle', 
  cropArea, 
  onCropChange, 
  onCropComplete 
}) {
  const canvasRef = useRef(null);
  const [localCrop, setLocalCrop] = useState(cropArea);

  useEffect(() => {
    setLocalCrop(cropArea);
  }, [shape, cropArea]);

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
      
      // Draw image
      const cropX = (img.width * localCrop.x) / 100;
      const cropY = (img.height * localCrop.y) / 100;
      const cropW = (img.width * localCrop.width) / 100;
      const cropH = (img.height * localCrop.height) / 100;
      
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, size, size);
      
      // Draw crop overlay based on shape
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      
      const centerX = size / 2;
      const centerY = size / 2;
      
      if (shape === 'circle') {
        const radius = (size / 2) * 0.9;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Draw safe zone indicator
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
      } else if (shape === 'square') {
        const sideLength = size * 0.8;
        const offset = (size - sideLength) / 2;
        ctx.strokeRect(offset, offset, sideLength, sideLength);
        
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#ff6b35';
        ctx.fillRect(offset, offset, sideLength, sideLength);
      } else if (shape === 'rectangle') {
        const width = size * 0.8;
        const height = size * 0.6;
        const offsetX = (size - width) / 2;
        const offsetY = (size - height) / 2;
        ctx.strokeRect(offsetX, offsetY, width, height);
        
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#ff6b35';
        ctx.fillRect(offsetX, offsetY, width, height);
      }
    };
    
    img.src = image;
  }, [image, localCrop, shape]);

  const handleSliderChange = (field, value) => {
    const newCrop = { ...localCrop, [field]: value };
    setLocalCrop(newCrop);
    onCropChange(newCrop);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="bg-white border-0 shadow-sm p-6">
        <h3 className="text-sm text-gray-500 mb-4">Crop Image for {shape}</h3>
        
        <canvas
          ref={canvasRef}
          className="w-full h-auto rounded-lg mb-6 bg-gray-50"
          style={{ maxWidth: '400px', margin: '0 auto 1.5rem' }}
        />

        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-xs text-gray-500">Horizontal Position</Label>
              <span className="text-xs text-gray-700 font-medium">{localCrop.x}%</span>
            </div>
            <Slider
              value={[localCrop.x]}
              onValueChange={([v]) => handleSliderChange('x', v)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-xs text-gray-500">Vertical Position</Label>
              <span className="text-xs text-gray-700 font-medium">{localCrop.y}%</span>
            </div>
            <Slider
              value={[localCrop.y]}
              onValueChange={([v]) => handleSliderChange('y', v)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-xs text-gray-500">Width</Label>
              <span className="text-xs text-gray-700 font-medium">{localCrop.width}%</span>
            </div>
            <Slider
              value={[localCrop.width]}
              onValueChange={([v]) => handleSliderChange('width', v)}
              min={20}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-xs text-gray-500">Height</Label>
              <span className="text-xs text-gray-700 font-medium">{localCrop.height}%</span>
            </div>
            <Slider
              value={[localCrop.height]}
              onValueChange={([v]) => handleSliderChange('height', v)}
              min={20}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        <Button
          onClick={onCropComplete}
          className="w-full mt-6 bg-[#ff6b35] hover:bg-[#e55a2b] text-white"
        >
          Confirm Crop
        </Button>
      </Card>
    </motion.div>
  );
}