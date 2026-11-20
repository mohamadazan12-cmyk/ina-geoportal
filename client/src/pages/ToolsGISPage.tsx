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
  Copy,
  Check,
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
  const [copied, setCopied] = useState(false);
  const [convertedResult, setConvertedResult] = useState<{
    dmsLat: string;
    dmsLng: string;
    utmZone: string;
  } | null>({
    dmsLat: `6° 12' 31.7" LS`,
    dmsLng: `106° 50' 44.2" BT`,
    utmZone: `Zona 48 S (WGS 84)`,
  });

  const handleConvertCoordinates = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      return `${deg}° ${min}' ${sec}" ${dir}`;
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

  const handleApplyPreset = (lat: string, lng: string) => {
    setLatInput(lat);
    setLngInput(lng);
    setTimeout(() => {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const toDMS = (val: number, isLat: boolean) => {
        const dir = isLat ? (val >= 0 ? 'LU' : 'LS') : val >= 0 ? 'BT' : 'BB';
        const abs = Math.abs(val);
        const deg = Math.floor(abs);
        const min = Math.floor((abs - deg) * 60);
        const sec = (((abs - deg) * 60 - min) * 60).toFixed(1);
        return `${deg}° ${min}' ${sec}" ${dir}`;
      };
      const utmZoneNum = Math.floor((lngNum + 180) / 6) + 1;
      const utmHemi = latNum >= 0 ? 'N' : 'S';

      setConvertedResult({
        dmsLat: toDMS(latNum, true),
        dmsLng: toDMS(lngNum, false),
        utmZone: `Zona ${utmZoneNum} ${utmHemi} (WGS 84)`,
      });
    }, 0);
  };

  const handleCopyResult = () => {
    if (!convertedResult) return;
    const text = `Lat: ${convertedResult.dmsLat}\nLng: ${convertedResult.dmsLng}\nUTM: ${convertedResult.utmZone}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 select-none flex flex-col space-y-6 md:space-y-8">
      {/* 1. Header with Back button and Title (exact Figma 30:997) */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => navigate('/lainnya')}
          aria-label="Kembali ke menu Lainnya"
          className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 hover:text-[#1A3BAF] active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
        </button>
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-[#1E1E1E] tracking-tight">
            Tools & Utilitas GIS
          </h1>
          <span className="text-xs md:text-sm text-[#717171]">
            Aplikasi Pendukung Pengelolaan Simpul, Metadata, dan Konversi Koordinat
          </span>
        </div>
      </div>

      {/* 2. Tools Grid (exact Figma 30:997 "Palapa", "Metadata Editor", responsive 3-col desktop) */}
      <div>
        <h2 className="text-sm md:text-base font-bold text-[#1E1E1E] uppercase tracking-wider mb-4">
          Aplikasi Pendukung Resmi JIGN
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TOOLS_DATA.map((tool) => (
            <div
              key={tool.id}
              className="w-full bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex flex-col justify-between gap-4 transition-all hover:shadow-md hover:border-[#1A3BAF]/30"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A3BAF] flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#1E1E1E] leading-snug">
                      {tool.name}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {tool.category} • {tool.version}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#717171] leading-relaxed line-clamp-3">
                  {tool.description}
                </p>
              </div>

              {/* Action button "Lihat Detail" */}
              <button
                type="button"
                onClick={() => setSelectedTool(tool)}
                className="w-full h-11 bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all"
              >
                <span>Lihat Detail Aplikasi</span>
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Interactive Utility: Konverter Koordinat Geospasial (2-col Desktop Grid) */}
      <div className="w-full bg-white rounded-2xl p-5 md:p-8 shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1A3BAF] flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-bold text-sm md:text-base text-[#1E1E1E]">
              Konverter Koordinat Geografis (Desimal ↔ DMS ↔ UTM)
            </h3>
            <p className="text-xs text-slate-500">
              Transformasi koordinat titik referensi pemetaan Sistem Referensi Geospasial Indonesia (SRGI 2013 / WGS 84)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Input Form */}
          <form onSubmit={handleConvertCoordinates} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Latitude (Lintang Desimal)
                </label>
                <input
                  type="text"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="-6.2088"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#1A3BAF] font-mono text-xs md:text-sm bg-slate-50/50"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Contoh: -6.2088 (Jakarta)</span>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Longitude (Bujur Desimal)
                </label>
                <input
                  type="text"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder="106.8456"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#1A3BAF] font-mono text-xs md:text-sm bg-slate-50/50"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Contoh: 106.8456 (Jakarta)</span>
              </div>
            </div>

            {/* Presets Shortcuts */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Preset Lokasi:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('-6.2088', '106.8456')}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
              >
                DKI Jakarta
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('-0.973', '116.708')}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
              >
                IKN Nusantara
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('-7.2575', '112.7521')}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
              >
                Surabaya
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('3.5952', '98.6722')}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
              >
                Medan
              </button>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
            >
              <RotateCw className="w-4 h-4" />
              <span>Hitung Konversi Koordinat</span>
            </button>
          </form>

          {/* Right Column: Result Display */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-[#1A3BAF] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Hasil Transformasi Koordinat
              </span>
              {convertedResult && (
                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1A3BAF] hover:underline"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Hasil</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {convertedResult ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-slate-400 font-sans text-[10px] uppercase font-bold block mb-0.5">
                    Derajat Menit Detik (DMS) - Latitude
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{convertedResult.dmsLat}</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-slate-400 font-sans text-[10px] uppercase font-bold block mb-0.5">
                    Derajat Menit Detik (DMS) - Longitude
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{convertedResult.dmsLng}</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-slate-400 font-sans text-[10px] uppercase font-bold block mb-0.5">
                    Proyeksi Universal Transverse Mercator (UTM)
                  </span>
                  <span className="font-bold text-[#1A3BAF] text-sm">{convertedResult.utmZone}</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Masukkan nilai koordinat lalu klik tombol konversi di sebelah kiri.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tool Detail Modal */}
      {selectedTool && (
        <Modal
          isOpen={Boolean(selectedTool)}
          onClose={() => setSelectedTool(null)}
          title={`Detail Aplikasi: ${selectedTool.name}`}
          maxWidth="lg"
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

            <p className="text-xs md:text-sm text-[#1E1E1E] leading-relaxed">
              {selectedTool.description}
            </p>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
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

            <div className="pt-2 flex items-center gap-3">
              <a
                href={selectedTool.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-11 bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <span>Akses Portal Resmi</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setSelectedTool(null)}
                className="px-5 h-11 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
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
