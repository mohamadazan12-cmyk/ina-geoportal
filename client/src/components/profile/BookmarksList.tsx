import React from 'react';
import { Bookmark, Map } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BookmarkRecord } from '../../types/auth';
import { Badge } from '../common/Badge';

interface BookmarksListProps {
  bookmarks: BookmarkRecord[];
  onRemoveBookmark: (datasetId: string) => void;
}

export const BookmarksList: React.FC<BookmarksListProps> = ({ bookmarks, onRemoveBookmark }) => {
  const navigate = useNavigate();

  if (bookmarks.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
        <Bookmark className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="text-sm font-semibold text-slate-700">Belum ada dataset yang ditandai / disimpan.</p>
        <p className="text-xs text-slate-400">Klik ikon bookmark pada kartu dataset di katalog untuk menyimpannya di sini.</p>
        <div className="pt-2">
          <Link
            to="/katalog"
            className="inline-flex px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Buka Katalog Dataset
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {bookmarks.map((bm) => (
        <div
          key={bm.id}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-sm flex flex-col justify-between transition-all"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <Badge variant={bm.dataset?.accessType === 'restricted' ? 'restricted' : 'public'} size="sm">
                {(bm.dataset?.accessType || 'public').toUpperCase()}
              </Badge>
              <button
                onClick={() => onRemoveBookmark(bm.datasetId)}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                Hapus
              </button>
            </div>

            <h4
              onClick={() => navigate(`/katalog/${bm.datasetId}`)}
              className="text-sm font-bold text-slate-900 hover:text-emerald-700 cursor-pointer line-clamp-2 transition-colors mb-1.5"
            >
              {bm.dataset?.title || `Dataset ID: ${bm.datasetId}`}
            </h4>

            <p className="text-xs text-slate-500 line-clamp-2 mb-3">
              {bm.dataset?.abstract || 'Tidak ada deskripsi abstrak untuk dataset ini.'}
            </p>

            <div className="text-[11px] text-slate-400">
              Wali Data: {bm.dataset?.node?.name || bm.dataset?.distribution || '-'} • Tahun: {bm.dataset?.year || '-'}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-4">
            <Link
              to={`/katalog/${bm.datasetId}`}
              className="flex-1 py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold text-center transition-colors"
            >
              Detail Dataset
            </Link>
            <Link
              to={`/webmap?addLayer=${bm.datasetId}`}
              className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold text-center transition-colors flex items-center justify-center gap-1 shadow-sm"
            >
              <Map className="w-3.5 h-3.5" />
              <span>Lihat di Peta</span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};
