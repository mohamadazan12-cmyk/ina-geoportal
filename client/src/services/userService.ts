import { apiClient } from './apiClient';
import { User, DownloadRecord, BookmarkRecord } from '../types/auth';

export const userService = {
  async getProfile(): Promise<User & { bookmarkCount: number; downloadCount: number }> {
    const res: any = await apiClient.get('/user/profile');
    return res.data;
  },

  async updateProfile(data: { name: string; institution?: string }): Promise<User> {
    const res: any = await apiClient.put('/user/profile', data);
    return res.data;
  },

  async getDownloads(params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<DownloadRecord[]> {
    const res: any = await apiClient.get('/user/downloads', { params });
    // If paginated response object, return array
    if (res && res.data && Array.isArray(res.data)) {
      return res.data;
    }
    return res || [];
  },

  async getDownloadHistory(params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<{ data: DownloadRecord[]; pagination?: any }> {
    const res: any = await apiClient.get('/downloads/history', { params });
    return res;
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
