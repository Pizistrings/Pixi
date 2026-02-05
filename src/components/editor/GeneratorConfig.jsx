import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Info } from 'lucide-react';

export default function GeneratorConfig({ mode, onModeChange, config, onConfigChange }) {
  return (
    <Card className="p-4 bg-white">
      <h3 className="font-medium text-gray-900 mb-3">Generator configuration</h3>
      
      {/* Mode Toggle */}
      <div className="mb-4">
        <Label className="text-sm text-gray-600 mb-2 block">Color mode</Label>
        <Tabs value={mode} onValueChange={onModeChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mono">Single-color</TabsTrigger>
            <TabsTrigger value="color">Multi-color</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Steps */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <Label className="text-sm text-gray-600">Steps</Label>
          <span className="text-sm text-[#ff6b35] font-medium">{config.steps.toLocaleString()}</span>
        </div>
        <Slider
          value={[config.steps]}
          onValueChange={([v]) => onConfigChange({ ...config, steps: v })}
          min={1000}
          max={5000}
          step={100}
          className="w-full"
        />
      </div>

      {/* Fade */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <Label className="text-sm text-gray-600">Fade</Label>
          <span className="text-sm text-[#ff6b35] font-medium">{config.fade}</span>
        </div>
        <Slider
          value={[config.fade]}
          onValueChange={([v]) => onConfigChange({ ...config, fade: v })}
          min={10}
          max={100}
          step={5}
          className="w-full"
        />
      </div>

      {/* Min Distance */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <Label className="text-sm text-gray-600 flex items-center gap-1">
            Min. dist.
            <Info className="w-3 h-3 text-gray-400" />
          </Label>
          <span className="text-sm text-[#ff6b35] font-medium">{config.minDistance}</span>
        </div>
        <Slider
          value={[config.minDistance]}
          onValueChange={([v]) => onConfigChange({ ...config, minDistance: v })}
          min={10}
          max={50}
          step={5}
          className="w-full"
        />
      </div>

      {/* Color Run */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <Label className="text-sm text-gray-600 flex items-center gap-1">
            Color run
            <Info className="w-3 h-3 text-gray-400" />
          </Label>
          <span className="text-sm text-[#ff6b35] font-medium">{config.colorRun}</span>
        </div>
        <Slider
          value={[config.colorRun]}
          onValueChange={([v]) => onConfigChange({ ...config, colorRun: v })}
          min={50}
          max={200}
          step={10}
          className="w-full"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mt-6">
        <Button variant="outline" size="sm" className="flex-1">
          Cancel
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          Reset
        </Button>
        <Button size="sm" className="flex-1 bg-[#ff6b35] hover:bg-[#e55a2b]">
          Ok
        </Button>
      </div>
    </Card>
  );
}