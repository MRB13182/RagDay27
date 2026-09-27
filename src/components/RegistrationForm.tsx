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
  getAvailableSections as getSectionsFromContent,
  uploadFileToStorage,
  saveRegistrationToSupabase,
} from '../lib/supabase';
import { JerseyGraphic } from './JerseyGraphic';
import { BkashLogo, NagadLogo } from './PaymentBrandLogos';
import { PhotoUploadField } from './PhotoUploadField';
import {
  Upload,
  User,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Info,
  Layers,
  Shirt,
  CreditCard,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface RegistrationFormProps {
  onSuccessSubmit: (newRecord: InvitationRecord) => void;
  onGoToInvitation: (regNo: string) => void;
  paymentSettings?: PaymentSettings;
  sections?: unknown[];
}

const JERSEY_SIZES: JerseySize[] = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

export const getAvailableSections = getSectionsFromContent;

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onSuccessSubmit,
  onGoToInvitation,
  paymentSettings = DEFAULT_PAYMENT_SETTINGS,
  sections = [],
}) => {
  const activeFee = paymentSettings?.registrationFee ?? 500;
  const activeCurrency = paymentSettings?.currency ?? 'BDT';

  const [formData, setFormData] = useState<RegistrationFormData>({
    gender: 'choose_one',
    name: '',
    roll: '',
    id: '',
    group: '',
    section: '',
    photoUrl: null,
    amount: activeFee,
    paymentMethod: paymentSettings?.bkashEnabled ? 'bkash' : 'nagad',
    senderNumber: '',
    paymentTime: '',
    transactionId: '',
    jerseyName: 'STRIKER',
    jerseyNumber: '27',
    jerseySize: 'L',
  });

  // Keep amount in sync if admin updates registration fee
  useEffect(() => {
    if (paymentSettings?.registrationFee) {
      setFormData(prev => ({ ...prev, amount: paymentSettings.registrationFee }));
    }
  }, [paymentSettings?.registrationFee]);

  // Keep payment method in sync if admin disables one
  useEffect(() => {
    const bkashOn = paymentSettings?.bkashEnabled ?? true;
    const nagadOn = paymentSettings?.nagadEnabled ?? true;
    if (!bkashOn && formData.paymentMethod === 'bkash' && nagadOn) {
      setFormData(prev => ({ ...prev, paymentMethod: 'nagad' }));
    } else if (!nagadOn && formData.paymentMethod === 'nagad' && bkashOn) {
      setFormData(prev => ({ ...prev, paymentMethod: 'bkash' }));
    }
  }, [paymentSettings?.bkashEnabled, paymentSettings?.nagadEnabled, formData.paymentMethod]);

  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{ name: string; regNo: string; gender: GenderType } | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Gender-based theme configuration solely for the Registration Form Container
  const isMale = formData.gender === 'male';
  const isFemale = formData.gender === 'female';

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

  const handleCopyAccount = (number: string, label: string) => {
    navigator.clipboard.writeText(number);
    setCopiedAccount(label);
    setTimeout(() => setCopiedAccount(null), 2500);
  };

  // Gender-based dynamic payment numbers (Hidden logic - no Desk UI)
  const activeBkashNumber =
    formData.gender === 'female'
      ? (paymentSettings?.femaleBkashNumber || '01XXXXXXXXX')
      : (paymentSettings?.maleBkashNumber || '01XXXXXXXXX');

  const activeNagadNumber =
    formData.gender === 'female'
      ? (paymentSettings?.femaleNagadNumber || '01XXXXXXXXX')
      : (paymentSettings?.maleNagadNumber || '01XXXXXXXXX');

  const handlePhotoSelected = ({
    photoUrl,
    photoFile,
    photoBlob,
  }: {
    photoUrl: string;
    photoFile: File;
    photoBlob: Blob;
  }) => {
    setFormData(prev => ({
      ...prev,
      photoUrl,
      photoFile,
      photoBlob,
    }));
  };

  const handlePhotoRemoved = () => {
    setFormData(prev => ({
      ...prev,
      photoUrl: null,
      photoFile: null,
      photoBlob: null,
    }));
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as GenderType;
    setFormData(prev => ({
      ...prev,
      gender: val,
      section: '', // Reset section automatically when gender changes
      jerseyName:
        prev.jerseyName === 'STRIKER' || prev.jerseyName === 'NOVA' || prev.jerseyName === 'HUNTER'
          ? val === 'male'
            ? 'HUNTER'
            : val === 'female'
            ? 'NOVA'
            : 'STRIKER'
          : prev.jerseyName,
    }));
    if (formErrors.gender) {
      setFormErrors(prev => ({ ...prev, gender: '' }));
    }
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      group: val,
      section: '', // Reset section automatically when group changes
    }));
    if (formErrors.group) {
      setFormErrors(prev => ({ ...prev, group: '' }));
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (formData.gender === 'choose_one') errors.gender = 'Please select your gender';
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.roll.trim()) errors.roll = 'Roll number is required';
    if (!formData.id.trim()) errors.id = 'Student ID is required';
    if (!formData.group) errors.group = 'Please select your academic group';

    const validSections = getAvailableSections(formData.gender, formData.group, sections);
    if (!formData.section) {
      errors.section = 'Please select your section';
    } else if (!validSections.includes(formData.section)) {
      errors.section = 'Invalid section for selected Gender and Group';
    }

    if (!formData.senderNumber.trim()) errors.senderNumber = 'Sender number is required';
    if (!formData.paymentTime.trim()) errors.paymentTime = 'Payment time is required';
    // Transaction ID is optional per requirements
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setIsSubmitting(true);

    try {
      let photoPath = formData.photoUrl || null;
      if (formData.photoFile) {
        photoPath = await uploadFileToStorage(formData.photoFile, 'studentPhoto');
      }

      const newRecord: InvitationRecord = {
        registrationNo: '',
        name: formData.name.trim(),
        roll: formData.roll.trim(),
        id: formData.id.trim(),
        group: formData.group,
        section: formData.section,
        status: 'pending',
        gender: formData.gender === 'female' ? 'female' : 'male',
        photoUrl: photoPath,
        jerseyName: formData.jerseyName.toUpperCase().trim(),
        jerseyNumber: formData.jerseyNumber || '27',
        jerseySize: formData.jerseySize,
        paymentMethod: formData.paymentMethod,
        amount: formData.amount,
        senderNumber: formData.senderNumber.trim(),
        paymentTime: formData.paymentTime.trim(),
        transactionId: formData.transactionId.trim() || undefined,
      };

      // 3. Save permanently to Supabase Database
      const saveResult = await saveRegistrationToSupabase(newRecord);
      const finalRecord = saveResult.data || newRecord;

      onSuccessSubmit(finalRecord);
      setSuccessModalData({ name: finalRecord.name, regNo: finalRecord.registrationNo, gender: finalRecord.gender });
    } catch (err) {
      console.error('Registration submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-6 sm:py-10 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
      {/* Registration Container (Adapts internally based on gender selection) */}
      <div className={`rounded-3xl p-4 sm:p-8 lg:p-10 transition-all duration-500 ease-out ${containerClasses}`}>
        {/* Form Title & Subtitle */}
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-white/20 backdrop-blur-sm">
            <span>Official Batch 27 Enrollment</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            Registration Form
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1.5 ${
              isMale ? 'text-slate-300' : isFemale ? 'text-pink-900/80' : 'text-slate-600'
            }`}
          >
            Please provide your student details, payment details, and jersey requirements.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ======================================================== */}
          {/* 1. PERSONAL INFORMATION */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <div className={`pb-2.5 font-display text-base sm:text-lg font-bold flex items-center justify-between ${sectionHeaderClasses}`}>
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                1. Personal Information
              </span>
              <span className="text-xs font-normal opacity-75">Required fields *</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Gender Selector: Strictly Choose One, Male, Female */}
              <div className="sm:col-span-2">
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={handleGenderChange}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none cursor-pointer ${inputClasses}`}
                >
                  <option value="choose_one" className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    Choose One
                  </option>
                  <option value="male" className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    Male
                  </option>
                  <option value="female" className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    Female
                  </option>
                </select>
                {formErrors.gender && (
                  <p className="text-rose-400 text-xs mt-1">{formErrors.gender}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>Registration No</label>
                <input
                  type="text"
                  value="Assigned automatically by Supabase"
                  readOnly
                  disabled
                  className={`w-full px-4 py-3 rounded-xl text-sm bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed`}
                />
                <p className="text-[11px] mt-1 text-slate-500">The database assigns the next registration number after submission.</p>
              </div>

              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={e => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-sm transition-colors outline-none ${inputClasses}`}
                />
                {formErrors.name && (
                  <p className="text-rose-400 text-xs mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Roll Number */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                  Roll <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 27"
                  value={formData.roll}
                  onChange={e => {
                    setFormData({ ...formData, roll: e.target.value });
                    if (formErrors.roll) setFormErrors(prev => ({ ...prev, roll: '' }));
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-sm transition-colors outline-none ${inputClasses}`}
                />
                {formErrors.roll && (
                  <p className="text-rose-400 text-xs mt-1">{formErrors.roll}</p>
                )}
              </div>

              {/* Student ID */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                  ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2023-0127"
                  value={formData.id}
                  onChange={e => {
                    setFormData({ ...formData, id: e.target.value });
                    if (formErrors.id) setFormErrors(prev => ({ ...prev, id: '' }));
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-sm transition-colors outline-none ${inputClasses}`}
                />
                {formErrors.id && (
                  <p className="text-rose-400 text-xs mt-1">{formErrors.id}</p>
                )}
              </div>

              {/* Group Field: Must NOT be preselected. Default: Choose Group */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                  Group <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.group}
                  onChange={handleGroupChange}
                  className={`w-full px-4 py-3 rounded-xl text-sm transition-colors outline-none cursor-pointer ${inputClasses}`}
                >
                  <option value="" className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    Choose Group
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
                {formErrors.group && (
                  <p className="text-rose-400 text-xs mt-1">{formErrors.group}</p>
                )}
              </div>

              {/* Section Field: Disabled until Gender AND Group are selected */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                  Section <span className="text-rose-500">*</span>
                </label>
                {(() => {
                  const isSectionEnabled =
                    (formData.gender === 'male' || formData.gender === 'female') &&
                    Boolean(formData.group);
                  const availableSections = isSectionEnabled
                    ? getAvailableSections(formData.gender, formData.group, sections)
                    : [];

                  return (
                    <>
                      <select
                        value={formData.section}
                        disabled={!isSectionEnabled}
                        onChange={e => {
                          setFormData(prev => ({ ...prev, section: e.target.value }));
                          if (formErrors.section) {
                            setFormErrors(prev => ({ ...prev, section: '' }));
                          }
                        }}
                        className={`w-full px-4 py-3 rounded-xl text-sm transition-colors outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${inputClasses}`}
                      >
                        <option value="" className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                          {!isSectionEnabled
                            ? '[ Select Gender & Group First ]'
                            : 'Select Section'}
                        </option>
                        {availableSections.map(sec => (
                          <option key={sec} value={sec} className={isMale ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                            {sec}
                          </option>
                        ))}
                      </select>
                      {!isSectionEnabled && (
                        <p className={`text-[11px] mt-1 ${isMale ? 'text-slate-400' : 'text-slate-500'}`}>
                          Please choose Gender and Group first to unlock sections.
                        </p>
                      )}
                      {formErrors.section && (
                        <p className="text-rose-400 text-xs mt-1">{formErrors.section}</p>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Photo Upload System */}
              <div className="sm:col-span-2">
                <PhotoUploadField
                  photoUrl={formData.photoUrl}
                  gender={formData.gender}
                  onPhotoSelected={handlePhotoSelected}
                  onPhotoRemoved={handlePhotoRemoved}
                  labelClasses={labelClasses}
                />
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. PAYMENT SECTION (MINIMAL & CLEAN) */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <div className={`pb-2.5 font-display text-base sm:text-lg font-bold flex items-center justify-between ${sectionHeaderClasses}`}>
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                2. Payment Section
              </span>
            </div>

            {/* 1. Registration Fee */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                Registration Fee
              </label>
              <div className={`p-4 rounded-2xl ${subCardClasses} flex items-center justify-between`}>
                <span className="text-xl sm:text-2xl font-display font-black tracking-tight">
                  {activeFee} {activeCurrency}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Exact Amount
                </span>
              </div>
            </div>

            {/* 2. Bkash Number */}
            {paymentSettings?.bkashEnabled !== false && (
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                  Bkash Number
                </label>
                <div className={`p-3 sm:p-4 rounded-2xl ${subCardClasses} flex items-center justify-between gap-2 sm:gap-3`}>
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-2xl transition-all shadow-[0_8px_20px_rgba(226,19,110,0.18),inset_0_1px_1px_rgba(255,255,255,0.7)] ${
                        isMale
                          ? 'bg-gradient-to-br from-[#E2136E]/25 via-slate-900/60 to-[#E2136E]/15 border border-[#E2136E]/50'
                          : isFemale
                          ? 'bg-gradient-to-br from-white/90 via-[#E2136E]/15 to-white/70 border border-[#E2136E]/40'
                          : 'bg-gradient-to-br from-white/95 via-[#E2136E]/10 to-white/80 border border-[#E2136E]/30'
                      }`}
                    >
                      <BkashLogo className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>
                    <span className="font-mono font-bold text-xs xs:text-sm sm:text-base tracking-wide truncate">
                      {activeBkashNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyAccount(activeBkashNumber.replace(/\D/g, '') || activeBkashNumber, 'bkash')}
                    className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 ${
                      copiedAccount === 'bkash'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : isMale
                        ? 'bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 text-[#38BDF8] border border-[#38BDF8]/30'
                        : isFemale
                        ? 'bg-pink-100 hover:bg-pink-200 text-pink-700 border border-pink-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {copiedAccount === 'bkash' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 3. Nagad Number */}
            {paymentSettings?.nagadEnabled !== false && (
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                  Nagad Number
                </label>
                <div className={`p-3 sm:p-4 rounded-2xl ${subCardClasses} flex items-center justify-between gap-2 sm:gap-3`}>
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-2xl transition-all shadow-[0_8px_20px_rgba(247,147,30,0.18),inset_0_1px_1px_rgba(255,255,255,0.7)] ${
                        isMale
                          ? 'bg-gradient-to-br from-[#F7931E]/25 via-slate-900/60 to-[#F7931E]/15 border border-[#F7931E]/50'
                          : isFemale
                          ? 'bg-gradient-to-br from-white/90 via-[#F7931E]/15 to-white/70 border border-[#F7931E]/40'
                          : 'bg-gradient-to-br from-white/95 via-[#F7931E]/10 to-white/80 border border-[#F7931E]/30'
                      }`}
                    >
                      <NagadLogo className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>
                    <span className="font-mono font-bold text-xs xs:text-sm sm:text-base tracking-wide truncate">
                      {activeNagadNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyAccount(activeNagadNumber.replace(/\D/g, '') || activeNagadNumber, 'nagad')}
                    className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 ${
                      copiedAccount === 'nagad'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : isMale
                        ? 'bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 text-[#38BDF8] border border-[#38BDF8]/30'
                        : isFemale
                        ? 'bg-pink-100 hover:bg-pink-200 text-pink-700 border border-pink-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {copiedAccount === 'nagad' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 4. Sender Number * */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                Sender Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="Enter Sender Number"
                value={formData.senderNumber}
                onChange={e => {
                  setFormData({ ...formData, senderNumber: e.target.value });
                  if (formErrors.senderNumber) {
                    setFormErrors(prev => ({ ...prev, senderNumber: '' }));
                  }
                }}
                className={`w-full px-4 py-3 rounded-xl text-sm transition-colors outline-none ${inputClasses}`}
              />
              {formErrors.senderNumber && (
                <p className="text-rose-400 text-xs mt-1">{formErrors.senderNumber}</p>
              )}
            </div>

            {/* 5. Payment Time * */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                Payment Time <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  placeholder="Select Time"
                  value={formData.paymentTime}
                  onChange={e => {
                    setFormData({ ...formData, paymentTime: e.target.value });
                    if (formErrors.paymentTime) {
                      setFormErrors(prev => ({ ...prev, paymentTime: '' }));
                    }
                  }}
                  style={{ colorScheme: isMale ? 'dark' : 'light' }}
                  className={`w-full px-4 py-3 rounded-xl text-sm transition-colors outline-none cursor-pointer ${inputClasses}`}
                />
                <Clock className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
              </div>
              {formErrors.paymentTime && (
                <p className="text-rose-400 text-xs mt-1">{formErrors.paymentTime}</p>
              )}
            </div>

            {/* 6. Transaction ID (Optional) */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                Transaction ID (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter Transaction ID"
                value={formData.transactionId}
                onChange={e => {
                  setFormData({ ...formData, transactionId: e.target.value.toUpperCase() });
                  if (formErrors.transactionId) {
                    setFormErrors(prev => ({ ...prev, transactionId: '' }));
                  }
                }}
                className={`w-full px-4 py-3 rounded-xl text-sm transition-colors outline-none font-mono uppercase ${inputClasses}`}
              />
              {formErrors.transactionId && (
                <p className="text-rose-400 text-xs mt-1">{formErrors.transactionId}</p>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. JERSEY DETAILS SECTION */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <div className={`pb-2.5 font-display text-base sm:text-lg font-bold flex items-center justify-between ${sectionHeaderClasses}`}>
              <span className="flex items-center gap-2">
                <Shirt className="w-4 h-4" />
                3. Jersey Details
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide border transition-all duration-300 ${
                  isMale
                    ? 'bg-sky-950/70 border-sky-400/40 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                    : isFemale
                    ? 'bg-pink-100 border-pink-300 text-pink-700 shadow-sm'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                }`}
              >
                Size : {formData.jerseySize}
              </span>
            </div>

            {/* Step 1: Jersey Size Selector Buttons */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${labelClasses}`}>
                Jersey Size <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {JERSEY_SIZES.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setFormData({ ...formData, jerseySize: size })}
                    className={`w-11 h-11 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
                      formData.jerseySize === size
                        ? isMale
                          ? 'bg-[#38BDF8] text-slate-950 shadow-md shadow-sky-400/50 ring-2 ring-sky-300 scale-105'
                          : isFemale
                          ? 'bg-[#EC4899] text-white shadow-md shadow-pink-500/50 ring-2 ring-pink-300 scale-105'
                          : 'bg-[#5B5FEF] text-white shadow-md shadow-[#5B5FEF]/50 ring-2 ring-[#5B5FEF]/30 scale-105'
                        : subCardClasses
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 & 3: Two-Column Form for Jersey Name and Jersey Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Jersey Name */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                  Jersey Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={14}
                  placeholder={isFemale ? 'NOVA' : 'HUNTER'}
                  value={formData.jerseyName}
                  onChange={e => setFormData({ ...formData, jerseyName: e.target.value.toUpperCase() })}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-bold tracking-wider uppercase transition-colors outline-none ${inputClasses}`}
                />
                <span
                  className={`text-[10px] mt-1 block ${
                    isMale ? 'text-slate-400' : isFemale ? 'text-pink-900/65' : 'text-slate-500'
                  }`}
                >
                  Maximum 14 letters printed on the back.
                </span>
              </div>

              {/* Jersey Number */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                  Jersey Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="27"
                  value={formData.jerseyNumber}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      jerseyNumber: e.target.value.replace(/\D/g, '').slice(0, 2),
                    })
                  }
                  className={`w-full px-4 py-3 rounded-xl text-sm font-bold font-mono transition-colors outline-none ${inputClasses}`}
                />
                <span
                  className={`text-[10px] mt-1 block ${
                    isMale ? 'text-slate-400' : isFemale ? 'text-pink-900/65' : 'text-slate-500'
                  }`}
                >
                  2-digit squad number (00 to 99).
                </span>
              </div>
            </div>

            {/* Step 4: JERSEY PREVIEW (SINGLE BACK VIEW ONLY) */}
            <div className="pt-2 space-y-2">
              <label className={`block text-xs font-bold uppercase tracking-wider ${labelClasses}`}>
                Jersey Preview
              </label>

              {/* Glassmorphism Preview Box Theme-Aligned */}
              <div
                className={`relative overflow-hidden rounded-2xl p-4 sm:p-6 transition-all duration-500 border flex flex-col items-center justify-center ${
                  isMale
                    ? 'bg-gradient-to-b from-[#091836] via-[#061126] to-[#030917] border-[#38BDF8]/35 shadow-[0_12px_45px_-10px_rgba(15,23,42,0.9),inset_0_0_40px_rgba(56,189,248,0.1)]'
                    : isFemale
                    ? 'bg-gradient-to-b from-white/95 via-pink-50/90 to-pink-100/70 border-pink-200/90 shadow-[0_12px_35px_-10px_rgba(244,114,182,0.25),inset_0_0_30px_rgba(255,255,255,0.8)] backdrop-blur-xl'
                    : 'bg-gradient-to-b from-white/90 via-slate-50/80 to-slate-100/60 border-slate-200 shadow-sm backdrop-blur-xl'
                }`}
              >
                {/* Subtle Ambient Radial Lighting Behind Jersey */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: isMale
                      ? 'radial-gradient(circle at 50% 45%, rgba(14, 116, 144, 0.28) 0%, rgba(30, 58, 138, 0.2) 40%, transparent 70%)'
                      : isFemale
                      ? 'radial-gradient(circle at 50% 45%, rgba(244, 114, 182, 0.2) 0%, rgba(251, 207, 232, 0.15) 45%, transparent 70%)'
                      : 'radial-gradient(circle at 50% 45%, rgba(91, 95, 239, 0.15) 0%, transparent 65%)',
                  }}
                />

                {/* Back View Jersey Graphic */}
                <div className="relative z-10 w-full py-2 flex items-center justify-center">
                  <JerseyGraphic
                    view="back"
                    name={formData.jerseyName}
                    number={formData.jerseyNumber}
                    size={formData.jerseySize}
                    gender={formData.gender}
                    className="w-full max-w-[340px] sm:max-w-[380px]"
                  />
                </div>

                {/* Sleek Glassmorphism "Back View" Label Below Jersey */}
                <div className="relative z-10 pt-2 pb-1">
                  <div
                    className={`px-8 py-1.5 rounded-full text-xs font-semibold tracking-wide border backdrop-blur-md transition-all duration-300 shadow-sm ${
                      isMale
                        ? 'bg-sky-950/70 border-sky-400/35 text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                        : isFemale
                        ? 'bg-white/90 border-pink-200 text-pink-700 shadow-sm'
                        : 'bg-white/90 border-slate-200 text-slate-700 shadow-sm'
                    }`}
                  >
                    Back View
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 5. SUBMIT REGISTRATION BUTTON (REDUCED SIZE, PREMIUM STYLING) */}
          {/* ======================================================== */}
          <div className="pt-3 pb-1 flex justify-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto min-w-[220px] max-w-sm py-2.5 px-6 rounded-xl font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-md hover:-translate-y-0.5 active:translate-y-0 ${
                isMale
                  ? 'bg-gradient-to-r from-[#2563EB] to-[#38BDF8] hover:from-[#1d4ed8] hover:to-[#0284c7] text-slate-950 shadow-sky-500/25'
                  : isFemale
                  ? 'bg-gradient-to-r from-[#EC4899] to-[#F472B6] hover:from-[#db2777] hover:to-[#e11d48] text-white shadow-pink-500/25'
                  : 'bg-gradient-to-r from-[#5B5FEF] to-[#7A6CFF] hover:from-[#4d51d4] hover:to-[#6858f2] text-white shadow-[#5B5FEF]/25'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Submitting Registration...
                </span>
              ) : (
                <>
                  <span>Submit Registration</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ======================================================== */}
      {/* REGISTRATION SUCCESS POPUP (GLASSMORPHISM MODAL) */}
      {/* ======================================================== */}
      {successModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div
            className={`w-full max-w-md rounded-3xl p-6 sm:p-7 transition-all shadow-2xl relative text-left ${
              successModalData.gender === 'male'
                ? 'bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#0F172A] text-white border border-[#38BDF8]/40 shadow-[0_20px_60px_-10px_rgba(15,23,42,0.9)]'
                : successModalData.gender === 'female'
                ? 'bg-gradient-to-br from-[#FFF1F5] via-[#FBCFE8] to-[#FFFFFF] text-slate-900 border border-[#F472B6]/50 shadow-[0_20px_60px_-10px_rgba(236,72,153,0.3)]'
                : 'bg-white text-slate-900 border border-white/90 shadow-[0_20px_60px_-10px_rgba(91,95,239,0.2)]'
            }`}
          >
            {/* Header Icon */}
            <div className="flex items-center justify-center mb-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md ${
                  successModalData.gender === 'male'
                    ? 'bg-[#38BDF8] text-slate-950 shadow-[#38BDF8]/30'
                    : successModalData.gender === 'female'
                    ? 'bg-[#EC4899] text-white shadow-[#EC4899]/30'
                    : 'bg-[#5B5FEF] text-white shadow-[#5B5FEF]/30'
                }`}
              >
                <Check className="w-7 h-7 stroke-[3]" />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-5">
              <h3 className="font-display text-xl sm:text-2xl font-extrabold">
                Registration Complete
              </h3>
            </div>

            {/* Details Box */}
            <div
              className={`p-4 rounded-2xl mb-4 space-y-2.5 text-xs ${
                successModalData.gender === 'male'
                  ? 'bg-slate-900/80 border border-slate-800 text-white'
                  : successModalData.gender === 'female'
                  ? 'bg-white/80 border border-pink-200 text-slate-900'
                  : 'bg-slate-50 border border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-current/10">
                <span className="opacity-75 uppercase font-semibold">Name:</span>
                <span className="text-sm font-bold">{successModalData.name}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-current/10">
                <span className="opacity-75 uppercase font-semibold">Registration Number:</span>
                <span className="text-sm font-bold font-mono">
                  {successModalData.regNo}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-current/10">
                <span className="opacity-75 uppercase font-semibold">Registration No:</span>

              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="opacity-75">Database:</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Saved in Supabase
                </span>
              </div>
            </div>

            {/* Notice Requirement */}
            <div
              className={`p-3.5 rounded-2xl mb-5 flex items-start gap-2.5 text-xs leading-relaxed ${
                successModalData.gender === 'male'
                  ? 'bg-sky-950/50 border border-sky-800/40 text-sky-200'
                  : successModalData.gender === 'female'
                  ? 'bg-pink-100/70 border border-pink-300 text-pink-900'
                  : 'bg-amber-50 border border-amber-200 text-amber-900'
              }`}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Notice:</strong> Keep your Registration Number in mind. You will need this Registration Number to download your invitation card after admin approval.
              </div>
            </div>

            {/* Action Button: OK */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSuccessModalData(null)}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all text-center cursor-pointer ${
                  successModalData.gender === 'male'
                    ? 'bg-slate-800 text-white hover:bg-slate-700'
                    : successModalData.gender === 'female'
                    ? 'bg-white text-pink-800 border border-pink-200 hover:bg-pink-50'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                OK
              </button>

              <button
                type="button"
                onClick={() => {
                  const reg = successModalData.regNo;
                  setSuccessModalData(null);
                  onGoToInvitation(reg);
                }}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  successModalData.gender === 'male'
                    ? 'bg-[#38BDF8] text-slate-950 hover:bg-[#7dd3fc]'
                    : successModalData.gender === 'female'
                    ? 'bg-[#EC4899] text-white hover:bg-pink-600'
                    : 'bg-[#5B5FEF] text-white hover:bg-[#4a4ed4]'
                }`}
              >
                <span>Check Card</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
