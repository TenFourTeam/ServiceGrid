import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";

// Consolidated toast system using only Sonner
export function ConsolidatedToaster() {
  const { theme = "system" } = useTheme();

  return (
    <SonnerToaster
      theme={theme as any}
      className="toaster group"
      position="bottom-right"
      offset="16px"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      // Ensure toasts appear above floating widgets
      style={{
        zIndex: 50, // Above floating widgets (z-40)
      }}
      expand={true}
      visibleToasts={3}
    />
  );
}