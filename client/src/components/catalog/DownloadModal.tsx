import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Lock, CheckCircle, Copy, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
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

  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  if (!dataset) return null;

  const isRestricted = dataset.accessType === 'restricted';
  const availableFormats = dataset.formatList.split(',').map((f) => f.trim().toLowerCase());

  const handleCopyEndpoint = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProcessDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Phase 12: Public Access for Viewing — Session Required for Downloading
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
        purpose: purpose.trim() || 'Unduh Publik',
      });
      setDownloadResult(res);

      // Trigger automatic browser download
      if (res.downloadUrl) {
        const link = document.createElement('a');
        link.href = res.downloadUrl;
        link.download = `${dataset.id}.${selectedFormat}`;
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
              <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-emerald-900">Pengunduhan Berhasil Dimulai!</h4>
                <p className="text-xs text-emerald-700">
                  Berkas dataset format <strong className="uppercase">{downloadResult.format}</strong> sedang diunduh ke komputer Anda.
                </p>
                <div className="pt-2">
                  <a
                    href={downloadResult.downloadUrl}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Ulang Berkas
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProcessDownload} className="space-y-4">
                {/* Authentication Requirement Notice */}
                {!isAuthenticated ? (
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#1A3BAF]">
                      <Lock className="w-4 h-4 text-[#1A3BAF]" />
                      Login Diperlukan untuk Mengunduh
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Katalog dan metadata dokumen terbuka untuk publik. Untuk mengunduh berkas fisik, silakan masuk dengan akun Ina-Geoportal Anda.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}&downloadDataset=${dataset.id}&format=${selectedFormat}`)}
                      className="px-3.5 py-2 bg-[#1A3BAF] hover:bg-[#153096] text-white font-bold rounded-lg transition-colors text-xs flex items-center gap-2 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Masuk ke Akun untuk Mengunduh</span>
                    </button>
                  </div>
                ) : isRestricted ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-950">
                      <Lock className="w-4 h-4 text-amber-700" />
                      Dataset Berstatus Terbatas (Restricted)
                    </div>
                    <p className="text-amber-800 text-[11px]">
                      Dataset ini dilindungi ketentuan kerahasiaan geospasial tematik nasional.
                      Silakan isi tujuan penggunaan data di bawah untuk dicatat pada profil akun Anda.
                    </p>
                  </div>
                ) : null}

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

                {/* Purpose Field for Restricted */}
                {isRestricted && isAuthenticated && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Tujuan Penggunaan Data <span className="text-rose-500">*</span>:
                    </label>
                    <textarea
                      required
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="Contoh: Analisis spasial potensi kerawanan bencana untuk skripsi riset kebencanaan..."
                      rows={3}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    ></textarea>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Data riwayat permohonan akan dicatat ke dalam audit trail profil pengguna Anda.
                    </p>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleResetModal}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-[#1A3BAF] hover:bg-[#153096] disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 active:scale-98"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Memproses Unduhan...</span>
                      </>
                    ) : !isAuthenticated ? (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Masuk untuk Mengunduh</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Unduh Sekarang ({selectedFormat.toUpperCase()})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: WEB SERVICE (CONDITION C) */}
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
