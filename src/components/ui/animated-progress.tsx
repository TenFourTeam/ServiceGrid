import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AnimatedProgressProps {
  value: number;
  className?: string;
  duration?: number;
}

/**
 * Animated Progress component that smoothly animates value changes
 */
export function AnimatedProgress({ 
  value, 
  className,
  duration = 300 
}: AnimatedProgressProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number>();
  const previousValueRef = useRef(0);
  
  useEffect(() => {
    const start = previousValueRef.current;
    const diff = value - start;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = start + diff * eased;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValueRef.current = value;
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);
  
  return <Progress value={displayValue} className={className} />;
}

interface AnimatedNumberProps {
  value: number;
  className?: string;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

/**
 * Animated Number component that counts up/down to target value
 */
export function AnimatedNumber({ 
  value, 
  className,
  duration = 300,
  suffix = '',
  prefix = ''
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number>();
  const previousValueRef = useRef(0);
  
  useEffect(() => {
    const start = previousValueRef.current;
    const diff = value - start;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(start + diff * eased);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValueRef.current = value;
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);
  
  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}{displayValue}{suffix}
    </span>
  );
}
