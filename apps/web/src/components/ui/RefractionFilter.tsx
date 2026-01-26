import React from 'react';

export const RefractionFilter: React.FC = () => (
  <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none', opacity: 0 }}>
    <defs>
      <filter id="refraction">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="warp" />
        <feDisplacementMap xChannelSelector="R" yChannelSelector="G" scale="10" in="SourceGraphic" in2="warp" />
      </filter>
    </defs>
  </svg>
);
