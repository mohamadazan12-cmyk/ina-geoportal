import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PaginatedMeta } from '../../types/dataset';

interface PaginationProps {
  meta: PaginatedMeta;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ meta, onPageChange }) => {
  if (meta.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between py-4 border-t border-slate-200 text-xs text-slate-600">
      <div>
        Menampilkan halaman <strong className="text-slate-900">{meta.page}</strong> dari{' '}
        <strong className="text-slate-900">{meta.totalPages}</strong> (Total {meta.total} dataset)
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
          className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
              meta.page === p
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {p}
          </button>
        ))}

        <button
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= meta.totalPages}
          className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          aria-label="Halaman selanjutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
