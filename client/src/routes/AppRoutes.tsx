import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { HomePage } from '../pages/HomePage';
import { WebmapPage } from '../pages/WebmapPage';
import { CatalogPage } from '../pages/CatalogPage';
import { DatasetDetailPage } from '../pages/DatasetDetailPage';
import { NetworkNodesPage } from '../pages/NetworkNodesPage';
import { NodeDetailPage } from '../pages/NodeDetailPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { UserProfilePage } from '../pages/UserProfilePage';
import { DownloadCenterPage } from '../pages/DownloadCenterPage';
import { LainnyaPage } from '../pages/LainnyaPage';
import { StandarDataPage } from '../pages/StandarDataPage';
import { ToolsGISPage } from '../pages/ToolsGISPage';
import { BantuanPage } from '../pages/BantuanPage';
import { KontakKamiPage } from '../pages/KontakKamiPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/webmap" element={<WebmapPage />} />
        <Route path="/katalog" element={<CatalogPage />} />
        <Route path="/katalog/:datasetId" element={<DatasetDetailPage />} />
        <Route path="/unduh" element={<DownloadCenterPage />} />
        <Route path="/lainnya" element={<LainnyaPage />} />
        <Route path="/standar-data" element={<StandarDataPage />} />
        <Route path="/tools" element={<ToolsGISPage />} />
        <Route path="/bantuan" element={<BantuanPage />} />
        <Route path="/kontak" element={<KontakKamiPage />} />
        <Route path="/simpul" element={<NetworkNodesPage />} />
        <Route path="/simpul/:nodeId" element={<NodeDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
