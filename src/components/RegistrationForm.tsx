import React, { useState, useEffect } from 'react';
import {
  GenderType,
  JerseySize,
  PaymentMethod,
  RegistrationFormData,
  InvitationRecord,
  PaymentSettings,
} from '../types';
import { DEFAULT_PAYMENT_SETTINGS } from '../data/mockData';
import { getConfiguredCategories, getConfiguredSections } from '../lib/superAdminConfig';
import { parseSafeDate } from '../lib/dateUtils';
import { safeCopyText } from '../lib/browserUtils';
import {
  createRegistration,
  uploadStudentPhoto,
  checkDuplicateRegistration,
  toNullableUuid,
  detectFlaggedFields,
} from '../services';
import { JerseyGraphic } from './JerseyGraphic';
import { BkashLogo, NagadLogo } from './PaymentBrandLogos';
import { PhotoUploadField } from './PhotoUploadField';
import { DuplicateRegistrationModal } from './DuplicateRegistrationModal';
import {
  User,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Shirt,
  CreditCard,
  AlertCircle,
  AlertTriangle,
  Clock,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  X,
  FileCheck,
  Mars,
  Venus,
  IdCard,
  Hash,
  ClipboardCheck,
  Phone,
  GraduationCap,
  Layers,
} from 'lucide-react';

interface RegistrationFormProps {
  onSuccessSubmit: (newRecord: InvitationRecord) => void;
  onGoToInvitation: (regNo: string, studentName?: string) => void;
  paymentSettings?: PaymentSettings;
  existingRegistrations?: InvitationRecord[];
  initialRecord?: InvitationRecord | null;
  registrationOpen?: boolean;
  registrationDeadline?: string;
  onResetReRegister?: () => void;
  onGenderChange?: (gender: GenderType) => void;
}

const JERSEY_SIZES: JerseySize[] = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

function formatRegistrationClosingDate(dateStr: string): string {
  try {
    const d = parseSafeDate(dateStr);
    if (d) {
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'long' });
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
    }
  } catch {}
  return dateStr;
}

const RegistrationDeadlineBanner: React.FC<{ deadline: string }> = ({ deadline }) => {
  const target = parseSafeDate(deadline);
  const targetTime = target?.getTime() ?? Number.NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!Number.isFinite(targetTime)) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [targetTime]);

  const remaining = Number.isFinite(targetTime) ? Math.max(0, targetTime - now) : 0;
  const expired = !Number.isFinite(targetTime) || remaining <= 0;
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const formattedClosingDate = formatRegistrationClosingDate(deadline);
  const units = [
    { label: 'DAYS', value: days },
    { label: 'HOURS', value: hours },
    { label: 'MINUTES', value: minutes },
    { label: 'SECONDS', value: seconds },
  ];

  return (
    <div className="mb-6 rounded-2xl border border-[#C9D0D9]/15 bg-[#090C13]/95 px-4 py-4 sm:px-5 sm:py-5 shadow-inner animate-fadeIn">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-mono text-center">
        <Clock className="h-4 w-4 shrink-0 text-[#8BEAFF]" />
        {expired ? (
          <span className="font-bold text-rose-400">Registration Closed · Deadline Passed ({formattedClosingDate})</span>
        ) : (
          <span className="text-[#8B95A5]">Closing Date: <strong className="text-[#F5F7FA]">{formattedClosingDate}</strong></span>
        )}
      </div>
      {!expired && (
        <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3" aria-label="Time remaining until registration closes" aria-live="off">
          {units.map(unit => (
            <div key={unit.label} className="rounded-xl border border-[#8BEAFF]/20 bg-[#101722] px-2 py-3 text-center">
              <div className="font-mono text-xl sm:text-2xl font-extrabold tabular-nums text-[#F5F7FA]">{String(unit.value).padStart(2, '0')}</div>
              <div className="mt-1 text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-[#8BEAFF]">{unit.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Resolves registration sections from protected super-admin configuration.
 * Sections depend on gender + academic group and are not hardcoded to five entries.
 */
export const getAvailableSections = (gender: GenderType, group: string): string[] => {
  if (gender === 'choose_one') return [];
  return getConfiguredSections(gender, group);
};

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onSuccessSubmit,
  onGoToInvitation,
  paymentSettings = DEFAULT_PAYMENT_SETTINGS,
  existingRegistrations = [],
  initialRecord = null,
  registrationOpen = true,
  registrationDeadline = '2026-11-01T23:59:59',
  onResetReRegister,
  onGenderChange,
}) => {
  const activeFee = paymentSettings?.registrationFee ?? 500;

  const [formData, setFormData] = useState<RegistrationFormData>({
    gender: initialRecord ? 'male' : 'choose_one',
    full_name: '',
    class_roll: '',
    student_id: '',
    contact_mobile_number: '',
    academic_group: '',
    academic_section: '',
    student_photo: null,
    send_method: paymentSettings?.bkashEnabled ? 'bkash' : 'nagad',
    sender_mobile_no: '',
    payment_time: '',
    transaction_id: '',
    jersey_back_name: 'STRIKER',
    jersey_number: '27',
    jersey_size: 'L',
  });

  const handleGenderSelect = (gender: GenderType) => {
    if (gender === 'female') {
      setFormData(prev => ({ ...prev, gender: 'choose_one' }));
      onGenderChange?.('choose_one');
      setGenderWarningMessage('ওই বেটা! তুই কি মাইয়া তোর জিনিস নাই । Male-এ চাপ দে! 😄');
      return;
    }
    setGenderWarningMessage('');
    setFormData(prev => ({ ...prev, gender }));
    onGenderChange?.(gender);
  };

  // Re-submission / editing state for rejected registrations
  const [editingRegNo, setEditingRegNo] = useState<string | null>(null);
  const [editingDbId, setEditingDbId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(initialRecord?.reject_reason || null);
  const [recoveryProof, setRecoveryProof] = useState<{
    studentId: string;
    fullName: string;
    classRoll: string;
    academicGroup: string;
    academicSection: string;
  } | null>(null);

  // Declaration checkbox state (Required: must be checked to submit)
  const [declarationChecked, setDeclarationChecked] = useState(false);

  // UI & Flow states
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [genderWarningMessage, setGenderWarningMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const registrationSteps = ['Personal Information', 'Payment Details', 'Jersey Design', 'Review & Submit'];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

  // Duplicate detection popup state
  const [duplicateModal, setDuplicateModal] = useState<{
    record: InvitationRecord;
    isLoading?: boolean;
    error?: string | null;
  } | null>(null);

  // Registration closed popup state
  const [showClosedModal, setShowClosedModal] = useState(!registrationOpen);

  useEffect(() => {
    if (!registrationOpen) {
      setShowClosedModal(true);
    }
  }, [registrationOpen]);

  // Submission success modal state
  const [successModalData, setSuccessModalData] = useState<{
    name: string;
    regNo: string;
    gender: GenderType;
  } | null>(null);

  // Pre-load complete database record when recovering a rejected registration.
  useEffect(() => {
    if (!initialRecord) return;

    onGenderChange?.(initialRecord.gender || 'male');
    const flagged = detectFlaggedFields(initialRecord.reject_reason);
    const isPhotoFlagged = flagged.has('student_photo');

    setFormData(prev => ({
      ...prev,
      gender: initialRecord.gender || 'male',
      full_name: initialRecord.full_name ?? prev.full_name,
      class_roll: initialRecord.class_roll ?? prev.class_roll,
      student_id: initialRecord.student_id ?? prev.student_id,
      contact_mobile_number: initialRecord.contact_mobile_number || initialRecord.sender_mobile_no || prev.contact_mobile_number,
      academic_group: initialRecord.academic_group ?? prev.academic_group,
      academic_section: initialRecord.academic_section ?? prev.academic_section,
      student_photo: isPhotoFlagged ? null : (initialRecord.student_photo ?? prev.student_photo),
      send_method: initialRecord.send_method || prev.send_method || 'bkash',
      sender_mobile_no: initialRecord.sender_mobile_no || initialRecord.contact_mobile_number || prev.sender_mobile_no,
      payment_time: initialRecord.payment_time ?? prev.payment_time,
      transaction_id: initialRecord.transaction_id ?? prev.transaction_id,
      jersey_back_name: initialRecord.jersey_back_name || prev.jersey_back_name || 'STRIKER',
      jersey_number: initialRecord.jersey_number ?? prev.jersey_number ?? '27',
      jersey_size: (initialRecord.jersey_size as JerseySize) || prev.jersey_size || 'L',
    }));
    setRejectionReason(initialRecord.status === 'rejected' ? (initialRecord.reject_reason || null) : null);
    setEditingRegNo(initialRecord.status === 'rejected' ? initialRecord.registration_no : null);
    setEditingDbId(initialRecord.status === 'rejected' ? toNullableUuid(initialRecord.dbId || initialRecord.id) : null);
    setRecoveryProof(initialRecord.status === 'rejected' ? {
      studentId: initialRecord.student_id || '',
      fullName: initialRecord.full_name || '',
      classRoll: initialRecord.class_roll || '',
      academicGroup: initialRecord.academic_group || '',
      academicSection: initialRecord.academic_section || '',
    } : null);
  }, [initialRecord, onGenderChange]);

  // Keep fee in sync
  useEffect(() => {
    if (paymentSettings?.registrationFee) {
      setFormData(prev => ({ ...prev, amount: paymentSettings.registrationFee }));
    }
  }, [paymentSettings?.registrationFee]);

  // Determine flagged fields from rejection reason
  const flaggedFields = React.useMemo(() => {
    return editingRegNo && rejectionReason ? detectFlaggedFields(rejectionReason) : new Set<string>();
  }, [editingRegNo, rejectionReason]);

  const isFlagged = (fieldName: string) => flaggedFields.has(fieldName);
  const hasSpecificFlaggedFields = flaggedFields.size > 0;

  const getFieldHighlightClass = (fieldName: string) => {
    if (!isFlagged(fieldName)) return '';
    return '!border-rose-500 !ring-2 !ring-rose-400/50 focus:!border-rose-600 focus:!ring-rose-500';
  };

  const isMale = formData.gender === 'male';
  const isGenderChosen = formData.gender !== 'choose_one';

  // Container & styling classes aligned with Obsidian Black / Liquid Silver / Ice Blue system
  const containerClasses = 'museum-frame bg-[#0C1018]/92 text-[#F5F7FA] border border-[#8BEAFF]/35 shadow-[0_32px_90px_rgba(0,0,0,0.7),0_0_40px_rgba(139,234,255,0.12)]';

  const sectionHeaderClasses = 'text-[#8BEAFF] border-b border-[#C9D0D9]/15';

  const labelClasses = 'text-[#C9D0D9]';

  const inputClasses = 'bg-[#080B12]/90 border border-[#C9D0D9]/18 text-[#F5F7FA] placeholder-[#626B79] focus:border-[#8BEAFF] focus:ring-2 focus:ring-[#8BEAFF]/25';

  const subCardClasses = 'bg-[#090C13]/85 border border-[#C9D0D9]/15 backdrop-blur-xl';

  // Resolve the payment account from the student's academic group (with fallback for custom categories).
  const normalizedGroup = formData.academic_group.trim().toLowerCase();
  const groupKey = /science/.test(normalizedGroup) ? 'Science'
    : /business|commerce/.test(normalizedGroup) ? 'Business Studies'
    : /humanities|arts/.test(normalizedGroup) ? 'Humanities'
    : formData.academic_group.trim();
  const groupPayment = groupKey
    ? (paymentSettings?.groupPaymentNumbers?.[formData.academic_group.trim()] || paymentSettings?.groupPaymentNumbers?.[groupKey])
    : undefined;
  const activeBkashNumber = groupPayment?.bkash?.trim() || (formData.academic_group.trim() ? (paymentSettings?.maleBkashNumber?.trim() || '') : '');
  const activeNagadNumber = groupPayment?.nagad?.trim() || (formData.academic_group.trim() ? (paymentSettings?.maleNagadNumber?.trim() || '') : '');
  const hasGroupPayment = Boolean(activeBkashNumber || activeNagadNumber);

  const handleCopyAccount = async (number: string, label: string) => {
    await safeCopyText(number);
    setCopiedAccount(label);
    setTimeout(() => setCopiedAccount(null), 2500);
  };

  const getMobileError = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return '';
    if (!/^\d+$/.test(trimmed)) return 'Must contain numbers only.';
    if (trimmed.length !== 11) return 'Must be 11 digits.';
    return '';
  };

  const handleGroupSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      academic_group: val,
      academic_section: '', // Reset section when group changes
    }));
    if (formErrors.academic_group) {
      setFormErrors(prev => ({ ...prev, academic_group: '' }));
    }
    setSubmitErrorMessage(null);
  };

  const availableCategories = getConfiguredCategories();
  const availableSections = getAvailableSections(formData.gender, formData.academic_group);

  // Perform Duplicate Detection Check
  const runDuplicateCheck = async (): Promise<boolean> => {
    const result = await checkDuplicateRegistration(
      formData.student_id,
      formData.full_name,
      formData.class_roll,
      formData.academic_group,
      formData.academic_section,
      editingRegNo || undefined
    );

    if (result.level === 'block') {
      const record = result.matches[0];
      if (record) setDuplicateModal({ record });
      else setSubmitErrorMessage(result.reason || 'This Student ID is already registered.');
      return true;
    }
    return false;
  };

  const handleStudentIdBlur = async () => {
    const sId = formData.student_id.trim();
    if (!sId || sId.length < 4) return;
    if (editingRegNo && sId === recoveryProof?.studentId) return;

    try {
      const result = await checkDuplicateRegistration(
        sId,
        formData.full_name,
        formData.class_roll,
        formData.academic_group,
        formData.academic_section,
        editingRegNo || undefined
      );
      if (result.level === 'block' && result.matches[0]) {
        setDuplicateModal({ record: result.matches[0] });
      }
    } catch (error: any) {
      setSubmitErrorMessage(error?.message || 'Unable to verify Student ID. Please retry.');
    }
  };

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      [
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
      ].includes(e.key) ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.gender || formData.gender === 'choose_one') errors.gender = 'Please select your gender.';
    if (!formData.full_name.trim()) errors.full_name = 'Full name is required.';

    const rollTrim = formData.class_roll.trim();
    if (!rollTrim) {
      errors.class_roll = 'Roll number is required.';
    } else if (!/^\d+$/.test(rollTrim)) {
      errors.class_roll = 'Roll number must contain digits only.';
    } else if (/^0+$/.test(rollTrim)) {
      errors.class_roll = 'Roll number must be greater than 0.';
    }

    const studentIdTrim = formData.student_id.trim();
    if (!studentIdTrim) {
      errors.student_id = 'Student ID is required.';
    } else if (!/^\d+$/.test(studentIdTrim)) {
      errors.student_id = 'Student ID must contain digits only.';
    }
    
    const contactErr = getMobileError(formData.contact_mobile_number);
    if (!formData.contact_mobile_number.trim()) {
      errors.contact_mobile_number = 'Contact number is required.';
    } else if (contactErr) {
      errors.contact_mobile_number = contactErr;
    }

    if (!formData.academic_group.trim()) errors.academic_group = 'Please select your academic group.';
    if (!formData.academic_section.trim()) errors.academic_section = 'Please select your section.';

    // Send Method & Payment Validation
    const senderErr = getMobileError(formData.sender_mobile_no);
    if (!formData.sender_mobile_no.trim()) {
      errors.sender_mobile_no = 'Sender payment number is required.';
    } else if (senderErr) {
      errors.sender_mobile_no = senderErr;
    }

    if (!formData.payment_time.trim()) errors.payment_time = 'Payment time is required.';

    // Jersey Validation
    if (!formData.jersey_back_name.trim()) errors.jersey_back_name = 'Jersey name is required.';
    if (formData.jersey_back_name.trim().length > 14) {
      errors.jersey_back_name = 'Jersey name must be 14 characters or less.';
    }
    const jerseyNumStr = formData.jersey_number.trim();
    if (!jerseyNumStr) {
      errors.jersey_number = 'Jersey number is required.';
    } else if (!/^\d{1,3}$/.test(jerseyNumStr)) {
      errors.jersey_number = 'Jersey number must be 1 to 3 digits only (0–999).';
    }

    // Declaration Checkbox Validation
    if (!declarationChecked) {
      errors.declaration = 'You must confirm the declaration statement to submit.';
    }

    return errors;
  };

  const validateStep = (step: number) => {
    const allErrors = validateForm();
    const fieldsByStep: Record<number, string[]> = {
      0: ['full_name', 'class_roll', 'student_id', 'contact_mobile_number', 'academic_group', 'academic_section'],
      1: ['sender_mobile_no', 'payment_time', 'transaction_id'],
      2: ['jersey_back_name', 'jersey_number'],
      3: ['declaration'],
    };
    const stepErrors = Object.fromEntries(fieldsByStep[step].filter(field => allErrors[field]).map(field => [field, allErrors[field]]));
    setFormErrors(prev => ({ ...prev, ...stepErrors }));
    return Object.keys(stepErrors).length === 0;
  };

  const goToNextStep = () => {
    setFormErrors({});
    setCurrentStep(step => Math.min(step + 1, registrationSteps.length - 1));
    setSubmitErrorMessage(null);
  };

  const goToPreviousStep = () => {
    setCurrentStep(step => Math.max(step - 1, 0));
    setSubmitErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitErrorMessage(null);

    // 1. Registration Open / Closed Check
    if (!registrationOpen) {
      setShowClosedModal(true);
      return;
    }

    // Female registration is intentionally disabled. Never submit a female registration.
    if (formData.gender !== 'male') {
      setSubmitErrorMessage('Registration is currently available for Male students only.');
      setFormData(prev => ({ ...prev, gender: 'choose_one' }));
      onGenderChange?.('choose_one');
      return;
    }

    // Group-scoped accounts are mandatory: never allow a student to submit
    // using another group's account or an unconfigured payment destination.
    const selectedGroupAccount = formData.send_method === 'bkash' ? activeBkashNumber : activeNagadNumber;
    if (!groupKey || !selectedGroupAccount) {
      setSubmitErrorMessage(
        !groupKey
          ? 'Please select a valid academic group before proceeding with payment.'
          : `The ${formData.send_method === 'bkash' ? 'bKash' : 'Nagad'} payment number for ${groupKey} is not configured. Please contact the administrator.`
      );
      setIsSubmitting(false);
      return;
    }

    // 2. Validate Required Fields
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    // 3. Duplicate Detection Check before submission
    setIsSubmitting(true);
    try {
      const isDuplicate = await runDuplicateCheck();
      if (isDuplicate) {
        setIsSubmitting(false);
        return;
      }

      // 4. Photo upload if file exists
      let photoStoragePath: string | null = null;
      let displayPhotoUrl = formData.student_photo || '';
      if (formData.photoFile) {
        const uploadRes = await uploadStudentPhoto(formData.photoFile, formData.class_roll.trim());
        if (uploadRes.success) {
          photoStoragePath = uploadRes.storagePath;
          displayPhotoUrl = uploadRes.publicUrl;
        } else if (displayPhotoUrl) {
          console.warn('Storage upload failed, falling back to optimized photo:', uploadRes.errorMessage);
        } else {
          throw new Error(uploadRes.errorMessage || 'Student photo upload failed.');
        }
      }

      // 5. Submit or Re-submit registration
      const result = await createRegistration(
        {
          ...formData,
          student_photo: photoStoragePath || displayPhotoUrl || null,
        },
        editingRegNo || undefined,
        editingDbId || undefined,
        recoveryProof || undefined,
        existingRegistrations
      );

      if (!result.success || !result.data) {
        setSubmitErrorMessage(result.errorMessage || 'Registration submission failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const confirmedRecord = result.data;

      // Notify parent app
      onSuccessSubmit(confirmedRecord);

      // Open Success Modal
      setSuccessModalData({
        name: confirmedRecord.full_name,
        regNo: confirmedRecord.registration_no,
        gender: formData.gender,
      });

      // Clear edit state if any
      setEditingRegNo(null);
      setEditingDbId(null);
      setRejectionReason(null);
      setRecoveryProof(null);
      if (onResetReRegister) onResetReRegister();
    } catch (err: any) {
      console.error('Registration submission error:', err);
      setSubmitErrorMessage(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelReRegistration = () => {
    setEditingRegNo(null);
    setEditingDbId(null);
    setRejectionReason(null);
    setRecoveryProof(null);
    if (onResetReRegister) onResetReRegister();
  };

  const handleContinueRejectedRegistration = (record: InvitationRecord) => {
    // Only a database-confirmed rejected record may enter recovery mode.
    if (record.status !== 'rejected') {
      setDuplicateModal({ record });
      return;
    }

    const flagged = detectFlaggedFields(record.reject_reason);
    const isPhotoFlagged = flagged.has('student_photo');
    setFormData(prev => ({
      ...prev,
      gender: record.gender || 'male',
      full_name: record.full_name ?? prev.full_name,
      class_roll: record.class_roll ?? prev.class_roll,
      student_id: record.student_id ?? prev.student_id,
      contact_mobile_number: record.contact_mobile_number || record.sender_mobile_no || prev.contact_mobile_number,
      academic_group: record.academic_group ?? prev.academic_group,
      academic_section: record.academic_section ?? prev.academic_section,
      student_photo: isPhotoFlagged ? null : (record.student_photo ?? prev.student_photo),
      send_method: record.send_method || prev.send_method || 'bkash',
      sender_mobile_no: record.sender_mobile_no || record.contact_mobile_number || prev.sender_mobile_no,
      payment_time: record.payment_time ?? prev.payment_time,
      transaction_id: record.transaction_id ?? prev.transaction_id,
      jersey_back_name: record.jersey_back_name || prev.jersey_back_name || 'STRIKER',
      jersey_number: record.jersey_number ?? prev.jersey_number ?? '27',
      jersey_size: (record.jersey_size as JerseySize) || prev.jersey_size || 'L',
    }));
    setRejectionReason(record.reject_reason || null);
    setEditingRegNo(record.registration_no);
    setEditingDbId(toNullableUuid(record.dbId || record.id));
    setRecoveryProof({
      studentId: record.student_id || '',
      fullName: record.full_name || '',
      classRoll: record.class_roll || '',
      academicGroup: record.academic_group || '',
      academicSection: record.academic_section || '',
    });
    setSubmitErrorMessage(null);
    setFormErrors({});
    setDuplicateModal(null);
  };

  return (
    <div className="py-6 sm:py-10 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
      {/* Re-submission Banner if editing previously rejected record */}
      {editingRegNo && (
        <div className="mb-6 p-4.5 rounded-2xl bg-amber-950/60 backdrop-blur-xl border border-amber-400/35 text-amber-100 shadow-[0_18px_40px_rgba(0,0,0,0.45)] flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-[#08090D] flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-sm">
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Re-Submitting Registration
                </div>
                <div className="text-sm font-extrabold text-[#F5F7FA]">
                  Registration No: <span className="font-mono text-[#8BEAFF]">{editingRegNo}</span>
                </div>
              </div>

              {rejectionReason && (
                <div className="p-3 rounded-xl bg-[#090C13]/90 backdrop-blur-md border border-rose-500/35 text-xs">
                  <span className="font-bold text-rose-300 uppercase block text-[10px] tracking-wider">
                    Rejection Reason:
                  </span>
                  <p className="font-semibold text-rose-100 mt-0.5 whitespace-pre-wrap">{rejectionReason}</p>
                </div>
              )}

              {!hasSpecificFlaggedFields && (
                <p className="text-rose-300 text-xs font-bold flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Previously, you made a mistake here. Please correct this.</span>
                </p>
              )}

              {hasSpecificFlaggedFields && (
                <p className="text-xs text-amber-200">
                  Please review and correct the highlighted fields marked below. Your registration number remains permanent.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelReRegistration}
            className="p-2 text-amber-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Cancel re-submission"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Registration Container */}
      <div className={`registration-theme rounded-3xl p-4 sm:p-8 lg:p-10 transition-all duration-500 ease-out ${isMale ? containerClasses : 'museum-frame bg-[#0C1018]/92 text-[#F5F7FA] border border-[#C9D0D9]/18 shadow-[0_32px_90px_rgba(0,0,0,0.65)]'}`}>
        {/* Registration Header */}
        <div className="mb-6 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] mb-3 bg-[#090C13]/90 border border-[#8BEAFF]/30 text-[#8BEAFF]">
            <Sparkles className="w-3.5 h-3.5 text-[#8BEAFF]" />
            <span>Official Batch 27 Enrollment</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F5F7FA]">
            Rag Day 27 Student Registration
          </h1>
          <p className="text-xs sm:text-sm mt-1.5 text-[#94A0B2]">
            Select your wing gender first to unlock the enrollment form and personalized jersey preview.
          </p>
        </div>

        {/* Static Registration Closing Date Banner */}
        {registrationDeadline && (
          <RegistrationDeadlineBanner deadline={registrationDeadline} />
        )}

        {/* Step 1: Select Your Gender */}
        <section className="space-y-4">
          <div className="pb-2.5 font-display text-base sm:text-lg font-bold flex items-center justify-between text-[#8BEAFF] border-b border-[#C9D0D9]/15">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#8BEAFF]" />
              Step 1: Select Your Gender
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Male Option Card */}
            <button
              type="button"
              onClick={() => handleGenderSelect('male')}
              className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer ${
                formData.gender === 'male'
                  ? 'bg-[#8BEAFF]/15 border-2 border-[#8BEAFF] text-[#F5F7FA] shadow-[0_0_24px_rgba(139,234,255,0.22)] ring-2 ring-[#8BEAFF]/20'
                  : 'bg-[#090C13]/90 border border-[#C9D0D9]/18 text-[#C9D0D9] hover:border-[#8BEAFF]/45 hover:text-[#F5F7FA]'
              }`}
            >
              <Mars className={`w-5 h-5 ${formData.gender === 'male' ? 'text-[#8BEAFF]' : 'text-[#8BEAFF]/75'}`} />
              <span>Male</span>
              {formData.gender === 'male' && <Check className="w-4 h-4 ml-1 text-[#8BEAFF]" />}
            </button>

            {/* Female Option Card */}
            <button
              type="button"
              onClick={() => handleGenderSelect('female')}
              className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer ${
                formData.gender === 'female'
                  ? 'bg-[#151B23] border-2 border-[#C9D0D9] text-[#F5F7FA] shadow-sm ring-2 ring-[#C9D0D9]/20'
                  : 'bg-[#090C13]/90 border border-[#C9D0D9]/18 text-[#8993A1] hover:border-[#C9D0D9]/45 hover:text-[#F5F7FA]'
              }`}
            >
              <Venus className={`w-5 h-5 ${formData.gender === 'female' ? 'text-[#C9D0D9]' : 'text-[#8993A1]'}`} />
              <span>Female</span>
            </button>
          </div>
        </section>

        {/* State A: Gender not selected yet */}
        {genderWarningMessage ? (
          <div role="alert" aria-live="polite" className="mx-auto mt-6 max-w-4xl rounded-2xl border-2 border-amber-400/50 bg-amber-950/60 px-5 py-6 sm:px-8 sm:py-8 text-center text-lg sm:text-2xl font-extrabold leading-relaxed text-amber-200 shadow-[0_14px_34px_rgba(0,0,0,0.5)] animate-fadeIn">
            {genderWarningMessage}
          </div>
        ) : formData.gender === 'choose_one' ? (
          <div className="mt-6 p-8 sm:p-12 rounded-2xl border border-[#C9D0D9]/15 bg-[#090C13]/85 backdrop-blur-sm text-center animate-fadeIn">
            <p className="text-sm sm:text-base font-semibold text-[#94A0B2]">
              Please select your gender to register.
            </p>
          </div>
        ) : null}

        {/* State C: Gender selected — guided multi-step registration. */}
        {formData.gender === 'male' && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6 registration-form-gendered animate-fadeIn">
            <div className="space-y-8 animate-fadeIn">
              {/* ======================================================== */}
              {/* 2. PERSONAL INFORMATION                                  */}
              {/* ======================================================== */}
              <div className={`space-y-4 ${currentStep === 0 ? '' : 'hidden'}`}>
                <div className={`pb-2.5 font-display text-base sm:text-lg font-bold flex items-center justify-between ${sectionHeaderClasses}`}>
                  <span className="flex items-center gap-2">
                    <IdCard className="w-4 h-4" />
                    2. Personal Information
                  </span>
                  <span className="text-xs font-normal text-[#8B95A5]">Required fields *</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Full Name */}
                  <div className="sm:col-span-2">
                    <label className={`flex items-center gap-1.5 block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="flex items-stretch gap-2">
                      <span className="flex w-12 shrink-0 items-center justify-center rounded-xl border border-[#8BEAFF]/25 bg-[#080B12] text-[#8BEAFF]"><User className="w-[18px] h-[18px]" /></span>
                      <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={formData.full_name}
                      onChange={e => {
                        setFormData({ ...formData, full_name: e.target.value });
                        if (formErrors.full_name) setFormErrors(prev => ({ ...prev, full_name: '' }));
                      }}
                      className={`min-w-0 flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses} ${getFieldHighlightClass('full_name')}`}
                    />
                    </div>
                    {formErrors.full_name && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.full_name}</p>
                    )}
                    {isFlagged('full_name') && (
                      <p className="text-rose-400 text-xs mt-1.5 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Previously, you made a mistake here. Please correct this.</span>
                      </p>
                    )}
                  </div>

                  {/* 2. Class Roll */}
                  <div>
                    <label className={`flex items-center gap-1.5 block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      Class Roll <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-stretch gap-2">
                    <span className="flex w-12 shrink-0 items-center justify-center rounded-xl border border-[#8BEAFF]/25 bg-[#080B12] text-[#8BEAFF]"><Hash className="w-[18px] h-[18px]" /></span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="e.g. 101"
                      value={formData.class_roll}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={e => {
                        e.preventDefault();
                        const val = e.clipboardData.getData('text').replace(/\D/g, '');
                        setFormData(prev => ({ ...prev, class_roll: val }));
                        if (formErrors.class_roll) setFormErrors(prev => ({ ...prev, class_roll: '' }));
                      }}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setFormData(prev => ({ ...prev, class_roll: val }));
                        if (formErrors.class_roll) setFormErrors(prev => ({ ...prev, class_roll: '' }));
                      }}
                      className={`min-w-0 flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses} ${getFieldHighlightClass('class_roll')}`}
                    />
                    </div>
                    {formErrors.class_roll && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.class_roll}</p>
                    )}
                    {isFlagged('class_roll') && (
                      <p className="text-rose-400 text-xs mt-1.5 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Previously, you made a mistake here. Please correct this.</span>
                      </p>
                    )}
                  </div>

                  {/* 3. Student ID */}
                  <div>
                    <label className={`flex items-center gap-1.5 block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      Student ID <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-stretch gap-2">
                    <span className="flex w-12 shrink-0 items-center justify-center rounded-xl border border-[#8BEAFF]/25 bg-[#080B12] text-[#8BEAFF]"><IdCard className="w-[18px] h-[18px]" /></span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="e.g. 270101"
                      value={formData.student_id}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={e => {
                        e.preventDefault();
                        const val = e.clipboardData.getData('text').replace(/\D/g, '');
                        setFormData(prev => ({ ...prev, student_id: val }));
                        if (formErrors.student_id) setFormErrors(prev => ({ ...prev, student_id: '' }));
                      }}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setFormData(prev => ({ ...prev, student_id: val }));
                        if (formErrors.student_id) setFormErrors(prev => ({ ...prev, student_id: '' }));
                      }}
                      onBlur={handleStudentIdBlur}
                      className={`min-w-0 flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses} ${getFieldHighlightClass('student_id')}`}
                    />
                    </div>
                    {formErrors.student_id && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.student_id}</p>
                    )}
                    {isFlagged('student_id') && (
                      <p className="text-rose-400 text-xs mt-1.5 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Previously, you made a mistake here. Please correct this.</span>
                      </p>
                    )}
                  </div>

                  {/* 4. Contact Mobile Number */}
                  <div className="sm:col-span-2">
                    <label className={`flex items-center gap-1.5 block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      Contact Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="registration-field-row">
                    <span className="registration-field-icon"><Phone className="w-[18px] h-[18px]" /></span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={11}
                      placeholder="e.g. 017XXXXXXXX"
                      value={formData.contact_mobile_number}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={e => {
                        e.preventDefault();
                        const val = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 11);
                        setFormData(prev => ({ ...prev, contact_mobile_number: val }));
                        if (formErrors.contact_mobile_number) setFormErrors(prev => ({ ...prev, contact_mobile_number: '' }));
                      }}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setFormData(prev => ({ ...prev, contact_mobile_number: val }));
                        if (formErrors.contact_mobile_number) setFormErrors(prev => ({ ...prev, contact_mobile_number: '' }));
                      }}
                      className={`min-w-0 flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses} ${getFieldHighlightClass('contact_mobile_number')}`}
                    />
                    </div>
                    {(getMobileError(formData.contact_mobile_number) || formErrors.contact_mobile_number) && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">
                        {getMobileError(formData.contact_mobile_number) || formErrors.contact_mobile_number}
                      </p>
                    )}
                    {isFlagged('contact_mobile_number') && (
                      <p className="text-rose-400 text-xs mt-1.5 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Previously, you made a mistake here. Please correct this.</span>
                      </p>
                    )}
                  </div>

                  <div className="contents">
                  {/* 5. Academic Group */}
                  <div>
                    <label className={`flex items-center gap-1.5 block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      Academic Group <span className="text-rose-500">*</span>
                    </label>
                    <div className="registration-field-row">
                    <span className="registration-field-icon"><GraduationCap className="w-[18px] h-[18px]" /></span>
                    <select
                      value={formData.academic_group}
                      onChange={handleGroupSelect}
                      className={`min-w-0 flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none cursor-pointer ${inputClasses} ${getFieldHighlightClass('academic_group')}`}
                    >
                      <option value="" className="bg-[#0B0F17] text-[#F5F7FA]">
                        {availableCategories.length > 0 ? 'Select Academic Group...' : 'No categories configured'}
                      </option>
                      {availableCategories.map(catName => (
                        <option key={catName} value={catName} className="bg-[#0B0F17] text-[#F5F7FA]">
                          {catName}
                        </option>
                      ))}
                    </select>
                    </div>
                    {formErrors.academic_group && (
                      <p className="text-rose-400 text-xs mt-1 font-semibold">{formErrors.academic_group}</p>
                    )}
                    {isFlagged('academic_group') && (
                      <p className="text-rose-400 text-xs mt-1.5 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Previously, you made a mistake here. Please correct this.</span>
                      </p>
                    )}
                  </div>

                  {/* 6. Academic Section */}
                  <div>
                    <label className={`flex items-center gap-1.5 block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      Academic Section <span className="text-rose-500">*</span>
                    </label>
                    <div className="registration-field-row">
                    <span className="registration-field-icon"><Layers className="w-[18px] h-[18px]" /></span>
                    <select
                      disabled={!formData.academic_group}
                      value={formData.academic_section}
                      onChange={e => {
                        setFormData({ ...formData, academic_section: e.target.value });
                        if (formErrors.academic_section) setFormErrors(prev => ({ ...prev, academic_section: '' }));
                      }}
                      className={`min-w-0 flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${inputClasses} ${getFieldHighlightClass('academic_section')}`}
                    >
                      <option value="" className="bg-[#0B0F17] text-[#F5F7FA]">
                        {formData.academic_group ? 'Choose Section...' : 'Select Group First'}
                      </option>
                      {availableSections.map(sec => (
                        <option
                          key={sec}
                          value={sec}
                          className="bg-[#0B0F17] text-[#F5F7FA]"
                        >
                          Section {sec}
                        </option>
                      ))}
                    </select>
                    </div>
                    {formErrors.academic_section && (
                      <p className="text-rose-400 text-xs mt-1 font-semibold">{formErrors.academic_section}</p>
                    )}
                    {isFlagged('academic_section') && (
                      <p className="text-rose-400 text-xs mt-1.5 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Previously, you made a mistake here. Please correct this.</span>
                      </p>
                    )}
                  </div>

                  </div>

                  {/* 7. Student Photo Upload (Optional, Max 3MB) */}
                  <div className={`sm:col-span-2 pt-1 ${isFlagged('student_photo') ? 'p-3 rounded-2xl border-2 border-rose-500/60 bg-rose-950/25' : ''}`}>
                    <PhotoUploadField
                      student_photo={formData.student_photo}
                      photoUrl={formData.student_photo}
                      gender="male"
                      labelClasses={labelClasses}
                      onPhotoSelected={({ student_photo, photoFile, photoBlob }) => {
                        setFormData(prev => ({ ...prev, student_photo, photoFile, photoBlob }));
                      }}
                      onPhotoRemoved={() => {
                        setFormData(prev => ({ ...prev, student_photo: null, photoFile: null, photoBlob: null }));
                      }}
                    />
                    {isFlagged('student_photo') && (
                      <p className="text-rose-400 text-xs mt-2 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Previously, you made a mistake here. Please correct this.</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Group-wise account instructions directly below personal and academic information. */}
              <section className={`mt-5 space-y-3 ${currentStep === 0 ? '' : 'hidden'}`}>
                <div className="rounded-2xl border border-[#C9D0D9]/16 bg-[#090C13]/92 p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-[#F5F7FA]">Payment Information · <span className="text-[#8BEAFF]">{formData.academic_group || 'Select your group'}</span></h3>
                    <span className="rounded-md bg-[#8BEAFF]/12 border border-[#8BEAFF]/30 px-2.5 py-1 text-xs font-mono font-bold text-[#8BEAFF]">Fee: {activeFee} BDT</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#94A0B2]">Select the correct group for payment. Copy the number below and send the exact registration fee. After payment, enter the sender number, Transaction ID and payment time in the next step.</p>
                  {!formData.academic_group ? <p className="text-xs text-amber-300">Select an Academic Group above to view its payment accounts.</p> : (!hasGroupPayment ? <p className="text-xs text-rose-300">Payment account numbers are not configured for this group. Please contact the organizers.</p> : null)}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#C9D0D9]/22 bg-[#10141B] p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-9 h-9 rounded-lg bg-white/95 flex items-center justify-center p-1 shrink-0"><BkashLogo className="w-6 h-6"/></span>
                        <div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-wider text-[#C9D0D9]">bKash Personal</div><div className="truncate font-mono text-sm text-[#F5F7FA] tabular-nums">{activeBkashNumber || 'Not configured'}</div></div>
                      </div>
                      <button type="button" disabled={!activeBkashNumber} onClick={()=>handleCopyAccount(activeBkashNumber.replace(/\D/g,''),'bkash')} className="rounded-lg border border-[#8BEAFF]/35 bg-[#8BEAFF]/12 hover:bg-[#8BEAFF]/22 px-3 py-2 text-xs font-bold text-[#8BEAFF] disabled:opacity-40 cursor-pointer shrink-0"><Copy className="mr-1 inline w-3.5 h-3.5"/>Copy</button>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#C9D0D9]/22 bg-[#10141B] p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-9 h-9 rounded-lg bg-white/95 flex items-center justify-center p-1 shrink-0"><NagadLogo className="w-6 h-6"/></span>
                        <div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-wider text-[#C9D0D9]">Nagad Personal</div><div className="truncate font-mono text-sm text-[#F5F7FA] tabular-nums">{activeNagadNumber || 'Not configured'}</div></div>
                      </div>
                      <button type="button" disabled={!activeNagadNumber} onClick={()=>handleCopyAccount(activeNagadNumber.replace(/\D/g,''),'nagad')} className="rounded-lg border border-[#8BEAFF]/35 bg-[#8BEAFF]/12 hover:bg-[#8BEAFF]/22 px-3 py-2 text-xs font-bold text-[#8BEAFF] disabled:opacity-40 cursor-pointer shrink-0"><Copy className="mr-1 inline w-3.5 h-3.5"/>Copy</button>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8B95A5]">Manual bKash/Nagad Send Money only. No online payment gateway is used.</p>
                </div>
              </section>

              {/* ======================================================== */}
              {/* 3. PAYMENT INFORMATION SECTION                           */}
              {/* ======================================================== */}
              <div className={`space-y-4 pt-2 ${currentStep === 1 ? '' : 'hidden'}`}>
                <div className={`pb-2.5 font-display text-base sm:text-lg font-bold flex items-center justify-between ${sectionHeaderClasses}`}>
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    2. Payment Details
                  </span>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-[#8BEAFF]/12 border border-[#8BEAFF]/30 text-[#8BEAFF]">
                    Fee: {paymentSettings.registrationFee} BDT
                  </span>
                </div>

                <div className={`p-4 sm:p-5 rounded-2xl ${subCardClasses} space-y-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C9D0D9]/12 pb-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#C9D0D9] block">
                        Official Payment Accounts ({formData.academic_group})
                      </span>
                      <p className="text-xs mt-0.5 text-[#8B95A5]">
                        {paymentSettings.instructions || 'Send Personal payment (Send Money) and retain sender phone number.'}
                      </p>
                    </div>
                  </div>

                  {/* Payment Numbers: bKash & Nagad Obsidian Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Group-scoped bKash account */}
                    <div className="relative overflow-hidden p-4 rounded-2xl border border-[#C9D0D9]/22 bg-[#10141B] flex items-center justify-between gap-3">
                      <div className="relative z-10 flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-white/95 flex items-center justify-center p-1.5 shrink-0">
                          <BkashLogo className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#C9D0D9]">bKash Personal</div>
                          <div className="font-mono font-black text-sm sm:text-base text-[#F5F7FA] truncate tabular-nums">{activeBkashNumber || 'Not configured'}</div>
                        </div>
                      </div>
                      <button type="button" disabled={!activeBkashNumber}
                        onClick={() => {
                          if (!activeBkashNumber) return;
                          handleCopyAccount(activeBkashNumber.replace(/\D/g, '') || activeBkashNumber, 'bkash');
                          setFormData(prev => ({ ...prev, send_method: 'bkash' }));
                        }}
                        className="relative z-10 px-3 py-2 rounded-xl text-xs font-extrabold bg-[#8BEAFF]/12 hover:bg-[#8BEAFF]/22 text-[#8BEAFF] border border-[#8BEAFF]/35 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1 shrink-0">
                        {copiedAccount === 'bkash' ? <Check className="inline w-3.5 h-3.5" /> : <Copy className="inline w-3.5 h-3.5" />}
                        {copiedAccount === 'bkash' ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    {/* Group-scoped Nagad account */}
                    <div className="relative overflow-hidden p-4 rounded-2xl border border-[#C9D0D9]/22 bg-[#10141B] flex items-center justify-between gap-3">
                      <div className="relative z-10 flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-white/95 flex items-center justify-center p-1.5 shrink-0">
                          <NagadLogo className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#C9D0D9]">Nagad Personal</div>
                          <div className="font-mono font-black text-sm sm:text-base text-[#F5F7FA] truncate tabular-nums">{activeNagadNumber || 'Not configured'}</div>
                        </div>
                      </div>
                      <button type="button" disabled={!activeNagadNumber}
                        onClick={() => {
                          if (!activeNagadNumber) return;
                          handleCopyAccount(activeNagadNumber.replace(/\D/g, '') || activeNagadNumber, 'nagad');
                          setFormData(prev => ({ ...prev, send_method: 'nagad' }));
                        }}
                        className="relative z-10 px-3 py-2 rounded-xl text-xs font-extrabold bg-[#8BEAFF]/12 hover:bg-[#8BEAFF]/22 text-[#8BEAFF] border border-[#8BEAFF]/35 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1 shrink-0">
                        {copiedAccount === 'nagad' ? <Check className="inline w-3.5 h-3.5" /> : <Copy className="inline w-3.5 h-3.5" />}
                        {copiedAccount === 'nagad' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Highlight for Incomplete Payment if flagged */}
                  {isFlagged('payment_amount') && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>Previously, you made a mistake here. Please correct this.</span>
                    </div>
                  )}

                  {/* Payment Inputs: 8. Send Method, 9. Sender Mobile No, 10. Payment Time, 11. Transaction ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    {/* 8. Send Method */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                        Send Method <span className="text-rose-400">*</span>
                      </label>
                      <div className="registration-field-row">
                      <span className="registration-field-icon"><CreditCard className="w-[18px] h-[18px]" /></span>
                      <select
                        value={formData.send_method}
                        onChange={e => setFormData({ ...formData, send_method: e.target.value as 'bkash' | 'nagad' })}
                        className={`min-w-0 flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-colors outline-none cursor-pointer ${inputClasses} ${getFieldHighlightClass('send_method')}`}
                      >
                        <option value="bkash" className="bg-[#0B0F17] text-[#F5F7FA]">
                          bKash
                        </option>
                        <option value="nagad" className="bg-[#0B0F17] text-[#F5F7FA]">
                          Nagad
                        </option>
                      </select>
                      </div>
                      {isFlagged('send_method') && (
                        <p className="text-rose-400 text-xs mt-1.5 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Previously, you made a mistake here. Please correct this.</span>
                        </p>
                      )}
                    </div>

                    {/* 9. Sender Mobile No (Required) */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                        Sender Mobile No <span className="text-rose-500">*</span>
                      </label>
                      <div className="registration-field-row">
                      <span className="registration-field-icon"><Phone className="w-[18px] h-[18px]" /></span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={11}
                        placeholder="e.g. 01XXXXXXXXX"
                        value={formData.sender_mobile_no}
                        onKeyDown={handleNumericKeyDown}
                        onPaste={e => {
                          e.preventDefault();
                          const val = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 11);
                          setFormData(prev => ({ ...prev, sender_mobile_no: val }));
                          if (formErrors.sender_mobile_no) setFormErrors(prev => ({ ...prev, sender_mobile_no: '' }));
                        }}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                          setFormData(prev => ({ ...prev, sender_mobile_no: val }));
                          if (formErrors.sender_mobile_no) setFormErrors(prev => ({ ...prev, sender_mobile_no: '' }));
                        }}
                        className={`min-w-0 flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses} ${getFieldHighlightClass('sender_mobile_no')}`}
                      />
                      </div>
                      {(getMobileError(formData.sender_mobile_no) || formErrors.sender_mobile_no) && (
                        <p className="text-rose-500 text-xs mt-1 font-semibold">
                          {getMobileError(formData.sender_mobile_no) || formErrors.sender_mobile_no}
                        </p>
                      )}
                      {isFlagged('sender_mobile_no') && (
                        <p className="text-rose-400 text-xs mt-1.5 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Previously, you made a mistake here. Please correct this.</span>
                        </p>
                      )}
                    </div>

                    {/* 10. Payment Time (Required) */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                        Payment Time <span className="text-rose-500">*</span>
                      </label>
                      <div className="registration-field-row">
                      <span className="registration-field-icon"><Clock className="w-[18px] h-[18px]" /></span>
                      <input
                        type="time"
                        value={formData.payment_time}
                        onChange={e => {
                          setFormData({ ...formData, payment_time: e.target.value });
                          if (formErrors.payment_time) setFormErrors(prev => ({ ...prev, payment_time: '' }));
                        }}
                        className={`min-w-0 flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses} ${getFieldHighlightClass('payment_time')}`}
                      />
                      </div>
                      {formErrors.payment_time && (
                        <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.payment_time}</p>
                      )}
                      {isFlagged('payment_time') && (
                        <p className="text-rose-400 text-xs mt-1.5 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Previously, you made a mistake here. Please correct this.</span>
                        </p>
                      )}
                    </div>

                    {/* 11. Transaction ID (Optional) */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                        Transaction ID
                      </label>
                      <div className="registration-field-row">
                      <span className="registration-field-icon"><FileCheck className="w-[18px] h-[18px]" /></span>
                      <input
                        type="text"
                        placeholder="e.g. 9J28DA10K"
                        value={formData.transaction_id}
                        onChange={e => setFormData({ ...formData, transaction_id: e.target.value })}
                        className={`min-w-0 flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses} ${getFieldHighlightClass('transaction_id')}`}
                      />
                      </div>
                      {isFlagged('transaction_id') && (
                        <p className="text-rose-400 text-xs mt-1.5 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Previously, you made a mistake here. Please correct this.</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* 4. JERSEY CUSTOMIZATION & LIVE PREVIEW                   */}
              {/* ======================================================== */}
              <div className={`space-y-4 pt-2 ${currentStep === 2 ? '' : 'hidden'}`}>
                <div className={`pb-2.5 font-display text-base sm:text-lg font-bold flex items-center justify-between ${sectionHeaderClasses}`}>
                  <span className="flex items-center gap-2">
                    <Shirt className="w-4 h-4" />
                    4. Squad Kit Jersey Customization
                  </span>
                  <span className="text-xs font-normal opacity-75">Live Preview Updates Below</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left: Live Interactive Jersey Graphic */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-3xl bg-[#090C13]/90 border border-[#8BEAFF]/25 shadow-inner">
                    <JerseyGraphic
                      name={formData.jersey_back_name}
                      number={formData.jersey_number}
                      gender="male"
                      className="w-full max-w-[280px] h-[300px]"
                    />
                    <div className="mt-2 text-center text-xs text-[#C9D0D9] font-mono tabular-nums">
                      {formData.jersey_back_name || 'YOUR NAME'} · <span className="text-[#8BEAFF]">#{formData.jersey_number !== '' ? formData.jersey_number : '27'}</span> · Size: {formData.jersey_size}
                    </div>
                  </div>

                  {/* Right: Jersey Inputs */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* 12. Jersey Back Name */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`block text-xs font-bold uppercase tracking-wider ${labelClasses}`}>
                          Jersey Back Name <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] font-mono opacity-70">
                          {formData.jersey_back_name.length}/14 max
                        </span>
                      </div>
                      <div className="registration-field-row">
                      <span className="registration-field-icon"><User className="w-[18px] h-[18px]" /></span>
                      <input
                        type="text"
                        maxLength={14}
                        placeholder="e.g. STRIKER"
                        value={formData.jersey_back_name}
                        onChange={e => {
                          const val = e.target.value.toUpperCase();
                          setFormData({ ...formData, jersey_back_name: val });
                          if (formErrors.jersey_back_name) setFormErrors(prev => ({ ...prev, jersey_back_name: '' }));
                        }}
                        className={`min-w-0 flex-1 px-4 py-3 rounded-xl text-sm font-mono font-bold uppercase transition-colors outline-none ${inputClasses}`}
                      />
                      </div>
                      {formErrors.jersey_back_name && (
                        <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.jersey_back_name}</p>
                      )}
                    </div>

                    {/* 13. Jersey Number & 14. Jersey Size */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* 13. Jersey Number */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className={`block text-xs font-bold uppercase tracking-wider ${labelClasses}`}>
                            Jersey Number <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[10px] font-mono opacity-70">0–999</span>
                        </div>
                        <div className="registration-field-row">
                        <span className="registration-field-icon"><Hash className="w-[18px] h-[18px]" /></span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={3}
                          required
                          placeholder="27"
                          aria-label="Jersey number, 1 to 3 digits (0 to 999)"
                          value={formData.jersey_number}
                          onKeyDown={handleNumericKeyDown}
                          onPaste={e => {
                            e.preventDefault();
                            const pasted = e.clipboardData.getData('text');
                            const clean = pasted.replace(/\D/g, '').slice(0, 3);
                            if (!clean || !/^\d{1,3}$/.test(clean)) {
                              setFormErrors(prev => ({ ...prev, jersey_number: 'Enter 1 to 3 digits only (0–999).' }));
                              return;
                            }
                            setFormData(prev => ({ ...prev, jersey_number: clean }));
                            if (formErrors.jersey_number) setFormErrors(prev => ({ ...prev, jersey_number: '' }));
                          }}
                          onChange={e => {
                            const raw = e.target.value;
                            // Strictly allow digits only (0-9) and max 3 characters
                            const clean = raw.replace(/\D/g, '').slice(0, 3);
                            setFormData(prev => ({ ...prev, jersey_number: clean }));
                            if (clean === '' || /^\d{1,3}$/.test(clean)) {
                              if (formErrors.jersey_number) setFormErrors(prev => ({ ...prev, jersey_number: '' }));
                            } else {
                              setFormErrors(prev => ({ ...prev, jersey_number: 'Enter 1 to 3 digits only (0–999).' }));
                            }
                          }}
                          onBlur={() => {
                            const trimmed = formData.jersey_number.trim();
                            if (!trimmed) {
                              setFormErrors(prev => ({ ...prev, jersey_number: 'Jersey number is required (1 to 3 digits).' }));
                            } else if (!/^\d{1,3}$/.test(trimmed)) {
                              setFormErrors(prev => ({ ...prev, jersey_number: 'Enter 1 to 3 digits only (0–999).' }));
                            } else if (formErrors.jersey_number) {
                              setFormErrors(prev => ({ ...prev, jersey_number: '' }));
                            }
                          }}
                          className={`jersey-number-input min-w-0 flex-1 w-full px-4 py-3 rounded-xl text-sm font-mono font-black transition-colors outline-none text-center ${inputClasses}`}
                          aria-invalid={Boolean(formErrors.jersey_number)}
                        />
                        </div>
                        <p className="text-[10px] mt-1 text-[#8993A1]">
                          1 to 3 digits (0–999) · e.g. 5, 05, 005, 10, 99, 100 · Leading zeros preserved
                        </p>
                        {formErrors.jersey_number && (
                          <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.jersey_number}</p>
                        )}
                      </div>

                      {/* 14. Jersey Size */}
                      <div>
                        <label className={`flex items-center gap-1.5 block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                          <Shirt className="w-3.5 h-3.5 shrink-0" /> Jersey Size <span className="text-rose-500">*</span>
                        </label>
                        <div className="registration-field-row">
                        <span className="registration-field-icon"><Shirt className="w-[18px] h-[18px]" /></span>
                        <select
                          value={formData.jersey_size}
                          onChange={e => setFormData({ ...formData, jersey_size: e.target.value as JerseySize })}
                          className={`min-w-0 flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-colors outline-none cursor-pointer ${inputClasses}`}
                        >
                          {JERSEY_SIZES.map(sz => (
                            <option
                              key={sz}
                              value={sz}
                              className="bg-[#0B0F17] text-[#F5F7FA]"
                            >
                              Size {sz}
                            </option>
                          ))}
                        </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* 5. DECLARATION */}
              {/* ======================================================== */}
              <div className={`pt-4 border-t border-[#C9D0D9]/15 ${currentStep === 3 ? '' : 'hidden'}`}>
                <label className="flex items-center gap-3 cursor-pointer select-none text-xs sm:text-sm font-medium py-2 text-[#C9D0D9]">
                  <input
                    type="checkbox"
                    checked={declarationChecked}
                    onChange={e => {
                      setDeclarationChecked(e.target.checked);
                      if (formErrors.declaration) setFormErrors(prev => ({ ...prev, declaration: '' }));
                    }}
                    className="w-4 h-4 rounded border-[#C9D0D9]/30 bg-[#080B12] text-[#8BEAFF] focus:ring-[#8BEAFF]/40 cursor-pointer shrink-0"
                  />
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#8BEAFF]/30 bg-[#8BEAFF]/10 text-[#8BEAFF]"><ShieldCheck className="w-5 h-5" /></span>
                  <span className="leading-tight">
                    I confirm that all provided information is correct. I understand that incorrect information may cause rejection.
                  </span>
                </label>
                {formErrors.declaration && (
                  <p className="text-rose-400 text-xs mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{formErrors.declaration}</span>
                  </p>
                )}
              </div>

              {/* Global Error Banner */}
              {submitErrorMessage && (
                <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{submitErrorMessage}</span>
                </div>
              )}

              {/* Step navigation */}
              <div className="pt-4 grid grid-cols-2 gap-3">
                <button type="button" onClick={goToPreviousStep} disabled={currentStep===0||isSubmitting}
                  className="py-3.5 px-4 rounded-2xl font-bold text-sm border border-[#C9D0D9]/20 bg-[#090C13] hover:bg-[#121723] text-[#C9D0D9] disabled:opacity-35 cursor-pointer transition-colors">Previous</button>
                {currentStep < registrationSteps.length-1 ? (
                  <button type="button" onClick={goToNextStep} disabled={isSubmitting}
                    className="py-3.5 px-4 rounded-2xl font-extrabold text-sm text-[#08090D] bg-gradient-to-r from-[#8BEAFF] to-[#B7F2FF] shadow-[0_10px_28px_rgba(139,234,255,0.22)] hover:brightness-105 cursor-pointer disabled:opacity-50 transition-all">
                    Next <ArrowRight className="inline w-4 h-4 ml-1" />
                  </button>
                ) : (
                  <button type="submit"
                  disabled={isSubmitting}
                  className="w-full min-w-0 whitespace-nowrap py-4 px-4 sm:px-6 rounded-2xl font-extrabold text-sm sm:text-base text-[#08090D] bg-gradient-to-r from-[#8BEAFF] to-[#B7F2FF] shadow-[0_12px_32px_rgba(139,234,255,0.26)] hover:brightness-105 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span>Submitting Registration...</span>
                  ) : (
                    <>
                      <span className="whitespace-nowrap">{editingRegNo ? 'RE-SUBMIT' : 'SUBMIT'}</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>

      {/* ======================================================== */}
      {/* DUPLICATE DETECTION MODAL                                */}
      {/* ======================================================== */}
      <DuplicateRegistrationModal
        isOpen={Boolean(duplicateModal)}
        record={duplicateModal?.record || null}
        isLoading={duplicateModal?.isLoading}
        error={duplicateModal?.error}
        onClose={() => setDuplicateModal(null)}
        onReRegister={record => handleContinueRejectedRegistration(record)}
      />

      {/* ======================================================== */}
      {/* REGISTRATION CLOSED MODAL                                */}
      {/* ======================================================== */}
      {showClosedModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-[#08090D]/82 backdrop-blur-lg animate-fadeIn">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 sm:p-7 shadow-[0_32px_90px_rgba(0,0,0,0.75)] border border-[#C9D0D9]/20 text-[#F5F7FA] space-y-4 text-center animate-scaleUp">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/35 text-amber-300 grid place-items-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-display font-extrabold text-[#F5F7FA]">Registration Closed</h3>
            <p className="text-xs sm:text-sm text-[#94A0B2] leading-relaxed">
              Registration is currently closed. Please contact the organizers manually.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowClosedModal(false)}
                className="w-full py-3 rounded-xl glass-button text-[#F5F7FA] font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUCCESS SUBMISSION MODAL                                 */}
      {/* ======================================================== */}
      {successModalData && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-[#08090D]/82 backdrop-blur-lg animate-fadeIn">
          <div className="relative w-full max-w-md glass-modal rounded-3xl p-6 sm:p-8 shadow-[0_32px_90px_rgba(0,0,0,0.75)] border border-[#8BEAFF]/30 text-[#F5F7FA] text-center space-y-5 animate-scaleUp">
            {/* Close Button at top-right */}
            <button
              type="button"
              onClick={() => setSuccessModalData(null)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-[#121723] hover:bg-[#192030] text-[#94A0B2] hover:text-[#F5F7FA] flex items-center justify-center transition-colors cursor-pointer border border-[#C9D0D9]/18"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 grid place-items-center mx-auto">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-md border border-emerald-400/30">
                Enrollment Submitted
              </span>
              <h2 className="text-2xl font-display font-black text-[#F5F7FA] mt-3">
                Registration Successful!
              </h2>
              <p className="text-xs text-[#94A0B2] mt-1">
                Congratulations <strong className="text-[#F5F7FA]">{successModalData.name}</strong>, your registration has been recorded.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#090C13]/95 border border-[#C9D0D9]/15 space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8B95A5] block">
                Permanent Registration Number
              </span>
              <div className="font-mono text-2xl font-black text-[#8BEAFF] tracking-wider tabular-nums">
                {successModalData.regNo}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>Status: Pending Review</span>
              </div>
            </div>

            {/* Important Notice */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/35 text-rose-200 text-xs font-medium text-left flex items-start gap-2.5">
              <span className="text-base shrink-0 leading-none mt-0.5">⚠️</span>
              <div className="leading-relaxed">
                <span className="font-bold block text-rose-100">
                  Please Note Your Registration Number and Full Name.
                </span>
                <span className="text-rose-300">
                  You will need them to check your application status and download your invitation card.
                </span>
              </div>
            </div>

            <p className="text-xs text-[#94A0B2] leading-relaxed">
              Please save your <strong className="text-[#F5F7FA]">Registration Number</strong>. The committee will verify your payment and grant your official invitation card pass.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  void handleCopyAccount(successModalData.regNo, 'regNo');
                }}
                className="py-3 px-4 rounded-xl glass-button text-[#F5F7FA] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedAccount === 'regNo' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#8BEAFF]" />
                    <span>Copy Reg No</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  const regNo = successModalData.regNo;
                  const studentName = successModalData.name;
                  setSuccessModalData(null);
                  onGoToInvitation(regNo, studentName);
                }}
                className="py-3 px-4 rounded-xl glass-button-primary font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Check Status</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
