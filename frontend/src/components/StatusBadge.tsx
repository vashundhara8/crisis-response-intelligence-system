import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normStatus = (status || 'REPORTED').toUpperCase();

  let className = 'status-badge ';
  let label = status;

  switch (normStatus) {
    case 'AVAILABLE':
      className += 'available';
      label = 'Available';
      break;
    case 'ASSIGNED':
      className += 'assigned';
      label = 'Assigned';
      break;
    case 'DEPLOYED':
      className += 'deployed';
      label = 'Deployed';
      break;
    case 'UNAVAILABLE':
      className += 'unavailable';
      label = 'Unavailable';
      break;
    case 'UNDER_MAINTENANCE':
    case 'MAINTENANCE':
      className += 'maintenance';
      label = 'Under Maintenance';
      break;
    case 'REPORTED':
      className += 'progress';
      label = 'Reported';
      break;
    case 'UNDER_ASSESSMENT':
      className += 'progress';
      label = 'Under Assessment';
      break;
    case 'ACTIVE':
    case 'AWAITING_RESCUE':
    case 'IN_PROGRESS':
      className += 'awaiting';
      label = 'Active';
      break;
    case 'RESOURCES_ASSIGNED':
    case 'RESOURCE_ALLOCATED':
      className += 'allocated';
      label = 'Resources Assigned';
      break;
    case 'RESOLVED':
      className += 'resolved';
      label = 'Resolved';
      break;
    case 'CLOSED':
      className += 'resolved';
      label = 'Closed';
      break;
    default:
      className += 'awaiting';
      label = normStatus.replace(/_/g, ' ');
  }

  return <span className={className}>{label}</span>;
};
