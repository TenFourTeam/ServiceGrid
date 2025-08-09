import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';
import { useOnboarding } from '@/onboarding/useOnboarding';
import { NewJobSheet } from '@/components/Job/NewJobSheet';

export function OnboardingChecklist() {
  const { steps, completed, total, dismissed, dismiss, undismiss, markEmailSenderDone } = useOnboarding();

  if (dismissed || completed === total) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          Get started
          <Badge variant="secondary" className="ml-2">{completed}/{total}</Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Getting started</div>
          <Button variant="ghost" size="sm" onClick={dismiss}>Hide</Button>
        </div>
        <ul className="space-y-2">
          {steps.map((s) => (
            <li key={s.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {s.done ? <CheckCircle2 className="text-primary" size={18} /> : <Circle className="text-muted-foreground" size={18} />}
                <span className={s.done ? 'line-through text-muted-foreground' : ''}>{s.label}</span>
              </div>
              {s.id === 'job' ? (
                <NewJobSheet />
              ) : s.id === 'email' && !s.done ? (
                <Button size="sm" variant="secondary" asChild><a href={s.href}>Open</a></Button>
              ) : (
                <Button size="sm" variant="secondary" asChild><Link to={s.href}>{s.done ? 'View' : 'Start'}</Link></Button>
              )}
            </li>
          ))}
        </ul>
        <div className="text-xs text-muted-foreground mt-3">
          Connected your email sender? <button className="underline" onClick={markEmailSenderDone}>Mark as done</button>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Hidden accidentally? <button className="underline" onClick={undismiss}>Unhide</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
