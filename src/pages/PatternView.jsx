import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PatternView() {
  const { data } = useParams();
  const [pattern, setPattern] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);

  useEffect(() => {
    if (data) {
      // Fetch pattern data from URL
      const patternUrl = decodeURIComponent(data);
      fetch(patternUrl)
        .then(res => res.json())
        .then(decoded => {
          // Transform compact format back to full format
          const fullPattern = {
            image: decoded.img,
            colors: decoded.colors.map(c => ({ name: c.n, hex: c.h, count: c.c, id: c.id })),
            numPins: decoded.pins,
            totalSteps: decoded.total,
            paths: decoded.paths.map(p => ({ from: p.f, to: p.t, color: p.c }))
          };
          setPattern(fullPattern);
        })
        .catch(e => {
          console.error('Failed to load pattern data:', e);
        });
    }
  }, [data]);

  useEffect(() => {
    if (isPlaying && pattern && currentStep < pattern.totalSteps) {
      const interval = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 1000 / speed);
      return () => clearTimeout(interval);
    }
  }, [isPlaying, currentStep, pattern, speed]);

  if (!pattern) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center text-gray-500">Loading pattern...</div>
      </div>
    );
  }

  const getCurrentColor = () => {
    if (!pattern.paths[currentStep - 1]) return null;
    const colorId = pattern.paths[currentStep - 1].color;
    return pattern.colors.find(c => c.id === colorId);
  };

  const currentColor = getCurrentColor();

  // Get recent steps for the step list
  const getRecentSteps = () => {
    const steps = [];
    for (let i = Math.max(0, currentStep - 5); i <= Math.min(pattern.totalSteps - 1, currentStep + 2); i++) {
      const path = pattern.paths[i];
      if (path) {
        const color = pattern.colors.find(c => c.id === path.color);
        steps.push({
          step: i + 1,
          color: color?.hex || '#000',
          isCurrent: i + 1 === currentStep
        });
      }
    }
    return steps;
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-light text-gray-900 mb-1">String Art Pattern</h1>
          <p className="text-sm text-gray-500">{pattern.totalSteps.toLocaleString()} total steps</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preview Image */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-0 shadow-sm overflow-hidden">
              <div className="p-6">
                <img 
                  src={pattern.image} 
                  alt="String Art Pattern"
                  className="w-full h-auto rounded-lg"
                />
              </div>
              
              {/* Progress Bar */}
              <div className="px-6 pb-6">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-[#ff6b35] transition-all duration-200"
                    style={{ width: `${(currentStep / pattern.totalSteps) * 100}%` }}
                  />
                </div>
                <div className="text-center text-sm text-gray-500">
                  <span className="text-[#ff6b35] font-medium">{currentStep}</span> / {pattern.totalSteps.toLocaleString()}
                </div>
              </div>
            </Card>
          </div>

          {/* Controls Panel */}
          <div className="space-y-4">
            {/* Current Step */}
            <Card className="bg-white border-0 shadow-sm p-6">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3">Current step</h3>
              <div className="text-center">
                <div className="text-6xl font-light text-gray-900 mb-4">
                  {currentStep}
                </div>
                
                {currentColor && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className="w-12 h-12 rounded-full shadow-lg"
                        style={{ backgroundColor: currentColor.hex }}
                      />
                    </div>
                    <div className="text-lg font-medium text-gray-700">
                      {currentColor.hex}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Step List */}
            <Card className="bg-white border-0 shadow-sm p-6">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3">Step list</h3>
              <div className="space-y-2">
                {getRecentSteps().map(step => (
                  <div
                    key={step.step}
                    className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${
                      step.isCurrent ? 'bg-gray-100' : ''
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full ${
                        step.isCurrent ? 'ring-2 ring-offset-2' : ''
                      }`}
                      style={{ 
                        backgroundColor: step.color,
                        ringColor: step.color
                      }}
                    />
                    <span className={`text-sm ${
                      step.isCurrent ? 'font-bold text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.step}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Controls */}
            <Card className="bg-white border-0 shadow-sm p-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentStep(0)}
                  disabled={currentStep === 0}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                
                <Button
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 bg-[#ff6b35] hover:bg-[#e55a2b]"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentStep(pattern.totalSteps)}
                  disabled={currentStep === pattern.totalSteps}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentStep(Math.min(pattern.totalSteps, currentStep + 1))}
                  disabled={currentStep === pattern.totalSteps}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Speed Control */}
              <div className="flex items-center justify-center gap-2">
                {[1, 5, 10, 25].map(s => (
                  <Button
                    key={s}
                    variant={speed === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSpeed(s)}
                    className="text-xs"
                  >
                    {s}x
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}