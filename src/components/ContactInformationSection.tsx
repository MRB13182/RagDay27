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
    cardClass: 'bg-[#0D1119]/90 border-[#8BEAFF]/25 hover:border-[#8BEAFF]/60',
    iconColorClass: 'text-[#8BEAFF]',
    titleColorClass: 'text-[#F5F7FA]',
    icon: <FlaskConical className="w-5 h-5 sm:w-6 sm:h-6 mx-auto" strokeWidth={1.9} aria-hidden="true" />,
  },
  'Business Studies': {
    cardClass: 'bg-[#0D1119]/90 border-[#C9D0D9]/25 hover:border-[#8BEAFF]/55',
    iconColorClass: 'text-[#C9D0D9]',
    titleColorClass: 'text-[#F5F7FA]',
    icon: <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 mx-auto" strokeWidth={1.9} aria-hidden="true" />,
  },
  Humanities: {
    cardClass: 'bg-[#0D1119]/90 border-[#8BEAFF]/25 hover:border-[#8BEAFF]/60',
    iconColorClass: 'text-[#8BEAFF]',
    titleColorClass: 'text-[#F5F7FA]',
    icon: <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 mx-auto" strokeWidth={1.9} aria-hidden="true" />,
  },
};

const WhatsAppBrandIcon: React.FC<{ disabled?: boolean }> = ({ disabled }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${disabled ? 'text-[#626B79]' : 'text-[#25D366]'}`}
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
    className="w-5 h-5 sm:w-5.5 sm:h-5.5"
    fill="none"
    stroke={disabled ? '#626B79' : `url(#${gradientId})`}
    strokeWidth={2}
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
    <circle cx="17.5" cy="6.5" r="0.8" fill={disabled ? '#626B79' : `url(#${gradientId})`} stroke="none" />
  </svg>
);

export const ContactInformationSection: React.FC = () => {
  return (
    <section
      id="contact-info"
      aria-labelledby="contact-info-heading"
      className="py-10 sm:py-16 text-center animate-fadeIn"
    >
      <div className="max-w-2xl mx-auto px-4">
        <div className="px-4 sm:px-8 py-7 sm:py-9 rounded-2xl museum-frame text-center relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-[#8BEAFF]">
              Department Desks
            </span>
            <h2
              id="contact-info-heading"
              className="font-display text-xl sm:text-3xl font-extrabold chrome-text tracking-tight mt-1.5"
            >
              For More Information
            </h2>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {DEPARTMENT_SOCIAL_CONTACTS.map((entry, idx) => {
                const theme = DEPARTMENT_THEMES[entry.department];
                const whatsappHref = resolveConfiguredSocialUrl(entry.whatsappUrl);
                const instagramHref = resolveConfiguredSocialUrl(entry.instagramUrl);
                const gradientId = `ig-dept-grad-${idx}`;

                return (
                  <div
                    key={entry.department}
                    className={`min-w-0 rounded-xl border px-3 py-4 sm:px-4 sm:py-5 flex flex-col items-center justify-between gap-3.5 transition-colors ${theme.cardClass}`}
                  >
                    <div className="space-y-2 w-full">
                      <div className={theme.iconColorClass}>{theme.icon}</div>
                      <h3
                        className={`text-xs sm:text-sm font-extrabold tracking-tight leading-tight break-words ${theme.titleColorClass}`}
                      >
                        {entry.department}
                      </h3>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-1">
                      {whatsappHref ? (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${entry.department} WhatsApp (opens in a new tab)`}
                          title={`${entry.department} WhatsApp`}
                          className="p-2 rounded-lg border border-[#C9D0D9]/15 bg-[#141925] hover:border-[#8BEAFF]/50 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8BEAFF] cursor-pointer"
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
                          className="p-2 rounded-lg border border-[#C9D0D9]/10 bg-[#11151E] opacity-40 cursor-not-allowed"
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
                          className="p-2 rounded-lg border border-[#C9D0D9]/15 bg-[#141925] hover:border-[#8BEAFF]/50 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8BEAFF] cursor-pointer"
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
                          className="p-2 rounded-lg border border-[#C9D0D9]/10 bg-[#11151E] opacity-40 cursor-not-allowed"
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
      </div>

      {/* Subtle architectural horizon separator */}
      <div className="mt-12 sm:mt-16 w-full max-w-5xl mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-[#C9D0D9]/20 to-transparent" />
      </div>
    </section>
  );
};
