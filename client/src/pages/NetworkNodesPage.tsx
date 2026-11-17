import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network, Search } from 'lucide-react';
import { NodeCard } from '../components/nodes/NodeCard';
import { Pagination } from '../components/catalog/Pagination';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { nodeService } from '../services/nodeService';
import { NetworkNode } from '../types/dataset';

export const NetworkNodesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data: nodeResult, isLoading } = useQuery({
    queryKey: ['networkNodesDirectory', searchTerm, selectedType, selectedStatus, page],
    queryFn: () =>
      nodeService.getNodes({
        q: searchTerm,
        type: selectedType,
        status: selectedStatus,
        page,
        limit: 9,
      }),
  });

  const nodes: NetworkNode[] = nodeResult?.data || [];
  const meta = nodeResult?.meta || { page: 1, limit: 9, total: 0, totalPages: 1 };

  const tabs = [
    { id: '', label: 'Semua Simpul' },
    { id: 'kl', label: 'Kementerian / Lembaga' },
    { id: 'provinsi', label: 'Pemerintah Provinsi' },
    { id: 'kabkot', label: 'Pemerintah Kab / Kota' },
  ];

  return (
    <div className="w-full flex flex-col px-5 pt-4 pb-8 select-none space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-[#1E1E1E] tracking-tight">
          Simpul Jaringan
        </h1>
        <p className="text-xs text-[#717171]">
          Daftar institusi produsen data terhubung ke JIGN ({meta.total} Simpul)
        </p>
      </div>

      {/* Type Tabs */}
      <div className="w-full bg-[#D9D9D9] p-1 rounded-lg flex items-center gap-1 text-xs font-medium shadow-inner overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedType(tab.id);
              setPage(1);
            }}
            className={`flex-1 py-1.5 px-2 text-center rounded-md whitespace-nowrap transition-all ${
              selectedType === tab.id
                ? 'bg-white text-[#1A3BAF] font-bold shadow-sm'
                : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar & Status */}
      <div className="flex flex-col gap-2">
        <div className="relative w-full">
          <div className="w-full h-11 bg-white rounded-lg border border-slate-200 flex items-center px-3.5 shadow-sm focus-within:ring-2 focus-within:ring-[#1A3BAF]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Cari kementerian, pemda, atau simpul..."
              className="flex-1 bg-transparent text-xs text-[#1E1E1E] placeholder-[#717171] outline-none pr-2"
            />
            <Search className="w-4 h-4 text-[#1A3BAF]" />
          </div>
        </div>

        <div className="w-full">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 outline-none"
          >
            <option value="">Semua Status Koneksi</option>
            <option value="online">Online</option>
            <option value="synced">Synced</option>
            <option value="offline">Offline</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

      {/* Grid of Nodes */}
      {isLoading ? (
        <LoadingSpinner label="Memuat data simpul jaringan..." />
      ) : nodes.length === 0 ? (
        <div className="py-16 bg-white rounded-2xl border border-slate-200 text-center space-y-2 p-6">
          <Network className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Tidak ada simpul jaringan yang cocok.</p>
          <p className="text-xs text-slate-400">Coba ubah kata kunci atau reset filter pencarian Anda.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nodes.map((node: NetworkNode) => (
              <NodeCard key={node.id} node={node} />
            ))}
          </div>

          <Pagination meta={meta} onPageChange={(p) => setPage(p)} />
        </>
      )}
    </div>
  );
};
