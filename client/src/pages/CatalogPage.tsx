import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, AlertCircle, X } from 'lucide-react';
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
        limit: 8,
      }),
  });

  const datasets: Dataset[] = datasetResult?.data || [];
  const meta = datasetResult?.meta || { page: 1, limit: 8, total: 0, totalPages: 1 };

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

  return (
    <div className="w-full flex flex-col px-5 pt-4 pb-8 select-none">
      {/* Title Header (exact Figma 75:710 "Katalog Peta") */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#1E1E1E] tracking-tight">
          Katalog Peta
        </h1>

        <button
          onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          aria-label="Filter"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
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
      <div className="relative w-full mb-4">
        <div className="w-full h-11 bg-white rounded-lg border border-slate-200 flex items-center px-3.5 shadow-sm focus-within:ring-2 focus-within:ring-[#1A3BAF] focus-within:border-transparent">
          <input
            type="text"
            value={q}
            onChange={(e) => updateFilter('q', e.target.value)}
            placeholder="Cari peta, dataset, atau instansi..."
            className="flex-1 bg-transparent text-[#1E1E1E] placeholder-[#717171] text-xs outline-none pr-2"
          />
          {q ? (
            <button
              onClick={() => updateFilter('q', '')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <Search className="w-4 h-4 text-[#1A3BAF]" />
          )}
        </div>
      </div>

      {/* Filter Drawer / Dropdown */}
      {showFilterDrawer && (
        <div className="w-full bg-white rounded-lg border border-slate-200 p-4 mb-4 shadow-sm space-y-3 animate-fadeIn">
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

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Category */}
            <div>
              <label className="block text-[#717171] mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-[#1E1E1E]"
              >
                <option value="">Semua Kategori</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Access Type */}
            <div>
              <label className="block text-[#717171] mb-1">Akses Data</label>
              <select
                value={accessType}
                onChange={(e) => updateFilter('access_type', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-[#1E1E1E]"
              >
                <option value="">Semua Akses</option>
                <option value="public">Publik (Terbuka)</option>
                <option value="restricted">Terbatas (Login)</option>
              </select>
            </div>

            {/* Format */}
            <div>
              <label className="block text-[#717171] mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => updateFilter('format', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-[#1E1E1E]"
              >
                <option value="">Semua Format</option>
                <option value="SHP">Shapefile (SHP)</option>
                <option value="GeoJSON">GeoJSON</option>
                <option value="WMS">WMS Service</option>
                <option value="WFS">WFS Service</option>
                <option value="KML">KML / KMZ</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-[#717171] mb-1">Urutan</label>
              <select
                value={sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-[#1E1E1E]"
              >
                <option value="newest">Terbaru</option>
                <option value="popular">Terpopuler</option>
                <option value="title_asc">Judul (A-Z)</option>
              </select>
            </div>

            {/* Simpul Jaringan */}
            <div className="col-span-2">
              <label className="block text-[#717171] mb-1">Simpul Jaringan</label>
              <select
                value={node}
                onChange={(e) => updateFilter('node', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-[#1E1E1E]"
              >
                <option value="">Semua Simpul Jaringan</option>
                {nodes.map((n: any) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Dataset Cards List */}
      {isLoading ? (
        <div className="py-16">
          <LoadingSpinner label="Memuat data katalog..." />
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-xs text-red-700 mb-2">{(error as Error)?.message || 'Gagal memuat dataset'}</p>
          <button
            onClick={() => refetch()}
            className="text-xs px-3 py-1 bg-white border border-red-300 rounded text-red-800"
          >
            Coba Lagi
          </button>
        </div>
      ) : datasets.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-slate-200 my-4">
          <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-sm text-[#1E1E1E]">Tidak Ada Dataset Ditemukan</p>
          <p className="text-xs text-[#717171] mt-1">Coba sesuaikan kata kunci atau reset filter pencarian.</p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="mt-3 text-xs text-[#1A3BAF] font-medium underline"
            >
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {datasets.map((dataset, idx) => (
            <DatasetCard
              key={dataset.id}
              dataset={dataset}
              initialBookmarked={bookmarkedIds.has(dataset.id)}
              index={idx}
            />
          ))}

          {/* Pagination */}
          <div className="pt-2">
            <Pagination
              meta={meta}
              onPageChange={(p) => updateFilter('page', p.toString())}
            />
          </div>
        </div>
      )}
    </div>
  );
};
