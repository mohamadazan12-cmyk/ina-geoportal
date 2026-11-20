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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 select-none space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1E1E1E] tracking-tight">
          Direktori Simpul Jaringan
        </h1>
        <p className="text-xs md:text-sm text-[#717171]">
          Daftar institusi produsen data dan wali data spasial terhubung ke JIGN ({meta.total} Simpul Terdaftar)
        </p>
      </div>

      {/* Type Tabs */}
      <div className="w-full max-w-2xl bg-[#D9D9D9] p-1 rounded-xl flex items-center gap-1 text-xs font-medium shadow-inner overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedType(tab.id);
              setPage(1);
            }}
            className={`flex-1 py-2 px-3 text-center rounded-lg whitespace-nowrap transition-all ${
              selectedType === tab.id
                ? 'bg-white text-[#1A3BAF] font-bold shadow-xs'
                : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar & Status Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        <div className="relative flex-1 w-full">
          <div className="w-full h-11 md:h-12 bg-white rounded-xl border border-slate-200 flex items-center px-4 shadow-xs focus-within:ring-2 focus-within:ring-[#1A3BAF] transition-all">
            <Search className="w-4 h-4 md:w-5 md:h-5 text-[#1A3BAF] mr-2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Cari kementerian, pemda, atau simpul jaringan..."
              className="flex-1 bg-transparent text-xs md:text-sm text-[#1E1E1E] placeholder-[#717171] outline-none pr-2"
            />
          </div>
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="w-full h-11 md:h-12 px-3 text-xs md:text-sm rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xs outline-none focus:ring-1 focus:ring-[#1A3BAF]"
          >
            <option value="">Semua Status Koneksi</option>
            <option value="online">Online (Terhubung)</option>
            <option value="synced">Synced (Tersinkronisasi)</option>
            <option value="offline">Offline</option>
            <option value="unknown">Status Belum Diketahui</option>
          </select>
        </div>
      </div>

      {/* Grid of Nodes */}
      {isLoading ? (
        <div className="py-24">
          <LoadingSpinner label="Memuat direktori simpul jaringan..." />
        </div>
      ) : nodes.length === 0 ? (
        <div className="py-20 bg-white rounded-2xl border border-slate-200 text-center space-y-3 p-8 shadow-xs">
          <Network className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-base font-bold text-slate-800">Tidak Ada Simpul Jaringan yang Cocok</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Coba sesuaikan kata kunci pencarian atau ubah filter kategori institusi.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nodes.map((node: NetworkNode) => (
              <NodeCard key={node.id} node={node} />
            ))}
          </div>

          <div className="pt-4 flex justify-center">
            <Pagination meta={meta} onPageChange={(p) => setPage(p)} />
          </div>
        </>
      )}
    </div>
  );
};
