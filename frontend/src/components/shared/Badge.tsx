import type { OrderStatus } from '@/types';

interface BadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  PAID: {
    label: 'Paid',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  PREPARING: {
    label: 'Preparing',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  READY: {
    label: 'Ready',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
};

export default function Badge({ status, className = '' }: BadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
