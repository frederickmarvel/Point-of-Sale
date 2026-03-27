import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  CreditCard,
  Coffee,
  AlertCircle,
  RefreshCw,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { orderService } from '@/services/order.service';
import { paymentService } from '@/services/payment.service';
import { formatCurrency, formatDate } from '@/utils/formatters';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Badge from '@/components/shared/Badge';
import type { Payment, PaymentMethod, PaymentGateway } from '@/types';

// ─── Payment Method Selector ──────────────────────────────────────────────────

interface PaymentSelectorProps {
  onSelect: (method: PaymentMethod, gateway: PaymentGateway, bankCode?: string) => void;
  isPending: boolean;
}

function PaymentSelector({ onSelect, isPending }: PaymentSelectorProps) {
  const [method, setMethod] = useState<PaymentMethod>('QRIS');
  const [gateway, setGateway] = useState<PaymentGateway>('XENDIT');
  const [bankCode, setBankCode] = useState('BCA');

  return (
    <div className="space-y-5">
      {/* Method */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Payment Method</p>
        <div className="grid grid-cols-2 gap-3">
          {(['QRIS', 'VIRTUAL_ACCOUNT'] as PaymentMethod[]).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                method === m
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {m === 'QRIS' ? <QrCode className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
              <span className="text-xs font-semibold">
                {m === 'QRIS' ? 'QRIS' : 'Virtual Account'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Gateway */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Gateway</p>
        <div className="grid grid-cols-2 gap-3">
          {(['XENDIT', 'DURIANPAY'] as PaymentGateway[]).map((g) => (
            <button
              key={g}
              onClick={() => setGateway(g)}
              className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                gateway === g
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Bank code (VA only) */}
      {method === 'VIRTUAL_ACCOUNT' && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Bank</p>
          <select
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
          >
            {['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA'].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={() => onSelect(method, gateway, method === 'VIRTUAL_ACCOUNT' ? bankCode : undefined)}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-semibold py-3.5 rounded-xl transition-colors"
      >
        {isPending ? <LoadingSpinner size="sm" /> : <CreditCard className="w-5 h-5" />}
        {isPending ? 'Processing…' : 'Pay Now'}
      </button>
    </div>
  );
}

// ─── Payment Display ───────────────────────────────────────────────────────────

interface PaymentDisplayProps {
  payment: Payment;
  onCheckStatus: () => void;
  isChecking: boolean;
}

function PaymentDisplay({ payment, onCheckStatus, isChecking }: PaymentDisplayProps) {
  if (payment.status === 'SUCCESS') {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <div>
          <p className="text-xl font-bold text-gray-800">Payment Successful!</p>
          <p className="text-gray-500 text-sm mt-1">
            Your order has been confirmed. We'll start preparing it soon.
          </p>
        </div>
        {payment.paidAt && (
          <p className="text-xs text-gray-400">Paid at {formatDate(payment.paidAt)}</p>
        )}
      </div>
    );
  }

  if (payment.status === 'FAILED' || payment.status === 'EXPIRED') {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <XCircle className="w-16 h-16 text-red-400" />
        <div>
          <p className="text-xl font-bold text-gray-800">
            Payment {payment.status === 'EXPIRED' ? 'Expired' : 'Failed'}
          </p>
          <p className="text-gray-500 text-sm mt-1">Please try again with a new payment.</p>
        </div>
      </div>
    );
  }

  // PENDING
  return (
    <div className="space-y-5">
      {payment.method === 'QRIS' && payment.qrCode && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-semibold text-gray-700">Scan QR Code to Pay</p>
          <img
            src={payment.qrCode}
            alt="Payment QR Code"
            className="w-52 h-52 border-2 border-gray-200 rounded-xl"
          />
        </div>
      )}

      {payment.method === 'VIRTUAL_ACCOUNT' && payment.virtualAccountNumber && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-700">
            {payment.bankCode} Virtual Account
          </p>
          <p className="font-mono text-2xl font-bold text-primary-600 tracking-widest">
            {payment.virtualAccountNumber}
          </p>
          <p className="text-xs text-gray-400">Transfer the exact amount shown below</p>
        </div>
      )}

      {payment.paymentUrl && (
        <a
          href={payment.paymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Open Payment Page
        </a>
      )}

      {payment.expiredAt && (
        <p className="text-xs text-center text-gray-400">
          Expires at {formatDate(payment.expiredAt)}
        </p>
      )}

      <button
        onClick={onCheckStatus}
        disabled={isChecking}
        className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-600 font-medium py-2.5 rounded-xl transition-colors text-sm"
      >
        <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
        Check Payment Status
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);

  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getOrder(orderId!),
    enabled: !!orderId,
  });

  // Try to load existing payment
  const { data: existingPayment, isLoading: loadingPayment } = useQuery({
    queryKey: ['payment', orderId],
    queryFn: () => paymentService.getPayment(orderId!),
    enabled: !!orderId,
    retry: false,
  });

  useEffect(() => {
    if (existingPayment) setPayment(existingPayment);
  }, [existingPayment]);

  const createPayment = useMutation({
    mutationFn: ({
      method,
      gateway,
      bankCode,
    }: {
      method: PaymentMethod;
      gateway: PaymentGateway;
      bankCode?: string;
    }) => paymentService.createPayment(orderId!, { method, gateway, bankCode }),
    onSuccess: (p) => {
      setPayment(p);
      toast.success('Payment initiated!');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to create payment.');
    },
  });

  const checkStatus = useMutation({
    mutationFn: () => paymentService.checkPaymentStatus(orderId!),
    onSuccess: (p) => {
      setPayment(p);
      if (p.status === 'SUCCESS') {
        toast.success('Payment confirmed!');
      } else if (p.status === 'FAILED' || p.status === 'EXPIRED') {
        toast.error(`Payment ${p.status.toLowerCase()}.`);
      } else {
        toast('Payment still pending.', { icon: '⏳' });
      }
    },
    onError: () => toast.error('Failed to check payment status.'),
  });

  // Auto-poll when payment is pending
  const pollStatus = useCallback(() => {
    if (payment?.status === 'PENDING') checkStatus.mutate();
  }, [payment?.status, checkStatus]);

  useEffect(() => {
    if (payment?.status !== 'PENDING') return;
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [payment?.status, pollStatus]);

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">Invalid order ID.</p>
        </div>
      </div>
    );
  }

  if (loadingOrder || loadingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">Order not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
            <Coffee className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-800">Payment</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Order</p>
              <p className="font-mono font-bold text-gray-800">#{order.id.slice(-6).toUpperCase()}</p>
            </div>
            <Badge status={order.status} />
          </div>

          {order.table && (
            <p className="text-sm text-gray-500">
              Table: <span className="font-medium text-gray-700">{order.table.name}</span>
            </p>
          )}

          {/* Items summary */}
          <div className="space-y-1.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {item.menuItem.name} × {item.quantity}
                </span>
                <span className="text-gray-600">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="font-bold text-gray-800">Total</span>
            <span className="text-xl font-bold text-primary-600">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Payment section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          {payment ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {payment.status === 'SUCCESS' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : payment.status === 'PENDING' ? (
                  <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className="font-semibold text-gray-800">
                  {payment.status === 'SUCCESS'
                    ? 'Payment Complete'
                    : payment.status === 'PENDING'
                    ? 'Awaiting Payment'
                    : 'Payment Failed'}
                </span>
              </div>
              <PaymentDisplay
                payment={payment}
                onCheckStatus={() => checkStatus.mutate()}
                isChecking={checkStatus.isPending}
              />
              {payment.status === 'SUCCESS' && (
                <button
                  onClick={() => navigate(`/order/${order.tableId}`)}
                  className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2"
                >
                  Order more items
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-500" />
                Choose Payment
              </h2>
              <PaymentSelector
                onSelect={(method, gateway, bankCode) =>
                  createPayment.mutate({ method, gateway, bankCode })
                }
                isPending={createPayment.isPending}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
