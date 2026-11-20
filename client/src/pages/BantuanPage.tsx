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
    title: 'Standar Data Geospasial Handbook (SNI & ISO)',
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
    id: 'guide-qgis',
    title: 'Petunjuk Integrasi Ina-Geoportal ke QGIS Desktop',
    category: 'Aplikasi GIS Desktop',
    size: '3.5 MB',
    summary: 'Langkah menghubungkan layanan Web Map Service (WMS) dan Web Feature Service (WFS) Ina-Geoportal ke software QGIS 3.x.',
    steps: [
      'Salin URL WMS atau WFS dari halaman detail katalog data geospasial.',
      'Buka QGIS Desktop, buka panel Browser dan klik kanan pada WMS/WMTS atau WFS / OGC API - Features.',
      'Pilih New Connection, masukkan Nama Koneksi dan tempelkan URL layanan yang sudah disalin.',
      'Klik OK, perluas layer yang muncul, lalu seret (drag and drop) layer ke kanvas kerja QGIS Anda.',
    ],
  },
  {
    id: 'guide-simpul',
    title: 'Prosedur Penghubungan Simpul Jaringan Baru ke JIGN',
    category: 'Tata Kelola Jaringan',
    size: '4.2 MB',
    summary: 'Pedoman resmi Badan Informasi Geospasial bagi instansi kementerian, lembaga, provinsi, dan kabupaten/kota yang ingin menghubungkan geoportal lokal ke Jaringan Informasi Geospasial Nasional.',
    steps: [
      'Siapkan infrastruktur server GIS dan aplikasi Palapa versi terbaru.',
      'Pastikan metadata katalog telah tervalidasi skema ISO 19139.',
      'Kirimkan surat permohonan resmi koneksi simpul jaringan ke Pusat Pengelolaan dan Penyebarluasan Informasi Geospasial (PPIG) BIG.',
      'Tim teknis BIG akan melakukan uji interoperabilitas endpoint CSW/WFS sebelum mengaktifkan status simpul.',
    ],
  },
];

export const BantuanPage: React.FC = () => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>('guide-registrasi');

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 select-none flex flex-col space-y-6">
      {/* 1. Header with Back button and Title (exact Figma 185:1596) */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => navigate('/lainnya')}
          aria-label="Kembali ke menu Lainnya"
          className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 hover:text-[#1A3BAF] active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
        </button>
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-[#1E1E1E] tracking-tight">
            Pusat Bantuan & Panduan
          </h1>
          <span className="text-xs md:text-sm text-[#717171]">
            Petunjuk Penggunaan, Handbook SNI, dan Standarisasi Pemetaan JIGN
          </span>
        </div>
      </div>

      {/* 2. Intro Information Card */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A3BAF] flex items-center justify-center shrink-0">
          <HelpCircle className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div>
          <h2 className="font-bold text-sm md:text-base text-[#1E1E1E]">
            Dokumentasi Teknis & Panduan Resmi
          </h2>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mt-1">
            Unduh berkas handbook format PDF resmi atau pelajari langkah-langkah tata cara pemanfaatan layanan data geospasial pada daftar panduan di bawah ini.
          </p>
        </div>
      </div>

      {/* 3. Guides Accordion List */}
      <div className="space-y-3.5">
        {GUIDES_DATA.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className="w-full bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden transition-all hover:shadow-md hover:border-[#1A3BAF]/30"
            >
              {/* Header trigger row */}
              <button
                type="button"
                onClick={() => toggleExpand(item.id)}
                className="w-full p-4 md:p-5 flex items-center justify-between text-left gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A3BAF] flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] md:text-xs font-bold text-[#1A3BAF] block uppercase tracking-wider">
                      {item.category}
                    </span>
                    <h3 className="font-bold text-sm md:text-base text-[#1E1E1E] leading-snug truncate">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                    {item.size}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#1A3BAF]" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-fadeIn text-xs md:text-sm">
                  <p className="text-slate-700 leading-relaxed">
                    {item.summary}
                  </p>

                  <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200/80">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-800 block">
                      Langkah-Langkah Pelaksanaan:
                    </span>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-700 leading-normal pl-1 text-xs">
                      {item.steps.map((st, i) => (
                        <li key={i} className="pl-1">
                          <span className="text-slate-800">{st}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="pt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => alert(`Mengunduh dokumen panduan resmi: ${item.title}`)}
                      className="h-10 px-5 bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Dokumen Panduan ({item.size})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
