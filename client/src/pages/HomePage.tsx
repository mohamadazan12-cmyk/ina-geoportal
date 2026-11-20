import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Globe,
  Database,
  Layers,
  Network,
  Loader2,
  ArrowRight,
  ChevronRight,
  Map,
  Download,
  FileText,
} from 'lucide-react';
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
    queryFn: () => nodeService.getNodes({ limit: 6 }),
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
      navigate(`/simpul?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate(`/katalog?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectSuggestion = (item: SearchSuggestion) => {
    setIsDropdownOpen(false);
    navigate(item.url);
  };

  const handlePopularTagClick = (tag: string) => {
    setSearchQuery(tag);
    navigate(`/katalog?q=${encodeURIComponent(tag)}`);
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
    if (nodeCategoryFilter === 'kementerian') return node.type?.toLowerCase().includes('kementerian') || node.type?.toLowerCase() === 'kl';
    if (nodeCategoryFilter === 'provinsi') return node.type?.toLowerCase().includes('provinsi');
    if (nodeCategoryFilter === 'lembaga') return node.type?.toLowerCase().includes('lembaga');
    return true;
  });

  return (
    <div className="w-full flex flex-col items-center px-4 pt-4 pb-8 md:px-8 md:pt-8 md:pb-16 select-none">
      {/* 1. Top Tab Switcher (Frame 1 in Figma 65:526 & 231:1168: width 362px, height 55px, rounded-lg, bg #D9D9D9) */}
      <div className="w-full max-w-[362px] md:max-w-[420px] h-[55px] md:h-[58px] bg-[#D9D9D9] rounded-lg p-[5px] flex items-center justify-between shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('data')}
          className={`w-[171px] md:w-[200px] h-[44px] md:h-[48px] rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
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
          className={`w-[171px] md:w-[200px] h-[44px] md:h-[48px] rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
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
          <div className="w-full max-w-[362px] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl bg-[#0C1D36] rounded-xl md:rounded-2xl p-5 md:p-10 lg:p-12 mt-4 md:mt-8 text-white flex flex-col justify-between shadow-md md:shadow-xl transition-all">
            <div className="flex flex-col max-w-3xl">
              {/* Badge: Portal Berbagi Data Geospasial */}
              <div className="inline-flex items-center gap-2 bg-white text-[#1E1E1E] px-3.5 py-1.5 rounded-full w-max text-xs font-normal shadow-sm mb-3 md:mb-4">
                <Globe className="w-4 h-4 text-[#1A3BAF]" />
                <span className="font-semibold text-xs text-[#1E1E1E]">Portal Berbagi Data Geospasial</span>
              </div>

              {/* Hero Title: Jaringan Informasi Geospasial Nasional */}
              <h1 className="text-white font-bold text-2xl md:text-4xl lg:text-5xl leading-tight mb-2 md:mb-4 tracking-tight">
                Jaringan Informasi<br className="md:hidden" /> Geospasial Nasional
              </h1>

              {/* Hero Description */}
              <p className="text-white text-xs md:text-sm lg:text-base font-normal leading-[17px] md:leading-relaxed opacity-95 mb-4 md:mb-8">
                Jelajahi data geospasial dari berbagai kementerian, lembaga, dan pemerintah daerah, dirender langsung dari sumbernya, sesuai prinsip Jaringan Informasi Geospasial Nasional (JIGN).
              </p>
            </div>

            {/* Search Input Box (Frame 50 in Figma: 321px width, 48px height, rounded-lg, bg #FFFFFF) */}
            <div ref={dropdownRef} className="relative w-full md:max-w-3xl">
              <form onSubmit={handleSearchSubmit} className="w-full">
                <div className="w-full h-12 md:h-14 bg-white rounded-lg md:rounded-xl flex items-center px-3.5 md:px-5 shadow-sm border border-transparent focus-within:border-[#1A3BAF] transition-all">
                  <Search className="w-4 h-4 md:w-5 md:h-5 text-[#1E1E1E] opacity-60 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari data, peta, atau tema..."
                    className="w-full text-xs md:text-sm text-[#1E1E1E] placeholder:text-slate-400 bg-transparent focus:outline-none"
                  />
                  {isLoadingSuggestions && (
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-[#1A3BAF] shrink-0 ml-1" />
                  )}
                  <button
                    type="submit"
                    className="ml-2 px-3 md:px-5 py-1.5 md:py-2 bg-[#1A3BAF] hover:bg-[#153096] text-white text-xs md:text-sm font-semibold rounded-md md:rounded-lg shadow-xs shrink-0 active:scale-95 transition-all"
                  >
                    Cari
                  </button>
                </div>
              </form>

              {/* Popular tags row (Desktop only) */}
              <div className="hidden md:flex items-center gap-2 mt-3 text-xs text-slate-300">
                <span className="text-slate-400 font-medium">Pencarian Populer:</span>
                {['Batas Wilayah', 'Tutupan Lahan', 'Fasilitas Kesehatan', 'Rawan Gempa', 'Jalan Nasional'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handlePopularTagClick(tag)}
                    className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Autocomplete Dropdown List */}
              {isDropdownOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-40 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                    Saran Pencarian
                  </div>
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between text-xs md:text-sm transition-colors"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {getSuggestionIcon(item.type)}
                          <span className="text-[#1E1E1E] font-medium truncate">
                            {item.title}
                          </span>
                        </div>
                        {item.sub && (
                          <span className="text-[10px] md:text-xs text-[#717171] shrink-0 ml-2">
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

          {/* 3. Statistics Cards (Frame 52 & Frame 53 in Figma: 2 cards mobile, 4 cards desktop) */}
          <div className="w-full max-w-[362px] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mt-4 md:mt-8">
            {/* Card 1: Simpul Jaringan Terhubung */}
            <button
              type="button"
              onClick={() => setActiveTab('simpul')}
              className="bg-white rounded-xl h-[87px] md:h-[110px] flex flex-col items-center justify-center p-2 md:p-4 text-center shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-md transition-all active:scale-98"
            >
              <span className="text-[#1E1E1E] font-bold text-[28px] md:text-[34px] leading-tight">
                {stats?.totalNodes ? formatNumber(stats.totalNodes) : '476'}
              </span>
              <span className="text-[#1E1E1E] text-xs md:text-sm font-normal leading-tight mt-1">
                Simpul Jaringan<br />Terhubung
              </span>
            </button>

            {/* Card 2: Dataset Tersedia di Katalog */}
            <button
              type="button"
              onClick={() => navigate('/katalog')}
              className="bg-white rounded-xl h-[87px] md:h-[110px] flex flex-col items-center justify-center p-2 md:p-4 text-center shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-md transition-all active:scale-98"
            >
              <span className="text-[#1E1E1E] font-bold text-[28px] md:text-[34px] leading-tight">
                {stats?.totalDatasets ? (stats.totalDatasets > 50 ? formatNumber(stats.totalDatasets) : '16.329') : '16.329'}
              </span>
              <span className="text-[#1E1E1E] text-xs md:text-sm font-normal leading-tight mt-1">
                Dataset Tersedia di<br />Katalog
              </span>
            </button>

            {/* Card 3: Cakupan Nasional (Desktop only) */}
            <div className="hidden md:flex bg-white rounded-xl h-[110px] flex-col items-center justify-center p-4 text-center shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-md transition-all">
              <span className="text-[#1E1E1E] font-bold text-[34px] leading-tight">
                38
              </span>
              <span className="text-[#1E1E1E] text-sm font-normal leading-tight mt-1">
                Provinsi Seluruh<br />Indonesia
              </span>
            </div>

            {/* Card 4: Web Service OGC (Desktop only) */}
            <div className="hidden md:flex bg-white rounded-xl h-[110px] flex-col items-center justify-center p-4 text-center shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-md transition-all">
              <span className="text-[#1E1E1E] font-bold text-[34px] leading-tight">
                100%
              </span>
              <span className="text-[#1E1E1E] text-sm font-normal leading-tight mt-1">
                Standarisasi OGC<br />WMS & WFS
              </span>
            </div>
          </div>

          {/* 4. Quick Access Feature Cards (Desktop Layout Extension) */}
          <div className="hidden md:grid md:grid-cols-4 gap-6 w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mt-8">
            <button
              type="button"
              onClick={() => navigate('/katalog')}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#1A3BAF]/40 hover:shadow-md transition-all text-left flex flex-col justify-between group"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A3BAF] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Database className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="font-bold text-sm text-[#1E1E1E] group-hover:text-[#1A3BAF] transition-colors">
                  Katalog Dataset Peta
                </h3>
                <p className="text-xs text-[#717171] mt-1 leading-relaxed">
                  Jelajahi ribuan data spasial tematik, batas administrasi, dan tutupan lahan.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#1A3BAF]">
                <span>Buka Katalog</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/webmap')}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#1A3BAF]/40 hover:shadow-md transition-all text-left flex flex-col justify-between group"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Map className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="font-bold text-sm text-[#1E1E1E] group-hover:text-[#1A3BAF] transition-colors">
                  Webmap Viewer Interaktif
                </h3>
                <p className="text-xs text-[#717171] mt-1 leading-relaxed">
                  Visualisasi spasial multi-layer, basemap satelit, dan alat ukur jarak & luas.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#1A3BAF]">
                <span>Buka Webmap</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/unduh')}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#1A3BAF]/40 hover:shadow-md transition-all text-left flex flex-col justify-between group"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Download className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="font-bold text-sm text-[#1E1E1E] group-hover:text-[#1A3BAF] transition-colors">
                  Pusat Unduhan Data
                </h3>
                <p className="text-xs text-[#717171] mt-1 leading-relaxed">
                  Unduh berkas resmi format Shapefile (SHP), GeoJSON, dan KML/KMZ.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#1A3BAF]">
                <span>Pusat Unduh</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/standar-data')}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#1A3BAF]/40 hover:shadow-md transition-all text-left flex flex-col justify-between group"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="font-bold text-sm text-[#1E1E1E] group-hover:text-[#1A3BAF] transition-colors">
                  Standar Data Geospasial
                </h3>
                <p className="text-xs text-[#717171] mt-1 leading-relaxed">
                  Dokumen SNI, pedoman katalog unsur geografi, dan metadata ISO 19115.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#1A3BAF]">
                <span>Buka Standar</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </>
      ) : (
        /* ================= TAB 2: INFO SIMPUL JARINGAN (Figma 231:1145) ================= */
        <div className="w-full max-w-[362px] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl space-y-4 md:space-y-6 mt-4 md:mt-8 animate-fadeIn">
          {/* Hero Card for Simpul Jaringan (Figma 231:1172) */}
          <div className="w-full bg-[#0B1933] rounded-2xl p-5 md:p-10 text-white flex flex-col justify-between shadow-md md:shadow-xl">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-white text-[#1E1E1E] px-3.5 py-1.5 rounded-full w-max text-xs font-medium shadow-sm mb-3 md:mb-4">
                <Network className="w-4 h-4 text-[#1A3BAF]" />
                <span className="font-semibold text-xs text-[#1E1E1E]">Simpul Jaringan Geospasial</span>
              </div>

              <h1 className="text-white font-bold text-2xl md:text-4xl leading-tight mb-2 md:mb-4 tracking-tight">
                Simpul Jaringan<br className="md:hidden" /> Geospasial Nasional
              </h1>

              <p className="text-white text-xs md:text-sm font-normal leading-[17px] md:leading-relaxed opacity-95 mb-4 md:mb-6">
                Pantau status konektivitas, katalog metadata, dan layanan berbagi pakai data geospasial dari kementerian, lembaga, serta pemerintah daerah yang terhubung dalam JIGN.
              </p>
            </div>

            {/* Search Simpul Input */}
            <form onSubmit={handleSearchSubmit} className="w-full md:max-w-2xl">
              <div className="w-full h-11 md:h-12 bg-white rounded-lg md:rounded-xl flex items-center px-3.5 md:px-4 shadow-sm border border-transparent focus-within:border-[#1A3BAF]">
                <Search className="w-4 h-4 text-[#1E1E1E] opacity-60 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari simpul kementerian, pemda..."
                  className="w-full text-xs md:text-sm text-[#1E1E1E] placeholder:text-slate-400 bg-transparent focus:outline-none"
                />
                <button
                  type="submit"
                  className="ml-2 px-3 py-1 bg-[#1A3BAF] text-white text-xs font-semibold rounded-md shadow-xs shrink-0"
                >
                  Cari
                </button>
              </div>
            </form>
          </div>

          {/* 4 Stat Badges (Figma 231:1185) */}
          <div className="grid grid-cols-4 gap-2 md:gap-6 text-center">
            <div className="bg-white p-2.5 md:p-5 rounded-xl md:rounded-2xl shadow-xs border border-slate-100 flex flex-col items-center">
              <span className="text-base md:text-2xl font-bold text-[#1A3BAF]">34</span>
              <span className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5 md:mt-1">Kementerian</span>
            </div>
            <div className="bg-white p-2.5 md:p-5 rounded-xl md:rounded-2xl shadow-xs border border-slate-100 flex flex-col items-center">
              <span className="text-base md:text-2xl font-bold text-[#1A3BAF]">28</span>
              <span className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5 md:mt-1">Lembaga</span>
            </div>
            <div className="bg-white p-2.5 md:p-5 rounded-xl md:rounded-2xl shadow-xs border border-slate-100 flex flex-col items-center">
              <span className="text-base md:text-2xl font-bold text-[#1A3BAF]">38</span>
              <span className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5 md:mt-1">Provinsi</span>
            </div>
            <div className="bg-white p-2.5 md:p-5 rounded-xl md:rounded-2xl shadow-xs border border-slate-100 flex flex-col items-center">
              <span className="text-base md:text-2xl font-bold text-[#1A3BAF]">416</span>
              <span className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5 md:mt-1">Kab/Kota</span>
            </div>
          </div>

          {/* Section Header: Daftar Simpul Jaringan (Figma 231:1192) */}
          <div className="flex items-center justify-between pt-1">
            <h2 className="text-sm md:text-lg font-bold text-[#1E1E1E]">Daftar Simpul Jaringan Terhubung</h2>
            <button
              type="button"
              onClick={() => navigate('/simpul')}
              className="text-xs md:text-sm font-semibold text-[#1A3BAF] hover:underline flex items-center gap-1"
            >
              <span>Lihat Semua Simpul</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pill category filter (Figma 231:1195) */}
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Semua Simpul' },
              { id: 'kementerian', label: 'Kementerian' },
              { id: 'provinsi', label: 'Pemerintah Provinsi' },
              { id: 'lembaga', label: 'Lembaga Non-Kementerian' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setNodeCategoryFilter(cat.id)}
                className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[11px] md:text-xs font-medium shrink-0 transition-colors ${
                  nodeCategoryFilter === cat.id
                    ? 'bg-[#1A3BAF] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Node Cards List (Figma 231:1213) - 1 col on mobile, 2 or 3 cols on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filteredPreviewNodes.length === 0 ? (
              <div className="col-span-full bg-white p-6 rounded-xl text-center text-xs md:text-sm text-slate-500 border border-slate-100">
                Memuat simpul jaringan terhubung...
              </div>
            ) : (
              filteredPreviewNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => navigate(`/simpul/${node.id}`)}
                  className="w-full bg-white p-3.5 md:p-4 rounded-xl border border-slate-100 shadow-xs hover:border-[#1A3BAF]/40 hover:shadow-md cursor-pointer flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-[#1A3BAF] flex items-center justify-center font-bold text-xs shrink-0">
                      {node.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-xs md:text-sm text-[#1E1E1E] truncate">
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
