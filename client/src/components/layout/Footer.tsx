import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Shield, Database, Globe, HelpCircle } from 'lucide-react';
import garudaLogo from '../../assets/figma/garuda_pancasila.png';
import bigLogo from '../../assets/figma/logo_geospasial.png';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#0C1D36] text-slate-300 text-xs border-t border-[#1A3BAF]/30 select-none">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Col 1 & 2: Brand & Institution Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#BFB709] bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                <img
                  src={garudaLogo}
                  alt="Garuda Pancasila"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <img
                src={bigLogo}
                alt="Badan Informasi Geospasial"
                className="h-9 w-auto object-contain bg-white/10 rounded p-1"
              />
              <div className="flex flex-col leading-tight">
                <span className="text-white font-extrabold text-base tracking-tight">
                  INA-GEOPORTAL v2.0
                </span>
                <span className="text-slate-400 text-[11px]">
                  Jaringan Informasi Geospasial Nasional (JIGN)
                </span>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed max-w-md">
              Sistem Purwarupa Fungsional Jaringan Informasi Geospasial Nasional generasi kedua.
              Mengintegrasikan metadata, visualisasi spasial OGC (WMS/WFS/GeoJSON), dan katalog
              multi-simpul jaringan seluruh Kementerian, Lembaga, serta Pemerintah Daerah di Indonesia.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-950/80 border border-blue-800 text-[11px] text-blue-200">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Satu Standar, Satu Basis Data, Satu Geoportal Nasional</span>
            </div>
          </div>

          {/* Col 3: Modul Utama */}
          <div>
            <h4 className="text-white font-bold mb-3.5 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Modul Utama</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Beranda & Pencarian Global
                </Link>
              </li>
              <li>
                <Link to="/katalog" className="hover:text-white transition-colors">
                  Katalog Dataset & Peta
                </Link>
              </li>
              <li>
                <Link to="/webmap" className="hover:text-white transition-colors">
                  Webmap Spasial Interaktif
                </Link>
              </li>
              <li>
                <Link to="/simpul" className="hover:text-white transition-colors">
                  Direktori Simpul Jaringan
                </Link>
              </li>
              <li>
                <Link to="/unduh" className="hover:text-white transition-colors">
                  Pusat Pengunduhan Data
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Layanan Pendukung */}
          <div>
            <h4 className="text-white font-bold mb-3.5 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Layanan Teknis</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/standar-data" className="hover:text-white transition-colors">
                  Standar Data Geospasial
                </Link>
              </li>
              <li>
                <Link to="/tools" className="hover:text-white transition-colors">
                  Tools GIS & Converter Koordinat
                </Link>
              </li>
              <li>
                <Link to="/bantuan" className="hover:text-white transition-colors">
                  Panduan Pengguna & Handbook SNI
                </Link>
              </li>
              <li>
                <Link to="/kontak" className="hover:text-white transition-colors">
                  Kontak BIG & Bantuan Layanan
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-white transition-colors">
                  Profil & Riwayat Unduhan
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Tautan Resmi & Standar */}
          <div>
            <h4 className="text-white font-bold mb-3.5 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Standar & Tautan</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://tanahair.indonesia.go.id/portal-web/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white inline-flex items-center gap-1 transition-colors"
                >
                  Ina-Geoportal Resmi <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://big.go.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white inline-flex items-center gap-1 transition-colors"
                >
                  Badan Informasi Geospasial <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <span className="text-slate-400">Standar Metadata ISO 19115/19139</span>
              </li>
              <li>
                <span className="text-slate-400">Spesifikasi OGC WMS & WFS</span>
              </li>
              <li>
                <span className="text-slate-400">Sistem Referensi Geospasial SRGI 2013</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div>
            © {new Date().getFullYear()} Ina-Geoportal Web App Redesign v2.0 • Badan Informasi Geospasial (BIG).
          </div>
          <div className="flex items-center gap-3">
            <span className="text-blue-400 font-semibold">Status: Responsive Production Ready</span>
            <span>•</span>
            <span>React 18 + Leaflet 1.9 + Tailwind CSS</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
