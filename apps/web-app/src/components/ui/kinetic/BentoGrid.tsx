'use client';

import React from 'react';

export const BentoGrid: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={`bento-grid ${className || ''}`} {...props}>
      {children}
    </div>
  );
};
