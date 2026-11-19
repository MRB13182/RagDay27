import React, { useState, useRef } from 'react';
import { Upload, CloudUpload, Check, Camera, Loader2, X, RefreshCw } from 'lucide-react';
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

  // Obsidian/Ice-Blue architectural dropzone treatment (preserves prop contract)
  void gender;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label & Status Row */}
      <div className="flex items-center justify-between">
        <label className={`block text-xs font-bold uppercase tracking-wider ${labelClasses}`}>
          Student Photo <span className="text-[#8993A1] font-normal lowercase">(optional)</span>
        </label>

        {/* Success message: ✓ Photo Uploaded */}
        {showSuccessBadge && !errorMessage && !isProcessing && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 animate-fadeIn tracking-wide">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            Photo Uploaded
          </span>
        )}
      </div>

      {/* Obsidian Architectural Upload Dropzone */}
      <div
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 cursor-pointer backdrop-blur-xl select-none ${
          isDragging
            ? 'border-[#8BEAFF] bg-[#151B23] shadow-[0_0_24px_rgba(139,234,255,0.28)] scale-[1.01]'
            : 'border-[#C9D0D9]/18 hover:border-[#8BEAFF]/55 bg-[#0B0E13] hover:bg-[#10141B] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
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
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-[#8BEAFF]/40 shadow-md transition-transform duration-200 group-hover/preview:scale-105 bg-[#08090D]"
                />
                {isProcessing && (
                  <div className="absolute inset-0 rounded-xl bg-black/70 backdrop-blur-xs flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-[#8BEAFF] animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 bg-[#8BEAFF]/10 text-[#8BEAFF] border border-[#8BEAFF]/25 group-hover:border-[#8BEAFF]/50">
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CloudUpload className="w-6 h-6 stroke-[2]" />
                )}
              </div>
            )}

            {/* Middle: Clean Text & Instructions */}
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold tracking-tight truncate text-[#F5F7FA]">
                {isProcessing
                  ? 'Processing photo...'
                  : effectivePhoto
                  ? 'Photo Uploaded'
                  : 'Click or Drag & Drop Photo'}
              </div>
              <p className="text-[11px] truncate mt-0.5 text-[#8993A1]">
                {effectivePhoto
                  ? 'Click to change or select another photo'
                  : 'JPG, PNG, or WEBP (Max 3 MB)'}
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
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer bg-[#8BEAFF]/12 hover:bg-[#8BEAFF]/22 text-[#8BEAFF] border border-[#8BEAFF]/35"
                  title="Change photo"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden sm:inline">Change</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="p-1.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-500/35 border border-rose-400/35 transition-all cursor-pointer"
                  title="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs font-bold px-3.5 py-2 rounded-xl border transition-all duration-200 flex items-center gap-1.5 bg-gradient-to-r from-[#8BEAFF] to-[#B6F2FF] text-[#08090D] border-[#8BEAFF]/60 shadow-[0_6px_18px_rgba(139,234,255,0.22)]">
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

      {/* Error Message: High-Contrast Red on Obsidian */}
      {errorMessage && (
        <div className="flex items-center gap-1 text-xs font-medium text-rose-400 animate-fadeIn pt-0.5">
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
