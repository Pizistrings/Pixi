import { useState } from 'react';
import { Plus, Star } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export default function ColorSelector({ mode, colors, onColorsChange }) {
  const [showDistribution, setShowDistribution] = useState(false);

  const addColor = () => {
    const newColor = {
      id: `color_${Date.now()}`,
      name: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      hex: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      distribution: 0
    };
    onColorsChange([...colors, newColor]);
  };

  return (
    <Card className="p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">
          Select thread colors ({colors.length})
        </h3>
        <Switch
          checked={showDistribution}
          onCheckedChange={setShowDistribution}
        />
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-600 mb-3">Selected colors</p>
        <div className="flex gap-2 mb-4">
          {colors.slice(0, 3).map(color => (
            <div
              key={color.id}
              className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {colors.map((color, idx) => (
          <div key={color.id} className="flex items-center gap-3 group">
            {showDistribution ? (
              <>
                <div
                  className="w-10 h-10 rounded-full border-2 border-gray-200 flex-shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="flex-1">
                  <Slider
                    value={[color.distribution || 0]}
                    onValueChange={([v]) => {
                      const newColors = [...colors];
                      newColors[idx] = { ...color, distribution: v };
                      onColorsChange(newColors);
                    }}
                    min={-100}
                    max={100}
                    className="w-full"
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">{color.distribution || 0}</span>
                <button className="w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <div
                  className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center flex-shrink-0 cursor-pointer"
                  style={{ backgroundColor: color.hex }}
                >
                  <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{color.name}</p>
                </div>
                {idx === 0 && <Star className="w-4 h-4 fill-[#ffa500] text-[#ffa500]" />}
              </>
            )}
          </div>
        ))}
      </div>

      <Button
        onClick={addColor}
        variant="outline"
        className="w-full mt-4 border-[#ff6b35] text-[#ff6b35] hover:bg-[#ff6b35]/10"
      >
        <Plus className="w-4 h-4 mr-2" />
        Custom color
      </Button>

      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-gray-600 mb-2">Background</p>
        <div className="flex gap-2">
          <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-300"></div>
          <div className="flex-1 flex items-center">
            <p className="text-sm text-[#ff6b35]">White</p>
          </div>
        </div>
      </div>
    </Card>
  );
}