export type SuperAdminSectionId =
  | 'website-identity'
  | 'event-settings'
  | 'registration-settings'
  | 'important-notice'
  | 'logo-related'
  | 'gallery';

export interface SuperAdminFeedback {
  type: 'success' | 'error';
  text: string;
}

export interface ConfirmModalState {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

export interface EventCardDraft {
  id: string;
  title: string;
  description: string;
  visible: boolean;
}

export interface GroupPaymentDraft {
  name: string;
  path: string;
  bkash: string;
  nagad: string;
}
