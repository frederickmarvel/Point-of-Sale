import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import type { LoginRequest } from '@/types';

export function useAuth() {
  const navigate = useNavigate();
  const { token, admin, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: (data) => {
      setAuth(data.token, data.admin);
      toast.success(`Welcome back, ${data.admin.name}!`);
      navigate('/admin/dashboard');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message ?? 'Login failed. Please try again.');
    },
  });

  const logout = () => {
    clearAuth();
    toast.success('Logged out successfully.');
    navigate('/admin/login');
  };

  return {
    token,
    admin,
    isAuthenticated,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout,
  };
}
