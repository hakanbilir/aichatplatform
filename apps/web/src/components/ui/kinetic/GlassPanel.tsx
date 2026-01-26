import React, { ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, className = '' }) => {
  return (
    <div className={`glass-panel ${className}`}>
      <div className="glass-panel-content">
        {children}
      </div>
    </div>
  );
};
