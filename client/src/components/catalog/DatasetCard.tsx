import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, ArrowUpRight, Info, Download } from 'lucide-react';
import { Dataset } from '../../types/dataset';
import { Badge } from '../common/Badge';
import { DownloadModal } from './DownloadModal';
import { useAuthStore } from '../../store/useAuthStore';
import { userService } from '../../services/userService';

import preview1 from '../../assets/figma/card_preview_1.png';
import preview2 from '../../assets/figma/card_preview_2.png';
import preview3 from '../../assets/figma/card_preview_3.png';
import preview4 from '../../assets/figma/card_preview_4.png';
import preview5 from '../../assets/figma/card_preview_5.png';
import preview6 from '../../assets/figma/card_preview_6.png';

const PREVIEW_MAPS = [preview1, preview2, preview3, preview4, preview5, preview6];

interface DatasetCardProps {
  dataset: Dataset;
  initialBookmarked?: boolean;
  index?: number;
}

export const DatasetCard: React.FC<DatasetCardProps> = ({
  dataset,
  initialBookmarked = false,
  index = 0,
}) => {
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false);

  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsTogglingBookmark(true);
    try {
      const res = await userService.toggleBookmark(dataset.id);
      setIsBookmarked(res.bookmarked);
    } catch (err) {
      console.error('Bookmark toggle error:', err);
    } finally {
      setIsTogglingBookmark(false);
    }
  };

  const handleOpenInMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/webmap?layerId=${encodeURIComponent(dataset.id)}`);
  };

  const previewImg = PREVIEW_MAPS[index % PREVIEW_MAPS.length];

  return (
    <>
      <div className="w-full bg-white rounded-lg p-3.5 shadow-sm border border-slate-100 flex flex-col gap-3 transition-all hover:shadow-md select-none">
        {/* Map Preview Thumbnail (exact Figma card design) */}
        <div className="relative w-full h-[160px] rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
          <img
            src={previewImg}
            alt={dataset.title}
            className="w-full h-full object-cover"
          />

          {/* Badges overlay */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
            <Badge variant={dataset.accessType === 'restricted' ? 'restricted' : 'public'}>
              {dataset.accessType.toUpperCase()}
            </Badge>
            {dataset.dataSourceStatus === 'REAL_VERIFIED' || dataset.dataSourceStatus === 'REAL' ? (
              <Badge variant="real" size="sm">RESMI NASIONAL</Badge>
            ) : dataset.dataSourceStatus === 'REAL_PARTIAL_COVERAGE' ? (
              <Badge variant="partial" size="sm">RESMI PARSIAL</Badge>
            ) : dataset.dataSourceStatus === 'PENDING_AUTHORIZATION' ? (
              <Badge variant="pending" size="sm">IZIN PUSDATIN</Badge>
            ) : dataset.dataSourceStatus === 'FALLBACK' ? (
              <Badge variant="demo" size="sm">FALLBACK AKTIF</Badge>
            ) : dataset.dataSourceStatus === 'UNAVAILABLE' ? (
              <Badge variant="offline" size="sm">UNAVAILABLE</Badge>
            ) : dataset.isDemo ? (
              <Badge variant="demo" size="sm">DEMO / FALLBACK</Badge>
            ) : null}
          </div>

          {/* Bookmark control on top right */}
          <button
            onClick={handleToggleBookmark}
            disabled={isTogglingBookmark}
            aria-label={isBookmarked ? 'Hapus bookmark' : 'Simpan bookmark'}
            className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md shadow-sm transition-transform active:scale-90 ${
              isBookmarked
                ? 'bg-amber-500 text-white'
                : 'bg-white/80 text-slate-600 hover:bg-white hover:text-amber-500'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-white' : ''}`} />
          </button>
        </div>

        {/* Title row with map fold icon */}
        <div className="flex items-start gap-2">
          {/* Folded Map Icon matching Figma icon */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-[#1E1E1E] shrink-0 mt-0.5"
          >
            <path
              d="M9 18L3 21V5L9 2L15 5L21 2V18L15 21L9 18Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 2V18M15 5V21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="flex-1">
            <h3
              onClick={() => navigate(`/katalog/${dataset.id}`)}
              className="font-semibold text-base text-[#1E1E1E] leading-snug hover:text-[#1A3BAF] cursor-pointer line-clamp-2 transition-colors"
            >
              {dataset.title}
            </h3>
            <p className="text-xs text-[#717171] line-clamp-1 mt-0.5">
              {dataset.node?.name || dataset.distribution || 'Badan Informasi Geospasial'} • {dataset.year}
            </p>
          </div>
        </div>

        {/* Action Buttons: Solid Blue "Lihat Peta ↗" (exact Figma) + Secondary Detail/Download */}
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={handleOpenInMap}
            className="flex-1 h-[44px] bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all"
          >
            <span>Lihat Peta</span>
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Quick ISO metadata detail */}
          <button
            type="button"
            onClick={() => navigate(`/katalog/${dataset.id}`)}
            title="Metadata Detail"
            className="w-[44px] h-[44px] rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center active:scale-95 transition-colors shrink-0"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Direct Download trigger */}
          <button
            type="button"
            onClick={() => setDownloadModalOpen(true)}
            title="Unduh Data"
            className="w-[44px] h-[44px] rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center active:scale-95 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Download modal handler */}
      <DownloadModal
        dataset={dataset}
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
      />
    </>
  );
};
