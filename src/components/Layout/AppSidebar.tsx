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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Calendar as CalendarIcon,
  ClipboardList,
  FileText,
  Receipt,
  Users,
  Settings as SettingsIcon,
} from "lucide-react";

import BusinessLogo from "@/components/BusinessLogo";

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
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  
  const isActivePath = (path: string) => location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="grid grid-cols-[32px_1fr_auto] items-center pr-2 py-1.5">
          {/* Logo column - fixed width so position stays constant in both states */}
          <div className="relative h-8 w-8 ml-0 flex items-center justify-center">
            <BusinessLogo
              size={24}
              src={business.logoUrl}
              alt={`${business.name || "Business"} logo`}
            />
            {collapsed && (
              <SidebarTrigger
                aria-label="Expand sidebar"
                className="absolute inset-0 h-8 w-8 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full"
              />
            )}
          </div>

          {/* Title column - hidden when collapsed */}
          <div className="min-w-0 pl-1 group-data-[collapsible=icon]:hidden">
            <div className="font-semibold truncate">{business.name || "Business"}</div>
            <div className="text-xs text-muted-foreground truncate">Contractor Console</div>
          </div>

          {/* Trigger column - only show when expanded */}
          {!collapsed && (
            <div className="justify-self-end">
              <SidebarTrigger aria-label="Toggle sidebar" />
            </div>
          )}
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

    </Sidebar>
  );
}
