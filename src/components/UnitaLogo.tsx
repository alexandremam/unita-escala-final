import React from 'react';

interface UnitaLogoProps {
  className?: string;
  size?: number; // Size for the emblem rosette
  variant?: 'emblem' | 'full' | 'horizontal';
  lightText?: boolean;
}

export default function UnitaLogo({ 
  className = '', 
  size = 40, 
  variant = 'emblem',
  lightText = false 
}: UnitaLogoProps) {
  // Centered geometric rosette with white strokes and exact blue shades from the logo:
  // Center: (100, 100), R: 43
  const renderEmblem = (emblemSize: number) => (
    <svg
      viewBox="0 0 200 200"
      width={emblemSize}
      height={emblemSize}
      className="select-none shrink-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        {/* Left Circle - Deep Dark Navy */}
        <circle cx="62" cy="100" r="43" fill="#0A428F" />

        {/* Right Circle - Deep Dark Navy */}
        <circle cx="138" cy="100" r="43" fill="#0A428F" />

        {/* Top Left Circle - Light Pastel Blue */}
        <circle cx="81" cy="67" r="43" fill="#BAD7F3" />

        {/* Top Right Circle - Vivid Medium Blue */}
        <circle cx="119" cy="67" r="43" fill="#4E8FD9" />

        {/* Bottom Left Circle - Medium Royal Blue */}
        <circle cx="81" cy="133" r="43" fill="#3173C5" />

        {/* Bottom Right Circle - Soft Blue */}
        <circle cx="119" cy="133" r="43" fill="#A5CEF2" />

        {/* Central overlapping circle with opacity for blend effects */}
        <circle cx="100" cy="100" r="43" fill="#4B89D4" fillOpacity="0.4" />
      </g>
    </svg>
  );

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`} id="unita-logo-full">
        {/* Generous Rosette Emblem scaling up to show details */}
        <div className="mb-4">
          {renderEmblem(size * 1.5)}
        </div>

        {/* "UNITÀ" Brand Title Accent */}
        <h1 className={`text-5xl font-black font-sans tracking-[0.05em] leading-none uppercase ${
          lightText ? 'text-white' : 'text-slate-800'
        }`}>
          UNITÀ
        </h1>

        {/* "ANESTESIA" Dynamic Letter-spaced Sub-Title */}
        <h2 className="text-xl font-medium tracking-[0.34em] pl-[0.34em] font-sans mt-1.5 uppercase text-blue-500">
          ANESTESIA
        </h2>

        {/* "CUIDAR • ACOLHER • ENCANTAR" Slogan */}
        <div className={`text-[9px] font-semibold tracking-[0.15em] uppercase mt-2.5 flex items-center justify-center gap-1.5 ${
          lightText ? 'text-slate-300' : 'text-slate-500'
        }`}>
          <span>CUIDAR</span>
          <span className="text-[7px] text-blue-400">•</span>
          <span>ACOLHER</span>
          <span className="text-[7px] text-blue-400">•</span>
          <span>ENCANTAR</span>
        </div>
      </div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-3.5 ${className}`} id="unita-logo-horizontal">
        {renderEmblem(size)}
        <div className="flex flex-col leading-none">
          <span className={`text-xl font-extrabold tracking-[0.02em] font-sans ${
            lightText ? 'text-white' : 'text-slate-800'
          }`}>
            UNITÀ
          </span>
          <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-blue-500 mt-0.5">
            ANESTESIA
          </span>
        </div>
      </div>
    );
  }

  // Default clean emblem
  return (
    <div className={`inline-flex ${className}`} id="unita-logo-emblem">
      {renderEmblem(size)}
    </div>
  );
}

