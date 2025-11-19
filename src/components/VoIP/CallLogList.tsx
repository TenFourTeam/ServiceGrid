import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, PhoneIncoming, PhoneOutgoing, Clock } from 'lucide-react';
import { useCallLogs } from '@/hooks/useCallLogs';
import { formatDistanceToNow } from 'date-fns';

export function CallLogList() {
  const { callLogs, isLoading } = useCallLogs();
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'no-answer':
      case 'busy':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Call History
        </CardTitle>
        <CardDescription>
          View and manage your call logs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading call logs...
          </div>
        ) : callLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No call logs yet. Make or receive calls to see them here.
          </div>
        ) : (
          <div className="space-y-2">
            {callLogs.map((call) => (
              <Card
                key={call.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setExpandedCallId(expandedCallId === call.id ? null : call.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {call.direction === 'inbound' ? (
                        <PhoneIncoming className="h-5 w-5 text-blue-500" />
                      ) : (
                        <PhoneOutgoing className="h-5 w-5 text-green-500" />
                      )}
                      
                      <div className="flex-1">
                        <div className="font-medium">
                          {call.customer?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {call.direction === 'inbound' ? call.fromNumber : call.toNumber}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {call.status === 'completed' 
                            ? formatDuration(call.durationSeconds)
                            : call.status
                          }
                        </div>

                        <Badge variant={getStatusColor(call.status)}>
                          {call.status}
                        </Badge>

                        <div className="text-sm text-muted-foreground">
                          {call.startedAt && formatDistanceToNow(new Date(call.startedAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedCallId === call.id && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      {call.recordingUrl && (
                        <div>
                          <audio controls className="w-full">
                            <source src={call.recordingUrl} type="audio/mpeg" />
                          </audio>
                        </div>
                      )}

                      {call.transcript && (
                        <div className="text-sm">
                          <div className="font-medium mb-1">Transcript:</div>
                          <div className="text-muted-foreground">{call.transcript}</div>
                        </div>
                      )}

                      {call.aiSummary && (
                        <div className="text-sm">
                          <div className="font-medium mb-1">AI Summary:</div>
                          <div className="text-muted-foreground">{call.aiSummary}</div>
                        </div>
                      )}

                      {call.customer && (
                        <Button variant="outline" size="sm" className="mt-2">
                          Call Back
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
