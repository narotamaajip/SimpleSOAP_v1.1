import React from 'react';

/**
 * LogoIcon: Renders the SimpleSOAP smartphone + medical cross + data lines mark.
 * Scalable via className (e.g., "w-6 h-6", "h-8 w-auto", etc.)
 */
export function LogoIcon({ className = "w-6 h-6", ...props }) {
  return (
    <svg
      viewBox="120 20 272 430"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      {/* Smartphone Frame Silhouette */}
      <rect
        x="144"
        y="40"
        width="224"
        height="400"
        rx="36"
        fill="none"
        stroke="#10B981"
        strokeWidth="24"
      />

      {/* Speaker/Sensor Notch */}
      <line
        x1="226"
        y1="68"
        x2="286"
        y2="68"
        stroke="#10B981"
        strokeWidth="12"
        strokeLinecap="round"
      />

      {/* Sharp-edged Medical Cross (+) in medium-dark emerald */}
      <path
        d="M256 164v100M206 214h100"
        stroke="#059669"
        strokeWidth="44"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* Supporting color accents (3 Data Lines) */}
      <line
        x1="190"
        y1="310"
        x2="322"
        y2="310"
        stroke="#4B5563"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <line
        x1="190"
        y1="345"
        x2="270"
        y2="345"
        stroke="#4B5563"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <line
        x1="190"
        y1="380"
        x2="300"
        y2="380"
        stroke="#4B5563"
        strokeWidth="14"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * LogoBrand: Icon + "SimpleSOAP" text.
 */
export function LogoBrand({ iconClassName = "w-6 h-6", textClassName = "text-emerald-800 font-extrabold text-lg tracking-tight", className = "flex items-center gap-2" }) {
  return (
    <div className={className}>
      <LogoIcon className={iconClassName} />
      <span className={textClassName}>SimpleSOAP</span>
    </div>
  );
}

export default LogoIcon;
