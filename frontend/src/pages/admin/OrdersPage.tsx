import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/shared/Layout';
import Badge from '@/components/shared/Badge';
import Modal from '@/components/shared/Modal';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { orderService } from '@/services/order.service';
import { formatCurrency, formatDate, todayDateString } from '@/utils/formatters';
import type { Order, OrderStatus } from '@/types';

const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
];

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
};

// ─── Order Detail Modal ───────────────────────────────────────────────────────

interface OrderDetailProps {
  order: Order;
  onUpdateStatus: (status: OrderStatus) => void;
  isPending: boolean;
}

function OrderDetail({ order, onUpdateStatus, isPending }: OrderDetailProps) {
  const nextStatuses = NEXT_STATUSES[order.status] ?? [];

  return (
    <div className="space-y-5">
      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Order ID</p>
          <p className="font-mono font-medium text-gray-800 text-xs break-all">{order.id}</p>
        </div>
        <div>
          <p className="text-gray-500">Table</p>
          <p className="font-medium text-gray-800">{order.table?.name ?? order.tableId}</p>
        </div>
        <div>
          <p className="text-gray-500">Customer</p>
          <p className="font-medium text-gray-800">{order.customerName ?? '—'}</p>
        </div>
        <div>
          <p className="text-gray-500">Placed at</p>
          <p className="font-medium text-gray-800">{formatDate(order.createdAt)}</p>
        </div>
        {order.customerNote && (
          <div className="col-span-2">
            <p className="text-gray-500">Note</p>
            <p className="font-medium text-gray-800">{order.customerNote}</p>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Status:</span>
        <Badge status={order.status} />
      </div>

      {/* Items */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Items</h3>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-gray-800">{item.menuItem.name}</span>
                <span className="text-gray-500 ml-1">× {item.quantity}</span>
                {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
              </div>
              <span className="text-gray-700">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
          <span className="font-semibold text-gray-800">Total</span>
          <span className="font-bold text-primary-600 text-lg">{formatCurrency(order.totalAmount)}</span>
        </div>
      </div>

      {/* Actions */}
      {nextStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {nextStatuses.map((status) => (
            <button
              key={status}
              onClick={() => onUpdateStatus(status)}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {isPending && <LoadingSpinner size="sm" />}
              Mark as {status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [dateFilter, setDateFilter] = useState(todayDateString());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orders', statusFilter, dateFilter, page],
    queryFn: () =>
      orderService.getOrders({
        status: statusFilter || undefined,
        date: dateFilter || undefined,
        page,
        limit: 20,
      }),
    refetchInterval: 15_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderService.updateOrderStatus(id, { status }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setSelectedOrder(updated);
      toast.success('Order status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const orders = data?.orders ?? [];
  const pagination = data?.pagination;

  const filtered = search
    ? orders.filter(
        (o) =>
          o.id.toLowerCase().includes(search.toLowerCase()) ||
          (o.customerName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (o.table?.name ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : orders;

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
            <p className="text-gray-500 text-sm mt-1">
              {pagination?.total ?? 0} orders found
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, customer, table…"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as OrderStatus | ''); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
            ))}
          </select>

          {/* Date filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <PageLoader />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b border-gray-200">
                    <th className="text-left px-5 py-3">Order</th>
                    <th className="text-left px-5 py-3">Table</th>
                    <th className="text-left px-5 py-3">Customer</th>
                    <th className="text-left px-5 py-3">Items</th>
                    <th className="text-left px-5 py-3">Total</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Placed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">
                        #{order.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {order.table?.name ?? order.tableId}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{order.customerName ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{order.items.length}</td>
                      <td className="px-5 py-3 font-semibold text-primary-600">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge status={order.status} />
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400">No orders found.</div>
              )}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Order #${selectedOrder.id.slice(-6).toUpperCase()}`}
          size="lg"
        >
          <OrderDetail
            order={selectedOrder}
            isPending={updateStatus.isPending}
            onUpdateStatus={(status) => updateStatus.mutate({ id: selectedOrder.id, status })}
          />
        </Modal>
      )}
    </Layout>
  );
}
