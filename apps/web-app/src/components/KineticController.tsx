'use client';

import React, { useEffect } from 'react';

import { useEcoMode } from '../hooks/useEcoMode';

export const KineticController: React.FC = () => {
  const { isEcoMode } = useEcoMode();

  useEffect(() => {
    if (isEcoMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = Math.min(scrollY / (docHeight || 1), 1);

      document.body.style.setProperty('--scroll-y', `${scrollY}`);
      document.body.style.setProperty('--scroll-progress', `${scrollProgress}`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isEcoMode]);

  return null;
};
