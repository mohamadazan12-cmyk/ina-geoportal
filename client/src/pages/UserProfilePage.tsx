import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Mail, Shield, LogOut, CheckCircle2, Bookmark, Download, User as UserIcon, Edit2, Save, X, Search, RotateCw } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { userService } from '../services/userService';
import { DownloadHistoryTable } from '../components/profile/DownloadHistoryTable';
import { BookmarksList } from '../components/profile/BookmarksList';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { resolveProviderBadge } from '../utils/providerIdentity';

export const UserProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'downloads' | 'bookmarks' | 'profile'>('downloads');
  const { user, logout, updateUser } = useAuthStore();
  const providerBadge = resolveProviderBadge(user);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editInstitution, setEditInstitution] = useState(user?.institution || '');
  const [profileSaveLoading, setProfileSaveLoading] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Download Filter State
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Fetch download history
  const {
    data: downloads = [],
    isLoading: loadingDownloads,
    refetch: refetchDownloads,
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);

    if (editName.trim().length < 2) {
      setProfileFeedback({ type: 'error', message: 'Nama lengkap minimal 2 karakter.' });
      return;
    }

    setProfileSaveLoading(true);
    try {
      const updated = await userService.updateProfile({
        name: editName.trim(),
        institution: editInstitution.trim() || 'Umum',
      });
      updateUser(updated);
      setIsEditingProfile(false);
      setProfileFeedback({ type: 'success', message: 'Profil pengguna berhasil diperbarui di database.' });
    } catch (err: any) {
      setProfileFeedback({ type: 'error', message: err.message || 'Gagal memperbarui profil.' });
    } finally {
      setProfileSaveLoading(false);
    }
  };

  // Filter downloads
  const filteredDownloads = downloads.filter((rec) => {
    const matchesSearch = searchFilter
      ? rec.dataset?.title?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        rec.datasetId?.toLowerCase().includes(searchFilter.toLowerCase())
      : true;
    const matchesCat = categoryFilter
      ? rec.dataset?.categoryId === categoryFilter || rec.dataset?.category?.name === categoryFilter
      : true;
    return matchesSearch && matchesCat;
  });

  // Extract unique categories from downloads
  const availableCategories = Array.from(
    new Set(
      downloads
        .map((d) => d.dataset?.category?.name)
        .filter((c): c is string => Boolean(c))
    )
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 select-none space-y-6">
      {/* User Header Profile Card */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name || 'User Avatar'}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover shrink-0 shadow-md border-2 border-white ring-2 ring-slate-100"
            />
          ) : (
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#1A3BAF] text-white flex items-center justify-center text-2xl md:text-3xl font-bold shrink-0 shadow-md">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-[#1E1E1E] leading-snug truncate">{user?.name}</h1>
              {providerBadge.isGoogleVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  {providerBadge.label}
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-[#717171] mt-1.5">
              <span className="flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-[#1A3BAF]" />
                {user?.email}
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {user?.institution || 'Pengguna Publik'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
          <span className="font-bold text-xs text-[#1A3BAF] bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-blue-200">
            <Shield className="w-3.5 h-3.5" />
            {user?.role || 'USER'}
          </span>

          <button
            onClick={logout}
            className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-xl bg-[#D9D9D9] p-1 rounded-xl flex items-center gap-1 text-xs md:text-sm font-medium shadow-inner">
        <button
          onClick={() => setActiveTab('downloads')}
          className={`flex-1 py-2 px-3 text-center rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'downloads'
              ? 'bg-white text-[#1A3BAF] font-bold shadow-xs'
              : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Riwayat Unduhan ({downloads.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex-1 py-2 px-3 text-center rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'bookmarks'
              ? 'bg-white text-[#1A3BAF] font-bold shadow-xs'
              : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Bookmark ({bookmarks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2 px-3 text-center rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'profile'
              ? 'bg-white text-[#1A3BAF] font-bold shadow-xs'
              : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Informasi Akun</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="min-h-[300px]">
        {activeTab === 'downloads' && (
          loadingDownloads ? (
            <div className="py-20">
              <LoadingSpinner label="Memuat riwayat pengunduhan..." />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80">
                <div>
                  <h3 className="text-base font-bold text-[#1E1E1E]">Arsip & Audit Trail Pengunduhan</h3>
                  <span className="text-xs text-slate-500">
                    Menampilkan {filteredDownloads.length} dari {downloads.length} unduhan tercatat di database
                  </span>
                </div>

                {/* Filter and Search Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari dataset..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1A3BAF]"
                    />
                  </div>

                  {availableCategories.length > 0 && (
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1A3BAF]"
                    >
                      <option value="">Semua Kategori</option>
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}

                  {(searchFilter || categoryFilter) && (
                    <button
                      onClick={() => {
                        setSearchFilter('');
                        setCategoryFilter('');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 p-1.5 rounded-lg border border-slate-200"
                      title="Reset Filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => refetchDownloads()}
                    className="text-xs text-slate-500 hover:text-[#1A3BAF] p-1.5 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors"
                    title="Segarkan Riwayat"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <DownloadHistoryTable downloads={filteredDownloads} />
            </div>
          )
        )}

        {activeTab === 'bookmarks' && (
          loadingBookmarks ? (
            <div className="py-20">
              <LoadingSpinner label="Memuat bookmark tersimpan..." />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#1E1E1E]">Dataset Favorit Tersimpan</h3>
                <span className="text-xs text-slate-500">{bookmarks.length} dataset ditandai</span>
              </div>
              <BookmarksList bookmarks={bookmarks} onRemoveBookmark={handleRemoveBookmark} />
            </div>
          )
        )}

        {activeTab === 'profile' && (
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs max-w-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-[#1E1E1E]">
                Informasi Pengguna Ina-Geoportal
              </h3>
              {!isEditingProfile && (
                <button
                  onClick={() => {
                    setEditName(user?.name || '');
                    setEditInstitution(user?.institution || '');
                    setIsEditingProfile(true);
                    setProfileFeedback(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1A3BAF] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Ubah Profil</span>
                </button>
              )}
            </div>

            {profileFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  profileFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <span>{profileFeedback.message}</span>
              </div>
            )}

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1A3BAF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Email (Tetap)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Alamat email terdaftar tidak dapat diubah.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Institusi / Lembaga
                  </label>
                  <input
                    type="text"
                    value={editInstitution}
                    onChange={(e) => setEditInstitution(e.target.value)}
                    placeholder="Contoh: Kementerian / Bappeda / Universitas..."
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1A3BAF]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileFeedback(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaveLoading}
                    className="px-4 py-2 bg-[#1A3BAF] hover:bg-[#153096] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{profileSaveLoading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-xs block font-bold uppercase mb-0.5">Nama Lengkap</span>
                  <span className="font-bold text-slate-800">{user?.name}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-xs block font-bold uppercase mb-0.5">Alamat Email</span>
                  <span className="font-bold text-slate-800">{user?.email}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-xs block font-bold uppercase mb-0.5">Institusi / Lembaga</span>
                  <span className="font-bold text-slate-800">{user?.institution || 'Pengguna Umum'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-xs block font-bold uppercase mb-0.5">Hak Akses</span>
                  <span className="font-bold text-[#1A3BAF]">{user?.role || 'USER'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
