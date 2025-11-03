import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { TeamMemberUtilization } from '@/hooks/useTeamUtilization';

interface TeamUtilizationChartProps {
  data: TeamMemberUtilization[];
}

export function TeamUtilizationChart({ data }: TeamUtilizationChartProps) {
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);

  React.useEffect(() => {
    const checkSize = () => setIsSmallScreen(window.innerWidth < 640);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const getUtilizationColor = (rate: number) => {
    if (rate < 50) return 'hsl(var(--destructive))'; // Red - underutilized
    if (rate < 75) return 'hsl(var(--chart-3))'; // Yellow - moderate
    if (rate <= 90) return 'hsl(var(--chart-4))'; // Green - optimal
    return 'hsl(var(--chart-1))'; // Orange - overutilized
  };

  const chartData = data.map(member => ({
    name: member.name,
    utilization: member.utilizationRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={isSmallScreen ? 250 : 350}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          type="number" 
          domain={[0, 100]}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          type="category" 
          dataKey="name" 
          width={isSmallScreen ? 80 : 120}
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
          formatter={(value: number) => `${value.toFixed(1)}%`}
        />
        <Legend />
        <Bar dataKey="utilization" name="Utilization Rate (%)">
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getUtilizationColor(entry.utilization)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
