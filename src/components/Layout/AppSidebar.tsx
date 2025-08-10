import { NavLink, useLocation } from "react-router-dom";
import { useStore } from "@/store/useAppStore";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Calendar as CalendarIcon,
  ClipboardList,
  FileText,
  Receipt,
  Users,
  Settings as SettingsIcon,
} from "lucide-react";

const items = [
  { title: "Calendar", url: "/calendar", icon: CalendarIcon },
  { title: "Work Orders", url: "/work-orders", icon: ClipboardList },
  { title: "Quotes", url: "/quotes", icon: FileText },
  { title: "Invoices", url: "/invoices", icon: Receipt },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
];

export default function AppSidebar() {
  const { business } = useStore();
  const location = useLocation();
  

  const isActivePath = (path: string) => location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary" aria-hidden />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="font-semibold truncate">{business.name || "Business"}</div>
              <div className="text-xs text-muted-foreground truncate">Contractor Console</div>
            </div>
          </div>
          <SidebarTrigger aria-label="Toggle sidebar" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActivePath(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted/50"
                      }
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="text-xs text-muted-foreground px-2 py-1.5">v0 Prototype</div>
      </SidebarFooter>
    </Sidebar>
  );
}
