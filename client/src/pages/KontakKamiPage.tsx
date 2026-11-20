import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import garudaLogo from '../assets/figma/garuda_pancasila.png';
import bigLogo from '../assets/figma/logo_geospasial.png';

export const KontakKamiPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', institution: '', subject: '', message: '' });
    }, 4000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 select-none flex flex-col space-y-6 md:space-y-8">
      {/* 1. Header with Back button and Title (exact Figma 40:245) */}
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
            Kontak & Layanan Informasi
          </h1>
          <span className="text-xs md:text-sm text-[#717171]">
            Badan Informasi Geospasial (BIG) • Pusat Pengelolaan dan Penyebarluasan Informasi Geospasial
          </span>
        </div>
      </div>

      {/* 2. Responsive 2-Column Grid for Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Column 1: Institutional Contact Info Card */}
        <div className="space-y-6">
          <div className="w-full bg-white rounded-2xl p-6 md:p-8 shadow-xs border border-slate-200/80 space-y-5">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full border-2 border-[#BFB709] bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                <img
                  src={garudaLogo}
                  alt="Garuda"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <img
                src={bigLogo}
                alt="BIG Logo"
                className="h-10 w-auto object-contain"
              />
              <div>
                <h2 className="font-extrabold text-base md:text-lg text-[#1E1E1E] leading-tight">
                  Badan Informasi Geospasial
                </h2>
                <span className="text-xs text-[#717171]">
                  Pusat Pengelolaan & Penyebarluasan Informasi Geospasial (PPIG)
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-3.5 text-xs md:text-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1A3BAF] flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 block">Alamat Kantor Pusat:</span>
                <p className="text-slate-600 leading-relaxed mt-0.5">
                  Jl. Raya Jakarta - Bogor KM 46, Cibinong, Kabupaten Bogor, Jawa Barat 16911
                </p>
              </div>
            </div>

            {/* Telephone */}
            <div className="flex items-start gap-3.5 text-xs md:text-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 block">Telepon & Fax:</span>
                <p className="text-slate-600 leading-relaxed mt-0.5 font-mono">
                  (021) 8753155 • (021) 8752062 • Fax: (021) 8752064
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3.5 text-xs md:text-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 block">Email Pelayanan & Helpdesk:</span>
                <p className="text-slate-600 leading-relaxed mt-0.5 font-mono">
                  info@big.go.id • ppig@big.go.id • jign@inageoportal.go.id
                </p>
              </div>
            </div>

            {/* Hours */}
            <div className="flex items-start gap-3.5 text-xs md:text-sm">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 block">Jam Operasional Layanan:</span>
                <p className="text-slate-600 leading-relaxed mt-0.5">
                  Senin – Jumat: 08.00 – 16.00 WIB (Kecuali Hari Libur Nasional)
                </p>
              </div>
            </div>
          </div>

          {/* Guarantee Card */}
          <div className="p-5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-3.5 text-xs">
            <ShieldCheck className="w-5 h-5 text-[#1A3BAF] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#1A3BAF] block">Komitmen Keterbukaan Informasi Geospasial</span>
              <p className="text-slate-600 leading-relaxed mt-0.5">
                Setiap permohonan data dan pertanyaan teknis terkait simpul jaringan akan ditindaklanjuti oleh Tim Teknis Jaringan Informasi Geospasial Nasional (JIGN) maksimal 2 × 24 jam kerja.
              </p>
            </div>
          </div>
        </div>

        {/* Column 2: Inquiry & Support Form */}
        <div className="w-full bg-white rounded-2xl p-6 md:p-8 shadow-xs border border-slate-200/80">
          <div className="pb-4 border-b border-slate-100 mb-5">
            <h2 className="font-bold text-base md:text-lg text-[#1E1E1E]">
              Kirim Pesan / Pengaduan Layanan
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Sampaikan pertanyaan, kendala unduh data, atau usulan integrasi simpul jaringan baru.
            </p>
          </div>

          {submitted ? (
            <div className="py-12 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3 p-6 animate-fadeIn">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-base text-emerald-950">Pesan Anda Berhasil Terkirim!</h3>
              <p className="text-xs text-emerald-800 max-w-sm mx-auto leading-relaxed">
                Terima kasih atas masukan Anda. Tim Helpdesk Ina-Geoportal BIG akan merespons melalui alamat email yang Anda cantumkan.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nama Anda"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#1A3BAF] bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Alamat Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nama@instansi.go.id"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#1A3BAF] bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Instansi / Universitas
                  </label>
                  <input
                    type="text"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="Kementerian / Lembaga / Pemda / Kampus"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#1A3BAF] bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Subjek *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Topik pertanyaan atau pengaduan"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#1A3BAF] bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Pesan Lengkap *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Jelaskan kebutuhan informasi spasial atau kendala teknis yang Anda hadapi secara rinci..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#1A3BAF] bg-slate-50/50 resize-y"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Pesan ke Helpdesk BIG</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
