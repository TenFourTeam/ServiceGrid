import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        variant="default"
        size="icon"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`bg-brand-600 text-white hover:bg-brand-700 transition-opacity ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}` }
      >
        <ArrowUp />
      </Button>
    </div>
  );
}
