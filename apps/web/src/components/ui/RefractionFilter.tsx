import React from 'react';

export const RefractionFilter: React.FC = () => (
  <svg width="0" height="0" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
    <filter id="refraction">
      <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </svg>
);
