import React from 'react';
import { X, Layers } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { LAYER_SYMBOLOGY_CATALOG, LegendItemClass } from '../../utils/symbology';

interface LegendDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLayerManager?: () => void;
}

export const LegendDrawer: React.FC<LegendDrawerProps> = ({
  isOpen,
  onClose,
  onOpenLayerManager,
}) => {
  const { activeLayers } = useMapStore();

  if (!isOpen) return null;

  // Filter only visible layers on the map
  const visibleLayers = activeLayers.filter((l) => l.visible);

  const renderSymbol = (item: LegendItemClass) => {
    switch (item.type) {
      case 'polygon':
        return (
          <span
            className="w-4 h-4 rounded shrink-0 border shadow-xs"
            style={{
              backgroundColor: item.fillColor || item.color,
              borderColor: item.color,
              opacity: 0.85,
            }}
          />
        );
      case 'line':
        return (
          <div className="w-5 flex items-center justify-center shrink-0">
            <span
              className="w-full rounded-full"
              style={{
                height: `${Math.min(item.borderWidth || 3, 5)}px`,
                backgroundColor: item.color,
              }}
            />
          </div>
        );
      case 'point':
        return (
          <span
            className="w-3.5 h-3.5 rounded-full shrink-0 border-2 border-white shadow-xs"
            style={{
              backgroundColor: item.color,
            }}
          />
        );
      default:
        return (
          <span
            className="w-3.5 h-3.5 rounded shrink-0"
            style={{ backgroundColor: item.color }}
          />
        );
    }
  };

  return (
    <div className="absolute bottom-3 left-3 right-3 z-[450] max-w-[390px] mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slideUp">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0C1D36] text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Legenda Peta</h4>
            <span className="text-[10px] text-slate-300">
              {visibleLayers.length} Layer Sedang Ditampilkan
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Tutup Legenda"
          className="p-1 rounded text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Legend Items Content */}
      <div className="p-3 max-h-80 overflow-y-auto space-y-3">
        {visibleLayers.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            <Layers className="w-6 h-6 mx-auto mb-1 text-slate-300" />
            <p className="font-semibold text-slate-700">Tidak ada layer aktif</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Aktifkan layer melalui panel Manajemen Layer untuk melihat legenda.
            </p>
            {onOpenLayerManager && (
              <button
                type="button"
                onClick={onOpenLayerManager}
                className="mt-2.5 px-3 py-1.5 rounded-lg bg-blue-50 text-[#1A3BAF] font-semibold text-xs hover:bg-blue-100 transition-colors"
              >
                Buka Manajemen Layer
              </button>
            )}
          </div>
        ) : (
          visibleLayers.map((layer) => {
            const catalog = LAYER_SYMBOLOGY_CATALOG[layer.id];
            const isWms = layer.type === 'wms' && layer.url && layer.wmsLayer;
            const wmsLegendUrl = isWms
              ? `${layer.url}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=${encodeURIComponent(
                  layer.wmsLayer!
                )}&FORMAT=image/png`
              : null;

            return (
              <div
                key={layer.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 shadow-xs space-y-2"
              >
                {/* Layer Title Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-1.5">
                  <div>
                    <h5 className="text-xs font-bold text-[#1E1E1E] leading-snug">
                      {layer.name}
                    </h5>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {layer.source || 'Ina-Geoportal'} • {layer.type.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-[#1A3BAF] font-semibold shrink-0">
                    {Math.round(layer.opacity * 100)}%
                  </span>
                </div>

                {/* 1. WMS Legend Graphic */}
                {wmsLegendUrl && (
                  <div className="pt-1 space-y-1.5">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Legenda Server OGC:
                    </div>
                    <img
                      src={wmsLegendUrl}
                      alt={`Legenda resmi ${layer.name}`}
                      className="max-w-full h-auto rounded border border-slate-200 bg-white p-1"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <span className="w-3.5 h-3.5 rounded bg-[#1A3BAF] shrink-0" />
                      <span className="text-[11px]">Layer WMS Simpul Jaringan</span>
                    </div>
                  </div>
                )}

                {/* 2. Structured Multi-Class Vector Legend */}
                {catalog && catalog.classes.length > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    {catalog.classes.map((cls, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 py-1 text-xs text-[#1E1E1E]"
                      >
                        {renderSymbol(cls)}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs leading-tight truncate">
                            {cls.label}
                          </div>
                          {cls.sublabel && (
                            <div className="text-[10px] text-slate-500 truncate leading-tight">
                              {cls.sublabel}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Fallback for Local/Uploaded layers without catalog entry */}
                {!catalog && !wmsLegendUrl && (
                  <div className="flex items-center gap-2.5 py-1 text-xs text-[#1E1E1E]">
                    <span className="w-4 h-4 rounded border border-blue-400 bg-blue-100 shrink-0" />
                    <div>
                      <div className="font-semibold text-xs">Layer Spasial Pengguna</div>
                      <div className="text-[10px] text-slate-500">Data Vektor Lokal</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
