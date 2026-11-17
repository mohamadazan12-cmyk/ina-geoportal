import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Network, Database, Download, Layers, AlertCircle, RefreshCw } from 'lucide-react';
import { statsService } from '../../services/statsService';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { formatNumber } from '../../utils/formatters';

export const StatsSection: React.FC = () => {
  const navigate = useNavigate();

  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['overviewStats'],
    queryFn: () => statsService.getOverviewStats(),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="py-12 bg-white border-b border-slate-200">
        <LoadingSpinner label="Memuat ringkasan statistik jaringan..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-8 bg-amber-50 border-b border-amber-200 px-4 text-center">
        <div className="inline-flex items-center gap-2 text-amber-800 text-sm font-semibold mb-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          Gagal mengambil statistik server: {(error as Error)?.message || 'Gangguan koneksi'}
        </div>
        <div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-amber-300 rounded-lg text-amber-900 hover:bg-amber-100 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Simpul Jaringan Terhubung',
      value: formatNumber(stats?.totalNodes),
      sub: 'Kementerian, Lembaga & Pemda',
      icon: Network,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      link: '/simpul',
    },
    {
      label: 'Dataset Geospasial',
      value: formatNumber(stats?.totalDatasets),
      sub: 'Vektor SHP, GeoJSON & WMS',
      icon: Database,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      link: '/katalog',
    },
    {
      label: 'Aktivitas Pengunduhan',
      value: formatNumber(stats?.totalDownloads),
      sub: 'Penelitian & Perencanaan Publik',
      icon: Download,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      link: '/katalog',
    },
  ];

  return (
    <section className="py-12 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Statistik Jaringan Informasi Geospasial</h2>
              <Badge variant="demo" size="sm">DEMO</Badge>
            </div>
            <p className="text-xs text-slate-500">
              Data terintegrasi dari seluruh simpul jaringan produsen data spasial Indonesia
            </p>
          </div>
          <span className="text-[11px] text-slate-400">
            Terakhir diperbarui: {new Date(stats?.lastUpdated || Date.now()).toLocaleTimeString('id-ID')} WIB
          </span>
        </div>

        {/* Counter Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                onClick={() => navigate(card.link)}
                className={`p-6 rounded-2xl border ${card.borderColor} ${card.bgColor}/30 hover:${card.bgColor}/70 transition-all cursor-pointer shadow-sm hover:shadow-md group`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                    <div className="text-3xl font-extrabold text-slate-900 mt-2 group-hover:text-emerald-700 transition-colors">
                      {card.value}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bgColor} ${card.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top Thematic Categories */}
        {stats?.topCategories && stats.topCategories.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Kategori Tematik Utama
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {stats.topCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/katalog?category=${cat.id}`)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/50 text-left transition-all group"
                >
                  <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 truncate">
                    {cat.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {cat.count} dataset
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
