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
  Globe,
  Building,
  ShieldCheck,
} from 'lucide-react';

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
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', institution: '', subject: '', message: '' });
    }, 4000);
  };

  return (
    <div className="w-full flex flex-col px-5 pt-4 pb-8 select-none">
      {/* 1. Header with Back button and Title (exact Figma 40:245) */}
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
            Kontak Kami
          </h1>
          <span className="text-[11px] text-[#717171]">
            Badan Informasi Geospasial (BIG)
          </span>
        </div>
      </div>

      {/* 2. Main Contact Card (exact Figma text 40:245) */}
      <div className="w-full bg-white rounded-lg p-4 shadow-sm border border-slate-100 space-y-3.5 mb-3.5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#1A3BAF] flex items-center justify-center shrink-0">
            <Building className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#1E1E1E] leading-snug">
              Badan Informasi Geospasial
            </h2>
            <span className="text-[11px] text-[#717171]">
              Pusat Pengelolaan dan Penyebarluasan Informasi Geospasial
            </span>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-3 text-xs">
          <MapPin className="w-4 h-4 text-[#1A3BAF] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-700 block">Alamat Kantor:</span>
            <p className="text-[#1E1E1E] leading-relaxed mt-0.5">
              JL. Raya Jakarta - Bogor KM 46, Cibinong, Jawa Barat 16911
            </p>
          </div>
        </div>

        {/* Telephone */}
        <div className="flex items-start gap-3 text-xs">
          <Phone className="w-4 h-4 text-[#1A3BAF] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-700 block">Telepon & Fax:</span>
            <p className="text-[#1E1E1E] mt-0.5">
              Tlp. (021) 8753155 / (021) 8752062<br />
              ext. 3608 / 3611 / 3103<br />
              Fax. (021) 87908988 / 8753155
            </p>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-start gap-3 text-xs">
          <Mail className="w-4 h-4 text-[#1A3BAF] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-700 block">Surat Elektronik:</span>
            <a
              href="mailto:info@big.go.id"
              className="text-[#1A3BAF] font-medium hover:underline inline-block mt-0.5"
            >
              info@big.go.id
            </a>
          </div>
        </div>
      </div>

      {/* 3. Operational Hours (exact Figma text 40:245) */}
      <div className="w-full bg-white rounded-lg p-3.5 shadow-sm border border-slate-100 flex items-center gap-3 mb-3.5">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4 stroke-[2.2]" />
        </div>
        <div>
          <h3 className="font-bold text-xs text-[#1E1E1E] uppercase tracking-wider">
            Jam Operasional Layanan
          </h3>
          <p className="text-xs text-slate-700 font-medium mt-0.5">
            Senin - Jumat, Pukul 08.00 - 16.00 WIB
          </p>
          <span className="text-[10px] text-slate-400">
            (Sabtu, Minggu & Hari Libur Nasional Tutup)
          </span>
        </div>
      </div>

      {/* 4. Supported Programs (exact Figma text 40:245 \"INA Geoportal Mendukung Program:\") */}
      <div className="w-full bg-white rounded-lg p-3.5 shadow-sm border border-slate-100 mb-4">
        <span className="font-bold text-xs text-[#1E1E1E] block mb-2.5">
          INA-Geoportal Mendukung Program:
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1A3BAF] shrink-0" />
            <span className="font-medium text-slate-800">Kebijakan Satu Peta</span>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium text-slate-800">JIGN Nasional</span>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium text-slate-800">Satu Data Indonesia</span>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="font-medium text-slate-800">Geoportal K/L/D</span>
          </div>
        </div>
      </div>

      {/* 5. Contact Message Form */}
      <div className="w-full bg-white rounded-lg p-4 shadow-sm border border-slate-100">
        <h3 className="font-bold text-sm text-[#1E1E1E] mb-1">
          Kirim Pesan / Pengaduan Layanan
        </h3>
        <p className="text-xs text-[#717171] mb-3">
          Sampaikan pertanyaan atau masukan Anda langsung kepada tim helpdesk kami.
        </p>

        {submitted ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
            <span className="font-bold text-xs text-emerald-800 block">
              Pesan Berhasil Terkirim!
            </span>
            <p className="text-[11px] text-emerald-700">
              Terima kasih. Tim kami akan menindaklanjuti melalui email yang Anda daftarkan.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2.5 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nama Anda"
                className="w-full h-9 px-3 rounded border border-slate-200 focus:ring-1 focus:ring-[#1A3BAF] outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Alamat Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@instansi.go.id"
                className="w-full h-9 px-3 rounded border border-slate-200 focus:ring-1 focus:ring-[#1A3BAF] outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Instansi / Lembaga</label>
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                placeholder="Nama Instansi / Pemda / Universitas"
                className="w-full h-9 px-3 rounded border border-slate-200 focus:ring-1 focus:ring-[#1A3BAF] outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Isi Pesan</label>
              <textarea
                required
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Tuliskan pertanyaan atau permohonan data Anda secara jelas..."
                className="w-full p-2.5 rounded border border-slate-200 focus:ring-1 focus:ring-[#1A3BAF] outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full h-10 bg-[#1A3BAF] hover:bg-[#153096] text-white rounded-lg font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-colors active:scale-98"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Pesan Sekarang</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
