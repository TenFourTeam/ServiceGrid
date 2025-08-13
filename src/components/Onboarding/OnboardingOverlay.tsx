import React from 'react';
import { createPortal } from 'react-dom';
import { useSpotlight } from '@/hooks/useSpotlight';
import { cn } from '@/utils/cn';

interface OnboardingOverlayProps {
  targetSelector?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function OnboardingOverlay({ 
  targetSelector, 
  children, 
  onClose,
  className 
}: OnboardingOverlayProps) {
  const { target } = useSpotlight(targetSelector);

  if (!target?.visible) return null;

  const overlayStyle = target ? {
    '--spotlight-x': `${target.x}px`,
    '--spotlight-y': `${target.y}px`,
    '--spotlight-w': `${target.width + 16}px`,
    '--spotlight-h': `${target.height + 16}px`,
  } as React.CSSProperties : {};

  return createPortal(
    <>
      {/* Overlay with spotlight hole */}
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-black/60 transition-opacity duration-300",
          "spotlight-overlay",
          className
        )}
        style={overlayStyle}
        onClick={onClose}
      />
      
      {/* Content positioned near spotlight */}
      {children && (
        <div 
          className="fixed z-[101] pointer-events-none"
          style={{
            left: target ? Math.min(target.x - target.width / 2, window.innerWidth - 320) : '50%',
            top: target ? Math.min(target.y + target.height / 2 + 24, window.innerHeight - 200) : '50%',
            transform: target ? 'none' : 'translate(-50%, -50%)'
          }}
        >
          <div className="pointer-events-auto">
            {children}
          </div>
        </div>
      )}
    </>,
    document.body
  );
}