import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Map, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowLeft, Download, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Badge } from '../components/common/Badge';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { login, isLoading, error: authError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [statusInfo, setStatusInfo] = useState<string | null>(null);

  // Return path handling with strict internal-only validation (prevents open redirect)
  const rawReturnUrl = searchParams.get('returnUrl') || (location.state as any)?.from?.pathname;
  const sanitizeReturnUrl = (url?: string | null): string => {
    if (!url) return '/profile';
    if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\') && !url.includes(':')) {
      return url;
    }
    return '/profile';
  };
  const returnPath = sanitizeReturnUrl(rawReturnUrl);

  const downloadDataset = searchParams.get('downloadDataset');
  const downloadDoc = searchParams.get('downloadDoc');
  const downloadFormat = searchParams.get('format') || 'geojson';

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password.trim()) {
      setLocalError('Silakan masukkan alamat email dan kata sandi Anda.');
      return;
    }

    setStatusInfo('Memverifikasi kredensial akun...');

    try {
      const success = await login(email.trim(), password);
      if (success) {
        setStatusInfo('Login berhasil! Mengalihkan...');

        // Carry through pending download query parameters
        let destination = returnPath;
        if (downloadDataset && !destination.includes('downloadDataset')) {
          const sep = destination.includes('?') ? '&' : '?';
          destination = `${destination}${sep}autoDownload=${encodeURIComponent(downloadDataset)}&format=${encodeURIComponent(downloadFormat)}`;
        } else if (downloadDoc && !destination.includes('downloadDoc')) {
          const sep = destination.includes('?') ? '&' : '?';
          destination = `${destination}${sep}autoDownloadDoc=${encodeURIComponent(downloadDoc)}`;
        }

        setTimeout(() => {
          navigate(destination, { replace: true });
        }, 400);
      } else {
        setStatusInfo(null);
      }
    } catch (err: any) {
      setStatusInfo(null);
      setLocalError(err.message || 'Login gagal. Periksa kembali email dan password.');
    }
  };

  const handleUseDemoAccount = async (autoSubmit: boolean = true) => {
    setLocalError(null);
    const demoEmail = 'demo@inageoportal.go.id';
    const demoPass = 'Password123!';
    setEmail(demoEmail);
    setPassword(demoPass);

    if (autoSubmit) {
      setStatusInfo('Masuk menggunakan akun demo evaluator...');
      try {
        const success = await login(demoEmail, demoPass);
        if (success) {
          setStatusInfo('Login berhasil! Mengalihkan...');
          let destination = returnPath;
          if (downloadDataset && !destination.includes('downloadDataset')) {
            const sep = destination.includes('?') ? '&' : '?';
            destination = `${destination}${sep}autoDownload=${encodeURIComponent(downloadDataset)}&format=${encodeURIComponent(downloadFormat)}`;
          } else if (downloadDoc && !destination.includes('downloadDoc')) {
            const sep = destination.includes('?') ? '&' : '?';
            destination = `${destination}${sep}autoDownloadDoc=${encodeURIComponent(downloadDoc)}`;
          }

          setTimeout(() => {
            navigate(destination, { replace: true });
          }, 400);
        } else {
          setStatusInfo(null);
        }
      } catch (err: any) {
        setStatusInfo(null);
        setLocalError(err.message || 'Login akun demo gagal.');
      }
    }
  };

  return (
    <div className="w-full flex-1 flex items-center justify-center py-6 md:py-16 px-4 select-none">
      <div className="w-full max-w-[390px] md:max-w-[460px] space-y-4 md:space-y-5 bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-md md:shadow-xl">
        {/* Header Branding */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#153096] to-[#1A3BAF] text-white flex items-center justify-center mx-auto shadow-md">
            <Map className="w-6 h-6" />
          </div>

          <div className="inline-flex items-center gap-1.5 mt-0.5">
            <span className="font-extrabold text-[#1A3BAF] tracking-tight text-lg">INA-GEOPORTAL</span>
            <Badge variant="demo" size="sm">DEMO</Badge>
          </div>

          <h2 className="text-lg font-bold text-[#1E1E1E]">Masuk ke Akun</h2>

          <p className="text-xs text-[#717171] leading-relaxed">
            Akses katalog peta dan dokumen terbuka untuk publik. Masuk ke akun diperlukan untuk mengunduh berkas fisik resmi.
          </p>
        </div>

        {/* Download Intended Context Banner */}
        {(downloadDataset || downloadDoc) && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
            <Download className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-950 block">Login Diperlukan untuk Mengunduh</span>
              <p className="text-[11px] text-amber-800 leading-normal">
                Dokumen pilihan Anda tersimpan aman. Setelah login berhasil, Anda akan otomatis kembali ke berkas untuk mengunduh.
              </p>
            </div>
          </div>
        )}

        {/* Quick Demo Credentials Card */}
        <div className="p-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A3BAF]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Akun Demo Evaluator</span>
            </div>
            <button
              type="button"
              onClick={() => handleUseDemoAccount(true)}
              className="text-[11px] font-bold text-white bg-[#1A3BAF] hover:bg-[#153096] px-2.5 py-1 rounded-md shadow-xs transition-colors active:scale-95"
            >
              1-Klik Masuk
            </button>
          </div>
          <div className="text-[11px] text-slate-600 space-y-0.5 font-mono bg-white/80 p-2 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Email:</span>
              <span className="font-semibold text-slate-800">demo@inageoportal.go.id</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Sandi:</span>
              <span className="font-semibold text-slate-800">Password123!</span>
            </div>
          </div>
        </div>

        {/* Status / Loading Notification */}
        {statusInfo && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-[#1A3BAF]" />
            <span className="font-medium text-[11px]">{statusInfo}</span>
          </div>
        )}

        {/* Error Notification */}
        {(localError || authError) && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-[11px] block">Autentikasi Gagal</span>
              <span className="text-[11px] leading-relaxed block">{localError || authError}</span>
            </div>
          </div>
        )}

        {/* Email & Password Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alamat Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1A3BAF] bg-white transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Kata Sandi
              </label>
              <button
                type="button"
                onClick={() => handleUseDemoAccount(false)}
                className="text-[11px] text-[#1A3BAF] hover:underline"
              >
                Isi Sandi Demo
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1A3BAF] bg-white transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
                <span>Memproses Masuk...</span>
              </>
            ) : (
              <span>Masuk ke Akun</span>
            )}
          </button>
        </form>

        {/* Link to Register */}
        <div className="text-center text-xs text-slate-600 pt-2 border-t border-slate-100">
          Belum punya akun?{' '}
          <Link
            to={returnPath ? `/register?returnUrl=${encodeURIComponent(returnPath)}` : '/register'}
            className="text-[#1A3BAF] font-bold hover:underline"
          >
            Daftar Sekarang
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
