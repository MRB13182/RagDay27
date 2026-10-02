import React, { useState, useRef } from 'react';
import { Upload, Check, Camera, Loader2, X, RefreshCw } from 'lucide-react';
import { GenderType } from '../types';
import { optimizePhoto, MAX_PHOTO_SIZE_BYTES } from '../utils/imageOptimizer';

interface PhotoUploadFieldProps {
  student_photo?: string | null;
  photoUrl?: string | null;
  gender: GenderType;
  onPhotoSelected: (result: {
    student_photo: string;
    photoUrl: string;
    photoFile: File;
    photoBlob: Blob;
  }) => void;
  onPhotoRemoved: () => void;
  labelClasses?: string;
  className?: string;
}

export const PhotoUploadField: React.FC<PhotoUploadFieldProps> = ({
  student_photo,
  photoUrl,
  gender,
  onPhotoSelected,
  onPhotoRemoved,
  labelClasses = 'text-slate-700',
  className = '',
}) => {
  const effectivePhoto = student_photo !== undefined ? student_photo : (photoUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessBadge, setShowSuccessBadge] = useState(false);

  const isMale = gender === 'male';
  const isFemale = gender === 'female';

  // Process a selected or dropped file silently
  const processFile = async (file: File) => {
    // Clear previous errors/success badges
    setErrorMessage(null);
    setShowSuccessBadge(false);

    // Immediate size check before any processing
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setErrorMessage('Photo size must be 3 MB or less.');
      return;
    }

    try {
      setIsProcessing(true);
      const result = await optimizePhoto(file);

      // Successfully processed silently
      onPhotoSelected({
        student_photo: result.dataUrl,
        photoUrl: result.dataUrl,
        photoFile: result.file,
        photoBlob: result.blob,
      });

      setShowSuccessBadge(true);
      setErrorMessage(null);
    } catch (err: any) {
      const msg = err?.message || "✕ Photo doesn't upload. Please try again with another photo.";
      setErrorMessage(msg);
      setShowSuccessBadge(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset file input value so re-selecting same file triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPhotoRemoved();
    setShowSuccessBadge(false);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label & Status Row */}
      <div className="flex items-center justify-between">
        <label className={`block text-xs font-bold uppercase tracking-wider ${labelClasses}`}>
          Student Photo <span className="text-slate-400 font-normal lowercase">(optional)</span>
        </label>

        {/* Success message: ✓ Photo Uploaded */}
        {showSuccessBadge && !errorMessage && !isProcessing && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 animate-fadeIn tracking-wide">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            Photo Uploaded
          </span>
        )}
      </div>

      {/* Modern Glassmorphism Upload Area */}
      <div
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative p-3 sm:p-4 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer backdrop-blur-md select-none ${
          isDragging
            ? isMale
              ? 'border-sky-400 bg-sky-950/40 shadow-[0_0_20px_rgba(56,189,248,0.25)] scale-[1.01]'
              : isFemale
              ? 'border-pink-500 bg-pink-950/20 shadow-[0_0_20px_rgba(244,114,182,0.3)] scale-[1.01]'
              : 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(91,95,239,0.25)] scale-[1.01]'
            : isMale
            ? 'border-slate-700/80 hover:border-sky-400/80 bg-slate-900/60 hover:bg-slate-900/80'
            : isFemale
            ? 'border-pink-300/80 hover:border-pink-400 bg-white/70 hover:bg-white/90'
            : 'border-slate-300 hover:border-indigo-400 bg-white/60 hover:bg-white/80'
        } ${isProcessing ? 'pointer-events-none opacity-80' : ''}`}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left: Avatar Preview or Placeholder Icon */}
          <div className="flex items-center gap-3 min-w-0">
            {effectivePhoto ? (
              <div className="relative group/preview flex-shrink-0">
                <img
                  src={effectivePhoto}
                  alt="Student Portrait Preview"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-white/40 shadow-md transition-transform duration-200 group-hover/preview:scale-105 bg-slate-100"
                />
                {isProcessing && (
                  <div className="absolute inset-0 rounded-xl bg-black/40 backdrop-blur-xs flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  isMale
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 group-hover:shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                    : isFemale
                    ? 'bg-pink-100 text-pink-600 border border-pink-200 group-hover:shadow-[0_0_12px_rgba(244,114,182,0.3)]'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-200 group-hover:shadow-[0_0_12px_rgba(91,95,239,0.2)]'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 stroke-[1.75]" />
                )}
              </div>
            )}

            {/* Middle: Clean Text & Instructions */}
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold tracking-tight truncate">
                {isProcessing
                  ? 'Processing photo...'
                  : effectivePhoto
                  ? 'Photo Uploaded'
                  : 'Click or Drag & Drop Photo'}
              </div>
              <p
                className={`text-[11px] truncate mt-0.5 ${
                  isMale ? 'text-slate-400' : isFemale ? 'text-pink-900/60' : 'text-slate-500'
                }`}
              >
                {effectivePhoto
                  ? 'Click to change or select another photo'
                  : 'JPG, PNG, or WEBP (Max 5 MB)'}
              </p>
            </div>
          </div>

          {/* Right: Actions Button (Browse / Change / Remove) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {effectivePhoto ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    isMale
                      ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40'
                      : isFemale
                      ? 'bg-pink-100 hover:bg-pink-200 text-pink-700 border border-pink-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                  title="Change photo"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden sm:inline">Change</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="p-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                  title="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl border transition-all duration-200 flex items-center gap-1.5 ${
                  isMale
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/40 group-hover:bg-sky-500/30'
                    : isFemale
                    ? 'bg-pink-100 text-pink-700 border-pink-200 group-hover:bg-pink-200'
                    : 'bg-slate-100 text-slate-800 border-slate-200 group-hover:bg-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Browse</span>
              </span>
            )}
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />
      </div>

      {/* Error Message: Professional, Red, Clear */}
      {errorMessage && (
        <div className="flex items-center gap-1 text-xs font-medium text-rose-500 animate-fadeIn pt-0.5">
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
