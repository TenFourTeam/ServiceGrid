import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { RequireRole } from "@/components/Auth/RequireRole";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useUserBusinesses } from "@/hooks/useUserBusinesses";
import { useBusinessSwitcher } from "@/hooks/useBusinessSwitcher";
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
  Shield,
  Clock,
} from "lucide-react";

import BusinessLogo from "@/components/BusinessLogo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useClerk, useUser } from "@clerk/clerk-react";
import { usePreloadImage } from "@/hooks/usePreloadImage";
import { useProfile } from "@/queries/useProfile";
import { SignOutButton } from "@/components/Auth/SignOutButton";

const allItems = [
  { title: "Calendar", url: "/calendar", icon: CalendarIcon, workerAccess: true },
  { title: "Timesheet", url: "/timesheet", icon: Clock, workerAccess: true },
  { title: "Work Orders", url: "/work-orders", icon: Wrench, workerAccess: false },
  { title: "Quotes", url: "/quotes", icon: FileText, workerAccess: false },
  { title: "Invoices", url: "/invoices", icon: Receipt, workerAccess: false },
  { title: "Customers", url: "/customers", icon: Users, workerAccess: false },
  { title: "Team", url: "/team", icon: Shield, workerAccess: false },
];

export default function AppSidebar() {
  const { businessId, role, canManage, business, businessLogoUrl, businessLightLogoUrl, businessName } = useBusinessContext();
  const { data: userBusinesses } = useUserBusinesses();
  const { switchBusiness, isSwitching } = useBusinessSwitcher();
  
  // Filter items based on user role
  const visibleItems = allItems.filter(item => 
    role === 'owner' || item.workerAccess
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useUser();
  const { data: profile } = useProfile();
  
  // Find the business where the user is an owner
  const ownedBusiness = userBusinesses?.find(b => b.role === 'owner');
  const isInOwnBusiness = businessId === ownedBusiness?.id;
  
  // Always show actual business name instead of "My Business"
  const displayBusinessName = businessName;
  
  // Warm the cache for the logo ASAP
  usePreloadImage(businessLightLogoUrl || businessLogoUrl);
  
  const isActivePath = (path: string) => location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="grid grid-cols-[32px_1fr_auto] items-center pr-2 py-1.5">
          {/* Logo column - fixed width so position stays constant in both states */}
          <div className="relative h-8 w-8 ml-0 flex items-center justify-center">
            <BusinessLogo
              size={26}
              src={businessLightLogoUrl || businessLogoUrl}
              alt={`${displayBusinessName || "Business"} logo`}
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
            <div className="font-semibold truncate">{displayBusinessName || "Business"}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">Contractor Console</span>
              {role && (
                <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-xs">
                  {role === 'owner' ? '👑' : '👥'} {role}
                </span>
              )}
            </div>
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
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
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
        <div className="p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center gap-2 rounded-md hover:border px-2 py-2 hover:bg-muted transition group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-8"
                aria-label="User menu"
              >
                <UserIcon className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden transition-all">{profile?.profile?.fullName || user?.fullName || "Account"}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={8} alignOffset={-4} className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "Account"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {!isInOwnBusiness && ownedBusiness && (
                <>
                  <DropdownMenuItem 
                    onClick={() => switchBusiness.mutate(ownedBusiness.id)}
                    disabled={isSwitching}
                  >
                    <Shield className="mr-2 h-4 w-4" /> 
                    My Business ({ownedBusiness.name})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <SettingsIcon className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/legal')}>
                <FileText className="mr-2 h-4 w-4" /> Terms & Services
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1">
                <SignOutButton 
                  variant="ghost" 
                  size="sm"
                  showConfirmation={false}
                  onSignOut={() => {
                    sessionStorage.setItem('just-logged-out', 'true');
                  }}
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>

    </Sidebar>
  );
}
