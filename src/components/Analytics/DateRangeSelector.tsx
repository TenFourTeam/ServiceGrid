import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRangeSelectorProps {
  value: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const presets = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-2 px-2 sm:mx-0 sm:px-0">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className="whitespace-nowrap flex-shrink-0"
            onClick={() => onChange({
              start: subDays(new Date(), preset.days),
              end: new Date(),
            })}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn('justify-start text-left font-normal w-full sm:w-auto')}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {format(value.start, 'MMM d')} - {format(value.end, 'MMM d, yyyy')}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-3 space-y-2">
            <div className="text-sm font-medium">Start Date</div>
            <Calendar
              mode="single"
              selected={value.start}
              onSelect={(date) => date && onChange({ ...value, start: date })}
              initialFocus
            />
            <div className="text-sm font-medium mt-4">End Date</div>
            <Calendar
              mode="single"
              selected={value.end}
              onSelect={(date) => date && onChange({ ...value, end: date })}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
