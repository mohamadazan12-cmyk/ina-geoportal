import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Database, ExternalLink, ArrowRight } from 'lucide-react';
import { NetworkNode } from '../../types/dataset';
import { Badge } from '../common/Badge';

interface NodeCardProps {
  node: NetworkNode;
}

export const NodeCard: React.FC<NodeCardProps> = ({ node }) => {
  const navigate = useNavigate();

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'kl':
        return 'Kementerian / Lembaga';
      case 'provinsi':
        return 'Pemerintah Provinsi';
      case 'kabkot':
        return 'Pemerintah Kab/Kota';
      default:
        return 'Instansi';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-[#1A3BAF]/40 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 group">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-[#1A3BAF] border border-blue-200">
            {getTypeLabel(node.type)}
          </span>
          <Badge variant={node.status}>{node.status.toUpperCase()}</Badge>
        </div>

        <h3
          onClick={() => navigate(`/simpul/${node.id}`)}
          className="text-base font-bold text-slate-900 group-hover:text-[#1A3BAF] cursor-pointer transition-colors mb-2 line-clamp-2"
        >
          {node.name}
        </h3>

        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
          {node.description || 'Simpul Jaringan Informasi Geospasial Nasional'}
        </p>

        <div className="space-y-1.5 text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
          {(node.province || node.regency) && (
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{[node.regency, node.province].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#1A3BAF] shrink-0" />
            <span className="font-semibold text-slate-700">{node.datasetCount ?? 0} Dataset Spasial</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        {node.websiteUrl ? (
          <a
            href={node.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-[#1A3BAF] flex items-center gap-1 transition-colors"
          >
            <span>Portal Web</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}

        <button
          onClick={() => navigate(`/simpul/${node.id}`)}
          className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-[#1A3BAF] text-slate-700 hover:text-white text-xs font-bold transition-all flex items-center gap-1 group-hover:bg-[#1A3BAF] group-hover:text-white"
        >
          <span>Detail Simpul</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
