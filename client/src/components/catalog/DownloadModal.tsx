import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Lock, CheckCircle, Copy, AlertCircle, ExternalLink, Loader2, Cloud, ShieldCheck, Database } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Dataset } from '../../types/dataset';
import { useAuthStore } from '../../store/useAuthStore';
import { datasetService } from '../../services/datasetService';

interface DownloadModalProps {
  dataset: Dataset | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ dataset, isOpen, onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState('geojson');
  const [purpose, setPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadResult, setDownloadResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'download' | 'webservice'>('download');
  const [copied, setCopied] = useState(false);

  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  if (!dataset) return null;

  const isRestricted = dataset.accessType === 'restricted';
  const availableFormats = dataset.formatList.split(',').map((f) => f.trim().toLowerCase());
  const r2PublicUrl = dataset.publicDownloadUrl || dataset.r2PublicUrl || `https://pub-9dc737b540c54b5597b47a06cbbda81e.r2.dev/geojson/web/${dataset.id}.json`;

  const handleCopyEndpoint = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProcessDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isAuthenticated) {
      const returnUrl = window.location.pathname;
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}&downloadDataset=${dataset.id}&format=${selectedFormat}`);
      return;
    }

    if (isRestricted && (!purpose || purpose.trim().length < 5)) {
      setErrorMessage('Harap jelaskan tujuan permohonan data (minimal 5 karakter).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await datasetService.requestDownload(dataset.id, {
        format: selectedFormat,
        purpose: purpose.trim() || 'Unduh Berkas Geospasial',
      });
      setDownloadResult(res);

      // Trigger automatic browser download
      const targetUrl = res.publicUrl || res.r2PublicUrl || res.downloadUrl;
      if (targetUrl) {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.download = `${dataset.id}.${selectedFormat}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses pengunduhan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetModal = () => {
    setDownloadResult(null);
    setErrorMessage(null);
    setPurpose('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleResetModal} title={`Unduh: ${dataset.title}`} maxWidth="lg">
      <div className="space-y-5">
        {/* Dataset Header Overview */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 font-medium">Instansi Wali Data:</div>
            <div className="text-sm font-bold text-slate-800">{dataset.node?.name || dataset.distribution || 'Pemerintah RI'}</div>
            <div className="text-xs text-slate-500 mt-1">Tahun: {dataset.year} • Skala: {dataset.scale}</div>
          </div>
          <div>
            <Badge variant={isRestricted ? 'restricted' : 'public'}>
              {isRestricted ? 'RESTRICTED' : 'PUBLIC'}
            </Badge>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('download')}
            className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'download'
                ? 'border-[#1A3BAF] text-[#1A3BAF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Berkas Unduhan (File)
          </button>
          <button
            onClick={() => setActiveTab('webservice')}
            className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'webservice'
                ? 'border-[#1A3BAF] text-[#1A3BAF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Layanan Web Service (WMS / WFS)
          </button>
        </div>

        {/* TAB 1: FILE DOWNLOAD */}
        {activeTab === 'download' && (
          <div>
            {downloadResult ? (
              <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 space-y-4">
                <div className="text-center space-y-2">
                  <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="text-base font-bold text-emerald-950">Pengunduhan Berhasil Diproses!</h4>
                  <p className="text-xs text-emerald-800 max-w-md mx-auto">
                    Berkas dataset format <strong className="uppercase">{downloadResult.format}</strong> sedang diunduh ke perangkat Anda dan aktivitas ini telah dicatat di database riwayat akun.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-emerald-200 text-xs space-y-2">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Status Transaksi:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      {downloadResult.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Sumber Penyimpanan:</span>
                    <span className="font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-blue-600" />
                      {downloadResult.storageSource || 'Cloudflare R2'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>ID Riwayat (Database):</span>
                    <code className="text-[10px] font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                      {downloadResult.historyId}
                    </code>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <a
                    href={downloadResult.publicUrl || downloadResult.r2PublicUrl || downloadResult.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Ulang Berkas
                  </a>
                  <button
                    type="button"
                    onClick={handleResetModal}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* DUAL-TRACK ARCHITECTURE DISPLAY */}

                {/* TRACK 1: PUBLIC DOWNLOAD (NO LOGIN REQUIRED) */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs">
                      <Cloud className="w-4 h-4 text-emerald-600" />
                      <span>Jalur 1: Unduh Publik (Tanpa Login)</span>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                      {isRestricted ? 'TIDAK TERSEDIA' : 'OPEN DATA'}
                    </span>
                  </div>

                  {!isRestricted ? (
                    <>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        Akses terbuka langsung dari CDN Cloudflare R2 tanpa memerlukan login atau sesi pengguna. File master geospasial siap diunduh secara instan untuk kebutuhan cepat.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={r2PublicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors text-xs shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Langsung dari Cloud R2 (GeoJSON)</span>
                        </a>
                        <span className="text-[10px] text-slate-500 italic">
                          (Tidak dicatat di riwayat akun)
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      Dataset ini berstatus <strong>Terbatas (Restricted)</strong>. Pengunduhan publik tanpa login tidak diizinkan. Silakan gunakan <strong>Jalur 2</strong> di bawah dengan mengisi permohonan data berautentikasi.
                    </p>
                  )}
                </div>

                {/* TRACK 2: AUTHENTICATED DOWNLOAD (TRACKED IN DATABASE) */}
                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-[#1A3BAF] text-xs">
                      <ShieldCheck className="w-4 h-4 text-[#1A3BAF]" />
                      <span>Jalur 2: Unduh Terautentikasi (Tercatat di Riwayat Profil)</span>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-300 flex items-center gap-1">
                      <Database className="w-2.5 h-2.5" />
                      DATABASE TRACKED
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Pengunduhan resmi dengan format pilihan Anda. Aktivitas tercatat secara persisten di database akun Anda, memudahkan pelacakan lisensi dan akses unduh ulang di masa mendatang.
                  </p>

                  <form onSubmit={handleProcessDownload} className="space-y-4">
                    {/* Format Selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Pilih Format Berkas:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {availableFormats
                          .filter((f) => ['geojson', 'shp', 'kml'].includes(f))
                          .map((fmt) => (
                            <button
                              key={fmt}
                              type="button"
                              onClick={() => setSelectedFormat(fmt)}
                              className={`py-2 px-3 text-xs font-bold rounded-lg border uppercase transition-all ${
                                selectedFormat === fmt
                                  ? 'border-[#1A3BAF] bg-blue-50 text-[#1A3BAF] ring-2 ring-blue-500/20'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {fmt === 'shp' ? 'Shapefile (.shp)' : fmt}
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Purpose Field (Required for Restricted, Optional for Public) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span>
                          Tujuan Penggunaan Data {isRestricted && <span className="text-rose-500">*</span>}:
                        </span>
                        {!isRestricted && <span className="text-[10px] font-normal text-slate-500">(Opsional)</span>}
                      </label>
                      <textarea
                        required={isRestricted}
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder={
                          isRestricted
                            ? 'Contoh: Analisis spasial potensi kerawanan bencana untuk skripsi riset kebencanaan (minimal 5 karakter)...'
                            : 'Contoh: Pemetaan tematik tata ruang kabupaten / riset akademik...'
                        }
                        rows={2}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      ></textarea>
                    </div>

                    {/* Authentication Status Callout */}
                    {!isAuthenticated ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="text-[11px]">
                            Anda belum login. Masuk ke akun Anda untuk mengunduh melalui Jalur 2 dan mencatat ke riwayat.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}&downloadDataset=${dataset.id}&format=${selectedFormat}`)}
                          className="px-3.5 py-1.5 bg-[#1A3BAF] hover:bg-[#153096] text-white font-bold rounded-lg text-xs whitespace-nowrap shadow-sm"
                        >
                          Masuk ke Akun
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5 bg-blue-100/60 p-2 rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Masuk sebagai <strong>{user?.name}</strong> ({user?.email}). Pengunduhan akan tercatat di akun ini.
                        </span>
                      </div>
                    )}

                    {errorMessage && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={handleResetModal}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                      >
                        Tutup
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !isAuthenticated}
                        className="px-5 py-2.5 bg-[#1A3BAF] hover:bg-[#153096] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 active:scale-98"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Memproses Unduhan...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Unduh & Catat ke Riwayat ({selectedFormat.toUpperCase()})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WEB SERVICE (OGC WMS / WFS) */}
        {activeTab === 'webservice' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Gunakan endpoint OGC Web Map Service (WMS) atau Web Feature Service (WFS) berikut untuk mengonsumsi data langsung di perangkat lunak SIG (seperti QGIS atau ArcGIS):
            </p>

            {/* WMS Box */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">WMS Service Endpoint:</span>
                <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-mono">OGC WMS 1.1.1 / 1.3.0</span>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 break-all">
                <span className="flex-1 select-all">{dataset.wmsUrl || 'https://tanahair.indonesia.go.id/geoserver/wms'}</span>
                <button
                  onClick={() => handleCopyEndpoint(dataset.wmsUrl || 'https://tanahair.indonesia.go.id/geoserver/wms')}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded transition-colors flex items-center gap-1 font-sans"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Tersalin' : 'Salin'}
                </button>
              </div>
              <div className="text-[11px] text-slate-500">
                Layer Name: <code className="bg-slate-200 px-1 rounded text-slate-800 font-bold">{dataset.wmsLayer || dataset.id}</code>
              </div>
            </div>

            {/* QGIS Connection Guide */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1.5 text-emerald-950">
              <div className="font-bold flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-emerald-700" />
                Panduan Koneksi QGIS:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1 text-[11px]">
                <li>Buka QGIS &rarr; Layer &rarr; Add Layer &rarr; Add WMS/WMTS Layer.</li>
                <li>Klik tombol <strong>New</strong>, beri nama koneksi (misal: <em>Ina-Geoportal WMS</em>).</li>
                <li>Tempelkan URL endpoint di atas ke kolom <strong>URL</strong> lalu klik <strong>OK</strong>.</li>
                <li>Klik <strong>Connect</strong>, pilih layer <code className="font-bold">{dataset.wmsLayer || dataset.id}</code>, lalu klik <strong>Add</strong>.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

