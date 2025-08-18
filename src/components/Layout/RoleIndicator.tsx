import { Badge } from "@/components/ui/badge";
import { Crown, Users } from "lucide-react";
import { useBusinessContext } from "@/hooks/useBusinessContext";

interface RoleIndicatorProps {
  size?: "sm" | "default" | "lg";
  showText?: boolean;
  className?: string;
}

export function RoleIndicator({ size = "default", showText = true, className = "" }: RoleIndicatorProps) {
  const { role, businessName } = useBusinessContext();

  if (!role) return null;

  const isOwner = role === 'owner';
  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-sm" : "text-xs";

  return (
    <Badge 
      variant={isOwner ? 'default' : 'secondary'} 
      className={`flex items-center gap-1.5 ${textSize} ${className}`}
    >
      {isOwner ? (
        <Crown className={iconSize} />
      ) : (
        <Users className={iconSize} />
      )}
      {showText && (
        <span className="font-medium">
          {isOwner ? 'Owner' : 'Worker'}
          {businessName && ` • ${businessName}`}
        </span>
      )}
    </Badge>
  );
}