import React, { ReactNode, useRef, MouseEvent, ButtonHTMLAttributes } from 'react';

interface SpecularButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  'data-ai-action'?: string;
}

export const SpecularButton: React.FC<SpecularButtonProps> = ({ children, className = '', ...props }) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      btnRef.current.style.setProperty('--x', `${x}px`);
      btnRef.current.style.setProperty('--y', `${y}px`);
    }
    props.onMouseMove?.(e);
  };

  return (
    <button
      ref={btnRef}
      className={`specular-btn ${className}`}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <span className="specular-btn-content">{children}</span>
    </button>
  );
};
