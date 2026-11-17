import { apiClient } from './apiClient';
import { User, DownloadRecord, BookmarkRecord } from '../types/auth';

export const userService = {
  async getProfile(): Promise<User & { bookmarkCount: number; downloadCount: number }> {
    const res: any = await apiClient.get('/user/profile');
    return res.data;
  },

  async getDownloads(): Promise<DownloadRecord[]> {
    const res: any = await apiClient.get('/user/downloads');
    return res.data || [];
  },

  async getBookmarks(): Promise<BookmarkRecord[]> {
    const res: any = await apiClient.get('/user/bookmarks');
    return res.data || [];
  },

  async toggleBookmark(datasetId: string): Promise<{ bookmarked: boolean; datasetId: string }> {
    const res: any = await apiClient.post('/user/bookmarks', { datasetId });
    return res.data;
  },
};
