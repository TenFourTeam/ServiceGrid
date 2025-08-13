import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSpotlight } from '@/hooks/useSpotlight';
import { cn } from '@/utils/cn';

interface AttentionRingProps {
  targetSelector: string;
  pulse?: boolean;
  color?: 'primary' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AttentionRing({ 
  targetSelector, 
  pulse = true,
  color = 'primary',
  size = 'md',
  className 
}: AttentionRingProps) {
  const { target } = useSpotlight(targetSelector);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !target?.visible) return null;

  const padding = {
    sm: 4,
    md: 8, 
    lg: 12
  }[size];

  const colorClasses = {
    primary: 'border-primary shadow-primary/25',
    success: 'border-green-500 shadow-green-500/25',
    warning: 'border-yellow-500 shadow-yellow-500/25'
  }[color];

  return createPortal(
    <div
      className={cn(
        "fixed pointer-events-none z-[99] border-2 rounded-lg transition-all duration-300",
        colorClasses,
        pulse && "animate-pulse",
        "shadow-lg",
        className
      )}
      style={{
        left: target.x - target.width / 2 - padding,
        top: target.y - target.height / 2 - padding,
        width: target.width + padding * 2,
        height: target.height + padding * 2,
      }}
    />,
    document.body
  );
}