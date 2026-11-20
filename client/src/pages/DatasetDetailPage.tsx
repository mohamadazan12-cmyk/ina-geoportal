import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Database,
  Map,
  Download,
  Bookmark,
  Building2,
  Globe,
  Mail,
  Layers,
  ArrowLeft,
  Copy,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { datasetService } from '../services/datasetService';
import { userService } from '../services/userService';
import { useAuthStore } from '../store/useAuthStore';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DownloadModal } from '../components/catalog/DownloadModal';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { formatDate } from '../utils/formatters';

const MapBoundsUpdater: React.FC<{ geojson: any }> = ({ geojson }) => {
  const map = useMap();
  useEffect(() => {
    if (!geojson) return;
    try {
      const geoLayer = L.geoJSON(geojson);
      const bounds = geoLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [15, 15] });
      }
    } catch {
      // Ignore fitBounds errors for point or non-standard collections
    }
  }, [geojson, map]);
  return null;
};

export const DatasetDetailPage: React.FC = () => {
  const { datasetId } = useParams<{ datasetId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copiedWms, setCopiedWms] = useState(false);

  useEffect(() => {
    if (searchParams.get('autoDownload') === datasetId) {
      setDownloadModalOpen(true);
    }
  }, [searchParams, datasetId]);

  // Fetch dataset metadata
  const {
    data: dataset,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['datasetDetail', datasetId],
    queryFn: () => datasetService.getDatasetById(datasetId!),
    enabled: !!datasetId,
  });

  // Fetch GeoJSON for mini map preview
  const { data: geojsonData } = useQuery({
    queryKey: ['datasetGeoJSON', datasetId],
    queryFn: () => datasetService.getDatasetGeoJSON(datasetId!),
    enabled: !!datasetId,
  });

  const handleToggleBookmark = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const res = await userService.toggleBookmark(datasetId!);
      setIsBookmarked(res.bookmarked);
    } catch (err) {
      console.error('Bookmark toggle error:', err);
    }
  };

  const handleCopyEndpoint = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWms(true);
    setTimeout(() => setCopiedWms(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="py-24">
        <LoadingSpinner label="Memuat detail metadata dataset..." />
      </div>
    );
  }

  if (isError || !dataset) {
    return (
      <div className="py-16 max-w-xl mx-auto text-center space-y-4 px-4">
        <h2 className="text-xl font-bold text-slate-800">Dataset Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">{(error as Error)?.message || 'Data tidak tersedia.'}</p>
        <Link
          to="/katalog"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A3BAF] text-white text-xs font-bold rounded-xl shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Katalog
        </Link>
      </div>
    );
  }

  const isRestricted = dataset.accessType === 'restricted';
  const formats = dataset.formatList.split(',').map((f: string) => f.trim().toUpperCase());

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 select-none space-y-6">
      {/* Back link */}
      <div>
        <Link
          to="/katalog"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A3BAF] hover:underline transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Katalog Peta
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isRestricted ? 'restricted' : 'public'}>
              {dataset.accessType.toUpperCase()}
            </Badge>
            {dataset.r2PublicUrl && (
              <Badge variant="r2">CLOUDFLARE R2</Badge>
            )}
            {dataset.dataSourceStatus === 'REAL' || dataset.dataSourceStatus === 'REAL_VERIFIED' ? (
              <Badge variant="real">DATA RESMI TERVERIFIKASI</Badge>
            ) : dataset.dataSourceStatus === 'REAL_PARTIAL_COVERAGE' ? (
              <Badge variant="partial">CAKUPAN PARSIAL</Badge>
            ) : dataset.dataSourceStatus === 'PENDING_AUTHORIZATION' ? (
              <Badge variant="pending">MEMERLUKAN IZIN PUSDATIN</Badge>
            ) : dataset.isDemo ? (
              <Badge variant="demo">DEMO / FALLBACK</Badge>
            ) : null}
            <span className="text-xs font-bold text-[#1A3BAF] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              {dataset.category?.name || 'Tematik'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleBookmark}
              className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 text-xs font-semibold ${
                isBookmarked
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>{isBookmarked ? 'Tersimpan' : 'Bookmark'}</span>
            </button>
          </div>
        </div>

        <h1 className="text-xl md:text-3xl font-bold text-[#1E1E1E] tracking-tight leading-snug">
          {dataset.title}
        </h1>

        <p className="text-xs md:text-sm text-[#717171] leading-relaxed max-w-4xl">
          {dataset.abstract}
        </p>

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={() => navigate(`/webmap?addLayer=${encodeURIComponent(dataset.id)}`)}
            className="w-full sm:w-auto px-6 h-11 bg-[#1A3BAF] hover:bg-[#153096] text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <Map className="w-4 h-4" />
            <span>Lihat di Peta Webmap</span>
          </button>

          <button
            onClick={() => setDownloadModalOpen(true)}
            className="w-full sm:w-auto px-6 h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Dataset ({formats.join(', ')})</span>
          </button>

          {!isRestricted && (dataset.publicDownloadUrl || dataset.r2PublicUrl) && (
            <a
              href={dataset.publicDownloadUrl || dataset.r2PublicUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Langsung (R2 Public)</span>
            </a>
          )}
        </div>
      </div>

      {/* Main Grid: ISO 19115 Metadata + Mini Map Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (col-span-2): Comprehensive Metadata */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deskripsi Lengkap */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-[#1A3BAF] uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-[#1A3BAF]" />
              Deskripsi & Riwayat Data
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {dataset.description || dataset.abstract}
            </p>
          </div>

          {/* Asal Usul & Provenansi Data Geospasial */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#1A3BAF] uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#1A3BAF]" />
                Asal Usul & Provenansi Data Resmi
              </h3>
              {dataset.dataSourceStatus === 'REAL_VERIFIED' || dataset.dataSourceStatus === 'REAL' ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  REAL VERIFIED (NASIONAL)
                </span>
              ) : dataset.dataSourceStatus === 'REAL_PARTIAL_COVERAGE' ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                  REAL (CAKUPAN PARSIAL)
                </span>
              ) : dataset.dataSourceStatus === 'PENDING_AUTHORIZATION' ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  PENDING AUTHORIZATION
                </span>
              ) : dataset.dataSourceStatus === 'UNAVAILABLE' ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                  UNAVAILABLE
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                  FALLBACK ACTIVE
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Instansi Wali Data</span>
                <span className="font-bold text-slate-800">{dataset.sourceAgency || dataset.node?.name || 'Badan Informasi Geospasial'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Unit Kerja / Produsen</span>
                <span className="font-bold text-slate-800">{dataset.sourceOrganization || dataset.distribution || 'Pusat Pemetaan'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Tipe Layanan & Geometri</span>
                <span className="font-bold text-slate-800">{dataset.serviceType || 'ArcGIS REST'} • {dataset.geometryType || 'Vektor'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Fitur Terverifikasi</span>
                <span className="font-mono font-bold text-slate-800">
                  {dataset.realFeatureCount ? `${dataset.realFeatureCount.toLocaleString('id-ID')} Objek Spasial` : 'Tersedia via WMS / MapServer'}
                </span>
              </div>

              {dataset.serviceUrl && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">URL Layanan Geospasial Sumber</span>
                  <div className="font-mono text-[11px] text-[#1A3BAF] break-all select-all">
                    {dataset.serviceUrl}
                  </div>
                </div>
              )}

              {dataset.disclaimer && (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block mb-0.5">Disclaimer & Batasan Penggunaan</span>
                  <p className="text-[11px] text-amber-900 leading-relaxed">{dataset.disclaimer}</p>
                </div>
              )}
            </div>
          </div>

          {/* ISO 19115 Standard Specification Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-[#1A3BAF] uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1A3BAF]" />
              Spesifikasi Metadata ISO 19115
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Dataset ID</span>
                <span className="font-mono font-bold text-slate-800 select-all">{dataset.id}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Sistem Referensi Koordinat (CRS)</span>
                <span className="font-bold text-slate-800">{dataset.crs}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Kode EPSG</span>
                <span className="font-mono font-bold text-slate-800">{dataset.epsg}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Skala Representasi</span>
                <span className="font-bold text-slate-800">{dataset.scale}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Tanggal Publikasi</span>
                <span className="font-semibold text-slate-800">{formatDate(dataset.publishedDate)}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Tanggal Pembaruan</span>
                <span className="font-semibold text-slate-800">{formatDate(dataset.updatedDate)}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Cakupan Spasial (Bounding Box BBOX)</span>
                <span className="font-mono text-slate-800">{dataset.bbox}</span>
              </div>
            </div>
          </div>

          {/* OGC Web Services Endpoints */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-[#1A3BAF] uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#1A3BAF]" />
              Layanan Interoperabilitas OGC (WMS / WFS)
            </h3>

            <div className="space-y-3">
              {dataset.wmsUrl && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">WMS Endpoint</span>
                    <button
                      onClick={() => handleCopyEndpoint(dataset.wmsUrl!)}
                      className="text-[#1A3BAF] font-bold hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedWms ? 'Tersalin' : 'Salin URL'}
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-slate-800 break-all select-all bg-white p-2 rounded border border-slate-200">
                    {dataset.wmsUrl}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Layer: <code className="font-bold text-slate-800">{dataset.wmsLayer || dataset.id}</code>
                  </div>
                </div>
              )}

              {dataset.wfsUrl && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">WFS Endpoint</span>
                    <button
                      onClick={() => handleCopyEndpoint(dataset.wfsUrl!)}
                      className="text-[#1A3BAF] font-bold hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Salin URL
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-slate-800 break-all select-all bg-white p-2 rounded border border-slate-200">
                    {dataset.wfsUrl}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Layer: <code className="font-bold text-slate-800">{dataset.wfsLayer || dataset.id}</code>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Mini Map Preview + Institution Profile */}
        <div className="space-y-6">
          {/* Mini Preview Map */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="p-4 bg-[#0C1D36] text-white flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-blue-400" />
                Pratinjau Spasial
              </span>
              <button
                onClick={() => navigate(`/webmap?addLayer=${encodeURIComponent(dataset.id)}`)}
                className="text-[11px] text-blue-300 hover:text-white font-bold flex items-center gap-1 transition-colors"
              >
                Buka Penuh <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="h-72 w-full relative bg-slate-100">
              <MapContainer
                center={[-2.5489, 118.0149]}
                zoom={4}
                className="h-full w-full"
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapBoundsUpdater geojson={geojsonData} />
                {geojsonData && (
                  <ErrorBoundary silent>
                    <GeoJSON
                      key={`${dataset.id}-${geojsonData ? 'loaded' : 'empty'}`}
                      data={geojsonData}
                      style={{
                        color: '#1A3BAF',
                        weight: 2,
                        fillColor: '#1A3BAF',
                        fillOpacity: 0.35,
                      }}
                      pointToLayer={(_feature, latlng) =>
                        L.circleMarker(latlng, {
                          radius: 5,
                          color: '#1A3BAF',
                          fillColor: '#1A3BAF',
                          fillOpacity: 0.8,
                          weight: 1.5,
                        })
                      }
                    />
                  </ErrorBoundary>
                )}
              </MapContainer>
            </div>
          </div>

          {/* Wali Data Info Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
            <h4 className="text-xs font-bold text-[#1A3BAF] uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1A3BAF]" />
              Instansi Wali Data
            </h4>
            <div className="text-base font-bold text-slate-900">
              {dataset.node?.name || dataset.distribution || 'Instansi Produsen'}
            </div>
            {dataset.contactPerson && (
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{dataset.contactPerson}</span>
              </div>
            )}
            {dataset.nodeId && (
              <div className="pt-2">
                <Link
                  to={`/simpul/${dataset.nodeId}`}
                  className="text-xs font-bold text-[#1A3BAF] hover:underline flex items-center gap-1"
                >
                  <span>Lihat Profil Simpul Jaringan</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Download Modal Trigger */}
      <DownloadModal
        dataset={dataset}
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
      />
    </div>
  );
};
