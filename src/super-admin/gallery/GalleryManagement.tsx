import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  Film,
  ImagePlus,
  Images,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { GalleryMedia } from './types';
import {
  MAX_GALLERY_FILE_BYTES,
  deleteGalleryMediaItem,
  listSuperAdminGalleryMedia,
  reorderGalleryMediaItems,
  updateGalleryMediaItem,
  uploadGalleryMediaItem,
} from '../../services/gallery';
import type { ConfirmModalState, SuperAdminFeedback } from '../types';
import {
  ConfirmActionModal,
  OrderControls,
  SectionHeader,
  inputClass,
  panelClass,
} from '../components/SuperAdminUI';

const formatBytes = (bytes: number) =>
  bytes <= 0
    ? '—'
    : bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

interface GalleryManagementProps {
  onFeedback?: (feedback: SuperAdminFeedback) => void;
  onRequestConfirm?: (modal: ConfirmModalState) => void;
}

export const GalleryManagement: React.FC<GalleryManagementProps> = ({
  onFeedback,
  onRequestConfirm,
}) => {
  const [items, setItems] = useState<GalleryMedia[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryMedia | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [localConfirm, setLocalConfirm] = useState<ConfirmModalState | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const report = (type: 'success' | 'error', text: string) => {
    if (type === 'error') setLocalError(text);
    else setLocalError('');
    onFeedback?.({ type, text });
  };

  const refresh = async () => {
    setLocalError('');
    setLoading(true);
    try {
      const rows = await listSuperAdminGalleryMedia();
      setItems(rows);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load gallery media.';
      setLocalError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const totalSelectedBytes = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files]
  );

  const chooseFiles = (list: FileList | File[]) => {
    const all = Array.from(list);
    const valid = all.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (valid.length !== all.length) {
      report('error', 'Only image and video formats are supported.');
      return;
    }
    if (valid.some(f => f.size > MAX_GALLERY_FILE_BYTES)) {
      report('error', 'Each file must be 150 MB or smaller.');
      return;
    }
    setLocalError('');
    setFiles(valid);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setBusy(true);
    setLocalError('');
    try {
      const nextSortStart = Math.max(0, ...items.map(i => i.sort_order)) + 1;
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const fallbackName = file.name.replace(/\.[^.]+$/, '');
        const itemTitle =
          files.length === 1 && title.trim()
            ? title.trim()
            : title.trim()
            ? `${title.trim()} (${i + 1})`
            : fallbackName;
        await uploadGalleryMediaItem(file, itemTitle, caption.trim(), nextSortStart + i);
      }

      setFiles([]);
      setTitle('');
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      report('success', `${files.length} gallery item(s) uploaded and synced across all devices.`);
      await refresh();
    } catch (err) {
      report('error', err instanceof Error ? err.message : 'Unable to upload gallery media.');
    } finally {
      setBusy(false);
    }
  };

  const openEditModal = (item: GalleryMedia) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditCaption(item.caption || '');
    setEditFile(null);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editTitle.trim()) {
      report('error', 'Media title cannot be empty.');
      return;
    }
    setBusy(true);
    try {
      await updateGalleryMediaItem(editingItem, {
        title: editTitle.trim(),
        caption: editCaption.trim(),
        replacementFile: editFile,
      });
      setEditingItem(null);
      setEditFile(null);
      report('success', 'Gallery item updated.');
      await refresh();
    } catch (err) {
      report('error', err instanceof Error ? err.message : 'Unable to update gallery item.');
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePublished = async (item: GalleryMedia) => {
    setBusy(true);
    try {
      await updateGalleryMediaItem(item, { enabled: !item.enabled });
      report('success', `"${item.title}" is now ${!item.enabled ? 'published' : 'hidden'}.`);
      await refresh();
    } catch (err) {
      report('error', err instanceof Error ? err.message : 'Unable to update visibility.');
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (item: GalleryMedia, direction: -1 | 1) => {
    const ordered = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const index = ordered.findIndex(x => x.id === item.id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];

    setBusy(true);
    try {
      await reorderGalleryMediaItems(ordered.map(x => x.id));
      await refresh();
    } catch (err) {
      report('error', err instanceof Error ? err.message : 'Unable to reorder gallery items.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (item: GalleryMedia) => {
    const confirmSpec: ConfirmModalState = {
      title: 'Delete Gallery Item',
      description: `Permanently delete "${item.title}" from Supabase Storage and the public gallery?`,
      confirmLabel: 'Delete Media',
      onConfirm: async () => {
        setBusy(true);
        try {
          await deleteGalleryMediaItem(item.id);
          report('success', `"${item.title}" deleted.`);
          await refresh();
        } catch (err) {
          report('error', err instanceof Error ? err.message : 'Unable to delete gallery item.');
        } finally {
          setBusy(false);
        }
      },
    };

    if (onRequestConfirm) {
      onRequestConfirm(confirmSpec);
    } else {
      setLocalConfirm(confirmSpec);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Gallery"
        subtitle="Upload, edit, reorder, show/hide, or delete shared images and videos synced via Supabase Storage."
        actions={
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || busy}
            className="inline-flex items-center gap-2 rounded-xl border border-[#C9D0D9]/20 bg-[#121826] px-4 py-2 text-xs font-semibold text-[#C9D0D9] hover:text-white cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#8BEAFF]' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {localError && !onFeedback && (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/35 bg-rose-950/55 px-4 py-3 text-xs font-medium text-rose-100"
        >
          {localError}
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleUpload} className={`${panelClass} grid gap-4 md:grid-cols-2`}>
        <div className="md:col-span-2 flex items-center gap-2 text-sm font-bold text-[#F5F7FA]">
          <ImagePlus className="h-4 w-4 text-[#8BEAFF]" />
          <span>Upload Images & Videos</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#C9D0D9] mb-1.5">
            Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Uses filename when blank"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#C9D0D9] mb-1.5">
            Caption (optional)
          </label>
          <input
            type="text"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Short description shown under media"
            className={inputClass}
          />
        </div>

        <div
          onDragOver={e => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files) chooseFiles(e.dataTransfer.files);
          }}
          className={`md:col-span-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            dragging
              ? 'border-[#8BEAFF] bg-[#8BEAFF]/10'
              : 'border-[#C9D0D9]/22 bg-[#090D16]'
          }`}
        >
          <Upload className="mx-auto h-7 w-7 text-[#8BEAFF]" />
          <p className="mt-2 text-sm font-semibold text-[#F5F7FA]">
            Drop image or video files here, or browse
          </p>
          <p className="mt-1 text-xs text-[#8993A1]">
            Supports JPG, PNG, WebP, MP4, WebM · Max 150 MB per file
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={e => e.target.files && chooseFiles(e.target.files)}
            className="mx-auto mt-3 block max-w-full text-xs text-[#C9D0D9] file:mr-3 file:rounded-lg file:border-0 file:bg-[#141D2E] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#8BEAFF] hover:file:bg-[#1B273D] cursor-pointer"
          />
          {files.length > 0 && (
            <p className="mt-2 text-xs font-medium text-[#8BEAFF] tabular-nums">
              {files.length} file(s) ready · {formatBytes(totalSelectedBytes)}
            </p>
          )}
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={busy || files.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#8BEAFF] px-5 py-2.5 text-xs font-bold text-[#08090D] hover:brightness-110 disabled:opacity-45 cursor-pointer whitespace-nowrap"
          >
            {busy ? (
              <>
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading…</span>
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                <span>Upload to Gallery</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Media Grid */}
      {loading ? (
        <div className={`${panelClass} py-12 text-center text-sm text-[#8993A1]`}>
          Loading shared gallery items…
        </div>
      ) : items.length === 0 ? (
        <div className={`${panelClass} py-12 text-center`}>
          <Images className="mx-auto mb-3 h-8 w-8 text-[#626B79]" />
          <p className="text-sm font-semibold text-[#C9D0D9]">No shared gallery media yet</p>
          <p className="mt-1 text-xs text-[#8993A1]">
            Upload your first photo or video above to display it on the public Gallery page.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, idx) => (
            <article
              key={item.id}
              className={`rounded-2xl border border-[#C9D0D9]/15 bg-[#0D121D] overflow-hidden flex flex-col justify-between transition-opacity ${
                item.enabled ? '' : 'opacity-60'
              }`}
            >
              <div className="relative aspect-[4/3] bg-[#06080D]">
                {item.type === 'image' ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <video
                    src={item.image_url}
                    controls
                    preload="metadata"
                    className="h-full w-full object-contain"
                  />
                )}
              </div>

              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[#8993A1] tabular-nums">
                    <span className="inline-flex items-center gap-1 uppercase font-semibold text-[#8BEAFF]">
                      {item.type === 'video' ? <Film className="h-3 w-3" /> : null}
                      {item.type}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatBytes(item.file_size)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.enabled ? 'Published' : 'Hidden'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#F5F7FA] truncate">{item.title}</h4>
                  {item.caption && (
                    <p className="text-xs text-[#94A0B2] line-clamp-2">{item.caption}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#C9D0D9]/12 pt-3">
                  <OrderControls
                    index={idx}
                    total={items.length}
                    disabled={busy}
                    onMoveUp={() => void handleMove(item, -1)}
                    onMoveDown={() => void handleMove(item, 1)}
                  />

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openEditModal(item)}
                      title="Edit title, caption, or replace media"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#C9D0D9]/18 bg-[#121826] px-2.5 py-1.5 text-xs font-semibold text-[#C9D0D9] hover:border-[#8BEAFF]/45 hover:text-[#8BEAFF] cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleTogglePublished(item)}
                      title={item.enabled ? 'Hide from public' : 'Publish to gallery'}
                      aria-label={item.enabled ? 'Hide from public' : 'Publish to gallery'}
                      className="rounded-lg border border-[#C9D0D9]/18 bg-[#121826] p-1.5 text-[#C9D0D9] hover:border-[#8BEAFF]/45 hover:text-[#8BEAFF] cursor-pointer"
                    >
                      {item.enabled ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(item)}
                      title="Delete media"
                      aria-label="Delete media"
                      className="rounded-lg border border-rose-400/25 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* In-app Edit Modal */}
      {editingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sa-edit-gallery-title"
          className="fixed inset-0 z-[390] flex items-center justify-center bg-[#06080D]/80 backdrop-blur-md p-4"
        >
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-2xl border border-[#C9D0D9]/22 bg-[#0D1320] p-6 space-y-4 shadow-[0_28px_80px_rgba(0,0,0,0.75)]"
          >
            <div className="flex items-center justify-between border-b border-[#C9D0D9]/12 pb-3">
              <h3 id="sa-edit-gallery-title" className="text-base font-bold text-[#F5F7FA]">
                Edit Gallery Media
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                aria-label="Close edit modal"
                className="rounded-lg p-1.5 text-[#94A0B2] hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#C9D0D9] mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#C9D0D9] mb-1.5">
                Caption
              </label>
              <input
                type="text"
                value={editCaption}
                onChange={e => setEditCaption(e.target.value)}
                placeholder="Optional caption"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#C9D0D9] mb-1.5">
                Replace File (optional)
              </label>
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={e => setEditFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-[#C9D0D9] file:mr-3 file:rounded-lg file:border-0 file:bg-[#141D2E] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#8BEAFF]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-[#C9D0D9]/12 pt-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditingItem(null)}
                className="rounded-xl border border-[#C9D0D9]/20 bg-[#141B29] px-4 py-2 text-xs font-semibold text-[#C9D0D9] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-[#8BEAFF] px-4 py-2 text-xs font-bold text-[#08090D] hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {busy ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!onRequestConfirm && (
        <ConfirmActionModal
          modal={localConfirm}
          busy={busy}
          onCancel={() => setLocalConfirm(null)}
        />
      )}
    </div>
  );
};
