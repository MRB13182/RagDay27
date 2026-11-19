import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Sparkles, Shirt } from 'lucide-react';

interface JerseyShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  title?: string;
  description?: string;
  fallbackImageSrc?: string;
}

export const JerseyShowcaseModal: React.FC<JerseyShowcaseModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  title = 'Batch 2027 Official Jersey Design',
  description = 'High-resolution official squad kit design featuring front, back, and sleeve details.',
  fallbackImageSrc,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [currentSrc, setCurrentSrc] = useState<string>(imageSrc);
  const [hasError, setHasError] = useState<boolean>(false);

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchDistanceRef = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasDraggingRef = useRef<boolean>(false);

  useEffect(() => {
    setCurrentSrc(imageSrc);
    setHasError(false);
  }, [imageSrc]);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);
      wasDraggingRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(prev => Math.min(+(prev + 0.35).toFixed(2), 4));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom(prev => {
          const next = Math.max(+(prev - 0.35).toFixed(2), 1);
          if (next === 1) setPan({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const container = containerRef.current;
    if (!isOpen || !container) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      setZoom(prev => {
        const next = Math.min(Math.max(1, +(prev + delta).toFixed(2)), 4);
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelNative);
    };
  }, [isOpen]);

  const handleZoomIn = () => setZoom(prev => Math.min(+(prev + 0.35).toFixed(2), 4));
  const handleZoomOut = () => {
    setZoom(prev => {
      const next = Math.max(+(prev - 0.35).toFixed(2), 1);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const toggleDoubleZoom = () => {
    if (zoom > 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2.2);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    wasDraggingRef.current = false;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    if (Math.abs(newX - pan.x) > 3 || Math.abs(newY - pan.y) > 3) {
      wasDraggingRef.current = true;
    }
    setPan({ x: newX, y: newY });
  }, [isDragging, zoom, pan]);

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistanceRef.current = dist;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        toggleDoubleZoom();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
      if (zoom > 1) {
        setIsDragging(true);
        wasDraggingRef.current = false;
        dragStartRef.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / lastTouchDistanceRef.current;
      lastTouchDistanceRef.current = dist;
      setZoom(prev => {
        const next = Math.min(Math.max(1, +(prev * factor).toFixed(2)), 4);
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    } else if (e.touches.length === 1 && isDragging && zoom > 1) {
      const newX = e.touches[0].clientX - dragStartRef.current.x;
      const newY = e.touches[0].clientY - dragStartRef.current.y;
      if (Math.abs(newX - pan.x) > 3 || Math.abs(newY - pan.y) > 3) {
        wasDraggingRef.current = true;
      }
      setPan({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = () => {
    lastTouchDistanceRef.current = null;
    setIsDragging(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !wasDraggingRef.current) {
      onClose();
    }
  };

  const handleImageError = () => {
    if (fallbackImageSrc && currentSrc !== fallbackImageSrc) {
      setCurrentSrc(fallbackImageSrc);
    } else {
      setHasError(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Jersey design preview modal"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[#08090D]/90 backdrop-blur-xl animate-fadeIn select-none"
    >
      <div
        className="relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-2xl glass-modal border border-[#8BEAFF]/35 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-[#C9D0D9]/15 bg-[#0C0F16]/90 backdrop-blur-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#8BEAFF]/15 border border-[#8BEAFF]/35 text-[#8BEAFF] flex items-center justify-center shrink-0">
              <Shirt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#8BEAFF]">
                  Official Artwork
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-[#C9D0D9]/75">
                  <Sparkles className="w-3 h-3 text-[#8BEAFF]" /> 4K Inspection
                </span>
              </div>
              <h3 className="font-display text-sm sm:text-base font-extrabold text-[#F5F7FA] tracking-tight truncate mt-0.5">
                {title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 bg-[#10141F] border border-[#C9D0D9]/20 rounded-xl p-1">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                title="Zoom Out (-)"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#C9D0D9] hover:text-[#F5F7FA] hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="px-2 font-mono text-xs font-bold text-[#8BEAFF] min-w-[50px] text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                title="Zoom In (+)"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#C9D0D9] hover:text-[#F5F7FA] hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
                title="Reset Zoom (0)"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#C9D0D9] hover:text-[#F5F7FA] hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                aria-label="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl glass-button-primary flex items-center justify-center cursor-pointer"
              title="Close Preview (Esc)"
              aria-label="Close jersey preview"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={toggleDoubleZoom}
          className={`relative z-10 flex-1 w-full min-h-[320px] max-h-[78vh] overflow-hidden flex items-center justify-center p-3 sm:p-6 bg-[#07090D] ${
            zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,234,255,0.08)_0%,transparent_65%)] pointer-events-none" />

          {!hasError ? (
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="relative max-w-full max-h-[74vh] flex items-center justify-center select-none"
            >
              <img
                src={currentSrc}
                alt={title}
                onError={handleImageError}
                draggable={false}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg drop-shadow-[0_24px_55px_rgba(0,0,0,0.85)] pointer-events-none"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 text-[#C9D0D9] max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-[#111521] border border-[#C9D0D9]/20 flex items-center justify-center text-[#8BEAFF] mb-3">
                <Shirt className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-[#F5F7FA] mb-1">Preview Unavailable</h4>
              <p className="text-xs text-[#C9D0D9]/75 mb-4">
                The jersey showcase artwork could not be loaded right now.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg glass-button-primary text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-20 px-4 py-2.5 sm:py-3 bg-[#0C0F16]/90 border-t border-[#C9D0D9]/15 flex items-center justify-between text-[11px] text-[#C9D0D9]/80 flex-wrap gap-2">
          <span className="truncate max-w-xs sm:max-w-md font-medium">{description}</span>

          <div className="flex items-center gap-3 ml-auto">
            <div className="flex sm:hidden items-center gap-1 bg-[#111521] p-1 rounded-lg border border-[#C9D0D9]/20">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="px-2.5 py-1 rounded bg-white/10 text-[#F5F7FA] font-bold text-xs disabled:opacity-40"
              >
                -
              </button>
              <span className="font-mono text-[10px] text-[#8BEAFF] px-1 font-bold tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className="px-2.5 py-1 rounded bg-white/10 text-[#F5F7FA] font-bold text-xs disabled:opacity-40"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 rounded bg-white/10 text-[#8BEAFF] text-[10px] font-bold"
              >
                1:1
              </button>
            </div>

            <span className="hidden md:inline text-[10px] font-mono text-[#626B79]">
              Scroll or pinch to zoom · Drag to pan · Double-click to toggle · Esc to close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
