import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Wrench, HelpCircle, PhoneCall, ChevronRight, ArrowRight } from 'lucide-react';

export const LainnyaPage: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      id: 'standar-data',
      title: 'Standar Data',
      subtitle: 'Standar dan spesifikasi data geospasial nasional SNI & ISO 19115',
      path: '/standar-data',
      icon: FileText,
      iconBg: 'bg-blue-50 text-[#1A3BAF]',
    },
    {
      id: 'tools',
      title: 'Tools & Utilitas',
      subtitle: 'Aplikasi pendukung Palapa, Metadata Editor, dan Konverter Koordinat',
      path: '/tools',
      icon: Wrench,
      iconBg: 'bg-emerald-50 text-emerald-700',
    },
    {
      id: 'bantuan',
      title: 'Pusat Bantuan',
      subtitle: 'Panduan lengkap pengguna, petunjuk unduh data, dan handbook',
      path: '/bantuan',
      icon: HelpCircle,
      iconBg: 'bg-amber-50 text-amber-700',
    },
    {
      id: 'kontak',
      title: 'Kontak Kami',
      subtitle: 'Informasi kontak resmi Badan Informasi Geospasial Cibinong',
      path: '/kontak',
      icon: PhoneCall,
      iconBg: 'bg-purple-50 text-purple-700',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 select-none flex flex-col">
      {/* Title Header (exact Figma 86:2531 "Lainnya") */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1E1E1E] tracking-tight">
          Layanan & Direktori Lainnya
        </h1>
        <p className="text-xs md:text-sm text-[#717171] mt-1">
          Akses layanan standarisasi geospasial, aplikasi pendukung pemetaan, dan pusat bantuan teknis JIGN.
        </p>
      </div>

      {/* Menu Cards Stack on Mobile, 4-col Grid on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className="w-full bg-white rounded-2xl p-4 md:p-6 flex md:flex-col items-center md:items-start justify-between shadow-xs border border-slate-200/80 hover:border-[#1A3BAF]/40 hover:shadow-md active:scale-98 transition-all text-left group"
            >
              <div className="flex md:flex-col items-center md:items-start gap-3.5 md:gap-4">
                <div
                  className={`w-11 h-11 md:w-12 md:h-12 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6 stroke-[2]" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-[#1E1E1E] group-hover:text-[#1A3BAF] transition-colors leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#717171] mt-1 md:mt-2 line-clamp-2 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#1A3BAF] group-hover:bg-blue-50 transition-colors md:mt-6 shrink-0">
                <ChevronRight className="w-5 h-5 stroke-[2.2] md:hidden" />
                <ArrowRight className="w-4 h-4 stroke-[2.2] hidden md:block" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
