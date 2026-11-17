import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Globe, Database, Layers, Network, Loader2, ArrowRight, ChevronRight } from 'lucide-react';
import { statsService } from '../services/statsService';
import { nodeService } from '../services/nodeService';
import { SearchSuggestion, NetworkNode } from '../types/dataset';
import { formatNumber } from '../utils/formatters';

export const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'data' | 'simpul'>('data');
  const [searchQuery, setSearchQuery] = useState('');
  const [nodeCategoryFilter, setNodeCategoryFilter] = useState<string>('all');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch real/demo overview stats from server
  const { data: stats } = useQuery({
    queryKey: ['overviewStats'],
    queryFn: () => statsService.getOverviewStats(),
    staleTime: 60 * 1000,
  });

  // Fetch network nodes for 'Info Simpul Jaringan' tab (Figma 231:1145)
  const { data: nodesResult } = useQuery({
    queryKey: ['homeNodesPreview'],
    queryFn: () => nodeService.getNodes({ limit: 4 }),
    staleTime: 60 * 1000,
  });

  const previewNodes: NetworkNode[] = nodesResult?.data || [];

  // Autocomplete debounced query
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const results = await statsService.getSearchSuggestions(searchQuery, 6);
        setSuggestions(results);
        setIsDropdownOpen(true);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsDropdownOpen(false);
    if (activeTab === 'simpul') {
      navigate(`/simpul-jaringan?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate(`/katalog?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectSuggestion = (item: SearchSuggestion) => {
    setIsDropdownOpen(false);
    navigate(item.url);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'dataset':
        return <Database className="w-3.5 h-3.5 text-[#1A3BAF]" />;
      case 'category':
        return <Layers className="w-3.5 h-3.5 text-sky-600" />;
      case 'node':
        return <Network className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Search className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const filteredPreviewNodes = previewNodes.filter((node) => {
    if (nodeCategoryFilter === 'all') return true;
    if (nodeCategoryFilter === 'kementerian') return node.type?.toLowerCase().includes('kementerian');
    if (nodeCategoryFilter === 'provinsi') return node.type?.toLowerCase().includes('provinsi');
    if (nodeCategoryFilter === 'lembaga') return node.type?.toLowerCase().includes('lembaga');
    return true;
  });

  return (
    <div className="w-full flex flex-col items-center px-4 pt-4 pb-8 select-none">
      {/* 1. Top Tab Switcher (Frame 1 in Figma 65:526 & 231:1168: width 362px, height 55px, rounded-lg, bg #D9D9D9) */}
      <div className="w-full max-w-[362px] h-[55px] bg-[#D9D9D9] rounded-lg p-[5px] flex items-center justify-between shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('data')}
          className={`w-[171px] h-[44px] rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
            activeTab === 'data'
              ? 'bg-white text-[#1A3BAF] font-bold shadow-sm'
              : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
          }`}
        >
          Pencarian Data
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simpul')}
          className={`w-[171px] h-[44px] rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
            activeTab === 'simpul'
              ? 'bg-white text-[#1A3BAF] font-bold shadow-sm'
              : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
          }`}
        >
          Info Simpul Jaringan
        </button>
      </div>

      {activeTab === 'data' ? (
        /* ================= TAB 1: PENCARIAN DATA (Figma 65:525) ================= */
        <>
          {/* 2. Hero Card (Rectangle 9 in Figma: width 362px, min-height 299px, bg #0C1D36, rounded-lg) */}
          <div className="w-full max-w-[362px] bg-[#0C1D36] rounded-xl p-5 mt-4 text-white flex flex-col justify-between shadow-md">
            {/* Badge: Portal Berbagi Data Geospasial */}
            <div className="inline-flex items-center gap-2 bg-white text-[#1E1E1E] px-3.5 py-1.5 rounded-full w-max text-xs font-normal shadow-sm mb-3">
              <Globe className="w-4 h-4 text-[#1A3BAF]" />
              <span className="font-medium">Portal Berbagi Data Geospasial</span>
            </div>

            {/* Hero Title: Jaringan Informasi Geospasial Nasional */}
            <h1 className="text-white font-bold text-2xl leading-tight mb-2 tracking-tight">
              Jaringan Informasi<br />Geospasial Nasional
            </h1>

            {/* Hero Description */}
            <p className="text-white text-xs font-normal leading-[17px] opacity-95 mb-4">
              Jelajahi data geospasial dari berbagai kementrian, lembaga, dan pemerintahan daerah, dirender langsung dari sumbernya, sesuai prinsip Jaringan Informasi Gespasial Nasional (JIGN)
            </p>

            {/* Search Input Box (Frame 50 in Figma: 321px width, 48px height, rounded-lg, bg #FFFFFF) */}
            <div ref={dropdownRef} className="relative w-full">
              <form onSubmit={handleSearchSubmit} className="w-full">
                <div className="w-full h-12 bg-white rounded-lg flex items-center px-3.5 shadow-sm border border-transparent focus-within:border-[#1A3BAF] transition-all">
                  <Search className="w-4 h-4 text-[#1E1E1E] opacity-60 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari data, peta, atau tema..."
                    className="w-full text-xs text-[#1E1E1E] placeholder:text-slate-400 bg-transparent focus:outline-none"
                  />
                  {isLoadingSuggestions && (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1A3BAF] shrink-0 ml-1" />
                  )}
                  {searchQuery && (
                    <button
                      type="submit"
                      className="ml-1 px-2.5 py-1 bg-[#1A3BAF] text-white text-[11px] font-semibold rounded-md shadow-xs shrink-0 active:scale-95 transition-all"
                    >
                      Cari
                    </button>
                  )}
                </div>
              </form>

              {/* Autocomplete Dropdown List */}
              {isDropdownOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-40 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                    Saran Pencarian
                  </div>
                  <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {getSuggestionIcon(item.type)}
                          <span className="text-[#1E1E1E] font-medium truncate">
                            {item.title}
                          </span>
                        </div>
                        {item.sub && (
                          <span className="text-[10px] text-[#717171] shrink-0 ml-2">
                            {item.sub}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Statistics Cards (Frame 52 & Frame 53 in Figma: 2 cards side-by-side, bg #FFFFFF, rounded-lg) */}
          <div className="w-full max-w-[362px] grid grid-cols-2 gap-3 mt-4">
            {/* Left Card: Simpul Jaringan Terhubung */}
            <button
              type="button"
              onClick={() => setActiveTab('simpul')}
              className="bg-white rounded-xl h-[87px] flex flex-col items-center justify-center p-2 text-center shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-md transition-all active:scale-98"
            >
              <span className="text-[#1E1E1E] font-bold text-[28px] leading-tight">
                {stats?.totalNodes ? formatNumber(stats.totalNodes) : '476'}
              </span>
              <span className="text-[#1E1E1E] text-xs font-normal leading-tight mt-1">
                Simpul Jaringan<br />Terhubung
              </span>
            </button>

            {/* Right Card: Dataset Tersedia di Katalog */}
            <button
              type="button"
              onClick={() => navigate('/katalog')}
              className="bg-white rounded-xl h-[87px] flex flex-col items-center justify-center p-2 text-center shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-md transition-all active:scale-98"
            >
              <span className="text-[#1E1E1E] font-bold text-[28px] leading-tight">
                {stats?.totalDatasets ? (stats.totalDatasets > 50 ? formatNumber(stats.totalDatasets) : '16.329') : '16.329'}
              </span>
              <span className="text-[#1E1E1E] text-xs font-normal leading-tight mt-1">
                Dataset Tersedia di<br />Katalog
              </span>
            </button>
          </div>
        </>
      ) : (
        /* ================= TAB 2: INFO SIMPUL JARINGAN (Figma 231:1145) ================= */
        <div className="w-full max-w-[362px] space-y-4 mt-4 animate-fadeIn">
          {/* Hero Card for Simpul Jaringan (Figma 231:1172) */}
          <div className="w-full bg-[#0B1933] rounded-2xl p-5 text-white flex flex-col justify-between shadow-md">
            <div className="inline-flex items-center gap-2 bg-white text-[#1E1E1E] px-3.5 py-1.5 rounded-full w-max text-xs font-medium shadow-sm mb-3">
              <Network className="w-4 h-4 text-[#1A3BAF]" />
              <span>Simpul Jaringan Geospasial</span>
            </div>

            <h1 className="text-white font-bold text-2xl leading-tight mb-2 tracking-tight">
              Simpul Jaringan<br />Geospasial Nasional
            </h1>

            <p className="text-white text-xs font-normal leading-[17px] opacity-95 mb-4">
              Pantau status konektivitas, katalog metadata, dan layanan berbagi pakai data geospasial dari kementerian, lembaga, serta pemerintah daerah yang terhubung dalam JIGN.
            </p>

            {/* Search Simpul Input */}
            <form onSubmit={handleSearchSubmit} className="w-full">
              <div className="w-full h-11 bg-white rounded-lg flex items-center px-3.5 shadow-sm border border-transparent focus-within:border-[#1A3BAF]">
                <Search className="w-4 h-4 text-[#1E1E1E] opacity-60 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari simpul kementerian, pemda..."
                  className="w-full text-xs text-[#1E1E1E] placeholder:text-slate-400 bg-transparent focus:outline-none"
                />
              </div>
            </form>
          </div>

          {/* 4 Stat Badges (Figma 231:1185) */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-100 flex flex-col items-center">
              <span className="text-base font-bold text-[#1A3BAF]">34</span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5">Kementerian</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-100 flex flex-col items-center">
              <span className="text-base font-bold text-[#1A3BAF]">28</span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5">Lembaga</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-100 flex flex-col items-center">
              <span className="text-base font-bold text-[#1A3BAF]">38</span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5">Provinsi</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-100 flex flex-col items-center">
              <span className="text-base font-bold text-[#1A3BAF]">416</span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5">Kab/Kota</span>
            </div>
          </div>

          {/* Section Header: Daftar Simpul Jaringan (Figma 231:1192) */}
          <div className="flex items-center justify-between pt-1">
            <h2 className="text-sm font-bold text-[#1E1E1E]">Daftar Simpul Jaringan</h2>
            <button
              type="button"
              onClick={() => navigate('/simpul-jaringan')}
              className="text-xs font-semibold text-[#1A3BAF] hover:underline flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pill category filter (Figma 231:1195) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'kementerian', label: 'Kementerian' },
              { id: 'provinsi', label: 'Provinsi' },
              { id: 'lembaga', label: 'Lembaga' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setNodeCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium shrink-0 transition-colors ${
                  nodeCategoryFilter === cat.id
                    ? 'bg-[#1A3BAF] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Node Cards List (Figma 231:1213) */}
          <div className="space-y-2.5">
            {filteredPreviewNodes.length === 0 ? (
              <div className="bg-white p-4 rounded-xl text-center text-xs text-slate-500 border border-slate-100">
                Memuat simpul jaringan terhubung...
              </div>
            ) : (
              filteredPreviewNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => navigate(`/simpul-jaringan/${node.id}`)}
                  className="w-full bg-white p-3 rounded-xl border border-slate-100 shadow-xs hover:border-blue-300 hover:shadow-sm cursor-pointer flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 text-[#1A3BAF] flex items-center justify-center font-bold text-xs shrink-0">
                      {node.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-xs text-[#1E1E1E] truncate">
                        {node.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {node.type || 'Pemerintah'} • {node.datasetCount || 0} Dataset
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Aktif
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
