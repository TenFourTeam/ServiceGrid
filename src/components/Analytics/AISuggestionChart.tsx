import * as React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AISuggestionChartProps {
  data: {
    totalSuggestions: number;
    accepted: number;
    rejected: number;
    acceptanceRate: number;
  };
}

export function AISuggestionChart({ data }: AISuggestionChartProps) {
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);

  React.useEffect(() => {
    const checkSize = () => setIsSmallScreen(window.innerWidth < 640);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const pending = data.totalSuggestions - data.accepted - data.rejected;

  const chartData = [
    { name: 'Accepted', value: data.accepted, color: 'hsl(var(--chart-4))' },
    { name: 'Rejected', value: data.rejected, color: 'hsl(var(--destructive))' },
    { name: 'Pending', value: pending, color: 'hsl(var(--muted))' },
  ].filter(item => item.value > 0);

  return (
    <ResponsiveContainer width="100%" height={isSmallScreen ? 250 : 350}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
