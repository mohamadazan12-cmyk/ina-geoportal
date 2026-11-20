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
      <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 p-8 space-y-3 shadow-xs">
        <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="text-base font-bold text-slate-800">Belum Ada Dataset yang Ditandai</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Klik ikon bookmark pada kartu dataset di katalog untuk menyimpannya sebagai daftar akses cepat di sini.
        </p>
        <div className="pt-2">
          <Link
            to="/katalog"
            className="inline-flex px-5 py-2.5 bg-[#1A3BAF] hover:bg-[#153096] text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            Buka Katalog Dataset
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bookmarks.map((bm) => (
        <div
          key={bm.id}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-[#1A3BAF]/40 hover:shadow-md shadow-xs flex flex-col justify-between transition-all"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
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
              className="text-sm font-bold text-slate-900 hover:text-[#1A3BAF] cursor-pointer line-clamp-2 transition-colors mb-1.5"
            >
              {bm.dataset?.title || `Dataset ID: ${bm.datasetId}`}
            </h4>

            <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
              {bm.dataset?.abstract || 'Tidak ada deskripsi abstrak untuk dataset ini.'}
            </p>

            <div className="text-[11px] text-slate-400">
              Wali Data: {bm.dataset?.node?.name || bm.dataset?.distribution || '-'} • Tahun: {bm.dataset?.year || '-'}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-4">
            <Link
              to={`/katalog/${bm.datasetId}`}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold text-center transition-colors"
            >
              Detail Dataset
            </Link>
            <Link
              to={`/webmap?addLayer=${bm.datasetId}`}
              className="flex-1 py-2 px-3 rounded-xl bg-[#1A3BAF] hover:bg-[#153096] text-white text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5 shadow-sm"
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
