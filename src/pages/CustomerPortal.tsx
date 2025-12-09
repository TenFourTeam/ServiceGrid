import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Calendar, 
  LogOut,
  User,
  Building2,
  ChevronRight
} from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { CustomerAuthProvider } from '@/components/CustomerPortal/CustomerAuthProvider';
import { CustomerProtectedRoute } from '@/components/CustomerPortal/CustomerProtectedRoute';

function CustomerPortalContent() {
  const navigate = useNavigate();
  const { customerDetails, logout, authMethod } = useCustomerAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/customer-login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const dashboardItems = [
    {
      icon: LayoutDashboard,
      title: 'Dashboard',
      description: 'View your project overview and status',
      href: '/portal',
      badge: null,
    },
    {
      icon: FileText,
      title: 'Documents',
      description: 'Quotes, invoices, and contracts',
      href: '/portal/documents',
      badge: 'Coming Soon',
    },
    {
      icon: Calendar,
      title: 'Schedule',
      description: 'View upcoming appointments',
      href: '/portal/schedule',
      badge: 'Coming Soon',
    },
    {
      icon: MessageSquare,
      title: 'Messages',
      description: 'Communicate with your contractor',
      href: '/portal/messages',
      badge: 'Coming Soon',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {customerDetails?.business?.logo_url ? (
              <img 
                src={customerDetails.business.logo_url} 
                alt={customerDetails.business.name}
                className="h-8 w-8 rounded-md object-contain"
              />
            ) : (
              <Building2 className="h-8 w-8 text-primary" />
            )}
            <div>
              <h1 className="font-semibold">
                {customerDetails?.business?.name || 'Customer Portal'}
              </h1>
              <p className="text-xs text-muted-foreground">Customer Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {customerDetails?.name ? getInitials(customerDetails.name) : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="text-sm font-medium">{customerDetails?.name}</p>
                <p className="text-xs text-muted-foreground">{customerDetails?.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Welcome, {customerDetails?.name?.split(' ')[0] || 'Customer'}!
          </h2>
          <p className="text-muted-foreground">
            Manage your projects and communicate with{' '}
            <span className="font-medium text-foreground">
              {customerDetails?.business?.name || 'your contractor'}
            </span>
          </p>
          {authMethod && (
            <Badge variant="secondary" className="mt-2">
              Signed in via {authMethod === 'magic_link' ? 'Magic Link' : authMethod === 'clerk' ? 'Google' : 'Password'}
            </Badge>
          )}
        </div>

        {/* Dashboard Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {dashboardItems.map((item) => (
            <Card 
              key={item.title}
              className={`transition-all hover:shadow-md ${item.badge ? 'opacity-60' : 'cursor-pointer hover:border-primary/50'}`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {item.title}
                      {item.badge && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {item.badge}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                </div>
                {!item.badge && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Quick Info Cards */}
        <div className="grid gap-4 md:grid-cols-3 mt-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Your Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{customerDetails?.name}</p>
              <p className="text-sm text-muted-foreground">{customerDetails?.email}</p>
              {customerDetails?.phone && (
                <p className="text-sm text-muted-foreground">{customerDetails.phone}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Service Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {customerDetails?.address || 'No address on file'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Your Contractor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{customerDetails?.business?.name}</p>
              <p className="text-sm text-muted-foreground">
                Contact your contractor for any questions
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function CustomerPortal() {
  return (
    <CustomerAuthProvider>
      <CustomerProtectedRoute>
        <CustomerPortalContent />
      </CustomerProtectedRoute>
    </CustomerAuthProvider>
  );
}
