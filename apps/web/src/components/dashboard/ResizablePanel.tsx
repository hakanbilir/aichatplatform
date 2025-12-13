import React, { useState, useRef, useEffect } from 'react';
import { Box } from '@mui/material';

// Split-pane component for resizable layouts
// Yeniden boyutlandırılabilir düzenler için bölünmüş panel bileşeni

export interface ResizablePanelProps {
  // Left panel content / Sol panel içeriği
  leftPanel: React.ReactNode;
  // Right panel content / Sağ panel içeriği
  rightPanel: React.ReactNode;
  // Initial left panel width (percentage) / Başlangıç sol panel genişliği (yüzde)
  initialLeftWidth?: number;
  // Minimum left panel width (percentage) / Minimum sol panel genişliği (yüzde)
  minLeftWidth?: number;
  // Maximum left panel width (percentage) / Maksimum sol panel genişliği (yüzde)
  maxLeftWidth?: number;
  // Resizer width (pixels) / Yeniden boyutlandırıcı genişliği (piksel)
  resizerWidth?: number;
  // Vertical layout / Dikey düzen
  vertical?: boolean;
  // Custom sx props / Özel sx prop'ları
  sx?: object;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  leftPanel,
  rightPanel,
  initialLeftWidth = 50,
  minLeftWidth = 20,
  maxLeftWidth = 80,
  resizerWidth = 4,
  vertical = false,
  sx,
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let newWidth: number;

      if (vertical) {
        const totalHeight = containerRect.height;
        const mouseY = e.clientY - containerRect.top;
        newWidth = (mouseY / totalHeight) * 100;
      } else {
        const totalWidth = containerRect.width;
        const mouseX = e.clientX - containerRect.left;
        newWidth = (mouseX / totalWidth) * 100;
      }

      // Clamp to min/max / Min/max'a sıkıştır
      newWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newWidth));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = vertical ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, minLeftWidth, maxLeftWidth, vertical]);

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        width: '100%',
        height: '100%',
        position: 'relative',
        ...sx,
      }}
    >
      {/* Left panel / Sol panel */}
      <Box
        sx={{
          width: vertical ? '100%' : `${leftWidth}%`,
          height: vertical ? `${leftWidth}%` : '100%',
          overflow: 'auto',
          transition: isResizing ? 'none' : 'width 200ms ease, height 200ms ease',
        }}
      >
        {leftPanel}
      </Box>

      {/* Resizer / Yeniden boyutlandırıcı */}
      <Box
        ref={resizerRef}
        onMouseDown={handleMouseDown}
        sx={{
          width: vertical ? '100%' : resizerWidth,
          height: vertical ? resizerWidth : '100%',
          backgroundColor: 'transparent',
          cursor: vertical ? 'row-resize' : 'col-resize',
          position: 'relative',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.1)',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: vertical ? '50%' : 0,
            left: vertical ? 0 : '50%',
            transform: vertical ? 'translateY(-50%)' : 'translateX(-50%)',
            width: vertical ? '40px' : '2px',
            height: vertical ? '2px' : '40px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '2px',
            transition: 'background-color 200ms ease',
          },
          '&:hover::before': {
            backgroundColor: 'rgba(255,255,255,0.4)',
          },
        }}
      />

      {/* Right panel / Sağ panel */}
      <Box
        sx={{
          width: vertical ? '100%' : `${100 - leftWidth}%`,
          height: vertical ? `${100 - leftWidth}%` : '100%',
          overflow: 'auto',
          transition: isResizing ? 'none' : 'width 200ms ease, height 200ms ease',
        }}
      >
        {rightPanel}
      </Box>
    </Box>
  );
};

