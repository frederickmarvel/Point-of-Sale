import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Clock,
} from 'lucide-react';
import Layout from '@/components/shared/Layout';
import Badge from '@/components/shared/Badge';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import { orderService } from '@/services/order.service';
import { formatCurrency } from '@/utils/formatters';
import type { OrderStatus } from '@/types';

const statusOrder: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
];

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', 'today'],
    queryFn: () => orderService.getTodayStats(),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  const totalOrders = stats?.totalOrders ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;
  const breakdown = stats?.statusBreakdown ?? ({} as Record<OrderStatus, number>);
  const topItems = stats?.topItems ?? [];

  const cards = [
    {
      label: "Today's Orders",
      value: totalOrders,
      icon: ShoppingBag,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Pending / Preparing',
      value: (breakdown.PENDING ?? 0) + (breakdown.PREPARING ?? 0),
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: 'Completed',
      value: breakdown.COMPLETED ?? 0,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Today's overview</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 font-medium">{label}</span>
                <div className={`${bg} p-2 rounded-lg`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Status breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Orders by Status</h2>
            <div className="space-y-3">
              {statusOrder.map((status) => {
                const count = breakdown[status] ?? 0;
                const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <Badge status={status} />
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-primary-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-6 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top items */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Top Items Today</h2>
            {topItems.length === 0 ? (
              <p className="text-gray-400 text-sm">No orders yet today.</p>
            ) : (
              <div className="space-y-3">
                {topItems.slice(0, 7).map(({ menuItem, totalQuantity, totalRevenue: rev }) => (
                  <div key={menuItem.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {menuItem.name}
                      </p>
                      <p className="text-xs text-gray-500">{totalQuantity}x sold</p>
                    </div>
                    <span className="text-sm font-semibold text-primary-600 ml-4">
                      {formatCurrency(rev)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
