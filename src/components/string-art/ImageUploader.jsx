import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ImageUploader({ onUpload }) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFile = useCallback((file) => {
    if (file && file.type && file.type.startsWith('image/')) {
      // Check for supported formats
      const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!supportedFormats.includes(file.type.toLowerCase())) {
        alert('Please upload a JPG, PNG, GIF, or WebP image. TIFF and other formats are not supported.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.onerror = () => {
        alert('Error reading file. Please try a different image.');
        setPreview(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e) => {
    const file = e.target.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleConfirm = () => {
    if (preview) {
      onUpload(preview);
    }
  };

  const handleClear = () => {
    setPreview(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        {!preview ? (
          <motion.label
            htmlFor="image-upload"
            className={`
              flex flex-col items-center justify-center p-16 cursor-pointer
              transition-all duration-300 ease-out
              ${isDragging 
                ? 'bg-[#ff6b35]/5 border-2 border-dashed border-[#ff6b35]' 
                : 'bg-gray-50/50 border-2 border-dashed border-gray-200 hover:border-gray-300'
              }
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.div
              animate={{ 
                y: isDragging ? -5 : 0,
                scale: isDragging ? 1.1 : 1 
              }}
              className={`
                w-20 h-20 rounded-2xl flex items-center justify-center mb-6
                ${isDragging ? 'bg-[#ff6b35]/10' : 'bg-gray-100'}
              `}
            >
              <Upload className={`w-8 h-8 ${isDragging ? 'text-[#ff6b35]' : 'text-gray-400'}`} />
            </motion.div>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isDragging ? 'Drop your image here' : 'Upload an image'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Drag & drop or click to browse
            </p>
            <p className="text-xs text-gray-400">
              Supports JPG, PNG, WebP • Best results with portraits
            </p>

            <input
              id="image-upload"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleInputChange}
              className="hidden"
            />
          </motion.label>
        ) : (
          <div className="p-8">
            <div className="relative max-w-sm mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="aspect-square rounded-xl overflow-hidden shadow-lg"
              >
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </motion.div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="absolute -top-2 -right-2 bg-white shadow-md hover:bg-gray-50 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center gap-3 mt-8"
            >
              <Button
                variant="outline"
                onClick={handleClear}
              >
                Choose Different
              </Button>
              <Button
                onClick={handleConfirm}
                className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white px-8"
              >
                Use This Image
              </Button>
            </motion.div>
          </div>
        )}
      </Card>

      {/* Sample Images */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400 mb-4">Or try with a sample image</p>
        <div className="flex justify-center gap-3">
          {[
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face'
          ].map((url, idx) => (
            <motion.button
              key={idx}
              onClick={() => {
                setPreview(url);
              }}
              className="w-16 h-16 rounded-lg overflow-hidden border-2 border-transparent hover:border-[#ff6b35] transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src={url}
                alt={`Sample ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}