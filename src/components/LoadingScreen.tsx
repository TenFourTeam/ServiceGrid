interface LoadingScreenProps {
  full?: boolean;
  label?: string;
}

export default function LoadingScreen({ full = false, label = 'Loading' }: LoadingScreenProps) {
  return (
    <div className={full ? "min-h-screen grid place-items-center bg-background" : "min-h-[50vh] grid place-items-center"}>
      <div className="flex items-center gap-3 text-muted-foreground">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
          role="status"
          aria-label="Loading"
        />
        <span className="text-sm">{label}…</span>
      </div>
    </div>
  );
}
