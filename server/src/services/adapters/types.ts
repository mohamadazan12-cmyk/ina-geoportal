export type BboxTuple = [number, number, number, number]; // [minX, minY, maxX, maxY] (WGS84 EPSG:4326)

export interface AdapterPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface AdapterQueryResult {
  success: boolean;
  data: any;
  featureCount: number;
  totalCount?: number;
  source: string;
  sourceAgency: string;
  isReal: boolean;
  status:
    | 'REAL_COMPLETE'
    | 'REAL_COMPLETE_SERVICE'
    | 'REAL_VERIFIED'
    | 'REAL_PARTIAL_COVERAGE'
    | 'PENDING_AUTHORIZATION'
    | 'MAP_SERVICE_ONLY'
    | 'FALLBACK'
    | 'UNAVAILABLE';
  pagination?: AdapterPagination;
  attribution: string;
  disclaimer?: string;
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  bbox?: BboxTuple;
  preferDemo?: boolean;
  skipUpstream?: boolean;
  scope?: 'national' | 'overview';
  full?: boolean;
}
