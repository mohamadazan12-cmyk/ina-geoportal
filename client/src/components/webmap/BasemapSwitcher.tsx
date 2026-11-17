import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { BasemapType } from '../../types/map';

interface BasemapSwitcherProps {
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
}

export const BasemapSwitcher: React.FC<BasemapSwitcherProps> = ({
  isOpenControlled,
  onCloseControlled,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isVisible = isOpenControlled !== undefined ? isOpenControlled : internalOpen;
  const { basemap, setBasemap } = useMapStore();

  const options: Array<{ id: BasemapType; name: string; desc: string }> = [
    { id: 'osm', name: 'OpenStreetMap', desc: 'Peta jalan standar internasional' },
    { id: 'satellite', name: 'Citra Satelit', desc: 'Foto udara resolusi tinggi ESRI' },
    { id: 'topo', name: 'Topografi', desc: 'Kontur elevasi dan relief permukaan' },
    { id: 'dark', name: 'Dark Map', desc: 'Peta gelap kontras tinggi (Dark Canvas)' },
  ];

  if (!isVisible) return null;

  return (
    <div className="absolute top-20 right-16 z-[450] animate-fadeIn w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2">
      <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
        <span>Pilihan Basemap</span>
        <button
          onClick={() => (onCloseControlled ? onCloseControlled() : setInternalOpen(false))}
          className="text-slate-400 hover:text-slate-600 text-xs font-bold"
        >
          ✕
        </button>
      </div>
      <div className="space-y-1 mt-1">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              setBasemap(opt.id);
              if (onCloseControlled) onCloseControlled();
              else setInternalOpen(false);
            }}
            className={`w-full text-left p-2.5 rounded-xl flex items-start justify-between transition-all ${
              basemap === opt.id
                ? 'bg-blue-50 text-[#1A3BAF] border border-blue-200'
                : 'hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div>
              <div className="text-xs font-bold">{opt.name}</div>
              <div className="text-[11px] text-slate-500">{opt.desc}</div>
            </div>
            {basemap === opt.id && <Check className="w-4 h-4 text-[#1A3BAF] mt-0.5" />}
          </button>
        ))}
      </div>
    </div>
  );
};
