import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
  FileText,
  Receipt,
  Users,
  Wrench,
  User as UserIcon,
  Settings as SettingsIcon,
  LifeBuoy,
  LogOut,
} from "lucide-react";

import BusinessLogo from "@/components/BusinessLogo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useClerk, useUser } from "@clerk/clerk-react";
import { usePreloadImage } from "@/hooks/usePreloadImage";

const items = [
  { title: "Calendar", url: "/calendar", icon: CalendarIcon },
  { title: "Work Orders", url: "/work-orders", icon: Wrench },
  { title: "Quotes", url: "/quotes", icon: FileText },
  { title: "Invoices", url: "/invoices", icon: Receipt },
  { title: "Customers", url: "/customers", icon: Users },
];

export default function AppSidebar() {
  const { business } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useUser();
  
  // Warm the cache for the logo ASAP
  usePreloadImage(business.lightLogoUrl || business.logoUrl);
  
  const isActivePath = (path: string) => location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="grid grid-cols-[32px_1fr_auto] items-center pr-2 py-1.5">
          {/* Logo column - fixed width so position stays constant in both states */}
          <div className="relative h-8 w-8 ml-0 flex items-center justify-center">
            <BusinessLogo
              size={26}
              src={business.lightLogoUrl || business.logoUrl}
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

      <SidebarFooter>
        <div className="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center gap-2 rounded-md border px-2 py-2 bg-background hover:bg-muted transition group-data-[collapsible=icon]:justify-center"
                aria-label="User menu"
              >
                <UserIcon className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:hidden transition-all">{(user?.unsafeMetadata as any)?.displayName || user?.fullName || "Account"}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={8} alignOffset={-4} className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "Account"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <SettingsIcon className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/legal')}>
                <FileText className="mr-2 h-4 w-4" /> Terms & Services
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>

    </Sidebar>
  );
}
