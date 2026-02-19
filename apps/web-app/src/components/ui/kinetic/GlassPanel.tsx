'use client';

import React from 'react';

import { useEcoMode } from '../../../hooks/useEcoMode';
import { useSpecular } from '../../../hooks/useSpecular';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  refractive?: boolean;
  specular?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className,
  refractive,
  specular,
  style,
  onMouseMove,
  ...props
}) => {
  const { isEcoMode } = useEcoMode();
  const { ref: specularRef, handleMouseMove: handleSpecularMove } = useSpecular<HTMLDivElement>();

  const isRefractive = (refractive ?? true) && !isEcoMode;
  const isSpecular = (specular ?? false) && !isEcoMode;

  const handleMouseMoveCombined = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSpecular) {
        handleSpecularMove(e);
    }
    if (onMouseMove) {
        onMouseMove(e);
    }
  };

  return (
    <div
      ref={isSpecular ? specularRef : undefined}
      className={`${isSpecular ? 'specular-button' : ''} ${className || ''}`}
      onMouseMove={handleMouseMoveCombined}
      style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
      {...props}
    >
      <div
        className="kinetic-glass-panel"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          filter: isRefractive ? 'url(#refraction)' : undefined,
          pointerEvents: 'none',
          width: '100%',
          height: '100%',
          borderRadius: 'inherit'
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </div>
    </div>
  );
};
