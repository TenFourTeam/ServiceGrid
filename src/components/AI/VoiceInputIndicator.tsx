import { cn } from '@/lib/utils';

interface VoiceInputIndicatorProps {
  isListening: boolean;
  className?: string;
}

export function VoiceInputIndicator({ isListening, className }: VoiceInputIndicatorProps) {
  if (!isListening) return null;

  return (
    <div className={cn("flex items-center gap-2 text-destructive", className)}>
      {/* Animated sound wave bars */}
      <div className="flex items-center gap-0.5 h-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="w-0.5 bg-destructive rounded-full animate-pulse"
            style={{
              height: `${8 + Math.random() * 8}px`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.5s',
            }}
          />
        ))}
      </div>
      <span className="text-xs font-medium">Listening...</span>
    </div>
  );
}
