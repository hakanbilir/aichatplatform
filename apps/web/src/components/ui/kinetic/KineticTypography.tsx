import React, { ReactNode, useEffect, useRef } from 'react';

interface KineticTypographyProps {
  children: ReactNode;
  variant?: 'h1' | 'h2' | 'h3';
  className?: string;
}

export const KineticTypography: React.FC<KineticTypographyProps> = ({ children, variant = 'h1', className = '' }) => {
  const Tag = variant;
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const scrollY = window.scrollY;
        const weight = 400 + Math.min(scrollY / 5, 300); // 400 to 700
        ref.current.style.setProperty('--weight', weight.toString());
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseEnter = () => {
    if (ref.current) ref.current.style.setProperty('--weight', '700');
  };

  const handleMouseLeave = () => {
     if (ref.current) {
        const scrollY = window.scrollY;
        const weight = 400 + Math.min(scrollY / 5, 300);
        ref.current.style.setProperty('--weight', weight.toString());
     }
  };

  return (
    <Tag
      ref={ref}
      className={`kinetic-text ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </Tag>
  );
};
