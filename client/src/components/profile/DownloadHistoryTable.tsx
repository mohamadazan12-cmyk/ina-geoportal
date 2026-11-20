import React from 'react';
import { Link } from 'react-router-dom';
import { Download, ExternalLink, Cloud, Clock } from 'lucide-react';
import { DownloadRecord } from '../../types/auth';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils/formatters';

interface DownloadHistoryTableProps {
  downloads: DownloadRecord[];
}

export const DownloadHistoryTable: React.FC<DownloadHistoryTableProps> = ({ downloads }) => {
  if (downloads.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
        <Download className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="text-sm font-semibold text-slate-700">Belum ada riwayat pengunduhan dataset.</p>
        <p className="text-xs text-slate-400">Dataset yang Anda unduh akan tercatat di sini secara persisten sebagai arsip audit trail.</p>
        <div className="pt-2">
          <Link
            to="/katalog"
            className="inline-flex px-4 py-2 bg-[#1A3BAF] hover:bg-[#153096] text-white text-xs font-bold rounded-xl transition-colors"
          >
            Jelajahi Katalog Dataset
          </Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REDIRECTED':
        return <Badge variant="r2" size="sm">REDIRECTED (R2)</Badge>;
      case 'COMPLETED':
        return <Badge variant="public" size="sm">COMPLETED</Badge>;
      case 'APPROVED':
        return <Badge variant="online" size="sm">APPROVED</Badge>;
      case 'REQUESTED':
        return <Badge variant="pending" size="sm">REQUESTED</Badge>;
      case 'FAILED':
        return <Badge variant="restricted" size="sm">FAILED</Badge>;
      default:
        return <Badge variant="info" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
            <tr>
              <th className="py-3 px-4">Nama Dataset</th>
              <th className="py-3 px-4">Kategori</th>
              <th className="py-3 px-4">Format</th>
              <th className="py-3 px-4">Penyimpanan</th>
              <th className="py-3 px-4">Tanggal & Waktu</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {downloads.map((rec) => (
              <tr key={rec.id} className="hover:bg-slate-50/70">
                <td className="py-3 px-4 font-bold text-slate-800 max-w-xs">
                  <Link
                    to={`/katalog/${rec.datasetId}`}
                    className="hover:text-[#1A3BAF] line-clamp-1"
                  >
                    {rec.dataset?.title || rec.datasetId}
                  </Link>
                  <span className="text-[10px] text-slate-400 font-normal block truncate">
                    {rec.dataset?.node?.name || 'Ina-Geoportal'}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                    {rec.dataset?.category?.name || 'Kebijakan Satu Peta'}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="font-mono font-bold uppercase bg-blue-50 text-[#1A3BAF] px-1.5 py-0.5 rounded border border-blue-200">
                    {rec.format}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 font-semibold bg-blue-50/80 px-2 py-0.5 rounded-full border border-blue-200">
                    <Cloud className="w-3 h-3 text-blue-600" />
                    <span>Cloudflare R2</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatDate(rec.downloadedAt)}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  {getStatusBadge(rec.status)}
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <Link
                    to={`/katalog/${rec.datasetId}`}
                    className="inline-flex items-center gap-1 text-[#1A3BAF] hover:underline font-bold"
                  >
                    <span>Detail</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
