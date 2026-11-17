import { apiClient } from './apiClient';
import { OverviewStats, SearchSuggestion } from '../types/dataset';

export const statsService = {
  async getOverviewStats(): Promise<OverviewStats> {
    const res: any = await apiClient.get('/stats/overview');
    return res.data;
  },

  async getSearchSuggestions(q: string, limit = 5): Promise<SearchSuggestion[]> {
    if (!q || !q.trim()) return [];
    const res: any = await apiClient.get(`/search/suggest?q=${encodeURIComponent(q.trim())}&limit=${limit}`);
    return res.data || [];
  },
};
