import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AIChatInterface } from "./AIChatInterface";

export function AskAIButton() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const getContextMessage = () => {
    const path = location.pathname;
    
    if (path.startsWith('/calendar')) {
      return "Show me gaps in this week's schedule";
    } else if (path.startsWith('/work-orders') || path.startsWith('/jobs')) {
      return "Schedule all pending jobs";
    } else if (path.startsWith('/team')) {
      return "Who's available tomorrow?";
    } else if (path.startsWith('/analytics')) {
      return "What insights do you have about my business?";
    }
    
    return "How can I help you today?";
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 z-50"
        size="icon"
      >
        <Sparkles className="w-6 h-6" />
      </Button>

      <AIChatInterface
        open={open}
        onOpenChange={setOpen}
        initialMessage={getContextMessage()}
        context={{ currentPage: location.pathname }}
      />
    </>
  );
}
