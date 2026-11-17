import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  Search,
  Grid,
  List,
  ArrowUpDown,
  ArrowUpRight,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from '../store/useAuthStore';

import preview1 from '../assets/figma/card_preview_1.png';
import preview2 from '../assets/figma/card_preview_2.png';
import preview3 from '../assets/figma/card_preview_3.png';
import preview4 from '../assets/figma/card_preview_4.png';
import preview5 from '../assets/figma/card_preview_5.png';
import preview6 from '../assets/figma/card_preview_6.png';

const PREVIEW_IMAGES = [preview1, preview2, preview3, preview4, preview5, preview6];

export interface StandarDoc {
  id: string;
  code: string;
  title: string;
  category: 'prioritas' | 'non-prioritas';
  year: number;
  publisher: string;
  description: string;
  pages: number;
  format?: string;
  isAvailableForDownload?: boolean;
  statusMessage?: string;
}

const STANDAR_DOCS_DATA: StandarDoc[] = [
  {
    id: 'sdg-01',
    code: 'SDG-01/BIG/2024',
    title: 'Standar Data Geospasial Peta Ketahanan dan Kerentanan Pangan Nasional',
    category: 'prioritas',
    year: 2024,
    publisher: 'Badan Informasi Geospasial & Badan Pangan Nasional',
    description: 'Spesifikasi penyusunan data spasial, struktur basis data atribut, katalog unsur geografi, dan simbolisasi peta kerentanan pangan skala 1:50.000.',
    pages: 48,
  },
  {
    id: 'sdg-02',
    code: 'SDG-02/BIG/2024',
    title: 'Standar Data Geospasial Biota Laut Dilindungi',
    category: 'prioritas',
    year: 2024,
    publisher: 'Kementerian Kelautan dan Perikanan & BIG',
    description: 'Pedoman standarisasi sebaran spasial mamalia laut, penyu, ikan dilindungi, dan terumbu karang bernilai konservasi tinggi perairan Indonesia.',
    pages: 62,
  },
  {
    id: 'sdg-03',
    code: 'SDG-03/ESDM/2023',
    title: 'Spesifikasi Produk Peta Bukaan Tambang Skala 1:50.000',
    category: 'non-prioritas',
    year: 2023,
    publisher: 'Kementerian ESDM & Pusat Standardisasi BIG',
    description: 'Ketentuan teknis digitasi citra satelit resolusi tinggi, batas konsesi IUP, dan perhitungan luasan reklamasi lahan tambang terbuka.',
    pages: 36,
  },
  {
    id: 'sdg-04',
    code: 'SDG-04/BMKG/2024',
    title: 'Spesifikasi Informasi Geospasial Gelombang Laut BMKG',
    category: 'prioritas',
    year: 2024,
    publisher: 'Badan Meteorologi, Klimatologi, dan Geofisika',
    description: 'Standar format model numerik oseanografi, data tinggi gelombang signifikan, periode gelombang, dan diseminasi format NetCDF/WMS.',
    pages: 54,
  },
  {
    id: 'sdg-05',
    code: 'SDG-05/BMKG/2024',
    title: 'Standar Data Angin Permukaan Laut Perairan Nusantara',
    category: 'prioritas',
    year: 2024,
    publisher: 'BMKG & Pusat Jaring Kontrol Geodesi BIG',
    description: 'Format data vektor arah dan kecepatan angin rata-rata harian pada ketinggian 10 meter untuk keselamatan pelayaran nasional.',
    pages: 42,
  },
  {
    id: 'sdg-06',
    code: 'SDG-06/BNPB/2024',
    title: 'Spesifikasi Penyajian Peta Rawan Bencana Longsor Skala 1:25.000',
    category: 'prioritas',
    year: 2024,
    publisher: 'BNPB & Badan Informasi Geospasial',
    description: 'Klasifikasi indeks kerentanan gerakan tanah berdasarkan curah hujan ekstrem, kemiringan lereng, dan geologi formasi batuan.',
    pages: 70,
  },
  {
    id: 'sdg-07',
    code: 'SDG-07/KLHK/2023',
    title: 'Standar Batas Kawasan Hutan Konservasi & Suaka Margasatwa',
    category: 'prioritas',
    year: 2023,
    publisher: 'Kementerian Lingkungan Hidup dan Kehutanan',
    description: 'Spesifikasi penetapan batas definitif kawasan konservasi darat dan perairan berdasarkan berita acara tata batas.',
    pages: 58,
  },
  {
    id: 'sdg-08',
    code: 'SDG-08/PUPR/2023',
    title: 'Spesifikasi Teknis Basis Data Jaringan Irigasi Primer dan Sekunder',
    category: 'non-prioritas',
    year: 2023,
    publisher: 'Kementerian PUPR Direktorat SDA',
    description: 'Standarisasi kodifikasi aset bendung, saluran primer, pintu air, dan peta petak tersier skala detail 1:5.000.',
    pages: 45,
  },
];

export const StandarDataPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'all' | 'prioritas' | 'non-prioritas'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<StandarDoc | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Fetch verified documents from backend with live physical availability
  const { data: apiDocs = STANDAR_DOCS_DATA } = useQuery({
    queryKey: ['officialStandardDocuments'],
    queryFn: async () => {
      try {
        const res: any = await apiClient.get('/documents');
        return res.data || STANDAR_DOCS_DATA;
      } catch {
        return STANDAR_DOCS_DATA;
      }
    },
    initialData: STANDAR_DOCS_DATA,
  });

  // Handle auto-open if redirected from login with pending document
  useEffect(() => {
    const autoDocId = searchParams.get('autoDownloadDoc');
    if (autoDocId && apiDocs.length > 0) {
      const match = apiDocs.find((d: StandarDoc) => d.id === autoDocId);
      if (match) {
        setSelectedDoc(match);
      }
    }
  }, [searchParams, apiDocs]);

  const filteredDocs = apiDocs.filter((doc: StandarDoc) => {
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'prioritas'
        ? doc.category === 'prioritas'
        : doc.category === 'non-prioritas';

    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  }).sort((a: StandarDoc, b: StandarDoc) => {
    return sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
  });

  return (
    <div className="w-full flex flex-col px-5 pt-4 pb-8 select-none">
      {/* 1. Header with Back button and Title (exact Figma 160:2213) */}
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
            Standar Data Geospasial
          </h1>
          <span className="text-[11px] text-[#717171]">
            Katalog Standarisasi Nasional JIGN
          </span>
        </div>
      </div>

      {/* 2. Search Input Bar (exact Figma 160:2215 Frame 50) */}
      <div className="relative w-full mb-3">
        <div className="w-full h-11 bg-white rounded-lg border border-slate-200 flex items-center px-3.5 shadow-sm focus-within:ring-2 focus-within:ring-[#1A3BAF]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari standar data, kode SNI, atau tema..."
            className="flex-1 bg-transparent text-xs text-[#1E1E1E] placeholder-[#717171] outline-none pr-2"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <Search className="w-4 h-4 text-[#1A3BAF]" />
          )}
        </div>
      </div>

      {/* 3. Category Filter Tabs (exact Figma 160:2226 Group 61) */}
      <div className="w-full bg-[#D9D9D9] rounded-lg p-1 flex items-center gap-1 mb-3 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex-1 h-9 rounded-md text-xs transition-all font-medium flex items-center justify-center ${
            activeTab === 'all'
              ? 'bg-white text-[#1A3BAF] font-semibold shadow-sm'
              : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
          }`}
        >
          Semua (60)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prioritas')}
          className={`flex-1 h-9 rounded-md text-xs transition-all font-medium flex items-center justify-center ${
            activeTab === 'prioritas'
              ? 'bg-white text-[#1A3BAF] font-semibold shadow-sm'
              : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
          }`}
        >
          Data Prioritas (50)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('non-prioritas')}
          className={`flex-1 h-9 rounded-md text-xs transition-all font-medium flex items-center justify-center ${
            activeTab === 'non-prioritas'
              ? 'bg-white text-[#1A3BAF] font-semibold shadow-sm'
              : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
          }`}
        >
          Non Prioritas (10)
        </button>
      </div>

      {/* 4. Controls Bar (Document Counter + Sort + Grid/List View Toggles) */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-semibold text-[#1E1E1E]">
          {filteredDocs.length} Dokumen Ditemukan
        </span>

        <div className="flex items-center gap-1.5">
          {/* Sort button */}
          <button
            type="button"
            onClick={() => setSortAsc(!sortAsc)}
            aria-label="Urutkan dokumen"
            title="Urutkan Dokumen"
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:text-[#1A3BAF] shadow-sm"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>

          {/* List View Toggle */}
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label="Tampilan List"
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-sm ${
              viewMode === 'list'
                ? 'bg-[#1A3BAF] text-white border-[#1A3BAF]'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <List className="w-4 h-4" />
          </button>

          {/* Grid View Toggle */}
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label="Tampilan Grid"
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-sm ${
              viewMode === 'grid'
                ? 'bg-[#1A3BAF] text-white border-[#1A3BAF]'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5. Document List / Grid (exact Figma 160:1987 & 166:2690) */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-slate-200 my-4">
          <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-sm text-[#1E1E1E]">Dokumen Tidak Ditemukan</p>
          <p className="text-xs text-[#717171] mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW (exact Figma 160:1987) */
        <div className="space-y-4">
          {filteredDocs.map((doc: StandarDoc, idx: number) => {
            const previewImg = PREVIEW_IMAGES[idx % PREVIEW_IMAGES.length];
            return (
              <div
                key={doc.id}
                className="w-full bg-white rounded-lg p-3.5 shadow-sm border border-slate-100 flex flex-col gap-3 transition-all hover:shadow-md"
              >
                {/* Preview Thumbnail */}
                <div className="relative w-full h-[140px] rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={previewImg}
                    alt={doc.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Badge overlays */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                    <span className="bg-white/90 backdrop-blur-sm text-[#1A3BAF] font-bold text-[10px] px-2 py-0.5 rounded-full border border-blue-200">
                      DOKUMEN
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        doc.category === 'prioritas'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {doc.category === 'prioritas' ? 'PRIORITAS' : 'NON PRIORITAS'}
                    </span>
                    <span className="bg-slate-900/70 text-white text-[10px] px-2 py-0.5 rounded-full">
                      {doc.year}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <span className="text-[11px] font-mono font-semibold text-[#1A3BAF]">
                    {doc.code}
                  </span>
                  <h3 className="font-semibold text-base text-[#1E1E1E] leading-snug mt-0.5">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-[#717171] line-clamp-2 mt-1">
                    {doc.description}
                  </p>
                </div>

                {/* Solid Blue Button \"Lihat Detail ↗\" (exact Figma Frame 50) */}
                <button
                  type="button"
                  onClick={() => setSelectedDoc(doc)}
                  className="w-full h-[44px] bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all"
                >
                  <span>Lihat Detail</span>
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW (exact Figma 166:2690) */
        <div className="space-y-2.5">
          {filteredDocs.map((doc: StandarDoc, idx: number) => {
            const previewImg = PREVIEW_IMAGES[idx % PREVIEW_IMAGES.length];
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className="w-full bg-white rounded-lg p-3 shadow-sm border border-slate-100 flex items-center gap-3 hover:shadow-md transition-all cursor-pointer active:scale-98"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                  <img
                    src={previewImg}
                    alt={doc.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                        doc.category === 'prioritas'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {doc.category === 'prioritas' ? 'PRIORITAS' : 'NON'}
                    </span>
                    <span className="text-[10px] font-mono text-[#717171]">
                      {doc.year}
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-[#1E1E1E] leading-snug truncate">
                    {doc.title}
                  </h4>
                  <p className="text-[10px] text-[#717171] truncate mt-0.5">
                    {doc.code} • {doc.pages} Halaman
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1A3BAF] flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal for Selected Document */}
      {selectedDoc && (
        <Modal
          isOpen={Boolean(selectedDoc)}
          onClose={() => {
            setSelectedDoc(null);
            setDownloadError(null);
          }}
          title="Detail Dokumen Standar Data"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  selectedDoc.category === 'prioritas'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {selectedDoc.category === 'prioritas' ? 'DATA PRIORITAS' : 'DATA NON PRIORITAS'}
              </span>
              <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded">
                {selectedDoc.code}
              </span>
              <span className="text-xs text-slate-500">Tahun {selectedDoc.year}</span>
            </div>

            <div>
              <h3 className="font-bold text-base text-[#1E1E1E] leading-snug">
                {selectedDoc.title}
              </h3>
              <p className="text-xs text-[#717171] mt-1">
                Diterbitkan oleh: <span className="font-medium text-[#1E1E1E]">{selectedDoc.publisher}</span>
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Deskripsi & Ruang Lingkup Standar
              </h4>
              <p className="text-xs text-[#1E1E1E] leading-relaxed">
                {selectedDoc.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-500 block text-[10px]">Ketebalan Dokumen</span>
                <span className="font-semibold text-slate-800">{selectedDoc.pages} Halaman Standar</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-500 block text-[10px]">Status Ketersediaan Berkas</span>
                {selectedDoc.isAvailableForDownload ? (
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tersedia
                  </span>
                ) : (
                  <span className="font-semibold text-amber-700 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Belum Tersedia
                  </span>
                )}
              </div>
            </div>

            {/* Status Information Box */}
            {selectedDoc.isAvailableForDownload ? (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-950 block">Berkas Resmi Siap Diunduh</span>
                  <p className="text-[11px] text-emerald-800">
                    Dokumen format PDF resmi telah terverifikasi dan siap diunduh oleh pengguna terotentikasi.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-950 block">Dokumen belum tersedia untuk diunduh.</span>
                  <p className="text-[11px] text-amber-800 leading-normal">
                    Metadata dan ruang lingkup standar dapat diakses bebas oleh publik. Berkas fisik PDF resmi sedang dalam tahap digitalisasi publikasi oleh instansi penerbit terkait.
                  </p>
                </div>
              </div>
            )}

            {/* Authentication Notice if File is Available but User is Anonymous */}
            {selectedDoc.isAvailableForDownload && !isAuthenticated && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-[#1A3BAF] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-950 block">Login Diperlukan untuk Mengunduh</span>
                  <p className="text-[11px] text-blue-800">
                    Silakan masuk menggunakan akun Ina-Geoportal Anda untuk mengunduh dokumen standar ini.
                  </p>
                </div>
              </div>
            )}

            {downloadError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{downloadError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center gap-2">
              {selectedDoc.isAvailableForDownload ? (
                isAuthenticated ? (
                  <a
                    href={`/api/v1/documents/${selectedDoc.id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`}
                    download={`${selectedDoc.code.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`}
                    className="flex-1 h-11 bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-lg font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh PDF Lengkap</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/login?returnUrl=/standar-data&downloadDoc=${selectedDoc.id}`);
                    }}
                    className="flex-1 h-11 bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-lg font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Masuk ke Akun untuk Mengunduh</span>
                  </button>
                )
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 h-11 bg-slate-100 border border-slate-200 text-slate-400 rounded-lg font-medium text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Dokumen Belum Tersedia untuk Diunduh</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedDoc(null);
                  setDownloadError(null);
                }}
                className="px-4 h-11 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
