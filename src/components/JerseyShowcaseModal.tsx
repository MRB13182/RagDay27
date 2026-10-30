import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2, Sparkles, Shirt } from 'lucide-react';

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

  // Sync image source when prop changes
  useEffect(() => {
    setCurrentSrc(imageSrc);
    setHasError(false);
  }, [imageSrc]);

  // Reset zoom & pan when opening/closing
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);
      wasDraggingRef.current = false;
    }
  }, [isOpen]);

  // Prevent background body scrolling when modal is open
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

  // Keyboard navigation: Escape to close, +/- to zoom, 0 to reset
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

  // Non-passive wheel listener for smooth desktop mouse-wheel zoom
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

  const handleZoomIn = () => {
    setZoom(prev => Math.min(+(prev + 0.35).toFixed(2), 4));
  };

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

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    wasDraggingRef.current = false;
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile (pinch-to-zoom + pan)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistanceRef.current = dist;
    } else if (e.touches.length === 1) {
      // Double tap detection
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
        dragStartRef.current = {
          x: e.touches[0].clientX - pan.x,
          y: e.touches[0].clientY - pan.y,
        };
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
    // Only close if user clicked directly on backdrop and was not dragging
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
      className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none"
    >
      {/* Modal Card Frame */}
      <div
        className="relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-2xl sm:rounded-3xl bg-[#081124] border-2 border-[#1E3A8A]/70 shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_50px_rgba(37,99,235,0.25)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Subtle top ambient sheen */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[#1E40AF]/20 via-[#38BDF8]/5 to-transparent pointer-events-none" />

        {/* Top Control Bar */}
        <div className="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-blue-900/60 bg-[#09152C]/90 backdrop-blur-xl">
          {/* Left: Branding & Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#0284C7] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Shirt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-500/30">
                  OFFICIAL ARTWORK
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-blue-200/80">
                  <Sparkles className="w-3 h-3 text-cyan-300" /> High-Resolution Showcase
                </span>
              </div>
              <h3 className="font-display text-sm sm:text-base font-extrabold text-white tracking-tight truncate mt-0.5">
                {title}
              </h3>
            </div>
          </div>

          {/* Right: Zoom controls & Primary Close Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-inner">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                title="Zoom Out (-)"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="px-2 font-mono text-xs font-bold text-cyan-300 min-w-[50px] text-center select-none">
                {Math.round(zoom * 100)}%
              </span>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                title="Zoom In (+)"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
                title="Reset Zoom (0)"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Signature Electric Blue Close Button (prominently styled as in design reference) */}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 border border-blue-400/40 transition-all duration-150 cursor-pointer"
              title="Close Preview (Esc)"
              aria-label="Close jersey preview"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Interactive Viewer Viewport */}
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
          className={`relative z-10 flex-1 w-full min-h-[320px] max-h-[78vh] overflow-hidden flex items-center justify-center p-3 sm:p-6 bg-radial from-[#0E1D3B] via-[#091427] to-[#050C1B] ${
            zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
          }`}
        >
          {/* Subtle grid line accents */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-40" />

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
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-xl drop-shadow-[0_20px_45px_rgba(0,0,0,0.7)] pointer-events-none"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
                <Shirt className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">Preview Loading</h4>
              <p className="text-xs text-slate-400 mb-4">
                The jersey showcase artwork is loading. You can also view it in the official merchandise cards.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          )}
        </div>

        {/* Bottom Status & Mobile Controls Footer */}
        <div className="relative z-20 px-4 py-2.5 sm:py-3 bg-[#070F1E]/95 border-t border-blue-900/40 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-slate-300 font-medium truncate max-w-xs sm:max-w-md">
              {description}
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Mobile zoom controls */}
            <div className="flex sm:hidden items-center gap-1">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="px-2 py-1 rounded bg-slate-800 text-white font-bold text-xs disabled:opacity-40"
              >
                -
              </button>
              <span className="font-mono text-[10px] text-cyan-300 px-1">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className="px-2 py-1 rounded bg-slate-800 text-white font-bold text-xs disabled:opacity-40"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[10px]"
              >
                1:1
              </button>
            </div>

            <span className="hidden md:inline text-[10px] text-slate-400">
              Scroll or pinch to zoom · Drag to pan · Double-click to toggle · Esc to close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
