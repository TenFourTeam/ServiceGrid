import { NavLink } from "react-router-dom";
import { Calendar as CalendarIcon, Clock, Users, Settings } from "lucide-react";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useLanguage } from "@/contexts/LanguageContext";

const getNavItems = (t: (key: string) => string) => [
  { title: t('navigation.calendar'), url: "/calendar", icon: CalendarIcon, workerAccess: true },
  { title: t('navigation.timesheet'), url: "/timesheet", icon: Clock, workerAccess: true },
  { title: t('navigation.team'), url: "/team", icon: Users, workerAccess: false },
  { title: t('navigation.settings'), url: "/settings", icon: Settings, workerAccess: true },
];

export default function MobileNavigation() {
  const { role } = useBusinessContext();
  const { t } = useLanguage();
  
  const navItems = getNavItems(t);
  
  // Filter items based on user role
  const visibleItems = navItems.filter(item => role === 'owner' || item.workerAccess);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around px-2 py-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-0 flex-1 p-2 rounded-lg transition-colors ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`
            }
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium truncate">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}