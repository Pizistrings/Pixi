import { useRef, useEffect } from 'react';
import { Upload, RotateCcw, Plus, Minus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function InputCanvas({ image, onImageUpload, config, onConfigChange }) {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      
      ctx.filter = `brightness(${config.brightness}%) contrast(${config.contrast}%)`;
      ctx.drawImage(img, 0, 0, 400, 400);
    };
    
    img.src = image;
  }, [image, config.brightness, config.contrast]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => onImageUpload(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card className="p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Input canvas</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Canvas */}
      <div className="border-2 border-dashed border-[#ff6b35] rounded-lg aspect-square mb-4 bg-gray-50 flex items-center justify-center">
        {image ? (
          <canvas ref={canvasRef} className="max-w-full max-h-full" />
        ) : (
          <div className="text-center p-8">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 mx-auto mb-4 bg-[#ff6b35] rounded-2xl flex items-center justify-center cursor-pointer hover:bg-[#e55a2b] transition-colors"
            >
              <Plus className="w-12 h-12 text-white" />
            </div>
            <p className="text-gray-500 text-sm">UPLOAD</p>
          </div>
        )}
      </div>

      {/* Image Controls */}
      {image && (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs text-gray-600">Brightness</Label>
              <span className="text-xs text-[#ff6b35] font-medium">{config.brightness}%</span>
            </div>
            <Slider
              value={[config.brightness]}
              onValueChange={([v]) => onConfigChange({ ...config, brightness: v })}
              min={50}
              max={150}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs text-gray-600">Contrast</Label>
              <span className="text-xs text-[#ff6b35] font-medium">{config.contrast}%</span>
            </div>
            <Slider
              value={[config.contrast]}
              onValueChange={([v]) => onConfigChange({ ...config, contrast: v })}
              min={50}
              max={200}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs text-gray-600">Sharpness</Label>
              <span className="text-xs text-[#ff6b35] font-medium">{config.sharpness}</span>
            </div>
            <Slider
              value={[config.sharpness]}
              onValueChange={([v]) => onConfigChange({ ...config, sharpness: v })}
              min={0}
              max={10}
              className="w-full"
            />
          </div>
        </div>
      )}
    </Card>
  );
}