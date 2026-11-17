import React from 'react';
import { Link } from 'react-router-dom';
import { Map, ExternalLink } from 'lucide-react';
import { Badge } from '../common/Badge';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1 */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
                <Map className="w-5 h-5" />
              </div>
              <span className="text-white font-bold text-lg">Ina-Geoportal Redesign v2.0</span>
              <Badge variant="demo" size="sm">DEMO SYSTEM</Badge>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              Sistem Purwarupa Fungsional Jaringan Informasi Geospasial Nasional (JIGN) generasi kedua.
              Mengintegrasikan metadata, visualisasi spasial OGC (WMS/WFS), dan katalog multi-simpul jaringan
              seluruh Kementerian, Lembaga, dan Pemerintah Daerah di Indonesia.
            </p>
            <div className="text-[11px] text-slate-500">
              * Seluruh statistik dan dataset berstatus penanda DEMO disajikan untuk tujuan pengujian fungsional sistem.
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Modul Utama</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-emerald-400 transition-colors">Beranda & Pencarian Global</Link>
              </li>
              <li>
                <Link to="/webmap" className="hover:text-emerald-400 transition-colors">Webmap Interactive Viewer</Link>
              </li>
              <li>
                <Link to="/katalog" className="hover:text-emerald-400 transition-colors">Katalog & Repositori Data</Link>
              </li>
              <li>
                <Link to="/simpul" className="hover:text-emerald-400 transition-colors">Direktori Simpul Jaringan</Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-emerald-400 transition-colors">Riwayat & Bookmark</Link>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Referensi & Standar</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://tanahair.indonesia.go.id/portal-web/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 inline-flex items-center gap-1 transition-colors"
                >
                  Ina-Geoportal Resmi <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://big.go.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 inline-flex items-center gap-1 transition-colors"
                >
                  Badan Informasi Geospasial (BIG) <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <span className="text-slate-400">Standar Metadata ISO 19115</span>
              </li>
              <li>
                <span className="text-slate-400">Spesifikasi OGC WMS & WFS</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div>
            © {new Date().getFullYear()} Ina-Geoportal Web App Redesign v2.0. Functional Development.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 font-medium">Status: Functional Ready</span>
            <span>•</span>
            <span>Leaflet 1.9 + React 18 + Prisma ORM</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
