export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  datasetCount?: number;
}

export interface NetworkNode {
  id: string;
  name: string;
  type: 'kl' | 'provinsi' | 'kabkot';
  province?: string;
  regency?: string;
  description?: string;
  status: 'online' | 'synced' | 'offline' | 'unknown';
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  lastSyncAt?: string;
  datasetCount?: number;
  datasets?: Dataset[];
}

export type DataSourceStatus =
  | 'REAL'
  | 'REAL_COMPLETE'
  | 'REAL_COMPLETE_SERVICE'
  | 'REAL_VERIFIED'
  | 'REAL_PARTIAL_COVERAGE'
  | 'MAP_SERVICE_ONLY'
  | 'DEMO'
  | 'FALLBACK'
  | 'PENDING_AUTHORIZATION'
  | 'UNAVAILABLE';

export type VerificationStatus =
  | 'VERIFIED'
  | 'CONNECTED'
  | 'PARTIAL'
  | 'PENDING_AUTHORIZATION'
  | 'UNAVAILABLE'
  | 'UNVERIFIED';

export interface Dataset {
  id: string;
  title: string;
  abstract: string;
  description: string;
  categoryId: string;
  category?: Category;
  nodeId: string;
  node?: NetworkNode;
  year: number;
  publishedDate: string;
  updatedDate: string;
  crs: string;
  epsg: string;
  scale: string;
  bbox: string;
  accessType: 'public' | 'restricted';
  formatList: string; // comma separated "geojson,shp,kml,wms"
  wmsUrl?: string | null;
  wmsLayer?: string | null;
  wfsUrl?: string | null;
  wfsLayer?: string | null;
  downloadUrl?: string | null;
  publicDownloadUrl?: string | null;
  remoteKey?: string | null;
  r2PublicUrl?: string | null;
  storageSource?: string | null;
  geojsonUrl?: string | null;
  contactPerson?: string | null;
  distribution?: string | null;
  isDemo?: boolean;
  downloadCount?: number;
  // Phase 10: Data Provenance & Real Data Management
  dataSourceStatus?: DataSourceStatus;
  verificationStatus?: VerificationStatus;
  sourceAgency?: string | null;
  sourceOrganization?: string | null;
  sourceDatasetTitle?: string | null;
  sourceUrl?: string | null;
  serviceUrl?: string | null;
  serviceType?: string | null;
  geometryType?: string | null;
  disclaimer?: string | null;
  attribution?: string | null;
  metadataUrl?: string | null;
  license?: string | null;
  realFeatureCount?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OverviewStats {
  totalNodes: number;
  totalDatasets: number;
  totalDownloads: number;
  topCategories: Array<{
    id: string;
    name: string;
    icon?: string;
    count: number;
  }>;
  isDemo: boolean;
  lastUpdated: string;
}

export interface SearchSuggestion {
  type: 'dataset' | 'category' | 'node';
  id: string;
  title: string;
  sub: string;
  url: string;
}
