import React from 'react';
import { GalleryManagement } from '../gallery/GalleryManagement';
import type { ConfirmModalState, SuperAdminFeedback } from '../types';

interface GallerySectionProps {
  onFeedback: (feedback: SuperAdminFeedback) => void;
  onRequestConfirm: (modal: ConfirmModalState) => void;
}

export const GallerySection: React.FC<GallerySectionProps> = ({
  onFeedback,
  onRequestConfirm,
}) => (
  <GalleryManagement onFeedback={onFeedback} onRequestConfirm={onRequestConfirm} />
);
