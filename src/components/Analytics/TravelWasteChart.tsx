import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface TravelWasteChartProps {
  data: Array<{
    week: string;
    jobCount: number;
    travelTime: number;
    efficiencyScore: number;
  }>;
}

export function TravelWasteChart({ data }: TravelWasteChartProps) {
  const chartData = data.map(item => ({
    weekLabel: format(new Date(item.week), 'MMM d'),
    travelTime: item.travelTime,
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="weekLabel" 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
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
        <Area 
          type="monotone" 
          dataKey="travelTime" 
          stroke="hsl(var(--chart-1))" 
          fill="hsl(var(--chart-1))"
          fillOpacity={0.6}
          name="Travel Time (min)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
