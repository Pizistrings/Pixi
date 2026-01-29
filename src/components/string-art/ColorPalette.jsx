import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, Star, Sliders } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function ColorPalette({ open, onOpenChange, selectedColors, onColorsChange }) {
  const [showBrightnessControls, setShowBrightnessControls] = useState(false);
  const [customColor, setCustomColor] = useState('#ff0000');

  const toggleColor = (color) => {
    const exists = selectedColors.find(c => c.hex === color.hex);
    if (exists) {
      onColorsChange(selectedColors.filter(c => c.hex !== color.hex));
    } else {
      if (selectedColors.length < 3) {
        onColorsChange([...selectedColors, { ...color, brightness: 0, favorite: false }]);
      }
    }
  };

  const toggleFavorite = (hex) => {
    onColorsChange(
      selectedColors.map(c => 
        c.hex === hex ? { ...c, favorite: !c.favorite } : c
      )
    );
  };

  const updateBrightness = (hex, brightness) => {
    onColorsChange(
      selectedColors.map(c => 
        c.hex === hex ? { ...c, brightness } : c
      )
    );
  };

  const addCustomColor = () => {
    if (selectedColors.length < 3) {
      onColorsChange([...selectedColors, {
        hex: customColor,
        name: customColor,
        brightness: 0,
        favorite: false
      }]);
    }
  };

  const presetColors = [
    { hex: '#000000', name: 'Black' },
    { hex: '#f60404', name: '#f60404' },
    { hex: '#f4fcfc', name: '#f4fcfc' },
    { hex: '#ffffff', name: 'White' },
    { hex: '#0000ff', name: 'Blue' },
    { hex: '#00ff00', name: 'Green' },
    { hex: '#ffff00', name: 'Yellow' },
    { hex: '#ff00ff', name: 'Magenta' },
    { hex: '#00ffff', name: 'Cyan' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select thread colors ({selectedColors.length})</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selected Colors */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Selected colors</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={showBrightnessControls}
                  onCheckedChange={setShowBrightnessControls}
                  id="brightness-toggle"
                />
                <Label htmlFor="brightness-toggle" className="text-xs cursor-pointer">
                  <Sliders className="w-4 h-4" />
                </Label>
              </div>
            </div>
            
            <div className="flex gap-3 mb-4">
              {[0, 1, 2].map((idx) => {
                const color = selectedColors[idx];
                return (
                  <div
                    key={idx}
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                      color ? 'border-gray-300' : 'border-dashed border-gray-200'
                    }`}
                    style={{ backgroundColor: color?.hex || 'transparent' }}
                  >
                    {color && (
                      <Check className="w-5 h-5 text-white drop-shadow" />
                    )}
                  </div>
                );
              })}
            </div>

            {showBrightnessControls && selectedColors.map((color) => (
              <div key={color.hex} className="flex items-center gap-3 py-2">
                <div
                  className="w-8 h-8 rounded-full border-2 border-gray-200"
                  style={{ backgroundColor: color.hex }}
                />
                <Slider
                  value={[color.brightness]}
                  onValueChange={([v]) => updateBrightness(color.hex, v)}
                  min={-100}
                  max={0}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-gray-600 w-12 text-right">
                  {color.brightness}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => toggleColor(color)}
                >
                  <span className="text-gray-400">×</span>
                </Button>
              </div>
            ))}
          </div>

          {/* Preset Colors */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Available colors</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {presetColors.map((color) => {
                const isSelected = selectedColors.find(c => c.hex === color.hex);
                const isFavorite = isSelected?.favorite;
                
                return (
                  <Card
                    key={color.hex}
                    onClick={() => toggleColor(color)}
                    className={`cursor-pointer transition-all p-3 ${
                      isSelected ? 'border-[#ff6b35] bg-[#ff6b35]/5' : 'hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center"
                        style={{ backgroundColor: color.hex }}
                      >
                        {isSelected && (
                          <Check className="w-4 h-4 text-white drop-shadow" />
                        )}
                      </div>
                      <span className="font-medium text-gray-700 flex-1">
                        {color.name}
                      </span>
                      {isFavorite && (
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Custom Color */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Custom color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                placeholder="#ff6b35"
                className="flex-1"
              />
              <Button
                onClick={addCustomColor}
                disabled={selectedColors.length >= 3}
                className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}