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
              className="w-12 h-12 rounded border-2 border-gray-200 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
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
                  className="w-10 h-10 rounded border-2 border-gray-200 flex-shrink-0"
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
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => {
                    const newColors = [...colors];
                    newColors[idx] = { ...color, hex: e.target.value };
                    onColorsChange(newColors);
                  }}
                  className="w-10 h-10 rounded cursor-pointer border-2 border-gray-200 flex-shrink-0"
                />
                <input
                  type="text"
                  value={color.name}
                  onChange={(e) => {
                    const newColors = [...colors];
                    newColors[idx] = { ...color, name: e.target.value };
                    onColorsChange(newColors);
                  }}
                  className="flex-1 text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
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
          <div className="w-10 h-10 rounded bg-white border-2 border-gray-300"></div>
          <div className="flex-1 flex items-center">
            <p className="text-sm text-[#ff6b35]">White</p>
          </div>
        </div>
      </div>
    </Card>
  );
}