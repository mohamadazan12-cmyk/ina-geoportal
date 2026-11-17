import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Download,
  HelpCircle,
} from 'lucide-react';

interface GuideItem {
  id: string;
  title: string;
  category: string;
  size: string;
  summary: string;
  steps: string[];
}

const GUIDES_DATA: GuideItem[] = [
  {
    id: 'guide-registrasi',
    title: 'Panduan Registrasi Ina-Geoportal V2/V3',
    category: 'Akun & Akses Data',
    size: '2.4 MB',
    summary: 'Tata cara pendaftaran akun pengguna perorangan, kementerian/lembaga, pemda, dan akademisi untuk mengakses dataset berstatus Terbatas (Restricted).',
    steps: [
      'Buka halaman Registrasi melalui tombol profil pengguna di pojok kanan atas.',
      'Isi formulir pendaftaran: Nama Lengkap, Email Kedinasan/Pribadi, Instansi, dan Nomor WhatsApp/Telepon.',
      'Lakukan verifikasi email dengan mengklik tautan konfirmasi yang dikirimkan.',
      'Setelah akun aktif, Anda dapat langsung login dan mengajukan unduh dataset restricted beserta peruntukannya.',
    ],
  },
  {
    id: 'guide-handbook',
    title: 'Standar Data Geospasial Handbook',
    category: 'Standarisasi JIGN',
    size: '8.1 MB',
    summary: 'Buku saku acuan struktur basis data, metadata ISO 19115, aturan topologi geometri, serta tata kelola interoperabilitas JIGN.',
    steps: [
      'Pahami prinsip Satu Peta: satu standar, satu basis data, satu geoportal, dan satu referensi geospasial.',
      'Pastikan format koordinat mematuhi SRGI 2013 (Sistem Referensi Geospasial Indonesia) atau WGS 84.',
      'Gunakan kodifikasi unsur geografi yang diterbitkan Badan Informasi Geospasial (BIG).',
    ],
  },
  {
    id: 'guide-demnas',
    title: 'Panduan Unduh Data Demnas & Batnas',
    category: 'Layanan Unduhan',
    size: '1.8 MB',
    summary: 'Petunjuk memotong (clipping) dan mengunduh data Digital Elevation Model Nasional (DEMNAS) resolusi 0.27-arcsecond serta BATNAS per lembar peta.',
    steps: [
      'Pilih menu Unduh pada bilah navigasi bawah aplikasi.',
      'Cari lembar peta DEMNAS atau masukkan koordinat batas area minat (Bounding Box).',
      'Pilih format file GeoTIFF atau NetCDF sesuai kebutuhan perangkat lunak GIS Anda.',
      'Klik tombol Unduh Data dan konfirmasi tujuan pemanfaatan data.',
    ],
  },
  {
    id: 'guide-metadata',
    title: 'Petunjuk Penggunaan Metadata Editor',
    category: 'Pengelolaan Data',
    size: '3.5 MB',
    summary: 'Panduan teknis pengisian elemen wajib dan kondisional metadata geospasial sesuai standar ISO 19115/19139 menggunakan aplikasi Palapa Metadata Editor.',
    steps: [
      'Unduh dan pasang aplikasi Palapa Desktop atau akses Metadata Editor daring.',
      'Buka berkas shapefile atau geodatabase yang akan didokumentasikan.',
      'Lengkapi informasi identifikasi, batas wilayah koordinat, riwayat lineage, dan kontak narahubung data.',
      'Ekspor metadata ke format XML standar ISO 19139 untuk diunggah ke Ina-Geoportal.',
    ],
  },
  {
    id: 'guide-sni',
    title: 'Katalog SNI Informasi Geospasial 2026',
    category: 'Katalog Standar Resmi',
    size: '5.2 MB',
    summary: 'Daftar lengkap Standar Nasional Indonesia (SNI) bidang informasi geospasial yang telah ditetapkan BSN dan BIG sebagai pedoman resmi nasional.',
    steps: [
      'Cari nomor SNI berdasarkan topik: Peta Rupabumi, Peta Tematik, Batas Daerah, atau Geodesi.',
      'Gunakan dokumen SNI sebagai dasar acuan spesifikasi teknis kerangka acuan kerja (KAK).',
    ],
  },
];

export const BantuanPage: React.FC = () => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>('guide-registrasi');

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="w-full flex flex-col px-5 pt-4 pb-8 select-none">
      {/* Header with Back button and Title (exact Figma 185:1682) */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => navigate('/lainnya')}
          aria-label="Kembali ke menu Lainnya"
          className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:text-[#1A3BAF] active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1E1E1E] tracking-tight">
            Bantuan & Panduan
          </h1>
          <span className="text-[11px] text-[#717171]">
            Panduan resmi dan tutorial operasional Ina-Geoportal
          </span>
        </div>
      </div>

      {/* Guides List (exact Figma 185:1596 Group 2 - Group 6) */}
      <div className="space-y-3">
        {GUIDES_DATA.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className="w-full bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md"
            >
              {/* Header trigger row */}
              <button
                type="button"
                onClick={() => toggleExpand(item.id)}
                className="w-full p-3.5 flex items-center justify-between text-left gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1A3BAF] flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-[#1A3BAF] block">
                      {item.category}
                    </span>
                    <h3 className="font-semibold text-sm text-[#1E1E1E] leading-snug truncate">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.size}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-50 bg-slate-50/50 space-y-3 animate-fadeIn text-xs">
                  <p className="text-[#1E1E1E] leading-relaxed">
                    {item.summary}
                  </p>

                  <div className="space-y-1.5">
                    <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wider block">
                      Langkah-Langkah:
                    </span>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700 leading-normal pl-1">
                      {item.steps.map((st, i) => (
                        <li key={i} className="pl-1">
                          <span className="text-slate-800">{st}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alert(`Mengunduh dokumen panduan: ${item.title}`)}
                      className="flex-1 h-9 bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PDF ({item.size})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ Banner */}
      <div className="mt-5 p-4 bg-gradient-to-br from-[#0C1D36] to-[#1A3BAF] rounded-lg text-white shadow-md">
        <div className="flex items-center gap-2 mb-1.5">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <h4 className="font-bold text-sm">Butuh Bantuan Lebih Lanjut?</h4>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed mb-3">
          Tim Helpdesk JIGN siap membantu integrasi simpul jaringan, kendala login, atau permohonan data geospasial khusus.
        </p>
        <button
          type="button"
          onClick={() => navigate('/kontak')}
          className="w-full h-9 bg-white text-[#1A3BAF] hover:bg-slate-100 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-colors"
        >
          <span>Hubungi Kontak Kami</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
