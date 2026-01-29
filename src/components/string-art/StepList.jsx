import React from 'react';
import { motion } from 'framer-motion';
import { Card } from "@/components/ui/card";

export default function StepList({ colorLayers, currentStep, stringPaths }) {
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

      {/* Color Legend */}
      {colorLayers.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <h4 className="text-xs text-gray-400 mb-3 uppercase tracking-wider">Colors</h4>
          <div className="space-y-2">
            {colorLayers.map((layer, idx) => (
              <div
                key={layer.id}
                className={`flex items-center justify-between py-1 transition-opacity ${
                  idx === currentColorIndex ? 'opacity-100' : 'opacity-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full shadow-inner"
                    style={{ backgroundColor: layer.hex }}
                  />
                  <span className="text-sm text-gray-700">{layer.name}</span>
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  {layer.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}