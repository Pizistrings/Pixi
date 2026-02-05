import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Printer, Download, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import jsPDF from 'jspdf';

export default function KnittingPanel({ project, stringPaths, colorLayers, settings, onBack }) {
  const [direction, setDirection] = useState('front-to-back');
  const [knittingStep, setKnittingStep] = useState(0);
  const patternCanvasRef = useRef(null);

  const generatePDF = () => {
    const pdf = new jsPDF();
    
    // Title page
    pdf.setFontSize(24);
    pdf.text(project.title, 20, 30);
    pdf.setFontSize(12);
    pdf.text(`String Art Pattern`, 20, 45);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 55);
    
    // Configuration
    pdf.setFontSize(14);
    pdf.text('Configuration:', 20, 75);
    pdf.setFontSize(10);
    pdf.text(`Shape: ${settings.shape}`, 25, 85);
    pdf.text(`Pins: ${settings.numPins}`, 25, 92);
    pdf.text(`Total Strings: ${stringPaths.length}`, 25, 99);
    
    // Color breakdown
    pdf.setFontSize(14);
    pdf.text('Thread Colors:', 20, 115);
    let yPos = 125;
    colorLayers.forEach((layer) => {
      pdf.setFontSize(10);
      pdf.setFillColor(layer.hex);
      pdf.circle(25, yPos - 2, 2, 'F');
      pdf.text(`${layer.name} - ${layer.count} strings`, 32, yPos);
      yPos += 7;
    });
    
    // Instructions
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.text('Knitting Instructions', 20, 30);
    pdf.setFontSize(10);
    pdf.text(`Follow the sequence ${direction === 'front-to-back' ? 'from front to back' : 'from back to front'}`, 20, 45);
    
    // First 100 steps as example
    pdf.setFontSize(9);
    yPos = 60;
    for (let i = 0; i < Math.min(100, stringPaths.length); i++) {
      const path = stringPaths[i];
      const color = colorLayers.find(c => c.id === path.color);
      pdf.text(`${i + 1}. Pin ${path.from} → Pin ${path.to} (${color?.name})`, 20, yPos);
      yPos += 5;
      if (yPos > 280) {
        pdf.addPage();
        yPos = 20;
      }
    }
    
    pdf.save(`${project.title}-pattern.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-medium text-gray-900">Knitting Pattern</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generatePDF}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={generatePDF}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pattern Preview */}
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Pattern</h3>
            <div className="aspect-square bg-gray-50 rounded-lg mb-4">
              <canvas
                ref={patternCanvasRef}
                width={400}
                height={400}
                className="w-full h-full"
              />
            </div>
            <div className="text-xs text-gray-500">
              {new Date(project.created_date).toLocaleString()} • Project
            </div>
          </Card>

          {/* Knitting Instructions */}
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Knitting</h3>
            
            <div className="mb-6">
              <Label className="text-xs text-gray-600 mb-2 block">Knitting direction</Label>
              <Tabs value={direction} onValueChange={setDirection}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="back-to-front">Back to Front</TabsTrigger>
                  <TabsTrigger value="front-to-back">Front to Back</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="mb-6">
              <Label className="text-xs text-gray-600 mb-2 block">Current progress</Label>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-light text-gray-900">{knittingStep}</div>
                <div className="text-sm text-gray-500">/ {stringPaths.length}</div>
              </div>
            </div>

            {/* Step Instructions */}
            <div className="space-y-2 max-h-96 overflow-auto">
              {stringPaths.slice(0, 50).map((path, idx) => {
                const color = colorLayers.find(c => c.id === path.color);
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-2 rounded ${
                      idx === knittingStep ? 'bg-orange-50 border border-orange-200' : ''
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color?.hex }}
                    />
                    <span className="text-sm text-gray-700">
                      Step {idx + 1}: Pin {path.from} → {path.to}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}