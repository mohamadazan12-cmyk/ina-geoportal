import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlobalSearch } from './GlobalSearch';
import { Badge } from '../common/Badge';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  const quickTags = [
    { label: 'Batas Administrasi', query: 'batas' },
    { label: 'Jaringan Jalan', query: 'jalan' },
    { label: 'Rawan Bencana Gempa', query: 'gempa' },
    { label: 'Tutupan Lahan', query: 'tutupan' },
    { label: 'Fasilitas Kesehatan', query: 'kesehatan' },
    { label: 'Rupa Bumi Indonesia', query: 'rbi' },
  ];

  return (
    <div className="relative bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background geometric grid pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:24px_24px]"></div>

      <div className="relative max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2">
          <Badge variant="demo" size="md">INA-GEOPORTAL REDESIGN V2.0</Badge>
          <span className="text-xs text-emerald-400 font-medium">Jaringan Informasi Geospasial Nasional</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
          Satu Pintu Informasi <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
            Geospasial Indonesia
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Temukan, jelajahi, visualisasikan, dan unduh data geospasial resmi dari kementerian, lembaga, serta pemerintah daerah seluruh Indonesia.
        </p>

        {/* Global Search Component */}
        <div className="pt-2">
          <GlobalSearch />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-400">
          <span className="font-medium text-slate-400">Topik Populer:</span>
          {quickTags.map((tag) => (
            <button
              key={tag.label}
              onClick={() => navigate(`/katalog?q=${encodeURIComponent(tag.query)}`)}
              className="px-3 py-1 rounded-full bg-slate-800/80 hover:bg-emerald-900/60 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/50 transition-all text-xs"
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
