import { motion } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export default function StepList({ 
  colorLayers, 
  currentStep, 
  stringPaths, 
  mode, 
  totalStrings,
  selectedColors = [],
  setSelectedColors,
  numColors = 4,
  onEditColor,
  isGenerated = false,
  onColorCountChange
}) {
  // Calculate cumulative steps for each color
  const getStepRanges = () => {
    let cumulative = 0;
    return colorLayers.map(layer => {
      const start = cumulative;
      cumulative += layer.count;
      return {
        ...layer,
        startStep: start,
        endStep: cumulative
      };
    });
  };

  const layersWithRanges = getStepRanges();

  // Find which color is currently active
  const getCurrentColorIndex = () => {
    for (let i = 0; i < layersWithRanges.length; i++) {
      if (currentStep <= layersWithRanges[i].endStep) {
        return i;
      }
    }
    return layersWithRanges.length - 1;
  };

  const currentColorIndex = getCurrentColorIndex();

  // Get recent steps for display
  const getRecentSteps = () => {
    const steps = [];
    const currentIdx = currentStep - 1;
    
    // Get surrounding steps
    for (let i = Math.max(0, currentIdx - 3); i <= Math.min(stringPaths.length - 1, currentIdx + 3); i++) {
      const path = stringPaths[i];
      if (path) {
        const layer = colorLayers.find(l => l.id === path.color);
        steps.push({
          step: i + 1,
          color: layer?.hex || '#1a1a1a',
          colorName: layer?.name || 'Black',
          isCurrent: i === currentIdx
        });
      }
    }
    
    return steps;
  };

  const recentSteps = stringPaths.length > 0 ? getRecentSteps() : [];

  return (
    <Card className="bg-white border-0 shadow-sm p-6">
      <h3 className="text-sm text-gray-500 mb-4">Step list</h3>
      
      {colorLayers.length > 0 ? (
        <div className="space-y-2">
          {recentSteps.map((step, idx) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-center gap-3 py-1.5 px-2 rounded-lg transition-colors ${
                step.isCurrent ? 'bg-gray-50' : ''
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full transition-transform ${
                  step.isCurrent ? 'scale-125 ring-2 ring-offset-2' : 'opacity-60'
                }`}
                style={{ 
                  backgroundColor: step.color,
                  ringColor: step.color 
                }}
              />
              <span className={`text-sm ${
                step.isCurrent 
                  ? 'font-semibold text-gray-900' 
                  : 'text-gray-400'
              }`}>
                {step.step}
              </span>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 px-2">
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <div className="h-4 w-12 bg-gray-100 rounded" />
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-2">
            Steps will appear here
          </p>
        </div>
      )}

      {/* Color Customization */}
      {mode === 'color' && setSelectedColors && colorLayers.length === 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <h4 className="text-xs text-gray-400 mb-3 uppercase tracking-wider">
            Customize Colors
          </h4>
          <div className="space-y-3">
            {selectedColors.slice(0, numColors).map((color, idx) => (
              <div key={color.id} className="flex items-center gap-3">
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => {
                    const newColors = [...selectedColors];
                    newColors[idx] = { ...color, hex: e.target.value };
                    setSelectedColors(newColors);
                  }}
                  className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-200"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={color.name}
                    onChange={(e) => {
                      const newColors = [...selectedColors];
                      newColors[idx] = { ...color, name: e.target.value };
                      setSelectedColors(newColors);
                    }}
                    className="w-full text-sm font-medium text-gray-700 bg-transparent border-none focus:outline-none"
                  />
                  <div className="text-xs text-gray-400 font-mono">{color.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Generated Results - Editable Colors */}
      {colorLayers.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <h4 className="text-xs text-gray-400 mb-3 uppercase tracking-wider">
            {colorLayers.length > 1 ? 'Generated Separation (Editable)' : 'Progress'}
          </h4>
          <div className="space-y-3">
            {colorLayers.map((layer, idx) => {
              const isActive = idx === currentColorIndex;
              const progress = isActive ? 
                Math.round(((currentStep - layersWithRanges[idx].startStep) / layer.count) * 100) : 
                (idx < currentColorIndex ? 100 : 0);
              
              return (
                <div
                  key={layer.id}
                  className={`border rounded-lg p-3 transition-all ${
                    isActive ? 'border-gray-300 bg-gray-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="color"
                        value={layer.hex}
                        onChange={(e) => onEditColor?.(layer.id, e.target.value)}
                        className="w-4 h-4 rounded-full shadow-inner cursor-pointer"
                        title="Click to change color"
                      />
                      <span className={`text-sm ${isActive ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {layer.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">
                      {layer.count.toLocaleString()} lines
                    </span>
                  </div>
                  
                  {colorLayers.length > 1 && (
                    <>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                        <div 
                          className="h-full transition-all duration-300"
                          style={{ 
                            backgroundColor: layer.hex,
                            width: `${progress}%`,
                            opacity: 0.7
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mb-2">
                        <span>Steps {layersWithRanges[idx].startStep + 1}-{layersWithRanges[idx].endStep}</span>
                        <span>{progress}%</span>
                      </div>
                      
                      {/* Editable line count slider */}
                      <div className="mt-2">
                        <div className="flex justify-between mb-1">
                          <Label className="text-xs text-gray-500">Line count</Label>
                          <span className="text-xs text-gray-700 font-medium">{layer.count}</span>
                        </div>
                        <Slider
                          value={[layer.count]}
                          onValueChange={([v]) => onColorCountChange?.(layer.id, v)}
                          min={10}
                          max={totalStrings}
                          step={10}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}