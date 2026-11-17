import React, { useState } from 'react';
import { useMap } from 'react-leaflet';
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
  FileSpreadsheet,
} from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';

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

const PRESET_LOCATIONS = [
  { name: 'IKN Nusantara', coords: [-0.973, 116.708], zoom: 12 },
  { name: 'DKI Jakarta', coords: [-6.2088, 106.8456], zoom: 11 },
  { name: 'Surabaya, Jawa Timur', coords: [-7.2575, 112.7521], zoom: 12 },
  { name: 'Bandung, Jawa Barat', coords: [-6.9175, 107.6191], zoom: 12 },
  { name: 'Medan, Sumatera Utara', coords: [3.5952, 98.6722], zoom: 12 },
  { name: 'Makassar, Sulawesi Selatan', coords: [-5.1477, 119.4327], zoom: 12 },
  { name: 'Jayapura, Papua', coords: [-2.5337, 140.7181], zoom: 12 },
  { name: 'Denpasar, Bali', coords: [-8.6705, 115.2126], zoom: 12 },
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationList, setShowLocationList] = useState(false);
  const { activeLayers } = useMapStore();

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handleRecenter = () => {
    map.flyTo([-2.5489, 118.0149], 5, { duration: 1.2 });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if query is coordinates "lat, lng"
    const coordParts = searchQuery.split(',').map((s) => parseFloat(s.trim()));
    if (coordParts.length === 2 && !isNaN(coordParts[0]) && !isNaN(coordParts[1])) {
      map.flyTo([coordParts[0], coordParts[1]], 12);
      setShowLocationList(false);
      return;
    }

    // Check preset locations match
    const matched = PRESET_LOCATIONS.find((loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (matched) {
      map.flyTo(matched.coords as [number, number], matched.zoom);
    }
    setShowLocationList(false);
  };

  const handleSelectLocation = (loc: typeof PRESET_LOCATIONS[0]) => {
    map.flyTo(loc.coords as [number, number], loc.zoom);
    setSearchQuery(loc.name);
    setShowLocationList(false);
  };

  const filteredLocations = searchQuery.trim()
    ? PRESET_LOCATIONS.filter((l) =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : PRESET_LOCATIONS;

  return (
    <>
      {/* 1. Top Floating Search Bar (exact Figma Frame 81:950) */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex flex-col items-center">
        <form
          onSubmit={handleSearchSubmit}
          className="w-full h-12 bg-white/95 backdrop-blur-md rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.10)] border border-slate-100 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-[#1A3BAF]"
        >
          <Search className="w-4 h-4 text-[#717171] mr-2.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowLocationList(true)}
            placeholder="Cari lokasi atau peta"
            className="flex-1 bg-transparent text-xs text-[#1E1E1E] placeholder-[#717171] outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowLocationList(false);
              }}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Dropdown for location suggestions */}
        {showLocationList && (
          <div className="w-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-[450] animate-fadeIn max-h-56 overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
              Lokasi Populer Indonesia
            </div>
            {filteredLocations.map((loc) => (
              <button
                key={loc.name}
                type="button"
                onClick={() => handleSelectLocation(loc)}
                className="w-full px-3 py-2 text-left text-xs text-[#1E1E1E] hover:bg-slate-50 flex items-center justify-between transition-colors border-b border-slate-50 last:border-none"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-[#1A3BAF]" />
                  <span>{loc.name}</span>
                </div>
                <span className="text-[10px] text-[#717171]">
                  {loc.coords[0].toFixed(2)}, {loc.coords[1].toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Right-Hand Floating Map Controls Stack (exact Figma Frame 81:950) */}
      <div className="absolute right-3.5 top-20 z-[400] flex flex-col gap-2.5 select-none">
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
