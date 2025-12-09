import { isToday, isYesterday, isSameDay, format } from 'date-fns';

export function getDateGroupLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d');
}

export function shouldGroupWithPrevious(
  prevMessage: { sender_id: string; created_at: string } | null,
  currentMessage: { sender_id: string; created_at: string },
  maxMinutesBetween = 5
): boolean {
  if (!prevMessage) return false;
  if (prevMessage.sender_id !== currentMessage.sender_id) return false;
  
  const prevDate = new Date(prevMessage.created_at);
  const currDate = new Date(currentMessage.created_at);
  const diffMinutes = (currDate.getTime() - prevDate.getTime()) / 60000;
  
  return diffMinutes <= maxMinutesBetween && isSameDay(prevDate, currDate);
}

export function groupMessagesByDate<T extends { created_at: string }>(
  messages: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  
  messages.forEach(message => {
    const date = new Date(message.created_at);
    const label = getDateGroupLabel(date);
    
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(message);
  });
  
  return groups;
}
