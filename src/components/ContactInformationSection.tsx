import React from 'react';

interface SocialLink {
  name: string;
  url: string;
  ariaLabel: string;
  iconBgClass: string;
  shadowClass: string;
  iconNode: React.ReactNode;
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/md.moshiur.rahman.512608',
    ariaLabel: 'Reach us on Facebook (opens in a new tab)',
    iconBgClass: 'bg-[#1877F2]',
    shadowClass: 'shadow-[0_8px_20px_rgba(24,119,242,0.28)] hover:shadow-[0_12px_26px_rgba(24,119,242,0.42)]',
    iconNode: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-current text-white"
      >
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: 'WhatsApp',
    url: 'https://wa.me/8801732212203',
    ariaLabel: 'Reach us on WhatsApp (opens in a new tab)',
    iconBgClass: 'bg-[#25D366]',
    shadowClass: 'shadow-[0_8px_20px_rgba(37,211,102,0.28)] hover:shadow-[0_12px_26px_rgba(37,211,102,0.42)]',
    iconNode: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-current text-white"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/ali.babaa.x?obrf=Y3dlMm5ib2IzZng0',
    ariaLabel: 'Reach us on Instagram (opens in a new tab)',
    iconBgClass: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]',
    shadowClass: 'shadow-[0_8px_20px_rgba(220,39,67,0.3)] hover:shadow-[0_12px_26px_rgba(220,39,67,0.45)]',
    iconNode: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-none stroke-current text-white stroke-[2.2]"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    ),
  },
];

export const ContactInformationSection: React.FC = () => {
  return (
    <section
      aria-labelledby="contact-info-heading"
      className="py-10 sm:py-14 text-center animate-fadeIn"
    >
      <div className="max-w-md mx-auto px-4">
        {/* Heading */}
        <h2
          id="contact-info-heading"
          className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
        >
          For More Information
        </h2>

        {/* Subtitle */}
        <p className="text-sm text-slate-500 mt-1.5 font-medium">
          Feel free to reach us on
        </p>

        {/* Social media icons row */}
        <div className="mt-6 flex items-center justify-center gap-6 sm:gap-8">
          {SOCIAL_LINKS.map(item => (
            <a
              key={item.name}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.ariaLabel}
              className="group flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FEF] focus-visible:ring-offset-2 rounded-2xl cursor-pointer"
            >
              {/* Circular Brand Icon */}
              <div
                className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110 active:scale-95 ${item.iconBgClass} ${item.shadowClass}`}
              >
                {item.iconNode}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Subtle divider separating this section from the footer */}
      <div className="mt-12 sm:mt-16 w-full max-w-5xl mx-auto px-4">
        <div className="border-t border-slate-200/70" />
      </div>
    </section>
  );
};
