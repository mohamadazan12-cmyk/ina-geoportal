import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, Database } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="w-full flex-1 flex items-center justify-center py-20 md:py-32 px-4 text-center select-none">
      <div className="max-w-md w-full space-y-5 bg-white p-8 md:p-10 rounded-2xl border border-slate-200/80 shadow-md">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1A3BAF] flex items-center justify-center mx-auto shadow-xs animate-bounce">
          <Compass className="w-8 h-8 stroke-[2.2]" />
        </div>
        <div>
          <h1 className="text-5xl font-extrabold text-[#1A3BAF] tracking-tight">404</h1>
          <h2 className="text-lg md:text-xl font-bold text-[#1E1E1E] mt-2">Halaman Tidak Ditemukan</h2>
          <p className="text-xs md:text-sm text-[#717171] mt-1.5 leading-relaxed">
            Koordinat atau tautan halaman yang Anda tuju berada di luar cakupan peta dan direktori Ina-Geoportal.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto px-5 py-2.5 bg-[#1A3BAF] hover:bg-[#153096] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Ke Beranda</span>
          </Link>
          <Link
            to="/katalog"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Database className="w-4 h-4" />
            <span>Katalog Data</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
