import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Trash2, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, QrCode, Share2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Knitting() {
  const location = useLocation();
  const navigate = useNavigate();
  const { project, image, shape, colors, config, stringPaths } = location.state || {};
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(10);
  const [direction, setDirection] = useState('front'); // 'front' or 'back'
  const [showPreview, setShowPreview] = useState(true);
  const [autoStep, setAutoStep] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const canvasRef = useRef(null);

  if (!project || !stringPaths) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No project data</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // PDF download logic
    alert('PDF download feature - implement with jsPDF');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/editor', { state: { project } })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-medium text-gray-900">{project.title} - Knitting Pattern</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <QrCode className="w-4 h-4 mr-2" />
              QR Code
            </Button>
            <Button 
              className="bg-[#ff6b35] hover:bg-[#e55a2b]"
              onClick={handleDownloadPDF}
            >
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Pattern Preview */}
          <div className="lg:col-span-2">
            <Card className="p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Pattern</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-red-500">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Pattern Canvas */}
              <div className="aspect-square bg-gray-50 rounded-lg mb-4 flex items-center justify-center border-2 border-gray-200">
                <canvas ref={canvasRef} className="max-w-full max-h-full" />
              </div>

              {/* Knitting Controls */}
              <Card className="p-4 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3">Knitting</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Current progress</p>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                        <span className="text-orange-600 text-lg">⚠</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Not started</p>
                        <p className="text-xl font-bold text-gray-900">{currentStep} / {stringPaths.length}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    {image && (
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                      Knitting direction
                      <span className="text-xs text-gray-400">ⓘ</span>
                    </Label>
                    <Tabs value={direction} onValueChange={setDirection} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="front">Back to Front</TabsTrigger>
                        <TabsTrigger value="back">Front to Back</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <Label className="text-sm text-gray-600">Preview</Label>
                    <Switch checked={showPreview} onCheckedChange={setShowPreview} />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <Label className="text-sm text-gray-600">Disable preview</Label>
                    <Switch checked={!showPreview} onCheckedChange={(v) => setShowPreview(!v)} />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <Label className="text-sm text-gray-600">Auto-stepper</Label>
                    <Switch checked={autoStep} onCheckedChange={setAutoStep} />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <Label className="text-sm text-gray-600">Disable auto-stepper</Label>
                    <Switch checked={!autoStep} onCheckedChange={(v) => setAutoStep(!v)} />
                  </div>
                </div>
              </Card>
            </Card>
          </div>

          {/* Right: Configuration & Step List */}
          <div className="space-y-4">
            {/* Sharing */}
            <Card className="p-4 bg-white">
              <h3 className="font-medium text-gray-900 mb-3">Sharing</h3>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-gray-600">Access rights</Label>
                  <span className="text-xs text-gray-400">ⓘ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Public</span>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
              </div>
            </Card>

            {/* Configuration */}
            <Card className="p-4 bg-white">
              <h3 className="font-medium text-gray-900 mb-3">Configuration</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Shape</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-[#ff6b35]"></div>
                    <div>
                      <p className="text-sm font-medium text-[#ff6b35]">{shape?.type === 'circle' ? 'Circle' : shape?.type === 'square' ? 'Square' : 'Rectangle'} {shape?.pins}</p>
                      <p className="text-xs text-gray-500">Pins: {shape?.pins}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Steps</p>
                    <p className="font-medium text-[#3b82f6]">{config?.steps}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Fade</p>
                    <p className="font-medium text-[#3b82f6]">{config?.fade}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Min. distance</p>
                    <p className="font-medium text-[#3b82f6]">{config?.minDistance}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Color run</p>
                    <p className="font-medium text-[#3b82f6]">{config?.colorRun}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Thickness</p>
                    <p className="font-medium text-[#3b82f6]">{config?.thickness}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Color Palette */}
            <Card className="p-4 bg-white">
              <h3 className="font-medium text-gray-900 mb-3">Color palette</h3>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-2">Thread</p>
                {colors?.map((color) => (
                  <div key={color.id} className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full border-2 border-gray-200"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{color.name}</p>
                      <p className="text-xs text-[#ff6b35]">{color.hex}</p>
                    </div>
                  </div>
                ))}

                <div className="pt-3 mt-3 border-t">
                  <p className="text-xs text-gray-500 mb-2">Background</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-300"></div>
                    <p className="text-sm text-[#ff6b35]">White</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Current Step */}
            <Card className="p-4 bg-white">
              <h3 className="font-medium text-gray-900 mb-3">Current step</h3>
              <div className="text-center py-8">
                <p className="text-6xl font-light text-gray-900 mb-4">{currentStep}</p>
                {colors && colors.length > 0 && (
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className="w-12 h-12 rounded-full border-2 border-gray-200"
                      style={{ backgroundColor: colors[0].hex }}
                    />
                    <p className="text-lg font-medium text-gray-900">{colors[0].name}</p>
                  </div>
                )}
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="icon">
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="sm">
                  ⏱ {speed}x
                </Button>
                <Button variant="outline" size="icon">
                  <Volume2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-center text-xs text-gray-500 mt-2">
                {currentStep} / {stringPaths.length}
              </p>
            </Card>

            {/* Step List */}
            <Card className="p-4 bg-white">
              <h3 className="font-medium text-gray-900 mb-3">Step list</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {[162, 106, 228, 33].map((step, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                      idx === 0 ? 'bg-red-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 ${
                        idx === 0 ? 'border-red-500 bg-red-500' : 'border-gray-300'
                      }`}
                    />
                    <span className={`font-medium ${idx === 0 ? 'text-red-500' : 'text-gray-600'}`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}