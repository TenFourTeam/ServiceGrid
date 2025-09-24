import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { RequireRole } from "@/components/Auth/RequireRole";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useOrganizationList } from "@clerk/clerk-react";
import { useBusinessSwitcher } from "@/hooks/useBusinessSwitcher";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarSeparator, SidebarTrigger, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Calendar as CalendarIcon, FileText, Receipt, Users, Wrench, User as UserIcon, Settings as SettingsIcon, LifeBuoy, LogOut, Shield, Clock, UserPlus, ClipboardList } from "lucide-react";
import BusinessLogo from "@/components/BusinessLogo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useClerk, useUser } from "@clerk/clerk-react";
import { usePreloadImage } from "@/hooks/usePreloadImage";
import { useProfile } from "@/queries/useProfile";
import { SignOutButton } from "@/components/Auth/SignOutButton";
import { useLanguage } from "@/contexts/LanguageContext";
const getCoreNavItems = (t: (key: string) => string) => [{
  title: t('navigation.calendar'),
  url: "/calendar",
  icon: CalendarIcon,
  workerAccess: true
}, {
  title: t('navigation.timesheet'),
  url: "/timesheet",
  icon: Clock,
  workerAccess: true
}, {
  title: t('navigation.team'),
  url: "/team",
  icon: Shield,
  workerAccess: false
}];

const getBusinessNavItems = (t: (key: string) => string) => [{
  title: t('navigation.requests'),
  url: "/requests",
  icon: ClipboardList,
  workerAccess: false
}, {
  title: t('navigation.customers'),
  url: "/customers",
  icon: Users,
  workerAccess: false
}, {
  title: t('navigation.quotes'),
  url: "/quotes",
  icon: FileText,
  workerAccess: false
}, {
  title: t('navigation.workOrders'),
  url: "/work-orders",
  icon: Wrench,
  workerAccess: false
}, {
  title: t('navigation.invoices'),
  url: "/invoices",
  icon: Receipt,
  workerAccess: false
}];
export default function AppSidebar() {
  const {
    businessId,
    role,
    canManage,
    business,
    businessLogoUrl,
    businessLightLogoUrl,
    businessName
  } = useBusinessContext();
  const { userMemberships } = useOrganizationList();
  const {
    switchBusiness,
    isSwitching
  } = useBusinessSwitcher();

  const location = useLocation();
  const navigate = useNavigate();
  const {
    signOut
  } = useClerk();
  const {
    state
  } = useSidebar();
  const collapsed = state === "collapsed";
  const {
    user
  } = useUser();
  const {
    data: profile
  } = useProfile();
  const { t } = useLanguage();

  // Get translated nav items and filter based on user role
  const coreItems = getCoreNavItems(t);
  const businessItems = getBusinessNavItems(t);
  const visibleCoreItems = coreItems.filter(item => role === 'owner' || item.workerAccess);
  const visibleBusinessItems = businessItems.filter(item => role === 'owner' || item.workerAccess);

  // Remove the business ownership check since we're using Clerk organizations
  // Always show actual business name instead of "My Business"
  const displayBusinessName = businessName;

  // Warm the cache for the logo ASAP
  usePreloadImage((businessLightLogoUrl || businessLogoUrl) as string);
  const isActivePath = (path: string) => location.pathname.startsWith(path);
  return <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="grid grid-cols-[32px_1fr_auto] items-center pr-2 py-1.5">
          {/* Logo column - fixed width so position stays constant in both states */}
          <div className="relative h-8 w-8 ml-0 flex items-center justify-center">
            <BusinessLogo size={26} src={(businessLightLogoUrl || businessLogoUrl) as string} alt={`${displayBusinessName || "Business"} logo`} />
            {collapsed && <SidebarTrigger aria-label="Expand sidebar" className="absolute inset-0 h-8 w-8 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full" />}
          </div>

          {/* Title column - hidden when collapsed */}
          <div className="min-w-0 pl-1 group-data-[collapsible=icon]:hidden">
            <div className="font-semibold truncate">{displayBusinessName || "Business"}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">{t('sidebar.subtitle')}</span>
            </div>
          </div>

          {/* Trigger column - only show when expanded */}
          {!collapsed && <div className="justify-self-end">
              <SidebarTrigger aria-label="Toggle sidebar" />
            </div>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleCoreItems.map(item => <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActivePath(item.url)}>
                    <NavLink to={item.url} end className={({
                  isActive
                }) => isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleBusinessItems.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleBusinessItems.map(item => <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActivePath(item.url)}>
                        <NavLink to={item.url} end className={({
                      isActive
                    }) => isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"}>
                          <item.icon className="mr-2 h-4 w-4" />
                          <span className="truncate">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="w-full flex items-center gap-2 rounded-md hover:border px-2 py-2 hover:bg-muted transition group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-8" aria-label="User menu">
                <UserIcon className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden transition-all">{profile?.profile?.fullName || user?.fullName || "Account"}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={8} alignOffset={-4} className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "Account"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                {t('sidebar.settings')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <SettingsIcon className="mr-2 h-4 w-4" /> {t('navigation.settings')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/legal')}>
                <FileText className="mr-2 h-4 w-4" /> {t('sidebar.termsServices')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/referral')}>
                <UserPlus className="mr-2 h-4 w-4" /> {t('sidebar.referFriend')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1">
                <SignOutButton variant="ghost" size="sm" showConfirmation={false} onSignOut={() => {
                sessionStorage.setItem('just-logged-out', 'true');
              }} />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>

    </Sidebar>;
}