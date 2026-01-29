import { motion } from 'framer-motion';
import { Star, Circle, Square } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const shapes = [
  { id: 'circle_240', name: 'Circle 240', type: 'circle', pins: 240, icon: Circle },
  { id: 'circle_200', name: 'Circle 200', type: 'circle', pins: 200, icon: Circle },
  { id: 'circle_280', name: 'Circle 280', type: 'circle', pins: 280, icon: Circle },
  { id: 'rectangle_61_91', name: 'Rectangle 61 * 91', type: 'rect', size: '61 × 91', icon: Square },
  { id: 'rectangle_91_61', name: 'Rectangle 91 * 61', type: 'rect', size: '91 × 61', icon: Square }
];

export default function ShapeSelector({ open, onOpenChange, selected, onSelect, favorites = [] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Shape</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-96 overflow-y-auto py-4">
          {shapes.map((shape) => {
            const Icon = shape.icon;
            const isFavorite = favorites.includes(shape.id);
            const isSelected = selected === shape.id;
            
            return (
              <motion.div
                key={shape.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  onClick={() => onSelect(shape.id)}
                  className={`cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-[#ff6b35] bg-[#ff6b35]/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      shape.type === 'circle' ? 'bg-blue-100' : 'bg-purple-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        shape.type === 'circle' ? 'text-blue-600' : 'text-purple-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-[#ff6b35]">
                        {shape.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Pins: {shape.pins || shape.size}
                      </div>
                    </div>
                    {isFavorite && (
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}