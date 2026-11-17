import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Database, Network, ArrowRight } from 'lucide-react';

export const QuickAccess: React.FC = () => {
  const navigate = useNavigate();

  const items = [
    {
      title: 'Webmap Interaktif',
      tagline: 'Spatial Viewer & OGC Layers',
      description: 'Eksplorasi peta interaktif Indonesia dengan multi-layer WMS, WFS, GeoJSON, analisis pengukuran, dan GetFeatureInfo.',
      icon: Map,
      route: '/webmap',
      buttonText: 'Buka Webmap',
      gradient: 'from-emerald-600 to-teal-700',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      title: 'Katalog & Unduh Data',
      tagline: 'Repositori Dataset Geospasial',
      description: 'Cari dan filter dataset berdasarkan kategori, instansi produsen, tahun, dan format shapefile, GeoJSON, maupun WMS.',
      icon: Database,
      route: '/katalog',
      buttonText: 'Jelajahi Katalog',
      gradient: 'from-sky-600 to-indigo-700',
      badgeColor: 'bg-sky-100 text-sky-800',
    },
    {
      title: 'Simpul Jaringan',
      tagline: 'Direktori K/L & Pemda',
      description: 'Daftar instansi wali data produsen informasi geospasial tingkat pusat, provinsi, dan kabupaten/kota se-Indonesia.',
      icon: Network,
      route: '/simpul',
      buttonText: 'Lihat Simpul',
      gradient: 'from-purple-600 to-pink-700',
      badgeColor: 'bg-purple-100 text-purple-800',
    },
  ];

  return (
    <section className="py-14 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl font-bold text-slate-900">Akses Cepat Layanan Geospasial</h2>
          <p className="text-sm text-slate-600 mt-2">
            Pilih modul kerja yang ingin Anda gunakan untuk kebutuhan analisis, riset, atau integrasi data Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-300 group"
              >
                <div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${item.gradient} text-white flex items-center justify-center mb-5 shadow-lg group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
                    {item.tagline}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-6">{item.description}</p>
                </div>

                <button
                  onClick={() => navigate(item.route)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 group-hover:bg-emerald-600 group-hover:text-white"
                >
                  <span>{item.buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
