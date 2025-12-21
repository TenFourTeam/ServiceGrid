import { Link } from 'react-router-dom';
import { 
  User, 
  Briefcase, 
  FileText, 
  Receipt, 
  ClipboardList,
  Calendar,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EntityCardProps {
  entityType: string;
  entityId: string;
  displayName: string;
  onClick?: () => void;
}

const entityConfig: Record<string, {
  icon: any;
  urlPath: string;
  bgColor: string;
  textColor: string;
}> = {
  customer: {
    icon: User,
    urlPath: '/customers',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  job: {
    icon: Briefcase,
    urlPath: '/jobs',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-600 dark:text-green-400',
  },
  quote: {
    icon: FileText,
    urlPath: '/quotes',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-600 dark:text-purple-400',
  },
  invoice: {
    icon: Receipt,
    urlPath: '/invoices',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  request: {
    icon: ClipboardList,
    urlPath: '/requests',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-600 dark:text-cyan-400',
  },
  schedule: {
    icon: Calendar,
    urlPath: '/calendar',
    bgColor: 'bg-pink-500/10',
    textColor: 'text-pink-600 dark:text-pink-400',
  },
  location: {
    icon: MapPin,
    urlPath: '/locations',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-600 dark:text-orange-400',
  },
};

export function EntityCard({ entityType, entityId, displayName, onClick }: EntityCardProps) {
  const config = entityConfig[entityType] || {
    icon: FileText,
    urlPath: '/',
    bgColor: 'bg-muted',
    textColor: 'text-foreground',
  };

  const Icon = config.icon;
  const url = `${config.urlPath}/${entityId}`;

  return (
    <Link
      to={url}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg',
        'text-sm font-medium transition-all',
        'hover:scale-[1.02] hover:shadow-sm',
        'border border-border/50',
        config.bgColor,
        config.textColor
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{displayName}</span>
      <ExternalLink className="w-3 h-3 opacity-60" />
    </Link>
  );
}

// Parse entity references from message content
export function parseEntityReferences(content: string): Array<{
  type: 'text' | 'entity';
  content: any;
}> {
  const parts: Array<{ type: 'text' | 'entity'; content: any }> = [];
  const entityRegex = /\[ENTITY:(\w+):([^:]+):([^\]]+)\]/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = entityRegex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    
    // Add entity reference
    parts.push({
      type: 'entity',
      content: {
        entityType: match[1],
        entityId: match[2],
        displayName: match[3],
      },
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex);
    if (textAfter) {
      parts.push({ type: 'text', content: textAfter });
    }
  }
  
  // If no entities found, return original content as text
  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }
  
  return parts;
}
