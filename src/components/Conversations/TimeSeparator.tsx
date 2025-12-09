interface TimeSeparatorProps {
  label: string;
}

export function TimeSeparator({ label }: TimeSeparatorProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground px-2">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
