import React, { ReactNode } from 'react';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className = '' }) => {
  return (
    <div className={`bento-grid ${className}`}>
      {children}
    </div>
  );
};
