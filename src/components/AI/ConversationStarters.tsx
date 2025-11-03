import { Calendar, Zap, Search, FileText, Users, TrendingUp, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsPhone } from '@/hooks/use-phone';

interface ConversationStartersProps {
  currentPage?: string;
  onStarterClick: (message: string) => void;
  className?: string;
}

interface Starter {
  icon: any;
  title: string;
  subtitle: string;
  message: string;
  gradient: string;
}

const defaultStarters: Starter[] = [
  {
    icon: Calendar,
    title: 'Schedule Jobs',
    subtitle: 'Auto-schedule all pending work',
    message: 'Schedule all pending jobs automatically',
    gradient: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    icon: MapPin,
    title: 'Optimize Routes',
    subtitle: 'Find the most efficient routes',
    message: 'Optimize all routes this week',
    gradient: 'from-green-500/10 to-emerald-500/10',
  },
  {
    icon: TrendingUp,
    title: 'Get Insights',
    subtitle: 'See business analytics',
    message: 'What insights do you have about my business?',
    gradient: 'from-purple-500/10 to-pink-500/10',
  },
  {
    icon: Users,
    title: 'Team Status',
    subtitle: 'Check team availability',
    message: 'Show me team availability for tomorrow',
    gradient: 'from-orange-500/10 to-red-500/10',
  },
];

const calendarStarters: Starter[] = [
  {
    icon: Search,
    title: 'Show Gaps',
    subtitle: 'Find open time slots',
    message: "Show me gaps in this week's schedule",
    gradient: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    icon: Zap,
    title: 'Optimize Today',
    subtitle: 'Improve today\'s route',
    message: "Optimize today's route for efficiency",
    gradient: 'from-yellow-500/10 to-orange-500/10',
  },
  {
    icon: Search,
    title: 'Find Conflicts',
    subtitle: 'Check for overlaps',
    message: 'Are there any scheduling conflicts this week?',
    gradient: 'from-red-500/10 to-pink-500/10',
  },
  {
    icon: Clock,
    title: 'Check Capacity',
    subtitle: 'See available slots',
    message: "What's my capacity for this week?",
    gradient: 'from-purple-500/10 to-indigo-500/10',
  },
];

const jobsStarters: Starter[] = [
  {
    icon: Calendar,
    title: 'Schedule Pending',
    subtitle: 'Auto-schedule all jobs',
    message: 'Schedule all pending jobs automatically',
    gradient: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    icon: Users,
    title: 'Check Availability',
    subtitle: 'See who\'s free',
    message: "Who's available tomorrow?",
    gradient: 'from-green-500/10 to-emerald-500/10',
  },
  {
    icon: TrendingUp,
    title: 'Capacity Check',
    subtitle: 'See workload status',
    message: "What's my capacity for this week?",
    gradient: 'from-purple-500/10 to-pink-500/10',
  },
  {
    icon: MapPin,
    title: 'Route Planning',
    subtitle: 'Optimize travel time',
    message: 'Suggest optimal routes for today',
    gradient: 'from-orange-500/10 to-red-500/10',
  },
];

const teamStarters: Starter[] = [
  {
    icon: Users,
    title: 'Team Availability',
    subtitle: 'Who can work tomorrow',
    message: 'Show me team availability for tomorrow',
    gradient: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    icon: TrendingUp,
    title: 'Utilization Report',
    subtitle: 'Team workload status',
    message: 'How utilized is my team this week?',
    gradient: 'from-purple-500/10 to-pink-500/10',
  },
  {
    icon: Calendar,
    title: 'Assign Jobs',
    subtitle: 'Smart job assignments',
    message: 'Suggest optimal team assignments for today',
    gradient: 'from-green-500/10 to-emerald-500/10',
  },
  {
    icon: Clock,
    title: 'Schedule Overview',
    subtitle: 'See team schedule',
    message: "Show me this week's team schedule",
    gradient: 'from-orange-500/10 to-red-500/10',
  },
];

function getStartersForPage(page?: string): Starter[] {
  if (!page) return defaultStarters;
  
  if (page.includes('/calendar')) return calendarStarters;
  if (page.includes('/work-orders') || page.includes('/jobs')) return jobsStarters;
  if (page.includes('/team')) return teamStarters;
  
  return defaultStarters;
}

export function ConversationStarters({ currentPage, onStarterClick, className }: ConversationStartersProps) {
  const starters = getStartersForPage(currentPage);
  const isPhone = useIsPhone();

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl', className)}>
      {starters.map((starter, index) => {
        const Icon = starter.icon;
        return (
          <Button
            key={index}
            variant="outline"
            className={cn(
              "h-auto flex flex-col items-start gap-2 hover:shadow-md transition-all",
              "border-2 hover:border-primary/20",
              "group relative overflow-hidden",
              isPhone ? "p-5 min-h-[88px]" : "p-4"
            )}
            onClick={() => onStarterClick(starter.message)}
          >
            {/* Gradient background on hover */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity",
              starter.gradient
            )} />
            
            <div className="relative z-10 w-full">
              {/* Icon */}
              <div className={cn(
                "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2",
                starter.gradient
              )}>
                <Icon className="w-5 h-5 text-foreground" />
              </div>
              
              {/* Text */}
              <div className="text-left">
                <div className="font-semibold text-sm mb-1">{starter.title}</div>
                <div className="text-xs text-muted-foreground">{starter.subtitle}</div>
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}
