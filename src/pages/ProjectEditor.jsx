import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Play, Pause, SkipBack, SkipForward, Download, Printer, ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import jsPDF from 'jspdf';

import InputPanel from '@/components/string-art/InputPanel';
import OutputPanel from '@/components/string-art/OutputPanel';
import KnittingPanel from '@/components/string-art/KnittingPanel';

export default function ProjectEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }).then(res => res[0]),
    enabled: !!projectId,
  });

  const [settings, setSettings] = useState(null);
  const [image, setImage] = useState(null);
  const [stringPaths, setStringPaths] = useState([]);
  const [colorLayers, setColorLayers] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState('editor'); // 'editor' or 'knitting'

  useEffect(() => {
    if (project) {
      setSettings(project.settings || getDefaultSettings());
      setImage(project.image_url);
      setStringPaths(project.string_paths || []);
    }
  }, [project]);

  const getDefaultSettings = () => ({
    numPins: 200,
    numStrings: 3000,
    shape: 'circle',
    mode: 'color',
    brightness: 100,
    contrast: 100,
    sharpness: 0,
    cropArea: { x: 0, y: 0, width: 100, height: 100 },
    lineWidth: 0.3,
    lineOpacity: 0.15,
    numColors: 4,
    selectedColors: [
      { name: 'Cyan', hex: '#00b4d8', id: 'C' },
      { name: 'Magenta', hex: '#e63946', id: 'M' },
      { name: 'Yellow', hex: '#ffd60a', id: 'Y' },
      { name: 'Black', hex: '#1a1a1a', id: 'K' }
    ],
    colorDistribution: { C: 20, M: 20, Y: 20, K: 40 }
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  const handleSave = () => {
    updateProjectMutation.mutate({
      image_url: image,
      settings: settings,
      string_paths: stringPaths,
      status: stringPaths.length > 0 ? 'completed' : 'draft'
    });
  };

  const handleGenerate = (paths, layers) => {
    setStringPaths(paths);
    setColorLayers(layers);
    setCurrentStep(0);
    handleSave();
  };

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading project...</div>
      </div>
    );
  }

  if (view === 'knitting') {
    return (
      <KnittingPanel
        project={project}
        stringPaths={stringPaths}
        colorLayers={colorLayers}
        settings={settings}
        onBack={() => setView('editor')}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Projects')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-medium text-gray-900">{project?.title}</h1>
              <p className="text-xs text-gray-500">
                Last modified: {new Date(project?.updated_date).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={updateProjectMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            {stringPaths.length > 0 && (
              <Button
                onClick={() => setView('knitting')}
                className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                Knit Pattern
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <InputPanel
            image={image}
            onImageChange={(img) => {
              setImage(img);
              setStringPaths([]);
              setCurrentStep(0);
            }}
            settings={settings}
            onSettingsChange={setSettings}
          />
          
          <OutputPanel
            image={image}
            settings={settings}
            stringPaths={stringPaths}
            colorLayers={colorLayers}
            currentStep={currentStep}
            isPlaying={isPlaying}
            isProcessing={isProcessing}
            onGenerate={handleGenerate}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onReset={() => setCurrentStep(0)}
            onSkipToEnd={() => setCurrentStep(stringPaths.length)}
            onStepChange={setCurrentStep}
            onProcessingChange={setIsProcessing}
          />
        </div>
      </div>
    </div>
  );
}