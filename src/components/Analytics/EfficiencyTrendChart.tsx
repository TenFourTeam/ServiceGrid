import * as React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface EfficiencyTrendChartProps {
  data: Array<{
    week: string;
    jobCount: number;
    travelTime: number;
    efficiencyScore: number;
  }>;
}

export function EfficiencyTrendChart({ data }: EfficiencyTrendChartProps) {
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);

  React.useEffect(() => {
    const checkSize = () => setIsSmallScreen(window.innerWidth < 640);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const chartData = data.map(item => ({
    ...item,
    weekLabel: format(new Date(item.week), 'MMM d'),
  }));

  return (
    <ResponsiveContainer width="100%" height={isSmallScreen ? 250 : 350}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="weekLabel" 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="efficiencyScore" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          name="Efficiency Score"
          dot={{ fill: 'hsl(var(--primary))' }}
        />
        <Line 
          type="monotone" 
          dataKey="jobCount" 
          stroke="hsl(var(--chart-2))" 
          strokeWidth={2}
          name="Job Count"
          dot={{ fill: 'hsl(var(--chart-2))' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
