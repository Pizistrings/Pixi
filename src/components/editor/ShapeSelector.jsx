import { Circle, Square, RectangleHorizontal, Star } from 'lucide-react';
import { Card } from "@/components/ui/card";

const shapes = [
  { type: 'circle', pins: 240, icon: Circle, label: 'Circle 240', favorite: true },
  { type: 'circle', pins: 240, icon: Circle, label: 'Circle 240', favorite: true },
  { type: 'circle', pins: 200, icon: Circle, label: 'Circle 200', favorite: true },
  { type: 'circle', pins: 280, icon: Circle, label: 'Circle 280', favorite: true },
  { type: 'rectangle', pins: 244, icon: RectangleHorizontal, label: 'Rectangle 61 * 91', favorite: true },
  { type: 'rectangle', pins: 304, icon: RectangleHorizontal, label: 'Rectangle 91 * 61', favorite: true },
];

export default function ShapeSelector({ shape, onShapeChange }) {
  return (
    <Card className="p-4 bg-white">
      <h3 className="font-medium text-gray-900 mb-3">Project images</h3>
      
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <input type="checkbox" className="rounded" />
          Reset parameters when image changes
        </label>
        
        <div className="w-full h-32 border-2 border-dashed border-[#ff6b35] rounded-lg flex items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-[#ff6b35] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-sm text-[#ff6b35] font-medium">UPLOAD</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {shapes.map((s, idx) => {
          const Icon = s.icon;
          const isSelected = s.type === shape.type && s.pins === shape.pins;
          
          return (
            <div
              key={idx}
              onClick={() => onShapeChange(s)}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 flex items-center justify-center ${
                s.type === 'rectangle' ? '' : 'rounded-full'
              } border-2 ${isSelected ? 'border-[#ff6b35]' : 'border-gray-300'}`}>
                <Icon className={`w-4 h-4 ${isSelected ? 'text-[#ff6b35]' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${isSelected ? 'text-[#ff6b35]' : 'text-gray-900'}`}>
                  {s.label}
                </p>
                <p className="text-xs text-gray-500">Pins: {s.pins}</p>
              </div>
              {s.favorite && (
                <Star className="w-4 h-4 fill-[#ffa500] text-[#ffa500]" />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}