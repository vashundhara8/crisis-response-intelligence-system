import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface ResourceUtilizationChartProps {
  data: {
    resource_type: string;
    total: number;
    available: number;
    deployed: number;
    utilization_rate: number;
  }[];
}

export const ResourceUtilizationChart: React.FC<ResourceUtilizationChartProps> = ({ data }) => {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey="resource_type" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
          <Bar dataKey="available" name="Available Units" fill="#039855" radius={[4, 4, 0, 0]} />
          <Bar dataKey="deployed" name="Deployed Units" fill="#f79009" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
