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
import {
  createRegistration,
  uploadStudentPhoto,
  checkDuplicateRegistration,
} from '../services';
import { JerseyGraphic } from './JerseyGraphic';
import { BkashLogo, NagadLogo } from './PaymentBrandLogos';
import { PhotoUploadField } from './PhotoUploadField';
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
} from 'lucide-react';

interface RegistrationFormProps {
  onSuccessSubmit: (newRecord: InvitationRecord) => void;
  onGoToInvitation: (regNo: string) => void;
  paymentSettings?: PaymentSettings;
  existingRegistrations?: InvitationRecord[];
  initialRecord?: InvitationRecord | null;
  registrationOpen?: boolean;
  onResetReRegister?: () => void;
}

const JERSEY_SIZES: JerseySize[] = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

/**
 * Returns exact section codes based on Group and Gender
 * Male: ScB1–ScB5, BsB1–BsB5, HuB1–HuB5
 * Female: ScG1–ScG5, BsG1–BsG5, HuG1–HuG5
 */
export const getAvailableSections = (gender: GenderType, group: string): string[] => {
  if (gender === 'male') {
    if (group === 'Science') return ['ScB1', 'ScB2', 'ScB3', 'ScB4', 'ScB5'];
    if (group === 'Business Studies') return ['BsB1', 'BsB2', 'BsB3', 'BsB4', 'BsB5'];
    if (group === 'Humanities') return ['HuB1', 'HuB2', 'HuB3', 'HuB4', 'HuB5'];
  } else if (gender === 'female') {
    if (group === 'Science') return ['ScG1', 'ScG2', 'ScG3', 'ScG4', 'ScG5'];
    if (group === 'Business Studies') return ['BsG1', 'BsG2', 'BsG3', 'BsG4', 'BsG5'];
    if (group === 'Humanities') return ['HuG1', 'HuG2', 'HuG3', 'HuG4', 'HuG5'];
  }
  return [];
};

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onSuccessSubmit,
  onGoToInvitation,
  paymentSettings = DEFAULT_PAYMENT_SETTINGS,
  existingRegistrations = [],
  initialRecord = null,
  registrationOpen = true,
  onResetReRegister,
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

  // Declaration checkbox state (Required: must be checked to submit)
  const [declarationChecked, setDeclarationChecked] = useState(false);

  // UI & Flow states
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

  // Duplicate detection popup state
  const [duplicateModal, setDuplicateModal] = useState<{
    type: 'approved' | 'pending' | 'rejected';
    record: InvitationRecord;
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
      setFormData({
        gender: initialRecord.gender || 'male',
        full_name: initialRecord.full_name || '',
        class_roll: initialRecord.class_roll || '',
        student_id: initialRecord.student_id || '',
        contact_mobile_number: initialRecord.contact_mobile_number || initialRecord.sender_mobile_no || '',
        academic_group: initialRecord.academic_group || '',
        academic_section: initialRecord.academic_section || '',
        student_photo: initialRecord.student_photo || null,
        send_method: initialRecord.send_method || 'bkash',
        sender_mobile_no: initialRecord.sender_mobile_no || initialRecord.contact_mobile_number || '',
        payment_time: initialRecord.payment_time || '',
        transaction_id: initialRecord.transaction_id || '',
        jersey_back_name: initialRecord.jersey_back_name || 'STRIKER',
        jersey_number: initialRecord.jersey_number || '27',
        jersey_size: (initialRecord.jersey_size as JerseySize) || 'L',
      });
      setEditingRegNo(initialRecord.registration_no);
      setEditingDbId(initialRecord.dbId || initialRecord.id || null);
    }
  }, [initialRecord]);

  // Keep fee in sync
  useEffect(() => {
    if (paymentSettings?.registrationFee) {
      setFormData(prev => ({ ...prev, amount: paymentSettings.registrationFee }));
    }
  }, [paymentSettings?.registrationFee]);

  const isGenderChosen = formData.gender === 'male' || formData.gender === 'female';
  const isMale = formData.gender === 'male';
  const isFemale = formData.gender === 'female';

  // Container & styling classes based on selected gender
  const containerClasses = isMale
    ? 'glass-male text-white border-[#38BDF8]/40 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.9),0_0_35px_-5px_rgba(56,189,248,0.25)]'
    : isFemale
    ? 'glass-female text-slate-900 border-[#F472B6]/50 shadow-[0_20px_60px_-15px_rgba(236,72,153,0.2),0_0_35px_-5px_rgba(244,114,182,0.25)]'
    : 'glass-panel text-slate-900 border-white/90 shadow-[0_20px_50px_-15px_rgba(91,95,239,0.1)]';

  const sectionHeaderClasses = isMale
    ? 'text-[#38BDF8] border-b border-slate-800'
    : isFemale
    ? 'text-[#EC4899] border-b border-pink-200'
    : 'text-[#5B5FEF] border-b border-slate-200';

  const labelClasses = isMale
    ? 'text-slate-300'
    : isFemale
    ? 'text-pink-950 font-semibold'
    : 'text-slate-700 font-semibold';

  const inputClasses = isMale
    ? 'bg-slate-900/80 border-slate-700/90 text-white placeholder-slate-500 focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/30'
    : isFemale
    ? 'bg-white/90 border-pink-200 text-slate-900 placeholder-pink-300 focus:border-[#EC4899] focus:ring-2 focus:ring-[#EC4899]/25'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#5B5FEF]/20';

  const subCardClasses = isMale
    ? 'bg-slate-900/60 border border-slate-800 backdrop-blur-md'
    : isFemale
    ? 'bg-white/80 border border-pink-200 backdrop-blur-md shadow-sm'
    : 'bg-white/70 border border-slate-200/80 backdrop-blur-md shadow-sm';

  // Dynamic payment numbers based on gender
  const activeBkashNumber = isFemale
    ? paymentSettings?.femaleBkashNumber || '01812-345678'
    : paymentSettings?.maleBkashNumber || '01712-345678';

  const activeNagadNumber = isFemale
    ? paymentSettings?.femaleNagadNumber || '01812-345678'
    : paymentSettings?.maleNagadNumber || '01712-345678';

  const handleCopyAccount = (number: string, label: string) => {
    navigator.clipboard.writeText(number);
    setCopiedAccount(label);
    setTimeout(() => setCopiedAccount(null), 2500);
  };

  const handleGenderSelect = (selectedGender: 'male' | 'female') => {
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
      existingRegistrations
    );

    if (match) {
      // If the match is the exact record being edited, allow continue
      if (editingRegNo && match.registration_no === editingRegNo) {
        return false;
      }

      if (match.status === 'approved') {
        setDuplicateModal({ type: 'approved', record: match });
        return true;
      }
      if (match.status === 'pending') {
        setDuplicateModal({ type: 'pending', record: match });
        return true;
      }
      if (match.status === 'rejected') {
        setDuplicateModal({ type: 'rejected', record: match });
        return true;
      }
    }

    return false;
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!isGenderChosen) errors.gender = 'Please select your gender (Male / Female).';
    if (!formData.full_name.trim()) errors.full_name = 'Full name is required.';
    if (!formData.class_roll.trim()) errors.class_roll = 'Roll number is required.';
    if (!formData.student_id.trim()) errors.student_id = 'Student ID is required.';
    if (!formData.contact_mobile_number.trim()) errors.contact_mobile_number = 'Contact number is required.';
    if (!formData.academic_group.trim()) errors.academic_group = 'Please select your academic group.';
    if (!formData.academic_section.trim()) errors.academic_section = 'Please select your section.';

    // Send Method & Payment Validation
    if (!formData.sender_mobile_no.trim()) errors.sender_mobile_no = 'Sender payment number is required.';
    if (!formData.payment_time.trim()) errors.payment_time = 'Payment time is required.';

    // Jersey Validation
    if (!formData.jersey_back_name.trim()) errors.jersey_back_name = 'Jersey name is required.';
    if (formData.jersey_back_name.trim().length > 14) {
      errors.jersey_back_name = 'Jersey name must be 14 characters or less.';
    }
    const jerseyNumStr = formData.jersey_number.trim();
    if (!jerseyNumStr) {
      errors.jersey_number = 'Jersey number is required.';
    } else if (!/^\d{1,2}$/.test(jerseyNumStr)) {
      errors.jersey_number = 'Jersey number must be 00–99.';
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
        }
      }

      // 5. Submit or Re-submit registration
      const result = await createRegistration(
        {
          ...formData,
          student_photo: photoStoragePath || displayPhotoUrl || null,
        },
        editingRegNo || undefined,
        editingDbId || undefined
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
      if (onResetReRegister) onResetReRegister();
    } catch (err: any) {
      console.error('Registration submission error:', err);
      setSubmitErrorMessage(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueRejectedRegistration = (record: InvitationRecord) => {
    setFormData({
      gender: record.gender || 'male',
      full_name: record.full_name || '',
      class_roll: record.class_roll || '',
      student_id: record.student_id || '',
      contact_mobile_number: record.contact_mobile_number || record.sender_mobile_no || '',
      academic_group: record.academic_group || '',
      academic_section: record.academic_section || '',
      student_photo: record.student_photo || null,
      send_method: record.send_method || 'bkash',
      sender_mobile_no: record.sender_mobile_no || record.contact_mobile_number || '',
      payment_time: record.payment_time || '',
      transaction_id: record.transaction_id || '',
      jersey_back_name: record.jersey_back_name || 'STRIKER',
      jersey_number: record.jersey_number || '27',
      jersey_size: (record.jersey_size as JerseySize) || 'L',
    });
    setEditingRegNo(record.registration_no);
    setEditingDbId(record.dbId || record.id || null);
    setDuplicateModal(null);
  };

  return (
    <div className="py-6 sm:py-10 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
      {/* Re-submission Banner if editing previously rejected record */}
      {editingRegNo && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-sm flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Re-Submitting Registration
              </div>
              <div className="text-sm font-extrabold">
                Registration No: <span className="font-mono text-indigo-700">{editingRegNo}</span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Update your student and payment information below. Your registration number remains permanent.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingRegNo(null);
              setEditingDbId(null);
              if (onResetReRegister) onResetReRegister();
            }}
            className="p-2 text-amber-700 hover:text-amber-900 rounded-lg hover:bg-amber-100 transition-colors"
            title="Cancel re-submission"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Registration Container (Adapts Theme to Selected Gender) */}
      <div className={`rounded-3xl p-4 sm:p-8 lg:p-10 transition-all duration-500 ease-out ${containerClasses}`}>
        {/* Title Header */}
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-white/20 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Official Batch 27 Enrollment</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            Rag Day 27 Student Registration
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1.5 ${
              isMale ? 'text-slate-300' : isFemale ? 'text-pink-900/80' : 'text-slate-600'
            }`}
          >
            Select your wing gender first to unlock the enrollment form and personalized jersey preview.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ======================================================== */}
          {/* STEP 1: GENDER SELECTION (Gating Gate)                  */}
          {/* ======================================================== */}
          <div className="space-y-3">
            <div className={`pb-2.5 font-display text-base sm:text-lg font-bold flex items-center justify-between ${sectionHeaderClasses}`}>
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Step 1: Select Your Gender
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider">
                {isGenderChosen ? (
                  <span className="text-emerald-500 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Unlocked
                  </span>
                ) : (
                  <span className="text-amber-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Required to Unlock
                  </span>
                )}
              </span>
            </div>

            <p className={`text-xs ${isMale ? 'text-slate-400' : isFemale ? 'text-pink-950/70' : 'text-slate-500'}`}>
              Select your wing below. The registration form, payment gateway numbers, and jersey customization will unlock accordingly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Male Option Card */}
              <button
                type="button"
                onClick={() => handleGenderSelect('male')}
                className={`p-4 sm:p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex items-center gap-4 ${
                  isMale
                    ? 'border-[#38BDF8] bg-slate-900/90 shadow-[0_0_25px_rgba(56,189,248,0.3)] ring-2 ring-[#38BDF8]/40 text-white'
                    : 'border-slate-300/80 bg-white/70 hover:border-[#38BDF8]/60 hover:bg-slate-50/80 text-slate-800'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl grid place-items-center font-black text-sm shrink-0 transition-transform ${
                    isMale
                      ? 'bg-gradient-to-tr from-[#0284C7] to-[#38BDF8] text-white shadow-md'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  ♂
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm sm:text-base">Male (Boys Wing)</h3>
                    {isMale && <Check className="w-4 h-4 text-[#38BDF8]" />}
                  </div>
                  <p className={`text-xs mt-0.5 ${isMale ? 'text-slate-300' : 'text-slate-500'}`}>
                    Cyber Blue squad kit & Boys Wing payment accounts
                  </p>
                </div>
              </button>

              {/* Female Option Card */}
              <button
                type="button"
                onClick={() => handleGenderSelect('female')}
                className={`p-4 sm:p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex items-center gap-4 ${
                  isFemale
                    ? 'border-[#EC4899] bg-white/95 shadow-[0_0_25px_rgba(236,72,153,0.25)] ring-2 ring-[#EC4899]/40 text-slate-900'
                    : 'border-slate-300/80 bg-white/70 hover:border-[#EC4899]/60 hover:bg-pink-50/50 text-slate-800'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl grid place-items-center font-black text-sm shrink-0 transition-transform ${
                    isFemale
                      ? 'bg-gradient-to-tr from-[#DB2777] to-[#F472B6] text-white shadow-md'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  ♀
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm sm:text-base">Female (Girls Wing)</h3>
                    {isFemale && <Check className="w-4 h-4 text-[#EC4899]" />}
                  </div>
                  <p className={`text-xs mt-0.5 ${isFemale ? 'text-pink-900/80' : 'text-slate-500'}`}>
                    Rose Blossom squad kit & Girls Wing payment accounts
                  </p>
                </div>
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
            <div className="p-8 sm:p-12 rounded-3xl bg-white/80 border-2 border-dashed border-slate-300 text-center space-y-3 animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center mx-auto shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Registration Form Locked</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Please select your gender (<strong>Male</strong> or <strong>Female</strong>) above. The form, academic sections, payment details, and live jersey preview will unlock immediately.
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
                    <User className="w-4 h-4" />
                    2. Personal Information
                  </span>
                  <span className="text-xs font-normal opacity-75">Required fields *</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Full Name */}
                  <div className="sm:col-span-2">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={formData.full_name}
                      onChange={e => {
                        setFormData({ ...formData, full_name: e.target.value });
                        if (formErrors.full_name) setFormErrors(prev => ({ ...prev, full_name: '' }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses}`}
                    />
                    {formErrors.full_name && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.full_name}</p>
                    )}
                  </div>

                  {/* 2. Class Roll */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      Class Roll <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 101"
                      value={formData.class_roll}
                      onChange={e => {
                        setFormData({ ...formData, class_roll: e.target.value });
                        if (formErrors.class_roll) setFormErrors(prev => ({ ...prev, class_roll: '' }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses}`}
                    />
                    {formErrors.class_roll && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.class_roll}</p>
                    )}
                  </div>

                  {/* 3. Student ID */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      Student ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 270101"
                      value={formData.student_id}
                      onChange={e => {
                        setFormData({ ...formData, student_id: e.target.value });
                        if (formErrors.student_id) setFormErrors(prev => ({ ...prev, student_id: '' }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses}`}
                    />
                    {formErrors.student_id && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.student_id}</p>
                    )}
                  </div>

                  {/* 4. Contact Mobile Number */}
                  <div className="sm:col-span-2">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                      Contact Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 01712-345678"
                      value={formData.contact_mobile_number}
                      onChange={e => {
                        setFormData({ ...formData, contact_mobile_number: e.target.value });
                        if (formErrors.contact_mobile_number) setFormErrors(prev => ({ ...prev, contact_mobile_number: '' }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses}`}
                    />
                    {formErrors.contact_mobile_number && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.contact_mobile_number}</p>
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
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none cursor-pointer ${inputClasses}`}
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
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${inputClasses}`}
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
                  </div>

                  {/* 7. Student Photo Upload (Optional, Max 3MB) */}
                  <div className="sm:col-span-2 pt-1">
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
                        className={`w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors outline-none cursor-pointer ${inputClasses}`}
                      >
                        <option value="bkash" className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                          bKash
                        </option>
                        <option value="nagad" className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                          Nagad
                        </option>
                      </select>
                    </div>

                    {/* 9. Sender Mobile No (Required) */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                        Sender Mobile No <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 01XXXXXXXXX"
                        value={formData.sender_mobile_no}
                        onChange={e => {
                          setFormData({ ...formData, sender_mobile_no: e.target.value });
                          if (formErrors.sender_mobile_no) setFormErrors(prev => ({ ...prev, sender_mobile_no: '' }));
                        }}
                        className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses}`}
                      />
                      {formErrors.sender_mobile_no && (
                        <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.sender_mobile_no}</p>
                      )}
                    </div>

                    {/* 10. Payment Time (Required) */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                        Payment Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 02:30 PM"
                        value={formData.payment_time}
                        onChange={e => {
                          setFormData({ ...formData, payment_time: e.target.value });
                          if (formErrors.payment_time) setFormErrors(prev => ({ ...prev, payment_time: '' }));
                        }}
                        className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses}`}
                      />
                      {formErrors.payment_time && (
                        <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.payment_time}</p>
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
                        className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${inputClasses}`}
                      />
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
                          <span className="text-[10px] font-mono opacity-70">00–99</span>
                        </div>
                        <input
                          type="text"
                          maxLength={2}
                          placeholder="27"
                          value={formData.jersey_number}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setFormData({ ...formData, jersey_number: val });
                            if (formErrors.jersey_number) setFormErrors(prev => ({ ...prev, jersey_number: '' }));
                          }}
                          className={`w-full px-4 py-3 rounded-xl text-sm font-mono font-black transition-colors outline-none text-center ${inputClasses}`}
                        />
                        {formErrors.jersey_number && (
                          <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.jersey_number}</p>
                        )}
                      </div>

                      {/* 14. Jersey Size */}
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                          Jersey Size <span className="text-rose-500">*</span>
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
              {/* 5. DECLARATION (Single elegant line as requested)       */}
              {/* ======================================================== */}
              <div className="pt-2 border-t border-slate-200/40">
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
      {duplicateModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {duplicateModal.type === 'approved' && (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                )}
                {duplicateModal.type === 'pending' && (
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center">
                    <Clock className="w-6 h-6" />
                  </div>
                )}
                {duplicateModal.type === 'rejected' && (
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 grid place-items-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="text-base sm:text-lg font-black">
                    {duplicateModal.type === 'approved' && 'Approved Registration'}
                    {duplicateModal.type === 'pending' && 'Registration Pending'}
                    {duplicateModal.type === 'rejected' && 'Previous registration found.'}
                  </h3>
                  <span className="font-mono text-xs font-bold text-indigo-600">
                    {duplicateModal.record.registration_no}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {duplicateModal.type === 'approved' && (
              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold">
                  You already have an approved registration.
                </div>
                <div className="space-y-1 text-xs">
                  <div><strong>Student:</strong> {duplicateModal.record.full_name} (Roll: {duplicateModal.record.class_roll})</div>
                  <div><strong>Student ID:</strong> {duplicateModal.record.student_id}</div>
                  <div><strong>Registration Number:</strong> <span className="font-mono font-bold text-indigo-700">{duplicateModal.record.registration_no}</span></div>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const regNo = duplicateModal.record.registration_no;
                      setDuplicateModal(null);
                      onGoToInvitation(regNo);
                    }}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                  >
                    View Invitation Card
                  </button>
                </div>
              </div>
            )}

            {duplicateModal.type === 'pending' && (
              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold">
                  Your registration is currently pending review.
                </div>
                <div className="space-y-1 text-xs">
                  <div><strong>Student:</strong> {duplicateModal.record.full_name} (Roll: {duplicateModal.record.class_roll})</div>
                  <div><strong>Student ID:</strong> {duplicateModal.record.student_id}</div>
                  <div><strong>Registration Number:</strong> <span className="font-mono font-bold text-indigo-700">{duplicateModal.record.registration_no}</span></div>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const regNo = duplicateModal.record.registration_no;
                      setDuplicateModal(null);
                      onGoToInvitation(regNo);
                    }}
                    className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md"
                  >
                    Check Status
                  </button>
                </div>
              </div>
            )}

            {duplicateModal.type === 'rejected' && (
              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <div className="space-y-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs">
                  <div>
                    <span className="font-bold text-rose-800 uppercase block text-[10px]">Registration Number:</span>
                    <span className="font-mono font-black text-rose-900 text-sm">{duplicateModal.record.registration_no}</span>
                  </div>
                  <div>
                    <span className="font-bold text-rose-800 uppercase block text-[10px]">Current Status:</span>
                    <span className="font-bold text-rose-700 uppercase">Rejected</span>
                  </div>
                  <div>
                    <span className="font-bold text-rose-800 uppercase block text-[10px]">Reject Reason:</span>
                    <span className="font-medium text-rose-900">{duplicateModal.record.reject_reason || 'No specific reason provided.'}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  You can continue with your existing registration number, update your information, and re-submit for approval.
                </p>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateModal(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContinueRejectedRegistration(duplicateModal.record)}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 cursor-pointer"
                  >
                    Continue Registration
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* REGISTRATION CLOSED MODAL                                */}
      {/* ======================================================== */}
      {showClosedModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 space-y-4 text-center">
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
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-slate-900 text-center space-y-5">
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
                  setSuccessModalData(null);
                  onGoToInvitation(regNo);
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
