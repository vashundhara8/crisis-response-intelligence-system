import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  color?: 'red' | 'orange' | 'green' | 'blue' | 'slate';
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  color = 'blue',
  icon
}) => {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-header">
        <span>{title}</span>
        {icon}
      </div>
      <div className={`stat-number ${color}`}>
        {value}
      </div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
};
