import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Mail, Shield, LogOut, CheckCircle2, UserCheck } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { userService } from '../services/userService';
import { DownloadHistoryTable } from '../components/profile/DownloadHistoryTable';
import { BookmarksList } from '../components/profile/BookmarksList';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { resolveProviderBadge } from '../utils/providerIdentity';

export const UserProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'downloads' | 'bookmarks' | 'profile'>('downloads');
  const { user, logout } = useAuthStore();
  const providerBadge = resolveProviderBadge(user);

  // Fetch download history
  const {
    data: downloads = [],
    isLoading: loadingDownloads,
  } = useQuery({
    queryKey: ['userDownloadHistory'],
    queryFn: () => userService.getDownloads(),
  });

  // Fetch bookmarks
  const {
    data: bookmarks = [],
    isLoading: loadingBookmarks,
    refetch: refetchBookmarks,
  } = useQuery({
    queryKey: ['userBookmarksFull'],
    queryFn: () => userService.getBookmarks(),
  });

  const handleRemoveBookmark = async (datasetId: string) => {
    try {
      await userService.toggleBookmark(datasetId);
      refetchBookmarks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full flex flex-col px-5 pt-4 pb-8 select-none space-y-4">
      {/* User Header Profile Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-start gap-4">
        <div className="flex items-center gap-3 w-full">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name || 'User Avatar'}
              className="w-14 h-14 rounded-full object-cover shrink-0 shadow-md border-2 border-white ring-1 ring-slate-200"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#1A3BAF] text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-md">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base font-bold text-[#1E1E1E] leading-snug truncate">{user?.name}</h1>
              {providerBadge.isGoogleVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {providerBadge.label}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-0.5 text-xs text-[#717171] mt-0.5">
              <span className="flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 text-[#1A3BAF]" />
                {user?.email}
              </span>
              <span className="flex items-center gap-1 truncate">
                <Building2 className="w-3 h-3 text-slate-400" />
                {user?.institution || 'Pengguna Publik'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100">
          <span className="font-semibold text-xs text-[#1A3BAF] bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Shield className="w-3 h-3" />
            {user?.role || 'USER'}
          </span>

          <button
            onClick={logout}
            className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#D9D9D9] p-1 rounded-lg gap-1 text-xs font-medium">
        <button
          onClick={() => setActiveTab('downloads')}
          className={`flex-1 py-2 px-1 text-center rounded-md transition-all ${
            activeTab === 'downloads'
              ? 'bg-white text-[#1A3BAF] font-bold shadow-sm'
              : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
          }`}
        >
          Unduhan ({downloads.length})
        </button>

        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex-1 py-2 px-1 text-center rounded-md transition-all ${
            activeTab === 'bookmarks'
              ? 'bg-white text-[#1A3BAF] font-bold shadow-sm'
              : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
          }`}
        >
          Bookmark ({bookmarks.length})
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2 px-1 text-center rounded-md transition-all ${
            activeTab === 'profile'
              ? 'bg-white text-[#1A3BAF] font-bold shadow-sm'
              : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
          }`}
        >
          Profil
        </button>
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'downloads' && (
          <div>
            {loadingDownloads ? (
              <LoadingSpinner label="Memuat riwayat pengunduhan..." />
            ) : (
              <DownloadHistoryTable downloads={downloads} />
            )}
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div>
            {loadingBookmarks ? (
              <LoadingSpinner label="Memuat dataset tersimpan..." />
            ) : (
              <BookmarksList
                bookmarks={bookmarks}
                onRemoveBookmark={handleRemoveBookmark}
              />
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 max-w-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#1A3BAF]" />
              Detail Akun Terdaftar
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Nama Lengkap</span>
                <span className="font-bold text-slate-800">{user?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Alamat Email</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  {user?.email}
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Metode Masuk</span>
                <span className="font-bold text-slate-800">{providerBadge.description}</span>
              </div>
              {providerBadge.showGoogleSubjectId && user?.googleId && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Google Subject ID</span>
                  <span className="font-mono text-[11px] text-slate-700">{user.googleId}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Institusi</span>
                <span className="font-bold text-slate-800">{user?.institution || 'Pengguna Publik'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Tingkat Hak Akses</span>
                <span className="font-bold text-emerald-700">{user?.role}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
