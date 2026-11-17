import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Wrench, HelpCircle, PhoneCall, ChevronRight } from 'lucide-react';

export const LainnyaPage: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      id: 'standar-data',
      title: 'Standar Data',
      subtitle: 'Standar dan spesifikasi data geospasial nasional',
      path: '/standar-data',
      icon: FileText,
      iconBg: 'bg-blue-50 text-[#1A3BAF]',
    },
    {
      id: 'tools',
      title: 'Tools',
      subtitle: 'Aplikasi pendukung Palapa & Metadata Editor',
      path: '/tools',
      icon: Wrench,
      iconBg: 'bg-emerald-50 text-emerald-700',
    },
    {
      id: 'bantuan',
      title: 'Bantuan',
      subtitle: 'Panduan pengguna dan katalog SNI',
      path: '/bantuan',
      icon: HelpCircle,
      iconBg: 'bg-amber-50 text-amber-700',
    },
    {
      id: 'kontak',
      title: 'Kontak Kami',
      subtitle: 'Informasi kontak Badan Informasi Geospasial',
      path: '/kontak',
      icon: PhoneCall,
      iconBg: 'bg-purple-50 text-purple-700',
    },
  ];

  return (
    <div className="w-full flex flex-col px-5 pt-4 pb-8 select-none">
      {/* Title Header (exact Figma 86:2531 \"Lainnya\") */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#1E1E1E] tracking-tight">
          Lainnya
        </h1>
        <p className="text-xs text-[#717171] mt-0.5">
          Akses layanan informasi geospasial, standarisasi, dan dukungan teknis.
        </p>
      </div>

      {/* Menu Cards Stack (Frame 56 in Figma 178:755) */}
      <div className="space-y-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className="w-full h-[68px] bg-white rounded-lg p-3.5 flex items-center justify-between shadow-sm border border-slate-100 hover:shadow-md active:scale-98 transition-all text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0 shadow-sm`}
                >
                  <Icon className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-[#1E1E1E] group-hover:text-[#1A3BAF] transition-colors leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-[#717171] mt-0.5 line-clamp-1">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#1A3BAF] group-hover:bg-blue-50 transition-colors">
                <ChevronRight className="w-5 h-5 stroke-[2.2]" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
