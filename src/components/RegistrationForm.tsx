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
import { getConfiguredSections } from '../lib/superAdminConfig';
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
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
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

const RegistrationCountdown: React.FC<{ deadline: string }> = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>(() => {
    const target = new Date(deadline).getTime();
    const diff = target - Date.now();
    if (isNaN(target) || diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      isExpired: false,
    };
  });

  useEffect(() => {
    const updateCountdown = () => {
      const target = new Date(deadline).getTime();
      const diff = target - Date.now();
      if (isNaN(target) || diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        isExpired: false,
      });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const formattedClosingDate = formatRegistrationClosingDate(deadline);

  return (
    <div className="mb-6 p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-xs text-center animate-fadeIn">
      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
        <Clock className="w-3.5 h-3.5" />
        <span>{timeLeft.isExpired ? 'Registration Closed' : 'Registration Ends In'}</span>
      </div>

      {!timeLeft.isExpired ? (
        <div className="flex items-center justify-center gap-1 sm:gap-2 font-mono font-bold text-slate-800 text-xs sm:text-sm flex-wrap">
          <span className="px-2 py-1 rounded-lg bg-white/90 border border-slate-200/80 shadow-2xs">
            {timeLeft.days} <span className="text-[10px] font-sans font-medium text-slate-500">Days</span>
          </span>
          <span className="text-slate-400 font-sans font-normal">:</span>
          <span className="px-2 py-1 rounded-lg bg-white/90 border border-slate-200/80 shadow-2xs">
            {String(timeLeft.hours).padStart(2, '0')} <span className="text-[10px] font-sans font-medium text-slate-500">Hours</span>
          </span>
          <span className="text-slate-400 font-sans font-normal">:</span>
          <span className="px-2 py-1 rounded-lg bg-white/90 border border-slate-200/80 shadow-2xs">
            {String(timeLeft.minutes).padStart(2, '0')} <span className="text-[10px] font-sans font-medium text-slate-500">Minutes</span>
          </span>
          <span className="text-slate-400 font-sans font-normal">:</span>
          <span className="px-2 py-1 rounded-lg bg-white/90 border border-slate-200/80 shadow-2xs">
            {String(timeLeft.seconds).padStart(2, '0')} <span className="text-[10px] font-sans font-medium text-slate-500">Seconds</span>
          </span>
        </div>
      ) : (
        <p className="text-xs font-bold text-rose-600 py-0.5">
          The registration deadline has passed.
        </p>
      )}

      <div className="text-[11px] text-slate-500 mt-2">
        <span>Closing Date: </span>
        <strong className="text-slate-700">{formattedClosingDate}</strong>
      </div>
    </div>
  );
};

/**
 * Resolves registration sections from protected super-admin configuration.
 * Sections depend on gender + academic group and are not hardcoded to five entries.
 */
export const getAvailableSections = (gender: GenderType, group: string): string[] => {
  if (gender !== 'male' && gender !== 'female') return [];
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
    gender: 'choose_one',
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

  // Pre-load data if initialRecord is provided (e.g. from Invitation Card "Register Again")
  useEffect(() => {
    if (initialRecord) {
      onGenderChange?.(initialRecord.gender || 'male');
      const flagged = detectFlaggedFields(initialRecord.reject_reason);
      const isPhotoFlagged = flagged.has('student_photo');

      setFormData({
        gender: initialRecord.gender || 'male',
        full_name: initialRecord.full_name || '',
        class_roll: initialRecord.class_roll || '',
        student_id: initialRecord.student_id || '',
        contact_mobile_number: initialRecord.contact_mobile_number || initialRecord.sender_mobile_no || '',
        academic_group: initialRecord.academic_group || '',
        academic_section: initialRecord.academic_section || '',
        student_photo: isPhotoFlagged ? null : (initialRecord.student_photo || null),
        send_method: initialRecord.send_method || 'bkash',
        sender_mobile_no: initialRecord.sender_mobile_no || initialRecord.contact_mobile_number || '',
        payment_time: initialRecord.payment_time || '',
        transaction_id: initialRecord.transaction_id || '',
        jersey_back_name: initialRecord.jersey_back_name || 'STRIKER',
        jersey_number: initialRecord.jersey_number || '27',
        jersey_size: (initialRecord.jersey_size as JerseySize) || 'L',
      });
      setRejectionReason(initialRecord.reject_reason || null);
      setEditingRegNo(initialRecord.registration_no);
      setEditingDbId(toNullableUuid(initialRecord.dbId || initialRecord.id));
      setRecoveryProof({
        studentId: initialRecord.student_id || '',
        fullName: initialRecord.full_name || '',
        classRoll: initialRecord.class_roll || '',
        academicGroup: initialRecord.academic_group || '',
        academicSection: initialRecord.academic_section || '',
      });
    }
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

  const isGenderChosen = formData.gender === 'male' || formData.gender === 'female';
  const isMale = formData.gender === 'male';
  const isFemale = formData.gender === 'female';

  // Container & styling classes based on selected gender
  const containerClasses = isMale
    ? 'glass-male text-white border-[#38BDF8]/40 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.9),0_0_35px_-5px_rgba(56,189,248,0.25)]'
    : isFemale
    ? 'glass-female text-slate-900 border-[#DB2777]/55 shadow-[0_20px_60px_-15px_rgba(157,23,77,0.25),0_0_35px_-5px_rgba(219,39,119,0.3)]'
    : 'glass-panel text-slate-900 border-white/90 shadow-[0_20px_50px_-15px_rgba(91,95,239,0.1)]';

  const sectionHeaderClasses = isMale
    ? 'text-[#38BDF8] border-b border-slate-800'
    : isFemale
    ? 'text-[#9D174D] border-b border-pink-300/80'
    : 'text-[#5B5FEF] border-b border-slate-200';

  const labelClasses = isMale
    ? 'text-slate-300'
    : isFemale
    ? 'text-[#6B1748] font-semibold'
    : 'text-slate-700 font-semibold';

  const inputClasses = isMale
    ? 'bg-slate-900/85 backdrop-blur-md border-slate-700/90 text-white placeholder-slate-500 focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/30 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.3)]'
    : isFemale
    ? 'bg-white/92 backdrop-blur-md border-pink-300/90 text-slate-900 placeholder-pink-400 focus:border-[#DB2777] focus:ring-2 focus:ring-[#DB2777]/25 shadow-[inset_0_1px_2px_rgba(76,29,72,0.05)]'
    : 'bg-white/85 backdrop-blur-md border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#5B5FEF]/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]';

  const subCardClasses = isMale
    ? 'bg-slate-900/70 border border-slate-800/90 backdrop-blur-xl shadow-inner'
    : isFemale
    ? 'bg-gradient-to-br from-pink-100/75 via-fuchsia-50/80 to-rose-100/75 border border-pink-300/80 backdrop-blur-xl shadow-[0_8px_24px_-16px_rgba(157,23,77,0.32)]'
    : 'bg-white/75 border border-white/90 backdrop-blur-xl shadow-xs';

  // Dynamic payment numbers based on gender
  const activeBkashNumber = isFemale
    ? paymentSettings?.femaleBkashNumber || '01812-345678'
    : paymentSettings?.maleBkashNumber || '01712-345678';

  const activeNagadNumber = isFemale
    ? paymentSettings?.femaleNagadNumber || '01812-345678'
    : paymentSettings?.maleNagadNumber || '01712-345678';

  const handleCopyAccount = async (number: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(number);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = number;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
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

  const handleGenderSelect = (selectedGender: 'male' | 'female') => {
    onGenderChange?.(selectedGender);
    setFormData(prev => ({
      ...prev,
      gender: selectedGender,
      academic_section: '', // Reset section when gender changes
      jersey_back_name:
        prev.jersey_back_name === 'STRIKER' || prev.jersey_back_name === 'HUNTER' || prev.jersey_back_name === 'NOVA'
          ? selectedGender === 'male'
            ? 'HUNTER'
            : 'NOVA'
          : prev.jersey_back_name,
    }));
    if (formErrors.gender) {
      setFormErrors(prev => ({ ...prev, gender: '' }));
    }
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
  };

  const availableSections = getAvailableSections(formData.gender, formData.academic_group);

  // Perform Duplicate Detection Check
  const runDuplicateCheck = async (): Promise<boolean> => {
    // If user is currently editing their own rejected registration, bypass duplicate check for their own regNo
    const match = await checkDuplicateRegistration(
      formData.student_id,
      formData.full_name,
      formData.class_roll,
      formData.academic_group,
      formData.academic_section
    );

    if (match) {
      // If the match is the exact record being edited, allow continue
      if (editingRegNo && match.registration_no === editingRegNo) {
        return false;
      }

      setDuplicateModal({ record: match });
      return true;
    }

    return false;
  };

  const handleStudentIdBlur = async () => {
    const sId = formData.student_id.trim();
    if (!sId || sId.length < 4) return;
    if (editingRegNo && sId === recoveryProof?.studentId) return;

    try {
      const match = await checkDuplicateRegistration(sId, '', '', '', '');
      if (match && (!editingRegNo || match.registration_no !== editingRegNo)) {
        setDuplicateModal({ record: match });
      }
    } catch {
      // ignore blur errors, submission will validate
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

    if (!isGenderChosen) errors.gender = 'Please select your gender (Male / Female).';
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
    } else if (!/^\d{1,3}$/.test(jerseyNumStr) || Number(jerseyNumStr) < 0 || Number(jerseyNumStr) > 999) {
      errors.jersey_number = 'Enter a whole jersey number from 0 to 999.';
    }

    // Declaration Checkbox Validation
    if (!declarationChecked) {
      errors.declaration = 'You must confirm the declaration statement to submit.';
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitErrorMessage(null);

    // 1. Registration Open / Closed Check
    if (!registrationOpen) {
      setShowClosedModal(true);
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
        gender: confirmedRecord.gender,
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
    const flagged = detectFlaggedFields(record.reject_reason);
    const isPhotoFlagged = flagged.has('student_photo');

    setFormData({
      gender: record.gender || 'male',
      full_name: record.full_name || '',
      class_roll: record.class_roll || '',
      student_id: record.student_id || '',
      contact_mobile_number: record.contact_mobile_number || record.sender_mobile_no || '',
      academic_group: record.academic_group || '',
      academic_section: record.academic_section || '',
      student_photo: isPhotoFlagged ? null : (record.student_photo || null),
      send_method: record.send_method || 'bkash',
      sender_mobile_no: record.sender_mobile_no || record.contact_mobile_number || '',
      payment_time: record.payment_time || '',
      transaction_id: record.transaction_id || '',
      jersey_back_name: record.jersey_back_name || 'STRIKER',
      jersey_number: record.jersey_number || '27',
      jersey_size: (record.jersey_size as JerseySize) || 'L',
    });
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
    setDuplicateModal(null);
  };

  return (
    <div className="py-6 sm:py-10 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
      {/* Re-submission Banner if editing previously rejected record */}
      {editingRegNo && (
        <div className="mb-6 p-4.5 rounded-2xl bg-amber-50/90 backdrop-blur-xl border border-amber-300/90 text-amber-900 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-sm">
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Re-Submitting Registration
                </div>
                <div className="text-sm font-extrabold">
                  Registration No: <span className="font-mono text-indigo-700">{editingRegNo}</span>
                </div>
              </div>

              {rejectionReason && (
                <div className="p-3 rounded-xl bg-white/90 backdrop-blur-md border border-rose-200/90 text-xs shadow-2xs">
                  <span className="font-bold text-rose-800 uppercase block text-[10px] tracking-wider">
                    Rejection Reason:
                  </span>
                  <p className="font-semibold text-rose-950 mt-0.5 whitespace-pre-wrap">{rejectionReason}</p>
                </div>
              )}

              {!hasSpecificFlaggedFields && (
                <p className="text-rose-600 text-xs font-bold flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Previously, you made a mistake here. Please correct this.</span>
                </p>
              )}

              {hasSpecificFlaggedFields && (
                <p className="text-xs text-amber-800">
                  Please review and correct the highlighted fields marked below. Your registration number remains permanent.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelReRegistration}
            className="p-2 text-amber-700 hover:text-amber-900 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
            title="Cancel re-submission"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Registration Container (Adapts Theme to Selected Gender) */}
      <div className={`registration-theme rounded-3xl p-4 sm:p-8 lg:p-10 transition-all duration-500 ease-out ${isGenderChosen ? containerClasses : 'glass-panel text-slate-900 border-white/90 shadow-[0_20px_50px_-15px_rgba(91,95,239,0.1)]'}`}>
        {/* Registration header stays in the site default theme; gender styling is scoped below. */}
        <div className="mb-6 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-white/75 border border-white/90 backdrop-blur-xl shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Official Batch 27 Enrollment</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Rag Day 27 Student Registration
          </h1>
          <p className="text-xs sm:text-sm mt-1.5 text-slate-600">
            Select your wing gender first to unlock the enrollment form and personalized jersey preview.
          </p>
        </div>

        {/* Compact Registration Countdown */}
        {registrationDeadline && (
          <RegistrationCountdown deadline={registrationDeadline} />
        )}

        <form onSubmit={handleSubmit} className={`space-y-8 ${isGenderChosen ? 'registration-form-gendered' : 'registration-form-default'}`}>
          {/* ======================================================== */}
          {/* STEP 1: GENDER SELECTION (Gating Gate)                  */}
          {/* ======================================================== */}
          <div className="space-y-3">
            <div className={`pb-2.5 font-display text-base sm:text-lg font-bold flex items-center justify-between ${sectionHeaderClasses} ${!isGenderChosen ? 'text-[#5B5FEF] border-b border-slate-200' : ''}`}>
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Step 1: Select Your Gender
              </span>

            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Male Option Card */}
              <button
                type="button"
                onClick={() => handleGenderSelect('male')}
                className={`gender-choice py-3.5 px-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 font-bold text-sm sm:text-base ${
                  isMale
                    ? 'border-[#38BDF8] bg-gradient-to-br from-[#082F49]/95 via-[#0C4A6E]/95 to-[#0F172A]/95 backdrop-blur-xl shadow-[0_8px_25px_rgba(56,189,248,0.3),inset_0_1px_1.5px_rgba(255,255,255,0.15)] ring-2 ring-[#38BDF8]/40 text-white'
                    : 'border-slate-300/80 bg-white/70 backdrop-blur-md hover:border-[#38BDF8]/60 hover:bg-white/90 text-slate-800 shadow-2xs'
                }`}
              >
                <span className={`w-8 h-8 rounded-xl grid place-items-center font-black text-sm shrink-0 ${
                  isMale ? 'bg-gradient-to-br from-[#06B6D4] to-[#0284C7] text-white shadow-md shadow-cyan-500/30' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Mars className="w-4 h-4" />
                </span>
                <span>Male</span>
                {isMale && <Check className="w-4 h-4 text-[#38BDF8] ml-0.5" />}
              </button>

              {/* Female Option Card */}
              <button
                type="button"
                onClick={() => handleGenderSelect('female')}
                className={`py-3.5 px-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 font-bold text-sm sm:text-base ${
                  isFemale
                    ? 'border-[#D946A6] bg-gradient-to-br from-fuchsia-100/95 via-rose-50/95 to-white/95 backdrop-blur-xl shadow-[0_8px_25px_rgba(217,70,166,0.22),inset_0_1px_1.5px_white] ring-2 ring-[#D946A6]/30 text-[#4A174C]'
                    : 'border-fuchsia-200/90 bg-white/75 backdrop-blur-md hover:border-[#D946A6]/60 hover:bg-rose-50/70 text-slate-800 shadow-2xs'
                }`}
              >
                <span className={`w-8 h-8 rounded-xl grid place-items-center font-black text-sm shrink-0 ${
                  isFemale ? 'bg-gradient-to-br from-[#C026D3] to-[#EC4899] text-white shadow-md shadow-fuchsia-500/20' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Venus className="w-4 h-4" />
                </span>
                <span>Female</span>
                {isFemale && <Check className="w-4 h-4 text-[#EC4899] ml-0.5" />}
              </button>
            </div>
            {formErrors.gender && (
              <p className="text-rose-500 text-xs font-bold mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{formErrors.gender}</span>
              </p>
            )}
          </div>

          {/* ======================================================== */}
          {/* LOCKED STATE GATE NOTICE (Shown when Gender not chosen) */}
          {/* ======================================================== */}
          {!isGenderChosen && (
            <div className="py-6 px-4 rounded-2xl bg-white/60 border border-slate-200/80 text-center animate-fadeIn shadow-2xs">
              <p className="text-sm text-slate-600 font-normal">
                Please select your gender to register.
              </p>
            </div>
          )}

          {/* ======================================================== */}
          {/* UNLOCKED FORM SECTIONS (Visible once Gender is Chosen) */}
          {/* ======================================================== */}
          {isGenderChosen && (
            <div className="space-y-8 animate-fadeIn">
              {/* ======================================================== */}
              {/* 2. PERSONAL INFORMATION                                  */}
              {/* ======================================================== */}
              <div className="space-y-4">
                <div className={`pb-2.5 font-display text-base sm:text-lg font-bold flex items-center justify-between ${sectionHeaderClasses}`}>
                  <span className="flex items-center gap-2">
                    <IdCard className="w-4 h-4" />
                    2. Personal Information
                  </span>
                  <span className="text-xs font-normal opacity-75">Required fields *</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Full Name */}
                  <div className="sm:col-span-2">
                    <label className={`flex items-center gap-1.5 block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      <User className="w-3.5 h-3.5 shrink-0" /> Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-stretch gap-2">
                      <span className={`flex w-12 shrink-0 items-center justify-center rounded-xl border backdrop-blur-xl ${isMale ? 'border-cyan-300/40 bg-gradient-to-br from-cyan-500/25 to-blue-600/25 text-cyan-300 shadow-md shadow-cyan-900/10' : isFemale ? 'border-fuchsia-300/70 bg-gradient-to-br from-fuchsia-500/25 to-pink-600/25 text-fuchsia-700 shadow-md shadow-pink-900/10' : 'border-slate-200 bg-white/75 text-indigo-500'}`}><User className="w-5 h-5" /></span>
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
                      <p className="text-rose-600 text-xs mt-1.5 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Previously, you made a mistake here. Please correct this.</span>
                      </p>
                    )}
                  </div>

                  {/* 2. Class Roll */}
                  <div>
                    <label className={`flex items-center gap-1.5 block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      <Hash className="w-3.5 h-3.5 shrink-0" /> Class Roll <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-stretch gap-2">
                    <span className={`flex w-12 shrink-0 items-center justify-center rounded-xl border backdrop-blur-xl ${isMale ? 'border-cyan-300/40 bg-gradient-to-br from-cyan-500/25 to-blue-600/25 text-cyan-300' : isFemale ? 'border-fuchsia-300/70 bg-gradient-to-br from-fuchsia-500/25 to-pink-600/25 text-fuchsia-700' : 'border-slate-200 bg-white/75 text-indigo-500'}`}><Hash className="w-5 h-5" /></span>
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
                      <p className="text-rose-600 text-xs mt-1.5 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Previously, you made a mistake here. Please correct this.</span>
                      </p>
                    )}
                  </div>

                  {/* 3. Student ID */}
                  <div>
                    <label className={`flex items-center gap-1.5 block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      <IdCard className="w-3.5 h-3.5 shrink-0" /> Student ID <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-stretch gap-2">
                    <span className={`flex w-12 shrink-0 items-center justify-center rounded-xl border backdrop-blur-xl ${isMale ? 'border-cyan-300/40 bg-gradient-to-br from-cyan-500/25 to-blue-600/25 text-cyan-300' : isFemale ? 'border-fuchsia-300/70 bg-gradient-to-br from-fuchsia-500/25 to-pink-600/25 text-fuchsia-700' : 'border-slate-200 bg-white/75 text-indigo-500'}`}><IdCard className="w-5 h-5" /></span>
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
                      <p className="text-rose-600 text-xs mt-1.5 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Previously, you made a mistake here. Please correct this.</span>
                      </p>
                    )}
                  </div>

                  {/* 4. Contact Mobile Number */}
                  <div className="sm:col-span-2">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      Contact Mobile Number <span className="text-rose-500">*</span>
                    </label>
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
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses} ${getFieldHighlightClass('contact_mobile_number')}`}
                    />
                    {(getMobileError(formData.contact_mobile_number) || formErrors.contact_mobile_number) && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">
                        {getMobileError(formData.contact_mobile_number) || formErrors.contact_mobile_number}
                      </p>
                    )}
                    {isFlagged('contact_mobile_number') && (
                      <p className="text-rose-600 text-xs mt-1.5 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Previously, you made a mistake here. Please correct this.</span>
                      </p>
                    )}
                  </div>

                  {/* 5. Academic Group */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      Academic Group <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.academic_group}
                      onChange={handleGroupSelect}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none cursor-pointer ${inputClasses} ${getFieldHighlightClass('academic_group')}`}
                    >
                      <option value="" className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                        Select Academic Group...
                      </option>
                      <option value="Science" className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                        Science
                      </option>
                      <option value="Business Studies" className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                        Business Studies
                      </option>
                      <option value="Humanities" className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                        Humanities
                      </option>
                    </select>
                    {formErrors.academic_group && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.academic_group}</p>
                    )}
                    {isFlagged('academic_group') && (
                      <p className="text-rose-600 text-xs mt-1.5 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Previously, you made a mistake here. Please correct this.</span>
                      </p>
                    )}
                  </div>

                  {/* 6. Academic Section */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      Academic Section <span className="text-rose-500">*</span>
                    </label>
                    <select
                      disabled={!formData.academic_group}
                      value={formData.academic_section}
                      onChange={e => {
                        setFormData({ ...formData, academic_section: e.target.value });
                        if (formErrors.academic_section) setFormErrors(prev => ({ ...prev, academic_section: '' }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${inputClasses} ${getFieldHighlightClass('academic_section')}`}
                    >
                      <option value="" className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                        {formData.academic_group ? 'Choose Section...' : 'Select Group First'}
                      </option>
                      {availableSections.map(sec => (
                        <option
                          key={sec}
                          value={sec}
                          className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}
                        >
                          Section {sec}
                        </option>
                      ))}
                    </select>
                    {formErrors.academic_section && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.academic_section}</p>
                    )}
                    {isFlagged('academic_section') && (
                      <p className="text-rose-600 text-xs mt-1.5 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Previously, you made a mistake here. Please correct this.</span>
                      </p>
                    )}
                  </div>

                  {/* 7. Student Photo Upload (Optional, Max 3MB) */}
                  <div className={`sm:col-span-2 pt-1 ${isFlagged('student_photo') ? 'p-3 rounded-2xl border-2 border-rose-400 bg-rose-50/20' : ''}`}>
                    <PhotoUploadField
                      student_photo={formData.student_photo}
                      photoUrl={formData.student_photo}
                      gender={formData.gender}
                      labelClasses={labelClasses}
                      onPhotoSelected={({ student_photo, photoFile, photoBlob }) => {
                        setFormData(prev => ({ ...prev, student_photo, photoFile, photoBlob }));
                      }}
                      onPhotoRemoved={() => {
                        setFormData(prev => ({ ...prev, student_photo: null, photoFile: null, photoBlob: null }));
                      }}
                    />
                    {isFlagged('student_photo') && (
                      <p className="text-rose-600 text-xs mt-2 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Previously, you made a mistake here. Please correct this.</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* 3. PAYMENT INFORMATION SECTION                           */}
              {/* ======================================================== */}
              <div className="space-y-4 pt-2">
                <div className={`pb-2.5 font-display text-base sm:text-lg font-bold flex items-center justify-between ${sectionHeaderClasses}`}>
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    3. Payment Information
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    Fee: {paymentSettings.registrationFee} BDT
                  </span>
                </div>

                <div className={`p-4 sm:p-5 rounded-2xl ${subCardClasses} space-y-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/40 pb-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Official Payment Accounts ({isFemale ? 'Girls Wing' : 'Boys Wing'})
                      </span>
                      <p className="text-xs mt-0.5 opacity-80">
                        {paymentSettings.instructions || 'Send Personal payment (Send Money) and retain sender phone number.'}
                      </p>
                    </div>
                  </div>

                  {/* Payment Numbers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* bKash Number */}
                    <div className="p-3 sm:p-4 rounded-xl bg-white/70 border border-slate-200/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center p-1">
                          <BkashLogo className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase text-slate-400">bKash Personal</div>
                          <div className="font-mono font-extrabold text-sm text-slate-900">{activeBkashNumber}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleCopyAccount(activeBkashNumber.replace(/\D/g, '') || activeBkashNumber, 'bkash');
                          setFormData(prev => ({ ...prev, send_method: 'bkash' }));
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedAccount === 'bkash' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAccount === 'bkash' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Nagad Number */}
                    <div className="p-3 sm:p-4 rounded-xl bg-white/70 border border-slate-200/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center p-1">
                          <NagadLogo className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase text-slate-400">Nagad Personal</div>
                          <div className="font-mono font-extrabold text-sm text-slate-900">{activeNagadNumber}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleCopyAccount(activeNagadNumber.replace(/\D/g, '') || activeNagadNumber, 'nagad');
                          setFormData(prev => ({ ...prev, send_method: 'nagad' }));
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedAccount === 'nagad' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAccount === 'nagad' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Highlight for Incomplete Payment if flagged */}
                  {isFlagged('payment_amount') && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Previously, you made a mistake here. Please correct this.</span>
                    </div>
                  )}

                  {/* Payment Inputs: 8. Send Method, 9. Sender Mobile No, 10. Payment Time, 11. Transaction ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    {/* 8. Send Method */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                        Send Method <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.send_method}
                        onChange={e => setFormData({ ...formData, send_method: e.target.value as 'bkash' | 'nagad' })}
                        className={`w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors outline-none cursor-pointer ${inputClasses} ${getFieldHighlightClass('send_method')}`}
                      >
                        <option value="bkash" className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                          bKash
                        </option>
                        <option value="nagad" className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                          Nagad
                        </option>
                      </select>
                      {isFlagged('send_method') && (
                        <p className="text-rose-600 text-xs mt-1.5 font-bold flex items-center gap-1">
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
                        className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses} ${getFieldHighlightClass('sender_mobile_no')}`}
                      />
                      {(getMobileError(formData.sender_mobile_no) || formErrors.sender_mobile_no) && (
                        <p className="text-rose-500 text-xs mt-1 font-semibold">
                          {getMobileError(formData.sender_mobile_no) || formErrors.sender_mobile_no}
                        </p>
                      )}
                      {isFlagged('sender_mobile_no') && (
                        <p className="text-rose-600 text-xs mt-1.5 font-bold flex items-center gap-1">
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
                      <input
                        type="time"
                        value={formData.payment_time}
                        onChange={e => {
                          setFormData({ ...formData, payment_time: e.target.value });
                          if (formErrors.payment_time) setFormErrors(prev => ({ ...prev, payment_time: '' }));
                        }}
                        className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses} ${getFieldHighlightClass('payment_time')}`}
                      />
                      {formErrors.payment_time && (
                        <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.payment_time}</p>
                      )}
                      {isFlagged('payment_time') && (
                        <p className="text-rose-600 text-xs mt-1.5 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Previously, you made a mistake here. Please correct this.</span>
                        </p>
                      )}
                    </div>

                    {/* 11. Transaction ID (Optional) */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                        Transaction ID <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 9J28DA10K"
                        value={formData.transaction_id}
                        onChange={e => setFormData({ ...formData, transaction_id: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses} ${getFieldHighlightClass('transaction_id')}`}
                      />
                      {isFlagged('transaction_id') && (
                        <p className="text-rose-600 text-xs mt-1.5 font-bold flex items-center gap-1">
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
              <div className="space-y-4 pt-2">
                <div className={`pb-2.5 font-display text-base sm:text-lg font-bold flex items-center justify-between ${sectionHeaderClasses}`}>
                  <span className="flex items-center gap-2">
                    <Shirt className="w-4 h-4" />
                    4. Squad Kit Jersey Customization
                  </span>
                  <span className="text-xs font-normal opacity-75">Live Preview Updates Below</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left: Live Interactive Jersey Graphic */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-3xl bg-slate-950/20 border border-white/20">
                    <JerseyGraphic
                      name={formData.jersey_back_name}
                      number={formData.jersey_number}
                      gender={formData.gender}
                      className="w-full max-w-[280px] h-[300px]"
                    />
                    <div className="mt-2 text-center text-xs opacity-75 font-mono">
                      {formData.jersey_back_name || 'YOUR NAME'} · #{formData.jersey_number || '27'} · Size: {formData.jersey_size}
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
                        className={`w-full px-4 py-3 rounded-xl text-sm font-mono font-bold uppercase transition-colors outline-none ${inputClasses}`}
                      />
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
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={3}
                          required
                          placeholder="27"
                          aria-label="Jersey number, 0 to 999"
                          value={formData.jersey_number}
                          onKeyDown={handleNumericKeyDown}
                          onPaste={e => {
                            e.preventDefault();
                            const pasted = e.clipboardData.getData('text');
                            if (pasted.length < 1 || pasted.length > 3 || !/^\d{1,3}$/.test(pasted) || Number(pasted) > 999) {
                              setFormErrors(prev => ({ ...prev, jersey_number: 'Enter a whole jersey number from 0 to 999.' }));
                              return;
                            }
                            setFormData(prev => ({ ...prev, jersey_number: pasted }));
                            if (formErrors.jersey_number) setFormErrors(prev => ({ ...prev, jersey_number: '' }));
                          }}
                          onChange={e => {
                            const val = e.target.value;
                            setFormData(prev => ({ ...prev, jersey_number: val }));
                            if (/^\d{1,3}$/.test(val) && Number(val) <= 999) {
                              if (formErrors.jersey_number) setFormErrors(prev => ({ ...prev, jersey_number: '' }));
                            } else {
                              setFormErrors(prev => ({ ...prev, jersey_number: 'Enter a whole jersey number from 0 to 999.' }));
                            }
                          }}
                          className={`jersey-number-input w-full px-4 py-3 rounded-xl text-sm font-mono font-black transition-colors outline-none text-center ${inputClasses}`}
                          aria-invalid={Boolean(formErrors.jersey_number)}
                        />
                        <p className={`text-[10px] mt-1 ${isMale ? 'text-cyan-200/75' : isFemale ? 'text-fuchsia-800/75' : 'text-slate-500'}`}>Number: 0–999 · Leading zeros are preserved</p>
                        {formErrors.jersey_number && (
                          <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.jersey_number}</p>
                        )}
                      </div>

                      {/* 14. Jersey Size */}
                      <div>
                        <label className={`flex items-center gap-1.5 block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                          <Shirt className="w-3.5 h-3.5 shrink-0" /> Jersey Size <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={formData.jersey_size}
                          onChange={e => setFormData({ ...formData, jersey_size: e.target.value as JerseySize })}
                          className={`w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors outline-none cursor-pointer ${inputClasses}`}
                        >
                          {JERSEY_SIZES.map(sz => (
                            <option
                              key={sz}
                              value={sz}
                              className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}
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

              {/* ======================================================== */}
              {/* 5. DECLARATION */}
              {/* ======================================================== */}
              <div className={`pt-3 border-t ${isMale ? 'border-cyan-300/25' : isFemale ? 'border-fuchsia-200/90' : 'border-slate-200/70'}`}>
                <label className="flex items-center gap-3 cursor-pointer select-none text-xs sm:text-sm font-medium py-2">
                  <input
                    type="checkbox"
                    checked={declarationChecked}
                    onChange={e => {
                      setDeclarationChecked(e.target.checked);
                      if (formErrors.declaration) setFormErrors(prev => ({ ...prev, declaration: '' }));
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                  />
                  <span className="leading-tight">
                    I confirm that all provided information is correct. I understand that incorrect information may cause rejection.
                  </span>
                </label>
                {formErrors.declaration && (
                  <p className="text-rose-500 text-xs mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{formErrors.declaration}</span>
                  </p>
                )}
              </div>

              {/* Global Error Banner */}
              {submitErrorMessage && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{submitErrorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-4 px-6 rounded-2xl font-extrabold text-base text-white shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isMale
                      ? 'bg-gradient-to-r from-[#0284C7] via-[#0EA5E9] to-[#38BDF8] hover:shadow-cyan-500/25 shadow-cyan-900/30'
                      : isFemale
                      ? 'bg-gradient-to-r from-[#DB2777] via-[#EC4899] to-[#F472B6] hover:shadow-pink-500/25 shadow-pink-900/20'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Submitting Registration...</span>
                  ) : (
                    <>
                      <span>{editingRegNo ? 'Re-Submit Registration' : 'Complete Registration'}</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
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
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),inset_0_1.5px_2px_white] border border-white/95 text-slate-900 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Registration Closed</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Registration is currently closed. Please contact the organizers manually.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowClosedModal(false)}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md cursor-pointer"
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
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-white/92 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),inset_0_1.5px_2px_white] border border-white/95 text-slate-900 text-center space-y-5">
            {/* Close Button at top-right */}
            <button
              type="button"
              onClick={() => setSuccessModalData(null)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center mx-auto shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Enrollment Submitted
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-3">
                Registration Successful!
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Congratulations <strong className="text-slate-800">{successModalData.name}</strong>, your registration has been recorded.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Permanent Registration Number
              </span>
              <div className="font-mono text-2xl font-black text-indigo-600 tracking-wider">
                {successModalData.regNo}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>Status: Pending Review</span>
              </div>
            </div>

            {/* Red Notice */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-left flex items-start gap-2.5">
              <span className="text-base shrink-0 leading-none mt-0.5">⚠️</span>
              <div className="leading-relaxed">
                <span className="font-bold block">
                  Please Note Your Registration Number and Full Name.
                </span>
                <span className="text-rose-600">
                  You will need them to check your application status and download your invitation card.
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Please save your <strong>Registration Number</strong>. The committee will verify your payment and grant your official invitation card pass.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(successModalData.regNo);
                  alert(`Copied ${successModalData.regNo} to clipboard!`);
                }}
                className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-600" />
                <span>Copy Reg No</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const regNo = successModalData.regNo;
                  const studentName = successModalData.name;
                  setSuccessModalData(null);
                  onGoToInvitation(regNo, studentName);
                }}
                className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
