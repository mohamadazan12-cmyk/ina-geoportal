import React from 'react';
import { X, Table, MapPin, Copy, Check } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';

export const FeatureInfoDrawer: React.FC = () => {
  const { selectedFeature, setSelectedFeature } = useMapStore();
  const [copied, setCopied] = React.useState(false);

  if (!selectedFeature) return null;

  const { coordinates, layerName, properties } = selectedFeature;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(properties, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const propEntries = Object.entries(properties);

  return (
    <div className="absolute bottom-3 left-3 right-3 z-[450] max-w-[380px] mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slideUp">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-emerald-400" />
          <div className="min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider truncate">
              {layerName || 'Informasi Fitur Spasial'}
            </h4>
            {coordinates && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyJson}
            className="p-1 rounded text-slate-400 hover:text-white"
            title="Salin Data JSON"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setSelectedFeature(null)}
            className="p-1 rounded text-slate-400 hover:text-white"
            title="Tutup Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Attributes Table */}
      <div className="p-3 max-h-72 overflow-y-auto">
        {propEntries.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">Tidak ada atribut data yang tersedia.</p>
        ) : (
          <table className="w-full text-xs text-left">
            <tbody className="divide-y divide-slate-100">
              {propEntries.map(([key, value]) => (
                <tr key={key} className="hover:bg-slate-50/80">
                  <td className="py-1.5 px-2 font-semibold text-slate-600 bg-slate-50/50 w-2/5 break-words">
                    {key}
                  </td>
                  <td className="py-1.5 px-2 text-slate-800 break-words font-mono text-[11px]">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
