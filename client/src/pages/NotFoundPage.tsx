import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, Database } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center py-20 px-4 text-center">
      <div className="max-w-md w-full space-y-4">
        <Compass className="w-16 h-16 text-emerald-600 mx-auto animate-bounce" />
        <h1 className="text-4xl font-extrabold text-slate-900">404</h1>
        <h2 className="text-lg font-bold text-slate-700">Halaman Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">
          Koordinat halaman yang Anda tuju berada di luar cakupan peta Ina-Geoportal.
        </p>
        <div className="pt-4 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Beranda</span>
          </Link>
          <Link
            to="/katalog"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Database className="w-4 h-4" />
            <span>Katalog Data</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
