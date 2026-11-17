import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Map, User, Mail, Lock, Building2, AlertCircle, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Badge } from '../components/common/Badge';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register, isLoading, error: authError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Return path handling
  const rawReturnUrl = searchParams.get('returnUrl');
  const sanitizeReturnUrl = (url?: string | null): string => {
    if (!url) return '/profile';
    if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\') && !url.includes(':')) {
      return url;
    }
    return '/profile';
  };
  const returnPath = sanitizeReturnUrl(rawReturnUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (name.trim().length < 2) {
      setLocalError('Nama lengkap minimal 2 karakter.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setLocalError('Format email tidak valid.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Kata sandi minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (!agreeTerms) {
      setLocalError('Anda harus menyetujui ketentuan layanan data geospasial.');
      return;
    }

    const success = await register({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      institution: institution.trim() || 'Umum',
    });

    if (success) {
      navigate(returnPath, { replace: true });
    }
  };

  return (
    <div className="w-full flex-1 flex items-center justify-center py-6 px-4 select-none">
      <div className="w-full max-w-[390px] space-y-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md">
        {/* Header Branding */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#153096] to-[#1A3BAF] text-white flex items-center justify-center mx-auto shadow-md">
            <Map className="w-6 h-6" />
          </div>

          <div className="inline-flex items-center gap-1.5 mt-0.5">
            <span className="font-extrabold text-[#1A3BAF] tracking-tight text-lg">INA-GEOPORTAL</span>
            <Badge variant="demo" size="sm">DEMO</Badge>
          </div>

          <h2 className="text-lg font-bold text-[#1E1E1E]">Daftar Akun Baru</h2>

          <p className="text-xs text-[#717171] leading-relaxed">
            Daftarkan akun untuk mengunduh dataset resmi, menyimpan bookmark peta, dan mencatat riwayat pemanfaatan spasial.
          </p>
        </div>

        {/* Error Notification */}
        {(localError || authError) && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-[11px] block">Pendaftaran Belum Berhasil</span>
              <span className="text-[11px] leading-relaxed block">{localError || authError}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Nama Lengkap */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Rian Pratama"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1A3BAF] bg-white transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alamat Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@institusi.go.id"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1A3BAF] bg-white transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Institusi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Institusi / Lembaga / Perguruan Tinggi
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Contoh: Pusat Riset Geospasial BRIN"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1A3BAF] bg-white transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Kata Sandi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kata Sandi (Min. 6 Karakter) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1A3BAF] bg-white transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Konfirmasi Kata Sandi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ulangi Kata Sandi <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1A3BAF] bg-white transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                aria-label={showConfirmPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Persetujuan Ketentuan */}
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-[#1A3BAF] rounded border-slate-300 focus:ring-[#1A3BAF]"
            />
            <label htmlFor="agreeTerms" className="text-[11px] text-slate-600 leading-tight">
              Saya menyetujui ketentuan pemanfaatan data geospasial dan kode etik akses JIGN.
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-[#1A3BAF] hover:bg-[#153096] disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 mt-2 active:scale-98"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mendaftarkan Akun...</span>
              </>
            ) : (
              <span>Daftar Akun Sekarang</span>
            )}
          </button>
        </form>

        {/* Link to Login */}
        <div className="text-center text-xs text-slate-600 pt-2 border-t border-slate-100">
          Sudah memiliki akun?{' '}
          <Link
            to={returnPath ? `/login?returnUrl=${encodeURIComponent(returnPath)}` : '/login'}
            className="text-[#1A3BAF] font-bold hover:underline"
          >
            Masuk di sini
          </Link>
        </div>

        {/* Back Link */}
        <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>

          <span className="text-[11px] text-slate-400">INA-Geoportal v2.0</span>
        </div>
      </div>
    </div>
  );
};
