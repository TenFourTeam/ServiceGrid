import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeadAnalytics } from "@/hooks/useLeadAnalytics";
import { Users, TrendingUp, AlertCircle, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

export function LeadMetricsCard() {
  const { data, isLoading } = useLeadAnalytics();
  const navigate = useNavigate();
  const { pressProps, pressClass } = usePressable();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:translate-y-[-2px]",
        "active:translate-y-0 active:shadow-sm",
        pressClass
      )}
      onClick={() => navigate('/analytics?tab=leads')}
      {...pressProps}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lead Generation
          </CardTitle>
          {data.unassignedRequests > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              {data.unassignedRequests} Unassigned
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{data.recentLeads}</div>
            <div className="text-xs text-muted-foreground">New this week</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600">{data.qualificationRate}%</div>
            <div className="text-xs text-muted-foreground">Qualified</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-xl font-bold">{data.averageLeadScore}</span>
            </div>
            <div className="text-xs text-muted-foreground">Avg score</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-lg font-medium truncate">
              {data.topSource || 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">Top source</div>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{data.qualifiedLeads}/{data.totalLeads}</span>
          </div>
          <Progress value={data.qualificationRate} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
