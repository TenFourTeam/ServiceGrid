import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 text-foreground hover:text-foreground"
      aria-label={language === 'en' ? 'Switch to Spanish' : 'Cambiar a inglés'}
    >
      <Globe className="h-4 w-4" aria-hidden="true" />
      <span className="font-medium">
        {language === 'en' ? 'EN' : 'ES'}
      </span>
    </Button>
  );
}
