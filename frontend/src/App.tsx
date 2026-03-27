import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import LoginPage from '@/pages/admin/LoginPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import MenuPage from '@/pages/admin/MenuPage';
import OrdersPage from '@/pages/admin/OrdersPage';
import TablesPage from '@/pages/admin/TablesPage';
import OrderPage from '@/pages/customer/OrderPage';
import PaymentPage from '@/pages/customer/PaymentPage';

export default function App() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/admin" replace />} />

      {/* Admin redirect */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Public admin login */}
      <Route path="/admin/login" element={<LoginPage />} />

      {/* Protected admin routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/menu"
        element={
          <ProtectedRoute>
            <MenuPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tables"
        element={
          <ProtectedRoute>
            <TablesPage />
          </ProtectedRoute>
        }
      />

      {/* Public customer routes */}
      <Route path="/order/:tableId" element={<OrderPage />} />
      <Route path="/payment/:orderId" element={<PaymentPage />} />
    </Routes>
  );
}
