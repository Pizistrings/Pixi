import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Upload, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function InputPanel({ image, onImageChange, settings, onSettingsChange }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onImageChange(file_url);
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setIsUploading(false);
  };

  const updateSetting = (key, value) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <Card className="border-2 border-dashed border-orange-300 bg-white">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Input canvas</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {image ? 'Change' : 'Upload'}
            </Button>
            {image && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSettingsChange(getDefaultSettings())}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Image Preview */}
        <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center mb-6 overflow-hidden">
          {image ? (
            <img
              src={image}
              alt="Input"
              className="w-full h-full object-cover"
              style={{
                filter: `brightness(${settings.brightness}%) contrast(${settings.contrast}%)`,
              }}
            />
          ) : (
            <div className="text-center p-8">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Upload an image to begin</p>
            </div>
          )}
        </div>
      </div>

      {/* Image Adjustments */}
      {image && (
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">Image Adjustments</h3>
            
            {/* Brightness */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <Label className="text-xs text-gray-600">Brightness</Label>
                <span className="text-xs text-gray-700 font-medium">{settings.brightness}%</span>
              </div>
              <Slider
                value={[settings.brightness]}
                onValueChange={([v]) => updateSetting('brightness', v)}
                min={50}
                max={150}
                step={5}
                className="w-full"
              />
            </div>

            {/* Contrast */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <Label className="text-xs text-gray-600">Contrast</Label>
                <span className="text-xs text-gray-700 font-medium">{settings.contrast}%</span>
              </div>
              <Slider
                value={[settings.contrast]}
                onValueChange={([v]) => updateSetting('contrast', v)}
                min={50}
                max={200}
                step={5}
                className="w-full"
              />
            </div>

            {/* Sharpness */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <Label className="text-xs text-gray-600">Sharpness</Label>
                <span className="text-xs text-gray-700 font-medium">{settings.sharpness}</span>
              </div>
              <Slider
                value={[settings.sharpness]}
                onValueChange={([v]) => updateSetting('sharpness', v)}
                min={0}
                max={10}
                step={1}
                className="w-full"
              />
            </div>

            {/* Crop X */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <Label className="text-xs text-gray-600">Crop X</Label>
                <span className="text-xs text-gray-700 font-medium">{settings.cropArea?.x || 0}%</span>
              </div>
              <Slider
                value={[settings.cropArea?.x || 0]}
                onValueChange={([v]) => updateSetting('cropArea', { ...settings.cropArea, x: v })}
                min={0}
                max={50}
                step={1}
                className="w-full"
              />
            </div>

            {/* Crop Y */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <Label className="text-xs text-gray-600">Crop Y</Label>
                <span className="text-xs text-gray-700 font-medium">{settings.cropArea?.y || 0}%</span>
              </div>
              <Slider
                value={[settings.cropArea?.y || 0]}
                onValueChange={([v]) => updateSetting('cropArea', { ...settings.cropArea, y: v })}
                min={0}
                max={50}
                step={1}
                className="w-full"
              />
            </div>

            {/* Crop Width */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <Label className="text-xs text-gray-600">Crop Width</Label>
                <span className="text-xs text-gray-700 font-medium">{settings.cropArea?.width || 100}%</span>
              </div>
              <Slider
                value={[settings.cropArea?.width || 100]}
                onValueChange={([v]) => updateSetting('cropArea', { ...settings.cropArea, width: v })}
                min={50}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Crop Height */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <Label className="text-xs text-gray-600">Crop Height</Label>
                <span className="text-xs text-gray-700 font-medium">{settings.cropArea?.height || 100}%</span>
              </div>
              <Slider
                value={[settings.cropArea?.height || 100]}
                onValueChange={([v]) => updateSetting('cropArea', { ...settings.cropArea, height: v })}
                min={50}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function getDefaultSettings() {
  return {
    brightness: 100,
    contrast: 100,
    sharpness: 0,
    cropArea: { x: 0, y: 0, width: 100, height: 100 }
  };
}