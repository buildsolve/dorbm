import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Cake, Lock, Mail } from 'lucide-react';
import { authApi } from '../api/client';
import { setAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string; password: string }>();

  const onSubmit = async (data: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      setAuth(res.data.user, res.data.access_token);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F5F5F5' }}>
      {/* Left brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-80 p-10 shrink-0"
        style={{ background: '#FF385C' }}
      >
        <div className="flex items-center gap-3">
          <Cake className="w-7 h-7 text-white" />
          <span className="text-white font-semibold text-lg tracking-wide">DOR</span>
        </div>
        <div>
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Module</p>
          <h2 className="text-white text-2xl font-light leading-snug">Production<br />Management</h2>
          <p className="text-white/50 text-xs mt-4">Ingredients · Recipes · Planning · Storage</p>
        </div>
        <p className="text-white/30 text-xs">© {new Date().getFullYear()} DOR</p>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Cake className="w-6 h-6 text-[#FF385C]" />
            <span className="font-semibold text-[#32363A]">DOR</span>
          </div>

          <h1 className="text-xl font-semibold text-[#32363A] mb-1">Sign In</h1>
          <p className="text-xs text-[#6A6D70] mb-6 uppercase tracking-wide">Production Management System</p>

          <div
            className="bg-white p-6"
            style={{ border: '1px solid #D9D9D9', borderTop: '3px solid #FF385C' }}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">E-Mail Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#89919A]" />
                  <input
                    {...register('email', { required: 'Email is required' })}
                    type="email"
                    className="input pl-9"
                    placeholder="admin@cakeerp.com"
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-[#BB0000]">{errors.email.message}</p>}
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#89919A]" />
                  <input
                    {...register('password', { required: 'Password is required' })}
                    type="password"
                    className="input pl-9"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
                {errors.password && <p className="mt-1 text-xs text-[#BB0000]">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-2 mt-2"
                style={{ borderRadius: 4 }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 pt-4" style={{ borderTop: '1px solid #EDEFF0' }}>
              <p className="text-xs text-[#6A6D70] font-medium mb-2 uppercase tracking-wide">Demo Credentials</p>
              <div className="space-y-1 text-xs text-[#6A6D70]">
                <div className="flex justify-between"><span>Admin</span><span className="font-mono text-[#32363A]">admin@cakeerp.com / admin123</span></div>
                <div className="flex justify-between"><span>Production</span><span className="font-mono text-[#32363A]">production@cakeerp.com / prod123</span></div>
                <div className="flex justify-between"><span>Inventory</span><span className="font-mono text-[#32363A]">inventory@cakeerp.com / inv123</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
