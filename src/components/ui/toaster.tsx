import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";
import { useEffect } from "react";

// Consolidated toast system using only Sonner
export function ConsolidatedToaster() {
  const { theme = "system" } = useTheme();

  useEffect(() => {
    // Monitor toast count and update CSS variable for widget positioning
    const updateToastOffset = () => {
      const toasts = document.querySelectorAll('[data-sonner-toast]');
      const widget = document.querySelector('[data-widget="floating-setup"]') as HTMLElement;
      
      if (widget && toasts.length > 0) {
        // Calculate total height of toasts + spacing
        const toastHeight = toasts.length * 80; // Approximate height per toast
        const spacing = 16; // Bottom spacing
        widget.style.setProperty('--toast-offset', `-${toastHeight + spacing}px`);
      } else if (widget) {
        widget.style.setProperty('--toast-offset', '0px');
      }
    };

    // Update immediately and then observe changes
    updateToastOffset();
    
    const observer = new MutationObserver(updateToastOffset);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['data-sonner-toast']
    });

    return () => observer.disconnect();
  }, []);

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
      // Ensure toasts appear above floating widgets and modals
      style={{
        zIndex: 110, // Above modals and drawers
      }}
      expand={true}
      visibleToasts={3}
    />
  );
}