import React, { useState } from 'react';
import { useMap } from 'react-leaflet';
import {
  Ruler,
  Maximize,
  Compass,
  Upload,
  X,
  Play,
  CheckCircle,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { calculateDistanceKm, calculatePolygonAreaSqKm, safeParseGeoJSON, simpleKmlToGeoJSON } from '../../utils/geoUtils';
import { useMapStore } from '../../store/useMapStore';

interface SpatialToolsProps {
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
}

export const SpatialTools: React.FC<SpatialToolsProps> = ({
  isOpenControlled,
  onCloseControlled,
}) => {
  const [activeTool, setActiveTool] = useState<'none' | 'distance' | 'area' | 'search' | 'upload'>('none');
  const [latInput, setLatInput] = useState('-6.2088');
  const [lngInput, setLngInput] = useState('106.8456');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // If controlled and opened, default to distance if none selected
  React.useEffect(() => {
    if (isOpenControlled && activeTool === 'none') {
      setActiveTool('distance');
    } else if (isOpenControlled === false && activeTool !== 'none') {
      setActiveTool('none');
    }
  }, [isOpenControlled]);

  // Measurement points state
  const [measurePoints, setMeasurePoints] = useState<Array<[number, number]>>([]);
  const [measureResult, setMeasureResult] = useState<string | null>(null);

  const map = useMap();
  const addLayer = useMapStore((s) => s.addLayer);

  // Handle map clicks when measuring
  React.useEffect(() => {
    if (activeTool !== 'distance' && activeTool !== 'area') return;

    const onMapClick = (e: L.LeafletMouseEvent) => {
      const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
      const updated = [...measurePoints, newPoint];
      setMeasurePoints(updated);

      if (activeTool === 'distance') {
        if (updated.length >= 2) {
          let totalKm = 0;
          for (let i = 0; i < updated.length - 1; i++) {
            totalKm += calculateDistanceKm(updated[i], updated[i + 1]);
          }
          setMeasureResult(`Jarak Total: ${totalKm.toFixed(2)} km (${updated.length} titik)`);
        } else {
          setMeasureResult('Klik titik berikutnya pada peta untuk mengukur jarak.');
        }
      } else if (activeTool === 'area') {
        if (updated.length >= 3) {
          const area = calculatePolygonAreaSqKm(updated);
          setMeasureResult(`Luas Area: ${area.toFixed(2)} km² (${updated.length} simpul)`);
        } else {
          setMeasureResult(`Klik minimal ${3 - updated.length} titik lagi untuk membentuk poligon.`);
        }
      }
    };

    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, [activeTool, measurePoints, map]);

  const handleFlyTo = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (isNaN(lat) || isNaN(lng)) return;
    map.flyTo([lat, lng], 12, { duration: 1.5 });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Ukuran file melebihi batas 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let geojsonData: any = null;

        if (file.name.endsWith('.kml')) {
          geojsonData = simpleKmlToGeoJSON(text);
        } else {
          geojsonData = safeParseGeoJSON(text);
        }

        const layerId = `local-${Date.now()}`;
        addLayer({
          id: layerId,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'geojson',
          opacity: 0.85,
          visible: true,
          geojsonData,
          source: 'Unggahan Berkas Lokal Pengguna',
          isLocalUpload: true,
        });

        setUploadSuccess(`Berhasil memuat "${file.name}" sebagai layer lokal.`);
        setTimeout(() => {
          setUploadSuccess(null);
          setActiveTool('none');
        }, 2000);
      } catch (err: any) {
        setUploadError(err.message || 'Gagal memproses berkas geospasial.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetMeasure = () => {
    setMeasurePoints([]);
    setMeasureResult(null);
  };

  if (isOpenControlled === false && activeTool === 'none') return null;

  return (
    <div className="absolute top-20 right-16 z-[450] flex flex-col items-end gap-2">
      {/* Tool Button Bar */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-1.5 flex items-center gap-1">
        <button
          onClick={() => {
            setActiveTool(activeTool === 'distance' ? 'none' : 'distance');
            handleResetMeasure();
          }}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'distance'
              ? 'bg-[#1A3BAF] text-white shadow-md'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Ukur Jarak (Measure Distance)"
        >
          <Ruler className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            setActiveTool(activeTool === 'area' ? 'none' : 'area');
            handleResetMeasure();
          }}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'area'
              ? 'bg-[#1A3BAF] text-white shadow-md'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Ukur Luas Area (Measure Area)"
        >
          <Maximize className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTool(activeTool === 'search' ? 'none' : 'search')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'search'
              ? 'bg-[#1A3BAF] text-white shadow-md'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Cari Koordinat (Latitude, Longitude)"
        >
          <Compass className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTool(activeTool === 'upload' ? 'none' : 'upload')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'upload'
              ? 'bg-[#1A3BAF] text-white shadow-md'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Unggah Data Lokal (GeoJSON / KML)"
        >
          <Upload className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Panel for Active Tool */}
      {activeTool !== 'none' && (
        <div className="w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-4 animate-fadeIn text-slate-800">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              {activeTool === 'distance' && <><Ruler className="w-4 h-4 text-[#1A3BAF]" /> Pengukuran Jarak</>}
              {activeTool === 'area' && <><Maximize className="w-4 h-4 text-[#1A3BAF]" /> Pengukuran Luas Area</>}
              {activeTool === 'search' && <><Compass className="w-4 h-4 text-[#1A3BAF]" /> Pencarian Koordinat</>}
              {activeTool === 'upload' && <><Upload className="w-4 h-4 text-[#1A3BAF]" /> Unggah Berkas Spasial</>}
            </h4>
            <button
              onClick={() => {
                setActiveTool('none');
                handleResetMeasure();
                onCloseControlled?.();
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* MEASUREMENT (DISTANCE / AREA) */}
          {(activeTool === 'distance' || activeTool === 'area') && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Klik pada peta untuk menempatkan titik {activeTool === 'distance' ? 'jalur' : 'sudut poligon'}.
              </p>
              {measureResult ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900">
                  {measureResult}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                  Belum ada titik yang diklik di peta.
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">{measurePoints.length} Titik</span>
                <button
                  onClick={handleResetMeasure}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* COORDINATE SEARCH */}
          {activeTool === 'search' && (
            <form onSubmit={handleFlyTo} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Latitude (Lintang):</label>
                <input
                  type="text"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="-6.2088"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Longitude (Bujur):</label>
                <input
                  type="text"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder="106.8456"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-[#1A3BAF] hover:bg-[#153096] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 shadow-sm active:scale-98 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Terbangkan ke Koordinat</span>
              </button>
            </form>
          )}

          {/* UPLOAD LOCAL DATA */}
          {activeTool === 'upload' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Unggah berkas <strong>.geojson</strong> atau <strong>.kml</strong> untuk dirender langsung di peta (Client-only, data tidak diunggah ke server).
              </p>

              <label className="block p-4 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/40 transition-colors">
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <span className="text-xs font-bold text-emerald-700">Pilih Berkas Lokal</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Format GeoJSON atau KML (Maks 10MB)</span>
                <input
                  type="file"
                  accept=".geojson,.json,.kml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {uploadSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {uploadError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
