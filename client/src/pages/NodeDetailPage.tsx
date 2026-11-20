import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Globe,
  Mail,
  Phone,
  Database,
  ArrowLeft,
  ExternalLink,
  MapPin,
  Building,
} from 'lucide-react';
import { nodeService } from '../services/nodeService';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DatasetCard } from '../components/catalog/DatasetCard';
import { Dataset } from '../types/dataset';

export const NodeDetailPage: React.FC = () => {
  const { nodeId } = useParams<{ nodeId: string }>();

  const {
    data: node,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['nodeDetail', nodeId],
    queryFn: () => nodeService.getNodeById(nodeId!),
    enabled: !!nodeId,
  });

  if (isLoading) {
    return (
      <div className="py-24">
        <LoadingSpinner label="Memuat profil Simpul Jaringan..." />
      </div>
    );
  }

  if (isError || !node) {
    return (
      <div className="py-16 max-w-xl mx-auto text-center space-y-4 px-4">
        <h2 className="text-xl font-bold text-slate-800">Simpul Jaringan Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">{(error as Error)?.message || 'Data simpul tidak tersedia.'}</p>
        <Link
          to="/simpul"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A3BAF] text-white text-xs font-bold rounded-xl shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Direktori
        </Link>
      </div>
    );
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'kl':
        return 'Kementerian / Lembaga';
      case 'provinsi':
        return 'Pemerintah Provinsi';
      case 'kabkot':
        return 'Pemerintah Kabupaten / Kota';
      default:
        return 'Instansi';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 select-none space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/simpul"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A3BAF] hover:underline transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Direktori Simpul
        </Link>
      </div>

      {/* Node Profile Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-blue-50 text-[#1A3BAF] border border-blue-200">
              {getTypeLabel(node.type)}
            </span>
            <Badge variant={node.status}>{node.status.toUpperCase()}</Badge>
          </div>
          <div className="text-xs text-slate-500">
            ID Simpul: <strong className="font-mono text-slate-700">{node.id}</strong>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1A3BAF] flex items-center justify-center font-bold text-base shrink-0 border border-blue-100">
            <Building className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E1E1E] tracking-tight">
              {node.name}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-4xl mt-1.5">
              {node.description || 'Simpul Jaringan resmi terhubung ke Ina-Geoportal Nasional.'}
            </p>
          </div>
        </div>

        {/* Contact info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
          {(node.province || node.regency) && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-[#1A3BAF] shrink-0" />
              <span>{[node.regency, node.province].filter(Boolean).join(', ')}</span>
            </div>
          )}

          {node.contactEmail && (
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="w-4 h-4 text-[#1A3BAF] shrink-0" />
              <a href={`mailto:${node.contactEmail}`} className="hover:underline truncate">
                {node.contactEmail}
              </a>
            </div>
          )}

          {node.contactPhone && (
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-4 h-4 text-[#1A3BAF] shrink-0" />
              <span>{node.contactPhone}</span>
            </div>
          )}

          {node.websiteUrl && (
            <div className="flex items-center gap-2 text-slate-600">
              <Globe className="w-4 h-4 text-[#1A3BAF] shrink-0" />
              <a
                href={node.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline flex items-center gap-1 font-bold text-[#1A3BAF] truncate"
              >
                <span>Situs Resmi</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Published Datasets by this Node */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-bold text-[#1E1E1E] flex items-center gap-2">
            <Database className="w-5 h-5 text-[#1A3BAF]" />
            Dataset yang Dipublikasikan ({node.datasets?.length ?? 0})
          </h2>
        </div>

        {!node.datasets || node.datasets.length === 0 ? (
          <div className="py-16 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-xs p-6 shadow-xs">
            Belum ada dataset yang terdaftar pada simpul jaringan ini di lingkungan sistem.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {node.datasets.map((dataset: Dataset, idx: number) => (
              <DatasetCard key={dataset.id} dataset={dataset} index={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
