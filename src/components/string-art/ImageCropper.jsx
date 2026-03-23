import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, Check } from 'lucide-react';

const SHAPES = [
  { id: 'circle', label: 'Circle', icon: '⬤' },
  { id: 'square', label: 'Square', icon: '■' },
  { id: 'landscape', label: 'Landscape', icon: '▬' },
  { id: 'portrait', label: 'Portrait', icon: '▮' },
];

// Aspect ratios for locked shapes
const ASPECT = {
  circle: 1,
  square: 1,
  landscape: 3 / 2,
  portrait: 2 / 3,
};

export default function ImageCropper({ imageSrc, onCrop, onCancel }) {
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [shape, setShape] = useState('circle');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [crop, setCrop] = useState({ x: 10, y: 10, w: 80, h: 80 });

  // When shape changes, recalculate height to match aspect ratio
  useEffect(() => {
    setCrop(prev => {
      const ratio = ASPECT[shape];
      const containerEl = containerRef.current;
      if (!containerEl) return prev;
      const containerW = containerEl.offsetWidth;
      const containerH = containerEl.offsetHeight;
      if (!containerH) return prev;
      // convert % width to pixels, compute height in %
      const wPx = (prev.w / 100) * containerW;
      const hPx = wPx / ratio;
      const h = (hPx / containerH) * 100;
      const y = Math.max(0, Math.min(prev.y, 100 - h));
      return { ...prev, h, y };
    });
  }, [shape]);

  const getEventPos = (e, container) => {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const applyAspect = useCallback((next, containerEl) => {
    const ratio = ASPECT[shape];
    const containerW = containerEl.offsetWidth;
    const containerH = containerEl.offsetHeight;
    const wPx = (next.w / 100) * containerW;
    const hPx = wPx / ratio;
    const h = clamp((hPx / containerH) * 100, 5, 100 - next.y);
    return { ...next, h };
  }, [shape]);

  const handleMouseDown = useCallback((e, type) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getEventPos(e, containerRef.current);
    setDragStart({ pos, crop: { ...crop } });
    if (type === 'move') setIsDragging(true);
    else setIsResizing(type);
  }, [crop]);

  const handleMouseMove = useCallback((e) => {
    if (!dragStart) return;
    e.preventDefault();
    const container = containerRef.current;
    const pos = getEventPos(e, container);
    const dx = pos.x - dragStart.pos.x;
    const dy = pos.y - dragStart.pos.y;
    const prev = dragStart.crop;

    if (isDragging) {
      const next = {
        x: clamp(prev.x + dx, 0, 100 - prev.w),
        y: clamp(prev.y + dy, 0, 100 - prev.h),
        w: prev.w,
        h: prev.h,
      };
      setCrop(next);
    } else if (isResizing) {
      let { x, y, w, h } = prev;
      if (isResizing.includes('e')) w = clamp(prev.w + dx, 10, 100 - x);
      if (isResizing.includes('w')) {
        const newX = clamp(prev.x + dx, 0, prev.x + prev.w - 10);
        w = prev.w - (newX - prev.x);
        x = newX;
      }
      if (isResizing.includes('s') && !['circle','square','landscape','portrait'].includes(shape)) {
        h = clamp(prev.h + dy, 10, 100 - y);
      }
      if (isResizing.includes('n') && !['circle','square','landscape','portrait'].includes(shape)) {
        const newY = clamp(prev.y + dy, 0, prev.y + prev.h - 10);
        h = prev.h - (newY - prev.y);
        y = newY;
      }
      const next = applyAspect({ x, y, w, h }, container);
      setCrop(next);
    }
  }, [dragStart, isDragging, isResizing, applyAspect, shape]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
    setDragStart(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleReset = () => {
    setCrop({ x: 10, y: 10, w: 80, h: 80 });
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const cx = (crop.x / 100) * naturalW;
    const cy = (crop.y / 100) * naturalH;
    const cw = (crop.w / 100) * naturalW;
    const ch = (crop.h / 100) * naturalH;

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');

    // Apply shape mask
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.ellipse(cw / 2, ch / 2, cw / 2, ch / 2, 0, 0, Math.PI * 2);
      ctx.clip();
    }

    ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
    onCrop(canvas.toDataURL('image/png', 0.95));
  };

  // Shape overlay for the preview — circle gets ellipse clip style
  const cropBoxStyle = {
    left: `${crop.x}%`, top: `${crop.y}%`,
    width: `${crop.w}%`, height: `${crop.h}%`,
    cursor: 'move',
    position: 'absolute',
  };

  const handles = [
    { id: 'nw', style: { top: -5, left: -5, cursor: 'nw-resize' } },
    { id: 'ne', style: { top: -5, right: -5, cursor: 'ne-resize' } },
    { id: 'sw', style: { bottom: -5, left: -5, cursor: 'sw-resize' } },
    { id: 'se', style: { bottom: -5, right: -5, cursor: 'se-resize' } },
  ];

  return (
    <div className="space-y-3">
      {/* Shape selector */}
      <div className="flex gap-2 justify-center">
        {SHAPES.map(s => (
          <button
            key={s.id}
            onClick={() => setShape(s.id)}
            className={`flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
              shape === s.id
                ? 'border-[#ff6b35] bg-[#ff6b35]/10 text-[#ff6b35]'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <span className="text-lg leading-none mb-0.5">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center">Drag to move • Drag corners to resize</p>

      <div
        ref={containerRef}
        className="relative select-none overflow-hidden rounded-lg bg-black"
        style={{ touchAction: 'none' }}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Crop"
          className="w-full h-auto block"
          onLoad={() => setImgLoaded(true)}
          draggable={false}
        />

        {imgLoaded && (
          <>
            {/* Dark overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: `
                linear-gradient(to right, rgba(0,0,0,0.55) ${crop.x}%, transparent ${crop.x}%),
                linear-gradient(to left, rgba(0,0,0,0.55) ${100 - crop.x - crop.w}%, transparent ${100 - crop.x - crop.w}%)
              `
            }} />
            <div className="absolute pointer-events-none" style={{
              top: 0, left: `${crop.x}%`, width: `${crop.w}%`, height: `${crop.y}%`,
              background: 'rgba(0,0,0,0.55)'
            }} />
            <div className="absolute pointer-events-none" style={{
              bottom: 0, left: `${crop.x}%`, width: `${crop.w}%`, height: `${100 - crop.y - crop.h}%`,
              background: 'rgba(0,0,0,0.55)'
            }} />

            {/* Crop box */}
            <div
              style={cropBoxStyle}
              onMouseDown={(e) => handleMouseDown(e, 'move')}
              onTouchStart={(e) => handleMouseDown(e, 'move')}
            >
              {/* Shape border preview */}
              <div
                className="absolute inset-0 border-2 border-white pointer-events-none"
                style={{ borderRadius: shape === 'circle' ? '50%' : '0' }}
              />

              {/* Rule of thirds (only for non-circle) */}
              {shape !== 'circle' && [33, 66].map(p => (
                <div key={`v${p}`} className="absolute top-0 bottom-0 border-l border-white/30 pointer-events-none" style={{ left: `${p}%` }} />
              ))}
              {shape !== 'circle' && [33, 66].map(p => (
                <div key={`h${p}`} className="absolute left-0 right-0 border-t border-white/30 pointer-events-none" style={{ top: `${p}%` }} />
              ))}

              {/* Corner handles */}
              {handles.map(h => (
                <div
                  key={h.id}
                  className="absolute w-4 h-4 bg-white rounded-sm shadow"
                  style={{ ...h.style }}
                  onMouseDown={(e) => handleMouseDown(e, h.id)}
                  onTouchStart={(e) => handleMouseDown(e, h.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-1" /> Reset
        </Button>
        <Button onClick={handleConfirm} className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white px-6">
          <Check className="w-4 h-4 mr-1" /> Apply Crop
        </Button>
      </div>
    </div>
  );
}