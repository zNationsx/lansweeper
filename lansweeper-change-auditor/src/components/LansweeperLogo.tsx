import React from 'react';

interface LansweeperLogoProps {
  className?: string;
  isDarkBackground?: boolean;
}

export default function LansweeperLogo({ className = "h-8", isDarkBackground = false }: LansweeperLogoProps) {
  return (
    <div className={`flex items-center font-sans select-none ${className}`}>
      {/* Branding Text only - no icons, no dots, perfectly aligned */}
      <div className="flex items-baseline tracking-tight font-extrabold text-lg sm:text-xl">
        <span className={isDarkBackground ? 'text-white' : 'text-slate-950'}>
          Lan
        </span>
        <span className="text-orange-500">
          sweeper
        </span>
      </div>
    </div>
  );
}
