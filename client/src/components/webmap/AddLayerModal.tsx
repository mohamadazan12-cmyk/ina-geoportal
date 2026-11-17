import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Check, Search, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { datasetService } from '../../services/datasetService';
import { useMapStore } from '../../store/useMapStore';
import { Dataset } from '../../types/dataset';

interface AddLayerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddLayerModal: React.FC<AddLayerModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { activeLayers, addLayer } = useMapStore();

  const { data: datasetRes, isLoading } = useQuery({
    queryKey: ['availableLayersCatalog'],
    queryFn: () => datasetService.getDatasets({ limit: 50 }),
    enabled: isOpen,
  });

  const datasets = datasetRes?.data || [];

  const filteredDatasets = datasets.filter(
    (ds) =>
      ds.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ds.abstract.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddDatasetToMap = async (ds: Dataset) => {
    setAddingId(ds.id);
    setErrorMessage(null);

    try {
      // Determine if we should add as GeoJSON or WMS
      // We prioritize GeoJSON for interactive client-side rendering
      let geojsonData: any = null;
      let layerType: 'geojson' | 'wms' = 'geojson';

      try {
        geojsonData = await datasetService.getDatasetGeoJSON(ds.id);
        layerType = 'geojson';
      } catch (err) {
        if (ds.wmsUrl && ds.wmsLayer) {
          layerType = 'wms';
        } else {
          throw new Error('Data spasial untuk layer ini belum dapat diakses.');
        }
      }

      addLayer({
        id: ds.id,
        name: ds.title,
        description: ds.abstract,
        type: layerType,
        url: ds.wmsUrl,
        wmsLayer: ds.wmsLayer || undefined,
        geojsonData,
        opacity: 0.85,
        visible: true,
        source: ds.node?.name || 'Ina-Geoportal',
        format: ds.formatList,
      });

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menambahkan layer ke peta.');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pilih Layer dari Katalog Dataset" maxWidth="xl">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari layer berdasarkan judul atau kata kunci..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dataset list */}
        {isLoading ? (
          <div className="py-12 flex justify-center items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>Memuat katalog layer...</span>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            Tidak ada dataset yang cocok dengan kata kunci &ldquo;{searchTerm}&rdquo;.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto space-y-2">
            {filteredDatasets.map((ds) => {
              const isAlreadyAdded = activeLayers.some((l) => l.id === ds.id);
              const isProcessing = addingId === ds.id;

              return (
                <div
                  key={ds.id}
                  className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-slate-50 flex items-start justify-between gap-3 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={ds.accessType === 'restricted' ? 'restricted' : 'public'} size="sm">
                        {ds.accessType.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {ds.category?.name}
                      </span>
                      {ds.isDemo && <Badge variant="demo" size="sm">DEMO</Badge>}
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 truncate">{ds.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{ds.abstract}</p>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Wali Data: {ds.node?.name || ds.distribution} • Tahun: {ds.year}
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    {isAlreadyAdded ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                        <Check className="w-3.5 h-3.5" />
                        Aktif
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAddDatasetToMap(ds)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow transition-all"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>{isProcessing ? 'Memuat...' : 'Tambahkan'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
