import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Settings as SettingsIcon, Download, Printer, Share2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InputCanvas from '@/components/editor/InputCanvas';
import OutputCanvas from '@/components/editor/OutputCanvas';
import ShapeSelector from '@/components/editor/ShapeSelector';
import ColorSelector from '@/components/editor/ColorSelector';
import GeneratorConfig from '@/components/editor/GeneratorConfig';

export default function Editor() {
  const location = useLocation();
  const navigate = useNavigate();
  const project = location.state?.project;
  
  const [image, setImage] = useState(null);
  const [mode, setMode] = useState('color'); // 'mono' or 'color'
  const [shape, setShape] = useState({ type: 'circle', pins: 240 });
  const [selectedColors, setSelectedColors] = useState([
    { id: 'black', name: 'Black', hex: '#000000', distribution: 0 },
    { id: 'red', name: '#f60404', hex: '#f60404', distribution: -100 }
  ]);
  const [config, setConfig] = useState({
    steps: 3000,
    fade: 30,
    minDistance: 30,
    colorRun: 100,
    thickness: 1,
    brightness: 100,
    contrast: 100,
    sharpness: 0
  });
  const [isGenerated, setIsGenerated] = useState(false);
  const [stringPaths, setStringPaths] = useState([]);
  const outputCanvasRef = useRef(null);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No project selected</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const handleGenerate = () => {
    setIsGenerated(true);
    // Generate logic will be triggered by OutputCanvas
  };

  const handleViewKnitting = () => {
    navigate('/knitting', { 
      state: { 
        project,
        image,
        shape,
        colors: selectedColors,
        config,
        stringPaths
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-medium text-gray-900">{project.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {isGenerated && (
              <>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button 
                  size="sm" 
                  className="bg-[#ff6b35] hover:bg-[#e55a2b]"
                  onClick={handleViewKnitting}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Knit
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Input Canvas */}
          <InputCanvas
            image={image}
            onImageUpload={setImage}
            config={config}
            onConfigChange={setConfig}
          />

          {/* Output Canvas */}
          <OutputCanvas
            ref={outputCanvasRef}
            image={image}
            shape={shape}
            colors={selectedColors}
            config={config}
            mode={mode}
            isGenerated={isGenerated}
            onGenerate={handleGenerate}
            stringPaths={stringPaths}
            onStringPathsChange={setStringPaths}
          />
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Shape Selector */}
          <ShapeSelector shape={shape} onShapeChange={setShape} />

          {/* Generator Config */}
          <GeneratorConfig
            mode={mode}
            onModeChange={setMode}
            config={config}
            onConfigChange={setConfig}
          />

          {/* Color Selector */}
          <ColorSelector
            mode={mode}
            colors={selectedColors}
            onColorsChange={setSelectedColors}
          />
        </div>
      </div>
    </div>
  );
}