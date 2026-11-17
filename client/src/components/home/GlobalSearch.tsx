import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Database, Layers, Network, ArrowRight, Loader2 } from 'lucide-react';
import { statsService } from '../../services/statsService';
import { SearchSuggestion } from '../../types/dataset';

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await statsService.getSearchSuggestions(query, 6);
        setSuggestions(results);
        setIsOpen(true);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsOpen(false);
    navigate(`/katalog?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSelectSuggestion = (item: SearchSuggestion) => {
    setIsOpen(false);
    navigate(item.url);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'dataset':
        return <Database className="w-4 h-4 text-emerald-600" />;
      case 'category':
        return <Layers className="w-4 h-4 text-sky-600" />;
      case 'node':
        return <Network className="w-4 h-4 text-purple-600" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={dropdownRef}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute left-4 pointer-events-none text-slate-400">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Cari dataset, batas wilayah, jalan, bencana, instansi..."
          className="w-full pl-12 pr-28 py-3.5 bg-white text-slate-800 placeholder-slate-400 text-sm md:text-base rounded-2xl border border-slate-300 shadow-lg shadow-slate-200/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        />
        <button
          type="submit"
          className="absolute right-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-1"
        >
          <span>Cari</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-fadeIn">
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">
            Saran Pencarian
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {suggestions.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start gap-3 transition-colors group"
              >
                <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 group-hover:bg-white transition-colors">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate group-hover:text-emerald-700">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{item.sub}</div>
                </div>
                <span className="text-[10px] font-medium text-slate-400 uppercase border border-slate-200 px-1.5 py-0.5 rounded self-center">
                  {item.type}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            className="w-full py-2.5 px-4 bg-slate-50 hover:bg-emerald-50 text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1 border-t border-slate-100 transition-colors"
          >
            Lihat semua hasil untuk &ldquo;{query}&rdquo; di Katalog <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
