import React from 'react';
import { Link } from 'react-router-dom';
import { Download, ExternalLink } from 'lucide-react';
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
        <p className="text-xs text-slate-400">Dataset yang Anda unduh akan tercatat di sini sebagai arsip audit trail.</p>
        <div className="pt-2">
          <Link
            to="/katalog"
            className="inline-flex px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Jelajahi Katalog Dataset
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
            <tr>
              <th className="py-3 px-4">Nama Dataset</th>
              <th className="py-3 px-4">Format</th>
              <th className="py-3 px-4">Tujuan Penggunaan</th>
              <th className="py-3 px-4">Tanggal Unduh</th>
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
                    className="hover:text-emerald-700 line-clamp-1"
                  >
                    {rec.dataset?.title || rec.datasetId}
                  </Link>
                  <span className="text-[10px] text-slate-400 font-normal block">
                    {rec.dataset?.node?.name || 'Ina-Geoportal'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono font-bold uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {rec.format}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={rec.purpose}>
                  {rec.purpose || '-'}
                </td>
                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                  {formatDate(rec.downloadedAt)}
                </td>
                <td className="py-3 px-4">
                  <Badge
                    variant={
                      rec.status === 'APPROVED' || rec.status === 'COMPLETED'
                        ? 'public'
                        : 'restricted'
                    }
                    size="sm"
                  >
                    {rec.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    to={`/katalog/${rec.datasetId}`}
                    className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-bold"
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
