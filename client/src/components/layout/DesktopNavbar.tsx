import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  Database,
  Map,
  Network,
  Download,
  FileText,
  Wrench,
  HelpCircle,
  PhoneCall,
  User,
  LogOut,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import garudaLogo from '../../assets/figma/garuda_pancasila.png';
import bigLogo from '../../assets/figma/logo_geospasial.png';

export const DesktopNavbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on route change or click outside
  useEffect(() => {
    setDropdownOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const primaryNavItems = [
    { to: '/', label: 'Beranda', icon: Compass },
    { to: '/katalog', label: 'Katalog Peta', icon: Database },
    { to: '/webmap', label: 'Webmap', icon: Map },
    { to: '/simpul', label: 'Simpul Jaringan', icon: Network },
    { to: '/unduh', label: 'Unduh Data', icon: Download },
  ];

  const moreMenuItems = [
    {
      to: '/standar-data',
      label: 'Standar Data Geospasial',
      description: 'Katalog SNI dan spesifikasi dokumen JIGN',
      icon: FileText,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      to: '/tools',
      label: 'Tools GIS & Utilitas',
      description: 'Palapa, Metadata Editor, dan Konverter Koordinat',
      icon: Wrench,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      to: '/bantuan',
      label: 'Pusat Bantuan & Panduan',
      description: 'Buku panduan unduh dan handbook pemetaan',
      icon: HelpCircle,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      to: '/kontak',
      label: 'Kontak Kami (BIG)',
      description: 'Pusat Pengelolaan Informasi Geospasial Cibinong',
      icon: PhoneCall,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      to: '/lainnya',
      label: 'Semua Menu Lainnya',
      description: 'Ikhtisar seluruh direktori layanan pendukung',
      icon: Layers,
      color: 'text-slate-600 bg-slate-100',
    },
  ];

  const isMoreActive = ['/standar-data', '/tools', '/bantuan', '/kontak', '/lainnya'].some((path) =>
    location.pathname.startsWith(path)
  );

  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-[#1A3BAF]/20 sticky top-0 z-40 select-none shadow-xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
        {/* Brand Logo (left) */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          {/* Garuda emblem in circle */}
          <div className="w-[42px] h-[42px] rounded-full border-2 border-[#BFB709] bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <img
              src={garudaLogo}
              alt="Garuda Pancasila"
              className="w-[30px] h-[32px] object-contain"
            />
          </div>

          {/* BIG Logo */}
          <img
            src={bigLogo}
            alt="Badan Informasi Geospasial"
            className="h-[38px] w-auto object-contain shrink-0"
          />

          {/* Brand Text */}
          <div className="flex flex-col justify-center leading-none pl-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[#1A3BAF] font-extrabold text-[19px] tracking-tight">
                GEOSPASIAL
              </span>
              <span className="text-[10px] font-bold text-[#1A3BAF] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                v2.0
              </span>
            </div>
            <span className="text-[#1E1E1E] font-medium text-[12px] mt-0.5 tracking-wide">
              Untuk Negeri • Ina-Geoportal
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links (Center) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-50 text-[#1A3BAF] shadow-xs'
                      : 'text-[#1E1E1E] hover:text-[#1A3BAF] hover:bg-slate-50'
                  }`
                }
              >
                <Icon className="w-4 h-4 stroke-[2.2]" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {/* More menu dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                isMoreActive || dropdownOpen
                  ? 'bg-blue-50 text-[#1A3BAF]'
                  : 'text-[#1E1E1E] hover:text-[#1A3BAF] hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4 stroke-[2.2]" />
              <span>Layanan Lain</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-fadeIn">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Layanan & Standardisasi JIGN
                </div>
                <div className="space-y-1 mt-1">
                  {moreMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setDropdownOpen(false)}
                        className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                          isActive
                            ? 'bg-blue-50 text-[#1A3BAF]'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}
                        >
                          <Icon className="w-4 h-4 stroke-[2]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-tight">{item.label}</div>
                          <div className="text-[11px] text-[#717171] leading-snug mt-0.5">
                            {item.description}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Tablet Navigation Compact (for 768px - 1023px) */}
        <nav className="hidden md:flex lg:hidden items-center gap-1">
          {primaryNavItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-50 text-[#1A3BAF]'
                      : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
                  }`
                }
              >
                <Icon className="w-4 h-4 stroke-[2.2]" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#1E1E1E] hover:text-[#1A3BAF]"
            >
              <span>Menu</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-fadeIn">
                <div className="space-y-1">
                  {primaryNavItems.slice(3).map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setDropdownOpen(false)}
                      className="block px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="border-t border-slate-100 my-1" />
                  {moreMenuItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setDropdownOpen(false)}
                      className="block px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Right Auth & Profile Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {isAuthenticated && user ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-[#1A3BAF]/40 hover:shadow-xs transition-all active:scale-98"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || 'User'}
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#1A3BAF] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex flex-col text-left leading-none max-w-[120px]">
                  <span className="text-xs font-bold text-[#1E1E1E] truncate">{user.name}</span>
                  <span className="text-[10px] text-[#717171] mt-0.5 truncate">{user.role || 'Pengguna'}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-fadeIn text-xs">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                  >
                    <User className="w-4 h-4 text-[#1A3BAF]" />
                    <span>Profil & Riwayat Unduh</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition-colors mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar Akun</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg text-xs font-bold text-[#1A3BAF] hover:bg-blue-50 border border-[#1A3BAF]/30 transition-all active:scale-95"
              >
                Masuk
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#1A3BAF] hover:bg-[#153096] shadow-sm transition-all active:scale-95"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
