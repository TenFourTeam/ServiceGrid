import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useBusinessAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function useTaskNotifications() {
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) return;

    console.log('[useTaskNotifications] Setting up notifications for user:', userId);

    const channel = supabase
      .channel('task-assignments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sg_checklist_items',
          filter: `assigned_to=eq.${userId}`,
        },
        (payload) => {
          console.log('[useTaskNotifications] New task assigned:', payload);
          
          const item = payload.new as any;
          
          toast.success('New task assigned! 🎯', {
            description: `You've been assigned: "${item.title}"`,
            duration: 5000,
            action: {
              label: 'View',
              onClick: () => {
                window.location.href = '/team?tab=mytasks';
              },
            },
          });

          // Optional: Browser notification (requires permission)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Task Assigned', {
              body: `You've been assigned: "${item.title}"`,
              icon: '/favicon.svg',
              badge: '/favicon.svg',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sg_checklist_items',
          filter: `assigned_to=eq.${userId}`,
        },
        (payload) => {
          const oldItem = payload.old as any;
          const newItem = payload.new as any;
          
          // Check if assignment just changed to this user
          if (oldItem.assigned_to !== userId && newItem.assigned_to === userId) {
            toast.success('Task reassigned to you! 🔄', {
              description: `"${newItem.title}" is now yours`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[useTaskNotifications] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
