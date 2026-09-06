import React from "react";

interface DealFlowLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export function DealFlowLogo({ size = 32, className, ...props }: DealFlowLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id="df-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#241c17" />
          <stop offset="100%" stopColor="#120e0b" />
        </linearGradient>
        <linearGradient id="df-stroke" x1="18" y1="16" x2="52" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#edd5c3" />
          <stop offset="100%" stopColor="#ae8870" />
        </linearGradient>
        <linearGradient id="df-inner-flow" x1="20" y1="32" x2="42" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#eed5c3" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id="df-glow" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Squircle container with glass highlight */}
      <rect width="64" height="64" rx="18" fill="url(#df-bg)" />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="17.25"
        stroke="rgba(255, 255, 255, 0.16)"
        strokeWidth="1.5"
      />
      <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#df-glow)" />

      {/* Modern architectural 'D' with continuous Flow geometry */}
      {/* Left pillar */}
      <path
        d="M20 16V48"
        stroke="url(#df-stroke)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* Sweeping D bowl */}
      <path
        d="M20 17H34.5C43.5 17 49 22.8 49 32C49 41.2 43.5 47 34.5 47H20"
        stroke="url(#df-stroke)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Internal Flow beam connecting the deal stages */}
      <path
        d="M20 32H35"
        stroke="url(#df-inner-flow)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Agreement verification nexus node */}
      <circle cx="35" cy="32" r="3.75" fill="#ffffff" />
      <circle cx="35" cy="32" r="1.75" fill="#241c17" />
    </svg>
  );
}
