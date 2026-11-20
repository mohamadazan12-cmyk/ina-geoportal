import { Dataset } from './dataset';

export interface User {
  id: string;
  name: string;
  email: string;
  institution?: string;
  role: string;
  avatarUrl?: string | null;
  provider?: string;
  googleId?: string | null;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DownloadRecord {
  id: string;
  userId?: string;
  datasetId: string;
  dataset: Dataset;
  format: string;
  purpose: string;
  status: 'COMPLETED' | 'APPROVED' | 'PENDING' | 'REDIRECTED' | 'REQUESTED' | 'FAILED';
  storageSource?: string;
  downloadedAt: string;
}

export interface BookmarkRecord {
  id: string;
  userId: string;
  datasetId: string;
  dataset: Dataset;
  createdAt: string;
}

declare global {
  interface Window {
    google?: any;
  }
}
