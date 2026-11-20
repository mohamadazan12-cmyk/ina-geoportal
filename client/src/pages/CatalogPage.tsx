import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, AlertCircle, X, RotateCcw, Database } from 'lucide-react';
import { DatasetCard } from '../components/catalog/DatasetCard';
import { Pagination } from '../components/catalog/Pagination';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { datasetService } from '../services/datasetService';
import { nodeService } from '../services/nodeService';
import { userService } from '../services/userService';
import { useAuthStore } from '../store/useAuthStore';
import { Dataset } from '../types/dataset';
import { BookmarkRecord } from '../types/auth';

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Extract query filters from URL
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const node = searchParams.get('node') || '';
  const format = searchParams.get('format') || '';
  const year = searchParams.get('year') || '';
  const accessType = searchParams.get('access_type') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // 1. Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categoriesList'],
    queryFn: () => datasetService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch network nodes for filter
  const { data: nodeRes } = useQuery({
    queryKey: ['nodesListForFilter'],
    queryFn: () => nodeService.getNodes({ limit: 50 }),
    staleTime: 5 * 60 * 1000,
  });
  const nodes = nodeRes?.data || [];

  // 3. Fetch user bookmarks if authenticated
  const { data: bookmarks = [] } = useQuery<BookmarkRecord[]>({
    queryKey: ['userBookmarksList', isAuthenticated],
    queryFn: () => (isAuthenticated ? userService.getBookmarks() : Promise.resolve([])),
    enabled: isAuthenticated,
  });
  const bookmarkedIds = new Set(bookmarks.map((b: BookmarkRecord) => b.datasetId));

  // 4. Fetch Datasets with current filters
  const {
    data: datasetResult,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['catalogDatasets', q, category, node, format, year, accessType, sort, page],
    queryFn: () =>
      datasetService.getDatasets({
        q,
        category,
        node_id: node,
        format,
        year: year ? parseInt(year, 10) : undefined,
        access_type: accessType,
        sort,
        page,
        limit: 9,
      }),
  });

  const datasets: Dataset[] = datasetResult?.data || [];
  const meta = datasetResult?.meta || { page: 1, limit: 9, total: 0, totalPages: 1 };

  // Helper to update URL search params
  const updateFilter = (key: string, value: string) => {
    const updated = new URLSearchParams(searchParams);
    if (value) {
      updated.set(key, value);
    } else {
      updated.delete(key);
    }
    if (key !== 'page') {
      updated.set('page', '1');
    }
    setSearchParams(updated);
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(q || category || node || format || year || accessType);

  // Common filter inputs component for reusability between mobile drawer and desktop sidebar
  const renderFilterFields = (isDesktopSidebar = false) => (
    <div className={`space-y-3.5 ${isDesktopSidebar ? 'text-xs' : 'text-xs'}`}>
      {/* Category */}
      <div>
        <label className="block text-[#717171] font-medium mb-1">Kategori Dataset</label>
        <select
          value={category}
          onChange={(e) => updateFilter('category', e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1E1E1E] focus:ring-1 focus:ring-[#1A3BAF] outline-none"
        >
          <option value="">Semua Kategori</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Access Type */}
      <div>
        <label className="block text-[#717171] font-medium mb-1">Akses Data</label>
        <select
          value={accessType}
          onChange={(e) => updateFilter('access_type', e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1E1E1E] focus:ring-1 focus:ring-[#1A3BAF] outline-none"
        >
          <option value="">Semua Akses</option>
          <option value="public">Publik (Terbuka)</option>
          <option value="restricted">Terbatas (Login Diperlukan)</option>
        </select>
      </div>

      {/* Format */}
      <div>
        <label className="block text-[#717171] font-medium mb-1">Format Berkas</label>
        <select
          value={format}
          onChange={(e) => updateFilter('format', e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1E1E1E] focus:ring-1 focus:ring-[#1A3BAF] outline-none"
        >
          <option value="">Semua Format</option>
          <option value="SHP">Shapefile (SHP)</option>
          <option value="GeoJSON">GeoJSON</option>
          <option value="WMS">WMS Web Service</option>
          <option value="WFS">WFS Web Service</option>
          <option value="KML">KML / KMZ</option>
        </select>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-[#717171] font-medium mb-1">Urutan</label>
        <select
          value={sort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1E1E1E] focus:ring-1 focus:ring-[#1A3BAF] outline-none"
        >
          <option value="newest">Terbaru</option>
          <option value="popular">Terpopuler (Unduhan)</option>
          <option value="title_asc">Judul (A-Z)</option>
        </select>
      </div>

      {/* Simpul Jaringan */}
      <div>
        <label className="block text-[#717171] font-medium mb-1">Simpul Jaringan Produsen</label>
        <select
          value={node}
          onChange={(e) => updateFilter('node', e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1E1E1E] focus:ring-1 focus:ring-[#1A3BAF] outline-none"
        >
          <option value="">Semua Simpul Jaringan</option>
          {nodes.map((n: any) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 select-none flex flex-col">
      {/* Title Header (exact Figma 75:710 "Katalog Peta") */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1E1E1E] tracking-tight">
            Katalog Peta
          </h1>
          <p className="text-xs md:text-sm text-[#717171] mt-0.5">
            Daftar metadata dan layer geospasial resmi dari simpul jaringan nasional ({meta.total} dataset)
          </p>
        </div>

        {/* Mobile Filter Toggle Button */}
        <button
          onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          aria-label="Filter"
          className={`md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            hasActiveFilters
              ? 'bg-[#1A3BAF] text-white border-[#1A3BAF]'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filter</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 ml-0.5" />
          )}
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full mb-4 md:mb-6">
        <div className="w-full h-11 md:h-12 bg-white rounded-xl border border-slate-200 flex items-center px-4 shadow-xs focus-within:ring-2 focus-within:ring-[#1A3BAF] focus-within:border-transparent transition-all">
          <Search className="w-4 h-4 md:w-5 md:h-5 text-[#1A3BAF] mr-2.5 shrink-0" />
          <input
            type="text"
            value={q}
            onChange={(e) => updateFilter('q', e.target.value)}
            placeholder="Cari peta, dataset, atau instansi..."
            className="flex-1 bg-transparent text-[#1E1E1E] placeholder-[#717171] text-xs md:text-sm outline-none pr-2"
          />
          {q && (
            <button
              onClick={() => updateFilter('q', '')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {showFilterDrawer && (
        <div className="md:hidden w-full bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-semibold text-xs text-[#1E1E1E]">Filter Pencarian</span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-[#1A3BAF] hover:underline"
              >
                Reset Semua
              </button>
            )}
          </div>
          {renderFilterFields(false)}
        </div>
      )}

      {/* Main Layout: Desktop Sidebar + Content Grid */}
      <div className="flex items-start gap-8">
        {/* Desktop Sidebar Filter (>= md) */}
        <aside className="hidden md:block w-72 shrink-0 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs sticky top-24">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#1A3BAF]" />
              <span className="font-bold text-xs uppercase tracking-wider text-[#1E1E1E]">
                Filter Dataset
              </span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-medium text-[#1A3BAF] hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
          {renderFilterFields(true)}
        </aside>

        {/* Dataset Cards Grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="py-24">
              <LoadingSpinner label="Memuat data katalog geospasial..." />
            </div>
          ) : isError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-red-800 mb-1">Gagal Memuat Dataset</p>
              <p className="text-xs text-red-700 mb-4">{(error as Error)?.message || 'Terjadi gangguan saat mengambil data.'}</p>
              <button
                onClick={() => refetch()}
                className="text-xs px-4 py-2 bg-white border border-red-300 rounded-lg text-red-800 font-semibold shadow-xs hover:bg-red-50 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          ) : datasets.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 my-4 shadow-xs">
              <Database className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-base text-[#1E1E1E]">Tidak Ada Dataset Ditemukan</p>
              <p className="text-xs text-[#717171] mt-1 max-w-sm mx-auto">
                Coba sesuaikan kata kunci atau atur ulang filter kategori dan instansi.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 bg-blue-50 text-[#1A3BAF] text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Responsive Cards: 1 col on mobile, 2 cols on tablet, 2 or 3 cols on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {datasets.map((dataset, idx) => (
                  <DatasetCard
                    key={dataset.id}
                    dataset={dataset}
                    initialBookmarked={bookmarkedIds.has(dataset.id)}
                    index={idx}
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="pt-4 flex justify-center">
                <Pagination
                  meta={meta}
                  onPageChange={(p) => updateFilter('page', p.toString())}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
