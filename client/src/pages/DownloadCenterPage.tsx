import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Database, FolderDown, X } from 'lucide-react';
import { datasetService } from '../services/datasetService';
import { Dataset } from '../types/dataset';
import { DownloadModal } from '../components/catalog/DownloadModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';

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

  const filteredItems = searchQuery.trim()
    ? mergedItems.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.abstract?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mergedItems;

  const handleOpenDownload = (item: Dataset) => {
    setSelectedDatasetForDownload(item);
  };

  return (
    <div className="w-full flex flex-col px-5 pt-4 pb-8 select-none">
      {/* Title Header (exact Figma 86:1468 \"Unduh Data\") */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#1E1E1E] tracking-tight">
          Unduh Data
        </h1>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#1A3BAF] text-xs font-semibold">
          <FolderDown className="w-3.5 h-3.5" />
          <span>{filteredItems.length} Data</span>
        </div>
      </div>

      {/* Search Input Bar (Figma Frame 86:1432) */}
      <div className="relative w-full mb-4">
        <div className="w-full h-11 bg-white rounded-lg border border-slate-200 flex items-center px-3.5 shadow-sm focus-within:ring-2 focus-within:ring-[#1A3BAF] focus-within:border-transparent">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari data unduhan geospasial..."
            className="flex-1 bg-transparent text-[#1E1E1E] placeholder-[#717171] text-xs outline-none pr-2"
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

      {/* Download Items List (Frame 54 in Figma 86:1343) */}
      {isLoading ? (
        <div className="py-16">
          <LoadingSpinner label="Memuat daftar data unduhan..." />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-slate-200 my-4">
          <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-sm text-[#1E1E1E]">Data Tidak Ditemukan</p>
          <p className="text-xs text-[#717171] mt-1">Coba sesuaikan kata kunci pencarian Anda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item, idx) => {
            const previewImg = PREVIEW_IMAGES[idx % PREVIEW_IMAGES.length];
            return (
              <div
                key={item.id}
                className="w-full bg-white rounded-lg p-3.5 shadow-sm border border-slate-100 flex flex-col gap-3 transition-all hover:shadow-md"
              >
                {/* Map Preview Image */}
                <div className="relative w-full h-[150px] rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={previewImg}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <Badge variant={item.accessType === 'restricted' ? 'restricted' : 'public'}>
                      {item.accessType.toUpperCase()}
                    </Badge>
                    <span className="bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px]">
                      {item.year || 2024}
                    </span>
                  </div>
                </div>

                {/* Title & metadata */}
                <div className="flex items-start gap-2">
                  <Database className="w-5 h-5 text-[#1A3BAF] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-base text-[#1E1E1E] leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#717171] line-clamp-1 mt-0.5">
                      Format: {item.formatList || 'SHP, GeoJSON, KML'} • Diunduh {item.downloadCount || 120}x
                    </p>
                  </div>
                </div>

                {/* Download Button (exact Figma Frame Group 50) */}
                <button
                  type="button"
                  onClick={() => handleOpenDownload(item)}
                  className="w-full h-[44px] bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all"
                >
                  <FolderDown className="w-4 h-4 stroke-[2.2]" />
                  <span>Unduh Data</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Download Modal Trigger */}
      <DownloadModal
        dataset={selectedDatasetForDownload}
        isOpen={Boolean(selectedDatasetForDownload)}
        onClose={() => setSelectedDatasetForDownload(null)}
      />
    </div>
  );
};
