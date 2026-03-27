import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Coffee,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { menuService } from '@/services/menu.service';
import { tableService } from '@/services/table.service';
import { orderService } from '@/services/order.service';
import { formatCurrency } from '@/utils/formatters';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { CartItem, MenuItem, Category } from '@/types';

// ─── Cart Sidebar ─────────────────────────────────────────────────────────────

interface CartSidebarProps {
  cart: CartItem[];
  onAdd: (item: MenuItem) => void;
  onRemove: (itemId: string) => void;
  onClear: () => void;
  onNoteChange: (itemId: string, note: string) => void;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  customerNote: string;
  onCustomerNoteChange: (note: string) => void;
  onPlaceOrder: () => void;
  isPlacingOrder: boolean;
}

function CartSidebar({
  cart,
  onAdd,
  onRemove,
  onClear,
  onNoteChange,
  customerName,
  onCustomerNameChange,
  customerNote,
  onCustomerNoteChange,
  onPlaceOrder,
  isPlacingOrder,
}: CartSidebarProps) {
  const total = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary-500" />
          Your Order
        </h2>
        {cart.length > 0 && (
          <button onClick={onClear} className="text-xs text-red-400 hover:text-red-600 transition-colors">
            Clear all
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
          <ShoppingCart className="w-12 h-12 opacity-30" />
          <p className="text-sm">Your cart is empty</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {cart.map(({ menuItem, quantity, notes }) => (
              <div key={menuItem.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{menuItem.name}</p>
                    <p className="text-xs text-primary-600 font-semibold">
                      {formatCurrency(menuItem.price * quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onRemove(menuItem.id)}
                      className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors"
                    >
                      {quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-gray-700">{quantity}</span>
                    <button
                      onClick={() => onAdd(menuItem)}
                      className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <input
                  value={notes}
                  onChange={(e) => onNoteChange(menuItem.id, e.target.value)}
                  placeholder="Special request…"
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-primary-300 outline-none"
                />
              </div>
            ))}
          </div>

          {/* Customer info */}
          <div className="mt-4 space-y-2">
            <input
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-300 outline-none"
            />
            <textarea
              value={customerNote}
              onChange={(e) => onCustomerNoteChange(e.target.value)}
              placeholder="Order notes (optional)"
              rows={2}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-300 outline-none resize-none"
            />
          </div>

          {/* Total + CTA */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="text-xl font-bold text-primary-600">{formatCurrency(total)}</span>
            </div>
            <button
              onClick={onPlaceOrder}
              disabled={isPlacingOrder || cart.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {isPlacingOrder ? <LoadingSpinner size="sm" /> : null}
              {isPlacingOrder ? 'Placing order…' : 'Place Order'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Menu Item Card ────────────────────────────────────────────────────────────

interface MenuItemCardProps {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

function MenuItemCard({ item, quantity, onAdd, onRemove }: MenuItemCardProps) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${!item.isAvailable ? 'opacity-50' : 'border-gray-200 hover:shadow-md'}`}>
      {item.imageUrl && (
        <img src={item.imageUrl} alt={item.name} className="w-full h-36 object-cover" />
      )}
      <div className="p-3">
        <p className="font-semibold text-gray-800 text-sm leading-tight">{item.name}</p>
        {item.description && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-primary-600 text-sm">{formatCurrency(item.price)}</span>
          {item.isAvailable ? (
            quantity === 0 ? (
              <button
                onClick={onAdd}
                className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onRemove}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-gray-800 text-sm w-5 text-center">{quantity}</span>
                <button
                  onClick={onAdd}
                  className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          ) : (
            <span className="text-xs text-gray-400">Unavailable</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

interface CategorySectionProps {
  category: Category;
  cart: CartItem[];
  onAdd: (item: MenuItem) => void;
  onRemove: (itemId: string) => void;
}

function CategorySection({ category, cart, onAdd, onRemove }: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const items = category.items?.filter((i) => i.isAvailable !== false) ?? [];

  if (items.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 w-full text-left mb-3 group"
      >
        <h2 className="text-base font-bold text-gray-800 group-hover:text-primary-600 transition-colors">
          {category.name}
        </h2>
        {collapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
      </button>
      {!collapsed && (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => {
            const cartItem = cart.find((c) => c.menuItem.id === item.id);
            return (
              <MenuItemCard
                key={item.id}
                item={item}
                quantity={cartItem?.quantity ?? 0}
                onAdd={() => onAdd(item)}
                onRemove={() => onRemove(item.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function OrderPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [showCart, setShowCart] = useState(false);

  const { data: menu = [], isLoading: loadingMenu, error: menuError } = useQuery({
    queryKey: ['public-menu'],
    queryFn: menuService.getPublicMenu,
  });

  const { data: table, isLoading: loadingTable } = useQuery({
    queryKey: ['public-table', tableId],
    queryFn: () => tableService.getPublicTable(tableId!),
    enabled: !!tableId,
  });

  const placeOrder = useMutation({
    mutationFn: orderService.placeOrder,
    onSuccess: (order) => {
      toast.success('Order placed! Proceed to payment.');
      navigate(`/payment/${order.id}`);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to place order. Please try again.');
    },
  });

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItem: item, quantity: 1, notes: '' }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === itemId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter((c) => c.menuItem.id !== itemId);
      return prev.map((c) => c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const setNote = (itemId: string, note: string) => {
    setCart((prev) => prev.map((c) => c.menuItem.id === itemId ? { ...c, notes: note } : c));
  };

  const handlePlaceOrder = () => {
    if (!tableId) return;
    if (cart.length === 0) {
      toast.error('Add items to your cart first.');
      return;
    }
    placeOrder.mutate({
      tableId,
      customerName: customerName || undefined,
      customerNote: customerNote || undefined,
      items: cart.map(({ menuItem, quantity, notes }) => ({
        menuItemId: menuItem.id,
        quantity,
        notes: notes || undefined,
      })),
    });
  };

  const cartCount = useMemo(() => cart.reduce((s, c) => s + c.quantity, 0), [cart]);
  const cartTotal = useMemo(
    () => cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0),
    [cart],
  );

  if (!tableId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-gray-600 font-medium">Invalid QR code. No table ID provided.</p>
        </div>
      </div>
    );
  }

  if (loadingMenu || loadingTable) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (menuError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-gray-600">Failed to load menu. Please try again.</p>
        </div>
      </div>
    );
  }

  const activeCategories = menu.filter((c) => c.isActive && (c.items?.some((i) => i.isAvailable) ?? false));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
              <Coffee className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-800 text-sm">RestoPOS</span>
              {table && <span className="text-xs text-gray-400 ml-2">· {table.name}</span>}
            </div>
          </div>

          {/* Cart button */}
          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-full transition-colors text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && (
              <>
                <span>{cartCount} items</span>
                <span className="font-bold">{formatCurrency(cartTotal)}</span>
              </>
            )}
            {cartCount === 0 && <span>Cart</span>}
          </button>
        </div>
      </header>

      {/* Menu content */}
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-8">
        {activeCategories.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Coffee className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Menu is currently unavailable.</p>
          </div>
        ) : (
          activeCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              cart={cart}
              onAdd={addToCart}
              onRemove={removeFromCart}
            />
          ))
        )}
      </div>

      {/* Cart drawer overlay */}
      {showCart && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="w-full max-w-sm bg-white flex flex-col shadow-xl p-5">
            <CartSidebar
              cart={cart}
              onAdd={addToCart}
              onRemove={removeFromCart}
              onClear={() => setCart([])}
              onNoteChange={setNote}
              customerName={customerName}
              onCustomerNameChange={setCustomerName}
              customerNote={customerNote}
              onCustomerNoteChange={setCustomerNote}
              onPlaceOrder={() => { setShowCart(false); handlePlaceOrder(); }}
              isPlacingOrder={placeOrder.isPending}
            />
          </div>
        </div>
      )}

      {/* Floating cart badge (mobile) */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-5 left-0 right-0 flex justify-center z-30 px-4 lg:hidden">
          <button
            onClick={() => setShowCart(true)}
            className="flex items-center gap-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-lg transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>{cartCount} items</span>
            <span className="text-primary-200">·</span>
            <span>{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
