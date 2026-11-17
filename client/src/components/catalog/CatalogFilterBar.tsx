import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Category, NetworkNode } from '../../types/dataset';

interface CatalogFilterBarProps {
  categories: Category[];
  nodes: NetworkNode[];
  searchQuery: string;
  selectedCategory: string;
  selectedNode: string;
  selectedFormat: string;
  selectedYear: string;
  selectedAccessType: string;
  sort: string;
  onFilterChange: (key: string, value: string) => void;
  onResetFilters: () => void;
}

export const CatalogFilterBar: React.FC<CatalogFilterBarProps> = ({
  categories,
  nodes,
  searchQuery,
  selectedCategory,
  selectedNode,
  selectedFormat,
  selectedYear,
  selectedAccessType,
  sort,
  onFilterChange,
  onResetFilters,
}) => {
  const formats = ['shp', 'geojson', 'kml', 'wms', 'wfs'];
  const years = ['2024', '2023', '2022', '2021', '2020'];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      {/* Top search & Sort row */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onFilterChange('q', e.target.value)}
            placeholder="Cari berdasarkan nama dataset, kata kunci, atau deskripsi..."
            className="w-full pl-10 pr-4 py-2.5 text-xs md:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={sort}
            onChange={(e) => onFilterChange('sort', e.target.value)}
            className="py-2.5 px-3 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-44"
          >
            <option value="newest">Terbaru</option>
            <option value="popular">Paling Banyak Diunduh</option>
            <option value="title_asc">Judul (A - Z)</option>
            <option value="title_desc">Judul (Z - A)</option>
            <option value="year_desc">Tahun (Terbaru)</option>
          </select>

          <button
            onClick={onResetFilters}
            title="Reset semua filter"
            className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter selections grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
        {/* Category Dropdown */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Kategori Tematik
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => onFilterChange('category', e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.datasetCount ?? 0})
              </option>
            ))}
          </select>
        </div>

        {/* Network Node Dropdown */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Simpul Jaringan (Wali Data)
          </label>
          <select
            value={selectedNode}
            onChange={(e) => onFilterChange('node', e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Simpul Jaringan</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </div>

        {/* Format Dropdown */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Format Data
          </label>
          <select
            value={selectedFormat}
            onChange={(e) => onFilterChange('format', e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Format</option>
            {formats.map((f) => (
              <option key={f} value={f}>
                {f === 'shp' ? 'Shapefile (.shp)' : f.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Year Dropdown */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Tahun Produksi
          </label>
          <select
            value={selectedYear}
            onChange={(e) => onFilterChange('year', e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Tahun</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Access Type Dropdown */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Tipe Akses
          </label>
          <select
            value={selectedAccessType}
            onChange={(e) => onFilterChange('access_type', e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Tipe Akses</option>
            <option value="public">Publik (Terbuka)</option>
            <option value="restricted">Restricted (Terbatas)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
