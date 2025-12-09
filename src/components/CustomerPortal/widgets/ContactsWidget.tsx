import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Phone, Mail, Building2 } from 'lucide-react';
import type { TeamMember, CustomerBusiness } from '@/types/customerPortal';

interface ContactsWidgetProps {
  business: CustomerBusiness;
  teamMembers: TeamMember[];
}

export function ContactsWidget({ business, teamMembers }: ContactsWidgetProps) {
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Your Team
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Business contact */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          {business.logo_url ? (
            <img 
              src={business.logo_url} 
              alt={business.name}
              className="h-10 w-10 rounded-md object-contain"
            />
          ) : (
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{business.name}</p>
            <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {business.phone && (
                <a href={`tel:${business.phone}`} className="flex items-center gap-1 hover:text-primary">
                  <Phone className="h-3 w-3" />
                  {business.phone}
                </a>
              )}
              {business.reply_to_email && (
                <a href={`mailto:${business.reply_to_email}`} className="flex items-center gap-1 hover:text-primary">
                  <Mail className="h-3 w-3" />
                  Email
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Team members */}
        {teamMembers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Assigned Team Members</p>
            <div className="flex flex-wrap gap-2">
              {teamMembers.map((member) => (
                <div 
                  key={member.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted/50"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{member.full_name || member.email}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {teamMembers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Team members will appear here once assigned to your projects.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
