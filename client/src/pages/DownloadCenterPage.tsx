import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Database, FolderDown, X, Download } from 'lucide-react';
import { datasetService } from '../services/datasetService';
import { Dataset } from '../types/dataset';
import { DownloadModal } from '../components/catalog/DownloadModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';
import { useAuthStore } from '../store/useAuthStore';

import downloadCard1 from '../assets/figma/download_card_preview_1.png';
import preview1 from '../assets/figma/card_preview_1.png';
import preview2 from '../assets/figma/card_preview_2.png';
import preview3 from '../assets/figma/card_preview_3.png';
import preview4 from '../assets/figma/card_preview_4.png';
import preview5 from '../assets/figma/card_preview_5.png';
import preview6 from '../assets/figma/card_preview_6.png';

const PREVIEW_IMAGES = [
  downloadCard1,
  preview1,
  preview2,
  preview3,
  preview4,
  preview5,
  preview6,
];

// Presets from Figma Frame 86:1342
const FIGMA_DOWNLOAD_PRESETS = [
  { id: 'ds-rbi-sumatra', title: 'RBI per Wilayah Sumatra', defaultFormat: 'SHP', accessType: 'public', year: 2024 },
  { id: 'ds-banjir-sumatra-2025', title: 'Data Analisis Banjir Sumatra Tahun 2025', defaultFormat: 'GeoJSON', accessType: 'public', year: 2025 },
  { id: 'ds-ksp', title: 'Data KSP (Kebijakan Satu Peta)', defaultFormat: 'SHP', accessType: 'restricted', year: 2024 },
  { id: 'ds-batnas', title: 'Data Batnas (Batimetri Nasional)', defaultFormat: 'GeoTIFF', accessType: 'public', year: 2023 },
  { id: 'ds-demnas', title: 'Data Demnas (Digital Elevation Model Nasional)', defaultFormat: 'GeoTIFF', accessType: 'public', year: 2023 },
  { id: 'ds-rbi-wilayah', title: 'Data RBI per Wilayah', defaultFormat: 'SHP', accessType: 'public', year: 2024 },
  { id: 'ds-batas-wilayah', title: 'Data Batas Wilayah Administrasi', defaultFormat: 'SHP', accessType: 'public', year: 2024 },
  { id: 'ds-rbi-cetak-25k', title: 'Data RBI Cetak Skala 1:25.000', defaultFormat: 'PDF', accessType: 'public', year: 2023 },
  { id: 'ds-rbi-cetak-50k', title: 'Data RBI Cetak Skala 1:50.000', defaultFormat: 'PDF', accessType: 'public', year: 2023 },
  { id: 'ds-rbi-cetak-250k', title: 'Data RBI Cetak Skala 1:250.000', defaultFormat: 'PDF', accessType: 'public', year: 2023 },
];

export const DownloadCenterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDatasetForDownload, setSelectedDatasetForDownload] = useState<Dataset | null>(null);
  const { isAuthenticated } = useAuthStore();

  // Fetch real datasets from server
  const { data: datasetResult, isLoading } = useQuery({
    queryKey: ['downloadDatasets'],
    queryFn: () => datasetService.getDatasets({ limit: 20 }),
  });

  const liveDatasets = datasetResult?.data || [];

  // Combine live datasets with Figma presets so that any item clicked has a valid Dataset object
  const mergedItems = liveDatasets.length > 0 ? liveDatasets : FIGMA_DOWNLOAD_PRESETS.map((p, idx) => ({
    id: p.id,
    title: p.title,
    abstract: `Data geospasial resmi ${p.title} dari Badan Informasi Geospasial untuk keperluan analisis, perencanaan, dan pemetaan.`,
    purpose: 'Analisis dan pemetaan spasial',
    theme: 'Tematik & Dasar',
    category: 'Kebijakan Satu Peta',
    scale: '1:25.000',
    year: p.year,
    accessType: p.accessType as 'public' | 'restricted',
    formatList: 'SHP, GeoJSON, KML',
    downloadCount: 1420 + idx * 85,
    viewCount: 3800 + idx * 120,
    isDemo: false,
    keywords: 'geospasial, unduh, big',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as Dataset));

  // Auto-open download modal if returned from login
  useEffect(() => {
    const autoDownloadId = searchParams.get('autoDownload');
    if (autoDownloadId && mergedItems.length > 0) {
      const match = mergedItems.find((d) => d.id === autoDownloadId);
      if (match) {
        setSelectedDatasetForDownload(match);
      }
    }
  }, [searchParams, mergedItems]);

  const filteredItems = mergedItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.abstract && item.abstract.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 select-none flex flex-col">
      {/* Title Header (exact Figma 86:1468 "Unduh Data") */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1E1E1E] tracking-tight">
            Unduh Data Geospasial
          </h1>
          <p className="text-xs md:text-sm text-[#717171] mt-0.5">
            Pusat pengunduhan berkas fisik resmi SHP, GeoJSON, TIFF, dan KML/KMZ
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-[#1A3BAF] text-xs font-semibold w-fit">
          <FolderDown className="w-4 h-4" />
          <span>{filteredItems.length} Data Tersedia</span>
        </div>
      </div>

      {/* Search Input Bar (Figma Frame 86:1432) */}
      <div className="relative w-full max-w-2xl mb-6">
        <div className="w-full h-11 md:h-12 bg-white rounded-xl border border-slate-200 flex items-center px-4 shadow-xs focus-within:ring-2 focus-within:ring-[#1A3BAF] focus-within:border-transparent transition-all">
          <Search className="w-4 h-4 md:w-5 md:h-5 text-[#1A3BAF] mr-2.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari data unduhan geospasial, lembar peta, atau format..."
            className="flex-1 bg-transparent text-[#1E1E1E] placeholder-[#717171] text-xs md:text-sm outline-none pr-2"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Download Items List (Frame 54 in Figma 86:1343) */}
      {isLoading ? (
        <div className="py-24">
          <LoadingSpinner label="Memuat daftar data unduhan..." />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 my-4 shadow-xs">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-base text-[#1E1E1E]">Data Tidak Ditemukan</p>
          <p className="text-xs text-[#717171] mt-1">Coba sesuaikan kata kunci pencarian Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, idx) => {
            const previewImg = PREVIEW_IMAGES[idx % PREVIEW_IMAGES.length];
            return (
              <div
                key={item.id}
                className="w-full bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 flex flex-col justify-between gap-3.5 transition-all hover:shadow-md hover:border-[#1A3BAF]/30"
              >
                <div className="space-y-3">
                  {/* Map Preview Image */}
                  <div className="relative w-full h-[160px] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={previewImg}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <Badge variant={item.accessType === 'restricted' ? 'restricted' : 'public'}>
                        {item.accessType.toUpperCase()}
                      </Badge>
                      <span className="bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] font-medium">
                        {item.year || 2024}
                      </span>
                    </div>
                  </div>

                  {/* Title & metadata */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1A3BAF] flex items-center justify-center shrink-0 mt-0.5">
                      <Database className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm md:text-base text-[#1E1E1E] leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#717171] mt-1">
                        Format: <span className="font-semibold text-slate-700">{item.formatList || 'SHP, GeoJSON, KML'}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Diunduh {item.downloadCount || 120}x • BIG Indonesia
                      </p>
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                <button
                  type="button"
                  onClick={() => setSelectedDatasetForDownload(item)}
                  className="w-full h-11 bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>{item.accessType === 'restricted' && !isAuthenticated ? 'Masuk untuk Mengunduh' : 'Unduh Berkas'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Download Modal */}
      <DownloadModal
        dataset={selectedDatasetForDownload}
        isOpen={Boolean(selectedDatasetForDownload)}
        onClose={() => setSelectedDatasetForDownload(null)}
      />
    </div>
  );
};
