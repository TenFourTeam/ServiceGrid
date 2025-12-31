import * as React from 'react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { feedback } from '@/utils/feedback';

interface PressableProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onPress?: () => void;
  haptic?: boolean;
  className?: string;
  asChild?: boolean;
}

/**
 * Pressable component with instant visual feedback
 * Provides scale-down effect on press for tactile feel
 */
export function Pressable({ 
  children, 
  className, 
  onPress, 
  haptic = true,
  onClick,
  ...props 
}: PressableProps) {
  const [isPressed, setIsPressed] = useState(false);
  
  const handleMouseDown = useCallback(() => {
    setIsPressed(true);
    if (haptic) feedback.tap();
  }, [haptic]);
  
  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setIsPressed(false);
  }, []);
  
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    onPress?.();
    onClick?.(e);
  }, [onPress, onClick]);
  
  return (
    <button
      className={cn(
        "transition-transform duration-100 ease-out select-none",
        isPressed && "scale-[0.97]",
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Hook for adding pressable behavior to any element
 */
export function usePressable(haptic = true) {
  const [isPressed, setIsPressed] = useState(false);
  
  const pressProps = {
    onMouseDown: () => {
      setIsPressed(true);
      if (haptic) feedback.tap();
    },
    onMouseUp: () => setIsPressed(false),
    onMouseLeave: () => setIsPressed(false),
    onTouchStart: () => {
      setIsPressed(true);
      if (haptic) feedback.tap();
    },
    onTouchEnd: () => setIsPressed(false),
  };
  
  const pressClass = isPressed ? 'scale-[0.97]' : '';
  
  return { isPressed, pressProps, pressClass };
}
