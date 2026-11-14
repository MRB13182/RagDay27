import React from 'react';
import { FlaskConical, Briefcase, BookOpen } from 'lucide-react';
import {
  DEPARTMENT_SOCIAL_CONTACTS,
  resolveConfiguredSocialUrl,
  type DepartmentKey,
} from '../config/socialContactsConfig';

interface DepartmentTheme {
  cardClass: string;
  iconColorClass: string;
  titleColorClass: string;
  icon: React.ReactNode;
}

const DEPARTMENT_THEMES: Record<DepartmentKey, DepartmentTheme> = {
  Science: {
    cardClass: 'bg-purple-50/90 border-purple-200/80 hover:border-purple-300/90',
    iconColorClass: 'text-purple-600',
    titleColorClass: 'text-purple-700',
    icon: <FlaskConical className="w-5 h-5 sm:w-6 sm:h-6 mx-auto" strokeWidth={2.1} aria-hidden="true" />,
  },
  'Business Studies': {
    cardClass: 'bg-amber-50/90 border-amber-200/80 hover:border-amber-300/90',
    iconColorClass: 'text-amber-700',
    titleColorClass: 'text-amber-900',
    icon: <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 mx-auto" strokeWidth={2.1} aria-hidden="true" />,
  },
  Humanities: {
    cardClass: 'bg-emerald-50/90 border-emerald-200/80 hover:border-emerald-300/90',
    iconColorClass: 'text-emerald-600',
    titleColorClass: 'text-emerald-800',
    icon: <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 mx-auto" strokeWidth={2.1} aria-hidden="true" />,
  },
};

const WhatsAppBrandIcon: React.FC<{ disabled?: boolean }> = ({ disabled }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={`w-5 h-5 sm:w-6 sm:h-6 ${disabled ? 'text-slate-400' : 'text-[#25D366]'}`}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
  </svg>
);

const InstagramBrandIcon: React.FC<{ gradientId: string; disabled?: boolean }> = ({
  gradientId,
  disabled,
}) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="w-5 h-5 sm:w-6 sm:h-6"
    fill="none"
    stroke={disabled ? '#94a3b8' : `url(#${gradientId})`}
    strokeWidth={2.1}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {!disabled && (
      <defs>
        <linearGradient id={gradientId} x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f58529" />
          <stop offset="45%" stopColor="#dd2a7b" />
          <stop offset="100%" stopColor="#8134af" />
        </linearGradient>
      </defs>
    )}
    <rect width="18" height="18" x="3" y="3" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.8" fill={disabled ? '#94a3b8' : `url(#${gradientId})`} stroke="none" />
  </svg>
);

export const ContactInformationSection: React.FC = () => {
  return (
    <section
      aria-labelledby="contact-info-heading"
      className="py-10 sm:py-14 text-center animate-fadeIn"
    >
      <div className="max-w-xl mx-auto px-3.5 sm:px-7 py-6 sm:py-8 rounded-3xl public-glass-surface public-glass-edge text-center relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-16 h-44 w-44 rounded-full bg-violet-300/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl"
        />

        <div className="relative z-10">
          <h2
            id="contact-info-heading"
            className="font-display text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
          >
            For More Information
          </h2>

          <div className="mt-5 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4">
            {DEPARTMENT_SOCIAL_CONTACTS.map((entry, idx) => {
              const theme = DEPARTMENT_THEMES[entry.department];
              const whatsappHref = resolveConfiguredSocialUrl(entry.whatsappUrl);
              const instagramHref = resolveConfiguredSocialUrl(entry.instagramUrl);
              const gradientId = `ig-dept-grad-${idx}`;

              return (
                <div
                  key={entry.department}
                  className={`min-w-0 rounded-2xl border px-2 py-3.5 sm:px-4 sm:py-5 flex flex-col items-center justify-between gap-3 transition-colors ${theme.cardClass}`}
                >
                  <div className="space-y-1.5 w-full">
                    <div className={theme.iconColorClass}>{theme.icon}</div>
                    <h3
                      className={`text-xs sm:text-sm font-extrabold leading-tight break-words ${theme.titleColorClass}`}
                    >
                      {entry.department}
                    </h3>
                  </div>

                  <div className="flex items-center justify-center gap-3 sm:gap-4 pt-0.5">
                    {whatsappHref ? (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${entry.department} WhatsApp (opens in a new tab)`}
                        title={`${entry.department} WhatsApp`}
                        className="p-1.5 rounded-xl hover:bg-white/70 active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FEF] cursor-pointer"
                      >
                        <WhatsAppBrandIcon />
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        aria-label={`${entry.department} WhatsApp not configured`}
                        title={`${entry.department} WhatsApp link is not configured yet`}
                        className="p-1.5 rounded-xl opacity-40 cursor-not-allowed"
                      >
                        <WhatsAppBrandIcon disabled />
                      </button>
                    )}

                    {instagramHref ? (
                      <a
                        href={instagramHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${entry.department} Instagram (opens in a new tab)`}
                        title={`${entry.department} Instagram`}
                        className="p-1.5 rounded-xl hover:bg-white/70 active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FEF] cursor-pointer"
                      >
                        <InstagramBrandIcon gradientId={gradientId} />
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        aria-label={`${entry.department} Instagram not configured`}
                        title={`${entry.department} Instagram link is not configured yet`}
                        className="p-1.5 rounded-xl opacity-40 cursor-not-allowed"
                      >
                        <InstagramBrandIcon gradientId={gradientId} disabled />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subtle divider separating this section from the footer */}
      <div className="mt-12 sm:mt-16 w-full max-w-5xl mx-auto px-4">
        <div className="border-t border-slate-200/70" />
      </div>
    </section>
  );
};
