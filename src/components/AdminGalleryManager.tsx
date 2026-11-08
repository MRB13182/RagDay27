import React from 'react';
import { GalleryManagement } from '../super-admin/gallery/GalleryManagement';

// Backwards-compatible wrapper for any existing non-Super-Admin imports.
export const AdminGalleryManager: React.FC = () => <GalleryManagement />;
