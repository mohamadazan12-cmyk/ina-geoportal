import React, { useState, useEffect, useRef } from 'react';
import { useMap, CircleMarker, Popup } from 'react-leaflet';
import {
  Plus,
  Minus,
  Crosshair,
  Layers,
  Map as MapIcon,
  Ruler,
  Search,
  X,
  Compass,
  MapPin,
  Building2,
  Sparkles,
  Loader2,
  Landmark,
  FileSpreadsheet,
} from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import {
  searchAdministrativeRegions,
  getPopularLocations,
} from '../../services/locationSearchService';
import { AdministrativeRegion, RegionType } from '../../types/location';

interface FigmaMapOverlayProps {
  onToggleLayerManager: () => void;
  onToggleBasemap: () => void;
  onToggleTools: () => void;
  onToggleLegend: () => void;
  isLayerManagerOpen: boolean;
  isBasemapOpen: boolean;
  isToolsOpen: boolean;
  isLegendOpen: boolean;
}

const TYPE_CONFIG: Record<
  RegionType,
  { label: string; badgeClass: string; icon: React.FC<{ className?: string }> }
> = {
  provinsi: {
    label: 'PROVINSI',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Landmark,
  },
  kota: {
    label: 'KOTA',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: Building2,
  },
  kabupaten: {
    label: 'KABUPATEN',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: MapPin,
  },
  khusus: {
    label: 'WILAYAH KHUSUS',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Sparkles,
  },
  koordinat: {
    label: 'KOORDINAT',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Compass,
  },
};

export const FigmaMapOverlay: React.FC<FigmaMapOverlayProps> = ({
  onToggleLayerManager,
  onToggleBasemap,
  onToggleTools,
  onToggleLegend,
  isLayerManagerOpen,
  isBasemapOpen,
  isToolsOpen,
  isLegendOpen,
}) => {
  const map = useMap();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationList, setShowLocationList] = useState(false);
  const [searchResults, setSearchResults] = useState<AdministrativeRegion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<AdministrativeRegion | null>(null);

  const popularLocations = useRef<AdministrativeRegion[]>(getPopularLocations()).current;
  const { activeLayers, setCenterAndZoom } = useMapStore();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowLocationList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search effect (200ms)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    const timer = setTimeout(async () => {
      try {
        const results = await searchAdministrativeRegions(trimmed, 20);
        setSearchResults(results);
      } catch (err) {
        console.error('Error searching administrative regions:', err);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handleRecenter = () => {
    setSelectedLocation(null);
    setSearchQuery('');
    setShowLocationList(false);
    map.flyTo([-2.5489, 118.0149], 5, { duration: 1.2 });
  };

  const handleSelectLocation = (loc: AdministrativeRegion) => {
    setSelectedLocation(loc);
    setSearchQuery(loc.name);
    setShowLocationList(false);

    setCenterAndZoom(loc.center, loc.zoom);

    if (loc.bbox && loc.bbox.length === 2) {
      map.fitBounds(loc.bbox, {
        padding: [50, 50],
        maxZoom: loc.type === 'provinsi' ? 9 : 14,
        animate: true,
        duration: 1.2,
      });
    } else {
      map.flyTo(loc.center, loc.zoom, { duration: 1.2 });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchResults.length > 0) {
      handleSelectLocation(searchResults[0]);
    } else if (popularLocations.length > 0) {
      const matched = popularLocations.find((l) =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (matched) {
        handleSelectLocation(matched);
      }
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedLocation(null);
    setSearchResults([]);
    setShowLocationList(false);
  };

  const isQueryActive = searchQuery.trim().length > 0;

  return (
    <>
      {/* Visual Marker for Selected Administrative Location */}
      {selectedLocation && (
        <CircleMarker
          center={selectedLocation.center}
          radius={8}
          pathOptions={{
            color: '#1A3BAF',
            fillColor: '#38BDF8',
            fillOpacity: 0.9,
            weight: 3,
          }}
        >
          <Popup autoPan={false}>
            <div className="p-1 text-xs select-text">
              <div className="font-bold text-slate-900">{selectedLocation.name}</div>
              <div className="text-[10px] text-slate-500">
                {selectedLocation.province !== 'Indonesia'
                  ? `${selectedLocation.province} • Indonesia`
                  : 'Indonesia'}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                {selectedLocation.center[0].toFixed(4)}, {selectedLocation.center[1].toFixed(4)}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      )}

      {/* 1. Top Floating Search Bar (exact Figma Frame 81:950, responsive for desktop) */}
      <div
        ref={searchContainerRef}
        className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-auto md:w-[420px] z-[400] flex flex-col items-center"
      >
        <form
          onSubmit={handleSearchSubmit}
          className="w-full h-12 bg-white/95 backdrop-blur-md rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.10)] border border-slate-100 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-[#1A3BAF]"
        >
          <Search className="w-4 h-4 text-[#717171] mr-2.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowLocationList(true);
            }}
            onFocus={() => setShowLocationList(true)}
            placeholder="Cari provinsi, kabupaten, kota, atau koordinat..."
            className="flex-1 bg-transparent text-xs text-[#1E1E1E] placeholder-[#717171] outline-none"
          />

          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin mr-1 shrink-0" />
          ) : isQueryActive ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-full transition-colors"
              title="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </form>

        {/* Selected Location Indicator Badge */}
        {selectedLocation && !showLocationList && (
          <div className="w-full mt-1.5 px-3 py-1.5 bg-[#1A3BAF] text-white rounded-lg shadow-md flex items-center justify-between text-xs animate-fadeIn border border-blue-400/30">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-cyan-300" />
              <span className="font-medium truncate">{selectedLocation.name}</span>
              <span className="text-[10px] text-blue-200 shrink-0">
                ({selectedLocation.type.toUpperCase()} • {selectedLocation.province})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLocation(null)}
              className="text-blue-200 hover:text-white p-0.5 rounded transition-colors ml-2"
              title="Tutup indikator lokasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dropdown for location suggestions */}
        {showLocationList && (
          <div className="w-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-[450] animate-fadeIn max-h-72 overflow-y-auto">
            {!isQueryActive ? (
              // Default state: Lokasi Populer Indonesia
              <>
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span>Lokasi Populer Indonesia</span>
                  <span className="text-[9px] font-normal text-slate-400">Pilihan Cepat</span>
                </div>
                {popularLocations.map((loc) => {
                  const cfg = TYPE_CONFIG[loc.type] || TYPE_CONFIG.kabupaten;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full px-3 py-2 text-left text-xs text-[#1E1E1E] hover:bg-blue-50/60 flex items-center justify-between transition-colors border-b border-slate-50 last:border-none group"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Icon className="w-3.5 h-3.5 text-[#1A3BAF] shrink-0" />
                        <div className="truncate">
                          <div className="font-medium text-slate-800 group-hover:text-blue-700 truncate">
                            {loc.name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {loc.type === 'provinsi'
                              ? 'Provinsi • Indonesia'
                              : `${loc.province} • Indonesia`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${cfg.badgeClass}`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </>
            ) : isLoading ? (
              // Loading state
              <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span>Mencari wilayah administrasi...</span>
              </div>
            ) : hasError ? (
              // Error state
              <div className="p-4 text-center text-xs text-red-600">
                Terjadi kendala saat mencari wilayah. Silakan coba kembali.
              </div>
            ) : searchResults.length > 0 ? (
              // Search results list
              <>
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span>Hasil Pencarian Administrasi</span>
                  <span className="text-[9px] font-normal text-slate-500">
                    {searchResults.length} wilayah ditemukan
                  </span>
                </div>
                {searchResults.map((loc) => {
                  const cfg = TYPE_CONFIG[loc.type] || TYPE_CONFIG.kabupaten;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full px-3 py-2 text-left text-xs text-[#1E1E1E] hover:bg-blue-50/60 flex items-center justify-between transition-colors border-b border-slate-50 last:border-none group"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Icon className="w-3.5 h-3.5 text-[#1A3BAF] shrink-0" />
                        <div className="truncate">
                          <div className="font-medium text-slate-800 group-hover:text-blue-700 truncate">
                            {loc.name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {loc.type === 'provinsi'
                              ? 'Provinsi • Indonesia'
                              : `${loc.province} • Indonesia`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${cfg.badgeClass}`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </>
            ) : (
              // Empty results state
              <div className="p-4 text-center text-xs text-slate-500">
                <div className="font-semibold text-slate-700">Wilayah Tidak Ditemukan</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Tidak ditemukan wilayah untuk kata kunci &quot;{searchQuery}&quot;.
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Coba cari berdasarkan nama provinsi, kabupaten, kota, atau koordinat.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Right-Hand Floating Map Controls Stack (exact Figma Frame 81:950) */}
      <div className="absolute right-3.5 top-20 md:right-6 md:top-6 z-[400] flex flex-col gap-2.5 select-none">
        {/* Zoom In (+) */}
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom In"
          title="Perbesar"
          className="w-[45px] h-[45px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center justify-center text-[#1E1E1E] hover:bg-slate-50 active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Zoom Out (-) */}
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom Out"
          title="Perkecil"
          className="w-[45px] h-[45px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center justify-center text-[#1E1E1E] hover:bg-slate-50 active:scale-95 transition-transform"
        >
          <Minus className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Recenter / GPS */}
        <button
          type="button"
          onClick={handleRecenter}
          aria-label="Reset Map Center"
          title="Pusatkan Peta (Indonesia)"
          className="w-[45px] h-[45px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center justify-center text-[#1A3BAF] hover:bg-slate-50 active:scale-95 transition-transform"
        >
          <Crosshair className="w-5 h-5 stroke-[2.2]" />
        </button>

        {/* Basemap Switcher */}
        <button
          type="button"
          onClick={onToggleBasemap}
          aria-label="Ganti Basemap"
          title="Pilihan Basemap"
          className={`w-[45px] h-[45px] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center justify-center active:scale-95 transition-all ${
            isBasemapOpen
              ? 'bg-[#1A3BAF] text-white'
              : 'bg-white text-[#1E1E1E] hover:bg-slate-50'
          }`}
        >
          <MapIcon className="w-5 h-5 stroke-[2]" />
        </button>

        {/* Layers Stack Drawer */}
        <button
          type="button"
          onClick={onToggleLayerManager}
          aria-label="Manajemen Layer"
          title="Manajemen Layer Aktif"
          className={`relative w-[45px] h-[45px] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center justify-center active:scale-95 transition-all ${
            isLayerManagerOpen
              ? 'bg-[#1A3BAF] text-white'
              : 'bg-white text-[#1E1E1E] hover:bg-slate-50'
          }`}
        >
          <Layers className="w-5 h-5 stroke-[2]" />
          {activeLayers.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
              {activeLayers.length}
            </span>
          )}
        </button>

        {/* Measurement Tools */}
        <button
          type="button"
          onClick={onToggleTools}
          aria-label="Alat Ukur Spasial"
          title="Alat Pengukuran & Koordinat"
          className={`w-[45px] h-[45px] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center justify-center active:scale-95 transition-all ${
            isToolsOpen
              ? 'bg-[#1A3BAF] text-white'
              : 'bg-white text-[#1E1E1E] hover:bg-slate-50'
          }`}
        >
          <Ruler className="w-5 h-5 stroke-[2]" />
        </button>

        {/* Legend Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleLegend}
          aria-label="Legenda Peta"
          title="Legenda Layer Aktif"
          className={`w-[45px] h-[45px] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center justify-center active:scale-95 transition-all ${
            isLegendOpen
              ? 'bg-[#1A3BAF] text-white'
              : 'bg-white text-[#1E1E1E] hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5 stroke-[2]" />
        </button>
      </div>
    </>
  );
};
