import { create } from 'zustand';
import { Dataset, PaginatedMeta } from '../types/dataset';

interface CatalogStore {
  searchQuery: string;
  selectedCategories: string[];
  selectedNodes: string[];
  selectedFormats: string[];
  selectedYear: number | null;
  selectedAccessType: string;
  sort: string;
  datasets: Dataset[];
  pagination: PaginatedMeta;
  isLoading: boolean;

  setSearchQuery: (query: string) => void;
  setSelectedCategories: (categories: string[]) => void;
  toggleCategory: (categoryId: string) => void;
  setSelectedNodes: (nodes: string[]) => void;
  toggleNode: (nodeId: string) => void;
  setSelectedFormats: (formats: string[]) => void;
  toggleFormat: (format: string) => void;
  setSelectedYear: (year: number | null) => void;
  setSelectedAccessType: (accessType: string) => void;
  setSort: (sort: string) => void;
  setPage: (page: number) => void;
  setDatasets: (datasets: Dataset[], meta: PaginatedMeta) => void;
  setIsLoading: (loading: boolean) => void;
  resetFilters: () => void;
}

const initialPagination: PaginatedMeta = {
  page: 1,
  limit: 9,
  total: 0,
  totalPages: 1,
};

export const useCatalogStore = create<CatalogStore>((set) => ({
  searchQuery: '',
  selectedCategories: [],
  selectedNodes: [],
  selectedFormats: [],
  selectedYear: null,
  selectedAccessType: '',
  sort: 'newest',
  datasets: [],
  pagination: initialPagination,
  isLoading: false,

  setSearchQuery: (searchQuery) => set({ searchQuery, pagination: { ...initialPagination, page: 1 } }),

  setSelectedCategories: (selectedCategories) => set({ selectedCategories, pagination: { ...initialPagination, page: 1 } }),

  toggleCategory: (categoryId) =>
    set((state) => {
      const exists = state.selectedCategories.includes(categoryId);
      const updated = exists
        ? state.selectedCategories.filter((c) => c !== categoryId)
        : [...state.selectedCategories, categoryId];
      return { selectedCategories: updated, pagination: { ...state.pagination, page: 1 } };
    }),

  setSelectedNodes: (selectedNodes) => set({ selectedNodes, pagination: { ...initialPagination, page: 1 } }),

  toggleNode: (nodeId) =>
    set((state) => {
      const exists = state.selectedNodes.includes(nodeId);
      const updated = exists
        ? state.selectedNodes.filter((n) => n !== nodeId)
        : [...state.selectedNodes, nodeId];
      return { selectedNodes: updated, pagination: { ...state.pagination, page: 1 } };
    }),

  setSelectedFormats: (selectedFormats) => set({ selectedFormats, pagination: { ...initialPagination, page: 1 } }),

  toggleFormat: (format) =>
    set((state) => {
      const exists = state.selectedFormats.includes(format);
      const updated = exists
        ? state.selectedFormats.filter((f) => f !== format)
        : [...state.selectedFormats, format];
      return { selectedFormats: updated, pagination: { ...state.pagination, page: 1 } };
    }),

  setSelectedYear: (selectedYear) => set({ selectedYear, pagination: { ...initialPagination, page: 1 } }),

  setSelectedAccessType: (selectedAccessType) => set({ selectedAccessType, pagination: { ...initialPagination, page: 1 } }),

  setSort: (sort) => set({ sort, pagination: { ...initialPagination, page: 1 } }),

  setPage: (page) =>
    set((state) => ({
      pagination: { ...state.pagination, page },
    })),

  setDatasets: (datasets, pagination) => set({ datasets, pagination, isLoading: false }),

  setIsLoading: (isLoading) => set({ isLoading }),

  resetFilters: () =>
    set({
      searchQuery: '',
      selectedCategories: [],
      selectedNodes: [],
      selectedFormats: [],
      selectedYear: null,
      selectedAccessType: '',
      sort: 'newest',
      pagination: initialPagination,
    }),
}));
