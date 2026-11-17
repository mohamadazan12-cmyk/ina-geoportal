import React, { useState } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sliders,
  Plus,
  X,
} from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';

interface LayerManagerDrawerProps {
  onOpenAddLayerModal: () => void;
  onOpenLegend: () => void;
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
}

export const LayerManagerDrawer: React.FC<LayerManagerDrawerProps> = ({
  onOpenAddLayerModal,
  onOpenLegend,
  isOpenControlled,
  onCloseControlled,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isOpenControlled !== undefined ? isOpenControlled : internalOpen;
  const setIsOpen = onCloseControlled ? (val: boolean) => !val && onCloseControlled() : setInternalOpen;

  const {
    activeLayers,
    removeLayer,
    toggleLayerVisibility,
    updateLayerOpacity,
    reorderLayers,
  } = useMapStore();

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderLayers(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < activeLayers.length - 1) {
      reorderLayers(index, index + 1);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute top-16 left-3 right-3 max-w-[380px] mx-auto z-[450] animate-fadeIn">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-[#0C1D36] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider">Manajemen Layer</h3>
              <span className="text-[10px] text-slate-300">
                {activeLayers.length} Layer Aktif
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenAddLayerModal}
              className="px-2 py-1 bg-[#1A3BAF] hover:bg-[#153096] text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </button>
            <button
              onClick={() => (onCloseControlled ? onCloseControlled() : setIsOpen(false))}
              className="p-1 text-slate-300 hover:text-white rounded"
              title="Tutup Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isOpen && (
          <div className="p-3 max-h-[calc(100vh-220px)] overflow-y-auto space-y-3">
            {activeLayers.length === 0 ? (
              <div className="py-8 text-center text-slate-500 space-y-3">
                <Layers className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">Belum ada layer spasial yang aktif pada peta.</p>
                <button
                  onClick={onOpenAddLayerModal}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  Pilih Layer dari Katalog
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeLayers.map((layer, index) => (
                  <div
                    key={layer.id}
                    className={`p-3 rounded-xl border transition-all ${
                      layer.visible
                        ? 'bg-slate-50 border-slate-200 shadow-sm'
                        : 'bg-slate-100/60 border-slate-200 opacity-60'
                    }`}
                  >
                    {/* Top Row: Title, Visibility, Delete, Reorder */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-1 rounded">
                            {layer.type}
                          </span>
                          {layer.isLocalUpload && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1 rounded">
                              LOKAL
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-800 truncate block">
                            {layer.name}
                          </span>
                        </div>
                        {layer.source && (
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            Sumber: {layer.source}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Toggle visibility */}
                        <button
                          onClick={() => toggleLayerVisibility(layer.id)}
                          className={`p-1 rounded hover:bg-white transition-colors ${
                            layer.visible ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                          title={layer.visible ? 'Sembunyikan layer' : 'Tampilkan layer'}
                        >
                          {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        {/* Move Up */}
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          title="Pindahkan ke atas tumpukan"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>

                        {/* Move Down */}
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === activeLayers.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          title="Pindahkan ke bawah tumpukan"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>

                        {/* Remove */}
                        <button
                          onClick={() => removeLayer(layer.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                          title="Hapus layer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Opacity Slider */}
                    <div className="flex items-center gap-2 pt-1">
                      <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={layer.opacity}
                        onChange={(e) => updateLayerOpacity(layer.id, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                      <span className="text-[11px] font-mono text-slate-500 w-8 text-right">
                        {Math.round(layer.opacity * 100)}%
                      </span>
                    </div>

                    {/* Info Toggle */}
                    {layer.description && (
                      <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 mt-2">
                        {layer.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <button
                onClick={onOpenLegend}
                className="text-[#1A3BAF] font-bold hover:underline flex items-center gap-1"
              >
                <span>Lihat Legenda Layer</span>
              </button>
              <button
                onClick={onOpenAddLayerModal}
                className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Layer</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
