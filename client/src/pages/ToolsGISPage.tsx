import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Wrench,
  ArrowUpRight,
  Compass,
  CheckCircle2,
  ExternalLink,
  RotateCw,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

interface ToolItem {
  id: string;
  name: string;
  category: string;
  version: string;
  description: string;
  features: string[];
  docUrl: string;
}

const TOOLS_DATA: ToolItem[] = [
  {
    id: 'palapa',
    name: 'Palapa',
    category: 'Manajemen Simpul Jaringan',
    version: 'v4.2.0',
    description: 'Aplikasi resmi Badan Informasi Geospasial untuk pengelolaan simpul jaringan, diseminasi metadata, dan penataan hak akses geospasial pada instansi kementerian, lembaga, dan pemerintah daerah.',
    features: [
      'Manajemen metadata spasial terstandar ISO 19115/19139',
      'Integrasi otomatis katalog dengan Ina-Geoportal Nasional',
      'Dukungan Web Coverage Service (WCS), WMS, dan WFS',
      'Audit log pengunduhan data dan statistik pemanfaatan',
    ],
    docUrl: 'https://palapa.big.go.id',
  },
  {
    id: 'metadata-editor',
    name: 'Metadata Editor',
    category: 'Penyusunan Metadata ISO',
    version: 'v3.1.2',
    description: 'Perangkat lunak mandiri untuk mempermudah produsen data menyusun, menyunting, dan memvalidasi kelengkapan dokumen metadata geospasial sebelum diintegrasikan ke jaringan nasional.',
    features: [
      'Validasi instan skema XML ISO 19139',
      'Penyusunan bounding box spasial otomatis dari Shapefile/GeoJSON',
      'Kamus istilah terstandar KUGI (Katalog Unsur Geografi Indonesia)',
      'Ekspor dan impor format XML dan JSON',
    ],
    docUrl: 'https://metadata.big.go.id',
  },
  {
    id: 'qgis-plugin',
    name: 'Ina-Geoportal QGIS Plugin',
    category: 'Integrasi Desktop GIS',
    version: 'v2.0.1',
    description: 'Plugin resmi QGIS untuk mencari, menjelajahi, dan menambahkan ribuan layer peta resmi dari Ina-Geoportal langsung ke dalam proyek peta kerja desktop GIS.',
    features: [
      'Pencarian langsung dataset dari repositori nasional',
      'Koneksi sekali klik layer WMS dan WFS tanpa input URL manual',
      'Dukungan autentikasi token akun Ina-Geoportal',
      'Pemberitahuan pembaruan data spasial secara berkala',
    ],
    docUrl: 'https://plugins.qgis.org',
  },
];

export const ToolsGISPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTool, setSelectedTool] = useState<ToolItem | null>(null);

  // Interactive coordinate converter state
  const [latInput, setLatInput] = useState('-6.2088');
  const [lngInput, setLngInput] = useState('106.8456');
  const [convertedResult, setConvertedResult] = useState<{
    dmsLat: string;
    dmsLng: string;
    utmZone: string;
  } | null>(null);

  const handleConvertCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (isNaN(lat) || isNaN(lng)) return;

    // Convert decimal to DMS
    const toDMS = (val: number, isLat: boolean) => {
      const dir = isLat ? (val >= 0 ? 'LU' : 'LS') : val >= 0 ? 'BT' : 'BB';
      const abs = Math.abs(val);
      const deg = Math.floor(abs);
      const min = Math.floor((abs - deg) * 60);
      const sec = (((abs - deg) * 60 - min) * 60).toFixed(1);
      return `${deg}° ${min}' ${sec}\" ${dir}`;
    };

    // Calculate approx UTM zone
    const utmZoneNum = Math.floor((lng + 180) / 6) + 1;
    const utmHemi = lat >= 0 ? 'N' : 'S';

    setConvertedResult({
      dmsLat: toDMS(lat, true),
      dmsLng: toDMS(lng, false),
      utmZone: `Zona ${utmZoneNum} ${utmHemi} (WGS 84)`,
    });
  };

  return (
    <div className="w-full flex flex-col px-5 pt-4 pb-8 select-none">
      {/* 1. Header with Back button and Title (exact Figma 30:997) */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => navigate('/lainnya')}
          aria-label="Kembali ke menu Lainnya"
          className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:text-[#1A3BAF] active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1E1E1E] tracking-tight">
            Tools
          </h1>
          <span className="text-[11px] text-[#717171]">
            Aplikasi & Utilitas Geospasial JIGN
          </span>
        </div>
      </div>

      {/* 2. Tools List (exact Figma 30:997 \"Palapa\", \"Metadata Editor\") */}
      <div className="space-y-3.5 mb-5">
        {TOOLS_DATA.map((tool) => (
          <div
            key={tool.id}
            className="w-full bg-white rounded-lg p-3.5 shadow-sm border border-slate-100 flex flex-col gap-2.5 transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1A3BAF] flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1E1E1E] leading-snug">
                    {tool.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {tool.category} • {tool.version}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#717171] leading-relaxed line-clamp-2">
              {tool.description}
            </p>

            {/* Action button \"Lihat Detail ↗\" (exact Figma text) */}
            <button
              type="button"
              onClick={() => setSelectedTool(tool)}
              className="w-full h-[40px] bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all"
            >
              <span>Lihat Detail</span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        ))}
      </div>

      {/* 3. Interactive Utility: Konverter Koordinat Geospasial */}
      <div className="w-full bg-white rounded-lg p-4 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">
          <Compass className="w-4 h-4 text-[#1A3BAF]" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#1E1E1E]">
            Konverter Koordinat Geografis
          </h3>
        </div>

        <form onSubmit={handleConvertCoordinates} className="space-y-2.5 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Latitude (Desimal)</label>
              <input
                type="text"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                placeholder="-6.2088"
                className="w-full h-8 px-2.5 rounded border border-slate-200 outline-none focus:ring-1 focus:ring-[#1A3BAF] font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Longitude (Desimal)</label>
              <input
                type="text"
                value={lngInput}
                onChange={(e) => setLngInput(e.target.value)}
                placeholder="106.8456"
                className="w-full h-8 px-2.5 rounded border border-slate-200 outline-none focus:ring-1 focus:ring-[#1A3BAF] font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors active:scale-98"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Konversi ke Format DMS & UTM</span>
          </button>
        </form>

        {convertedResult && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 animate-fadeIn text-xs">
            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block">
              Hasil Transformasi Koordinat:
            </span>
            <div className="space-y-1 font-mono text-[11px] text-slate-800">
              <div><span className="text-slate-500 font-sans">DMS Lat:</span> {convertedResult.dmsLat}</div>
              <div><span className="text-slate-500 font-sans">DMS Lng:</span> {convertedResult.dmsLng}</div>
              <div><span className="text-slate-500 font-sans">Proyeksi UTM:</span> {convertedResult.utmZone}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tool Detail Modal */}
      {selectedTool && (
        <Modal
          isOpen={Boolean(selectedTool)}
          onClose={() => setSelectedTool(null)}
          title={`Detail Aplikasi: ${selectedTool.name}`}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-[#1A3BAF] font-bold text-xs px-2.5 py-0.5 rounded-full">
                {selectedTool.category}
              </span>
              <span className="font-mono text-xs text-slate-500">
                {selectedTool.version}
              </span>
            </div>

            <p className="text-xs text-[#1E1E1E] leading-relaxed">
              {selectedTool.description}
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
                Fitur Unggulan:
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {selectedTool.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  alert(`Membuka dokumentasi resmi ${selectedTool.name}`);
                  setSelectedTool(null);
                }}
                className="flex-1 h-10 bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <span>Akses Portal Resmi</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedTool(null)}
                className="px-4 h-10 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
