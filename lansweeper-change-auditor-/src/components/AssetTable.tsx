import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Filter, 
  Eye, 
  Settings, 
  Check, 
  X,
  ChevronLeft,
  ChevronRight,
  ListFilter
} from 'lucide-react';
import { LansweeperAsset } from '../types';
import LansweeperLogo from './LansweeperLogo';

interface AssetTableProps {
  id: string;
  entraram: LansweeperAsset[];
  sairam: LansweeperAsset[];
  selectedEntrouNames: Set<string>;
  setSelectedEntrouNames: (names: Set<string>) => void;
  selectedSaiuNames: Set<string>;
  setSelectedSaiuNames: (names: Set<string>) => void;
  onExportExcel: () => void;
  diaAtualDateStr: string;
  diaAnteriorDateStr: string;
  responsavel: string;
}

export default function AssetTable({
  id,
  entraram,
  sairam,
  selectedEntrouNames,
  setSelectedEntrouNames,
  selectedSaiuNames,
  setSelectedSaiuNames,
  onExportExcel,
  diaAtualDateStr,
  diaAnteriorDateStr,
  responsavel,
}: AssetTableProps) {
  // Navigation / Tab States
  const [viewMode, setViewMode] = useState<'oficial' | 'filtros'>('oficial');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom dropdown open states
  const [activeDropdown, setActiveDropdown] = useState<'type' | 'entrou' | 'saiu' | null>(null);

  // Filter Search strings (for inside the custom dropdowns)
  const [typeSearch, setTypeSearch] = useState('');
  const [entrouSearch, setEntrouSearch] = useState('');
  const [saiuSearch, setSaiuSearch] = useState('');

  // Refs for click-away detection
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const entrouDropdownRef = useRef<HTMLDivElement>(null);
  const saiuDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeDropdown === 'type' && typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (activeDropdown === 'entrou' && entrouDropdownRef.current && !entrouDropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (activeDropdown === 'saiu' && saiuDropdownRef.current && !saiuDropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  // All distinct AssetTypes
  const allAssetTypes = useMemo(() => {
    const typesSet = new Set<string>();
    entraram.forEach((a) => typesSet.add(a.AssetType || 'Indefinido'));
    sairam.forEach((a) => typesSet.add(a.AssetType || 'Indefinido'));
    return Array.from(typesSet).sort();
  }, [entraram, sairam]);

  // Selected AssetTypes filter state (initialized to all)
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    setSelectedAssetTypes(new Set(allAssetTypes));
  }, [allAssetTypes]);

  // Pagination states (for "Tabela Filtros" mode)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Sorting states
  const [sortField, setSortField] = useState<keyof LansweeperAsset | 'Status'>('AssetName');
  const [sortAsc, setSortAsc] = useState(true);

  // Reset page when search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedAssetTypes, selectedEntrouNames, selectedSaiuNames, viewMode]);

  // Reset sub-dropdown searches when closed
  useEffect(() => {
    if (!activeDropdown) {
      setTypeSearch('');
      setEntrouSearch('');
      setSaiuSearch('');
    }
  }, [activeDropdown]);

  // Helpers to select/deselect custom asset checkboxes in dropdowns
  const handleToggleAssetType = (type: string) => {
    const next = new Set(selectedAssetTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    setSelectedAssetTypes(next);
  };

  const handleSelectAllTypes = () => {
    setSelectedAssetTypes(new Set(allAssetTypes));
  };

  const handleClearAllTypes = () => {
    setSelectedAssetTypes(new Set());
  };

  // Entrou multi-select helpers
  const handleToggleEntrouAsset = (name: string) => {
    const next = new Set(selectedEntrouNames);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelectedEntrouNames(next);
  };

  const handleSelectAllEntrou = () => {
    setSelectedEntrouNames(new Set(entraram.map(a => a.AssetName)));
  };

  const handleClearAllEntrou = () => {
    setSelectedEntrouNames(new Set());
  };

  // Saiu multi-select helpers
  const handleToggleSaiuAsset = (name: string) => {
    const next = new Set(selectedSaiuNames);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelectedSaiuNames(next);
  };

  const handleSelectAllSaiu = () => {
    setSelectedSaiuNames(new Set(sairam.map(a => a.AssetName)));
  };

  const handleClearAllSaiu = () => {
    setSelectedSaiuNames(new Set());
  };

  // Global search and type/status filter function
  const matchGlobalSearch = (asset: LansweeperAsset, search: string) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (asset.AssetName || '').toLowerCase().includes(s) ||
      (asset.AssetType || '').toLowerCase().includes(s) ||
      (asset.Domain || '').toLowerCase().includes(s) ||
      (asset.OS || '').toLowerCase().includes(s) ||
      (asset.Model || '').toLowerCase().includes(s) ||
      (asset.Manufacturer || '').toLowerCase().includes(s) ||
      (asset.IPAddress || '').toLowerCase().includes(s) ||
      (asset.IPLocation || '').toLowerCase().includes(s) ||
      (asset.MACAddress || '').toLowerCase().includes(s)
    );
  };

  // Filtered Entrou List
  const finalFilteredEntrou = useMemo(() => {
    return entraram.filter((asset) => {
      const isSelected = selectedEntrouNames.has(asset.AssetName);
      const isTypeMatch = selectedAssetTypes.has(asset.AssetType || 'Indefinido');
      const isSearchMatch = matchGlobalSearch(asset, searchTerm);
      return isSelected && isTypeMatch && isSearchMatch;
    });
  }, [entraram, selectedEntrouNames, selectedAssetTypes, searchTerm]);

  // Filtered Saiu List
  const finalFilteredSaiu = useMemo(() => {
    return sairam.filter((asset) => {
      const isSelected = selectedSaiuNames.has(asset.AssetName);
      const isTypeMatch = selectedAssetTypes.has(asset.AssetType || 'Indefinido');
      const isSearchMatch = matchGlobalSearch(asset, searchTerm);
      return isSelected && isTypeMatch && isSearchMatch;
    });
  }, [sairam, selectedSaiuNames, selectedAssetTypes, searchTerm]);

  // Combined and sorted lists for Tabela Filtros mode
  const combinedList = useMemo(() => {
    const list: (LansweeperAsset & { status: 'Entrou' | 'Saiu' })[] = [];
    finalFilteredEntrou.forEach((a) => list.push({ ...a, status: 'Entrou' }));
    finalFilteredSaiu.forEach((a) => list.push({ ...a, status: 'Saiu' }));

    // Sorting
    list.sort((a, b) => {
      let valA: any = a[sortField as keyof typeof a] || '';
      let valB: any = b[sortField as keyof typeof b] || '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [finalFilteredEntrou, finalFilteredSaiu, sortField, sortAsc]);

  // Pagination bounds
  const totalItems = combinedList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return combinedList.slice(start, start + pageSize);
  }, [combinedList, currentPage, pageSize]);

  // Counts of matching/filtered options for UI dropdown lists
  const filteredTypeOptions = useMemo(() => {
    return allAssetTypes.filter(t => t.toLowerCase().includes(typeSearch.toLowerCase()));
  }, [allAssetTypes, typeSearch]);

  const filteredEntrouOptions = useMemo(() => {
    return entraram.filter(a => a.AssetName.toLowerCase().includes(entrouSearch.toLowerCase()));
  }, [entraram, entrouSearch]);

  const filteredSaiuOptions = useMemo(() => {
    return sairam.filter(a => a.AssetName.toLowerCase().includes(saiuSearch.toLowerCase()));
  }, [sairam, saiuSearch]);

  // Helper render for single cells showing complete text on hover and fitting screen bounds
  const renderCell = (value?: string, className = '') => {
    const val = value || '—';
    // Monospace columns (IP and MAC) or explicitly nowrap classes should keep whitespace-nowrap
    const isNoWrap = className.includes('font-mono') || className.includes('whitespace-nowrap') || className.includes('truncate');
    
    // Check if custom padding or text size is defined to prevent duplicates
    const hasPadding = className.includes('px-') || className.includes('py-');
    const hasTextSize = className.includes('text-') && !className.includes('text-left') && !className.includes('text-right') && !className.includes('text-center');
    
    const paddingClass = hasPadding ? '' : 'px-2.5 py-1.5';
    const textSizeClass = hasTextSize ? '' : 'text-[11px]';

    return (
      <td 
        className={`${paddingClass} ${textSizeClass} text-slate-600 group-hover:bg-slate-50/60 transition-all ${
          isNoWrap ? 'whitespace-nowrap' : 'whitespace-normal break-words'
        } ${className}`}
        title={val}
      >
        {val}
      </td>
    );
  };

  // Render Domain cell with any domain different from Alupar highlighted in red
  const renderDomainCell = (domain?: string, isEntrou?: boolean, customClass = '') => {
    const val = domain || '—';
    const isNonAlupar = val !== '—' && val.toUpperCase() !== 'ALUPAR';
    const textColor = isNonAlupar 
      ? 'text-rose-600 font-extrabold' 
      : 'text-slate-600 font-medium';
    
    // Check if custom padding is defined to prevent duplicates
    const hasPadding = customClass.includes('px-') || customClass.includes('py-');
    const paddingClass = hasPadding ? '' : 'px-2.5 py-1.5';

    return (
      <td 
        className={`${paddingClass} text-[11px] text-center group-hover:bg-slate-50/60 transition-all ${customClass}`}
        title={val}
      >
        <span className={textColor}>{val}</span>
      </td>
    );
  };

  return (
    <div id={id} className="bg-white border border-[#E5E7EB] rounded-[18px] shadow-[0_4px_16px_rgba(0,0,0,0.01)] overflow-hidden flex flex-col">
      
      {/* 1. Controls & Filter Bar (Top Area) */}
      <div id={`${id}-controls`} className="px-6 py-5 bg-white border-b border-slate-100 flex flex-col gap-4 shadow-3xs animate-in fade-in duration-200">
        
        {/* Top Row: Navigation Tabs and Export Button (Upper Right) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* View Mode Toggles */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/60 flex shrink-0 self-start sm:self-auto">
            <button
              id={`${id}-toggle-oficial`}
              onClick={() => setViewMode('oficial')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all cursor-pointer ${
                viewMode === 'oficial'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/40'
              }`}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Layout Oficial
            </button>
            <button
              id={`${id}-toggle-filtros`}
              onClick={() => setViewMode('filtros')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all cursor-pointer ${
                viewMode === 'filtros'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/40'
              }`}
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Tabela Filtros
            </button>
          </div>

          {/* Export to Excel (Always placed in top right corner of control panel) */}
          <button
            id={`${id}-btn-export`}
            onClick={onExportExcel}
            className="px-4.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold active:scale-[0.98] transition-all flex items-center justify-center shrink-0 shadow-sm cursor-pointer self-stretch sm:self-auto"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportar Relatório
          </button>
        </div>

        {/* Bottom Row: Search Field and Filter Controls aligned perfectly in line */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-slate-100/70">
          
          {/* Search bar */}
          <div className="relative w-full lg:max-w-[260px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              id={`${id}-search-input`}
              type="text"
              placeholder="Pesquisar ativos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 w-full transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Grouped Filter Container (Perfectly aligned in a single row layout) */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-50/80 border border-slate-200/50 px-3 py-1.5 rounded-2xl w-full lg:w-auto">
            {/* Label indicating filters */}
            <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center mr-1 shrink-0">
              Filtros:
            </span>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Dropdown: AssetType */}
              <div className="relative" ref={typeDropdownRef}>
                <button
                  id={`${id}-btn-type-filter`}
                  onClick={() => setActiveDropdown(activeDropdown === 'type' ? null : 'type')}
                  className={`px-3 py-1.5 bg-white border rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-between min-w-[110px] shadow-2xs cursor-pointer ${
                    activeDropdown === 'type' ? 'border-blue-500 text-blue-700 ring-2 ring-blue-50' : 'border-slate-200'
                  }`}
                >
                  <span className="truncate mr-1.5 flex items-center">
                    <Filter className="h-3 w-3 mr-1.5 text-blue-500" />
                    Tipo ({selectedAssetTypes.size})
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {activeDropdown === 'type' && (
                  <div className="absolute right-0 sm:left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-30 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filtrar tipos..."
                        value={typeSearch}
                        onChange={(e) => setTypeSearch(e.target.value)}
                        className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-full"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] border-b border-slate-100 pb-2 pt-1 px-1">
                      <button onClick={handleSelectAllTypes} className="text-blue-600 font-semibold hover:text-blue-500">Todos</button>
                      <button onClick={handleClearAllTypes} className="text-rose-600 font-semibold hover:text-rose-500">Limpar</button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredTypeOptions.length > 0 ? (
                        filteredTypeOptions.map((type) => (
                          <label key={type} className="flex items-center space-x-2 px-1.5 py-1 hover:bg-slate-50 rounded-md cursor-pointer transition-colors text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={selectedAssetTypes.has(type)}
                              onChange={() => handleToggleAssetType(type)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="truncate">{type}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-400 p-2 text-center">Nenhum tipo correspondente</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Dropdown: Entrou Asset selection */}
              <div className="relative" ref={entrouDropdownRef}>
                <button
                  id={`${id}-btn-entrou-filter`}
                  onClick={() => setActiveDropdown(activeDropdown === 'entrou' ? null : 'entrou')}
                  className={`px-3 py-1.5 bg-white border rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-between min-w-[150px] shadow-2xs cursor-pointer ${
                    activeDropdown === 'entrou' ? 'border-emerald-500 text-emerald-700 ring-2 ring-emerald-50' : 'border-slate-200'
                  }`}
                >
                  <span className="truncate mr-1.5 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                    Ativos Entraram ({selectedEntrouNames.size})
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {activeDropdown === 'entrou' && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-30 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar ativos por nome (Entrou)..."
                        value={entrouSearch}
                        onChange={(e) => setEntrouSearch(e.target.value)}
                        className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-full"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] border-b border-slate-100 pb-2 pt-1 px-1">
                      <button onClick={handleSelectAllEntrou} className="text-blue-600 font-semibold hover:text-blue-500">Todos ({entraram.length})</button>
                      <button onClick={handleClearAllEntrou} className="text-rose-600 font-semibold hover:text-rose-500 font-sans">Limpar</button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredEntrouOptions.length > 0 ? (
                        filteredEntrouOptions.map((asset) => (
                          <label key={asset.AssetName} className="flex items-center space-x-2 px-1.5 py-1 hover:bg-slate-50 rounded-md cursor-pointer transition-colors text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={selectedEntrouNames.has(asset.AssetName)}
                              onChange={() => handleToggleEntrouAsset(asset.AssetName)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="truncate font-mono text-[11px] font-bold">{asset.AssetName}</span>
                            {asset.AssetType && (
                              <span className="text-[9px] text-slate-500 ml-auto bg-slate-100 px-1 py-0.5 rounded truncate max-w-[80px]">
                                {asset.AssetType}
                              </span>
                            )}
                          </label>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-400 p-2 text-center">Nenhum ativo correspondente</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Dropdown: Saiu Asset selection */}
              <div className="relative" ref={saiuDropdownRef}>
                <button
                  id={`${id}-btn-saiu-filter`}
                  onClick={() => setActiveDropdown(activeDropdown === 'saiu' ? null : 'saiu')}
                  className={`px-3 py-1.5 bg-white border rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-between min-w-[140px] shadow-2xs cursor-pointer ${
                    activeDropdown === 'saiu' ? 'border-rose-500 text-rose-700 ring-2 ring-rose-50' : 'border-slate-200'
                  }`}
                >
                  <span className="truncate mr-1.5 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mr-2"></span>
                    Ativos Saíram ({selectedSaiuNames.size})
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {activeDropdown === 'saiu' && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-30 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar ativos por nome (Saiu)..."
                        value={saiuSearch}
                        onChange={(e) => setSaiuSearch(e.target.value)}
                        className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-full"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] border-b border-slate-100 pb-2 pt-1 px-1">
                      <button onClick={handleSelectAllSaiu} className="text-blue-600 font-semibold hover:text-blue-500">Todos ({sairam.length})</button>
                      <button onClick={handleClearAllSaiu} className="text-rose-600 font-semibold hover:text-rose-500 font-sans">Limpar</button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredSaiuOptions.length > 0 ? (
                        filteredSaiuOptions.map((asset) => (
                          <label key={asset.AssetName} className="flex items-center space-x-2 px-1.5 py-1 hover:bg-slate-50 rounded-md cursor-pointer transition-colors text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={selectedSaiuNames.has(asset.AssetName)}
                              onChange={() => handleToggleSaiuAsset(asset.AssetName)}
                              className="rounded border-slate-300 text-rose-600 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="truncate font-mono text-[11px] font-bold">{asset.AssetName}</span>
                            {asset.AssetType && (
                              <span className="text-[9px] text-slate-500 ml-auto bg-slate-100 px-1 py-0.5 rounded truncate max-w-[80px]">
                                {asset.AssetType}
                              </span>
                            )}
                          </label>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-400 p-2 text-center">Nenhum ativo correspondente</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2.5. Section Title & Logo Row (Below Filters, Above Table) - Left Logo/Metadata and Centered Titles */}
      <div id={`${id}-title-logo-row`} className="relative px-6 py-5 bg-slate-50/45 border-b border-[#E5E7EB] flex flex-col md:flex-row md:items-center md:justify-between min-h-[110px] gap-6">
        {/* Left Side: Logo and Metadata stacked vertically, perfectly left-aligned */}
        <div className="flex flex-col space-y-1 text-left z-10 justify-center shrink-0">
          <LansweeperLogo className="h-5 max-w-[120px] mb-1" isDarkBackground={false} />
          <p className="text-xs font-semibold text-slate-800">
            Período: <span className="font-normal text-slate-500">{diaAnteriorDateStr} a {diaAtualDateStr}</span>
          </p>
          <p className="text-xs font-semibold text-slate-800">
            Responsável: <span className="font-bold text-blue-600 uppercase tracking-wide">{responsavel || 'Não definido'}</span>
          </p>
        </div>

        {/* Centered Main Titles */}
        <div className="md:absolute md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 text-center w-full md:w-auto z-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <h2 id={`${id}-main-title`} className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
              Alupar Brasil - Movimentação Diária de Ativos
            </h2>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              Identificação de conexões e desconexões na rede.
            </p>
          </div>
        </div>

        {/* Right side placeholder to balance the absolute centered container */}
        <div className="hidden md:block w-[180px] shrink-0"></div>
      </div>

      {/* 3. Table Views */}
      <div id={`${id}-table-area`} className="flex-1 overflow-x-auto bg-white min-h-[400px]">
        
        {viewMode === 'oficial' ? (
          /* ==================================== */
          /* LAYOUT OFICIAL (Spreadsheet layout)   */
          /* ==================================== */
          <div id={`${id}-layout-oficial`} className="w-full p-6 space-y-6 animate-in fade-in duration-250">
            
            {/* ENTRARAM BLOCK */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 px-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Ativos Conectados (Novos Ingressos)</h4>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm bg-white custom-scrollbar max-h-[350px] relative">
                <table className="w-full text-left table-auto">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50/50 sticky top-0 z-10 shadow-[inset_0_-1px_0_rgba(229,231,235,1)]">
                      <th className="px-2.5 py-2 text-center text-white bg-emerald-600 font-bold rounded-tl-lg shadow-sm">
                        Entrou
                      </th>
                      <th className="px-2.5 py-2 text-slate-850 font-bold">AssetType</th>
                      <th className="px-2.5 py-2 text-slate-850 font-bold text-center">Domain</th>
                      <th className="px-2.5 py-2 text-slate-850 font-bold text-center hidden sm:table-cell">OS</th>
                      <th className="px-2.5 py-2 text-slate-850 font-bold hidden md:table-cell">Model</th>
                      <th className="px-2.5 py-2 text-slate-850 font-bold">IPAddress</th>
                      <th className="px-2.5 py-2 text-slate-850 font-bold hidden xl:table-cell">IPLocation</th>
                      <th className="px-2.5 py-2 text-slate-850 font-bold rounded-tr-lg hidden xl:table-cell">MACAddress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-600">
                    {finalFilteredEntrou.length > 0 ? (
                       finalFilteredEntrou.map((asset) => (
                         <tr key={asset.AssetName} className="group hover:bg-slate-50/50 transition-colors">
                          <td 
                            className="px-2.5 py-2 text-[11px] text-slate-900 font-bold whitespace-nowrap bg-slate-50/5 group-hover:bg-slate-50/85 transition-all border-r border-slate-100"
                            title={asset.AssetName}
                          >
                            {asset.AssetName}
                          </td>
                          {renderCell(asset.AssetType, 'text-left px-2.5 py-2')}
                          {renderDomainCell(asset.Domain, true, 'px-2.5 py-2')}
                          {renderCell(asset.OS, 'text-center px-2.5 py-2 hidden sm:table-cell')}
                          {renderCell(asset.Model, 'text-left px-2.5 py-2 text-slate-500 hidden md:table-cell max-w-[150px] truncate')}
                          {renderCell(asset.IPAddress, 'font-mono text-left px-2.5 py-2 text-slate-500')}
                          {renderCell(asset.IPLocation, 'text-left px-2.5 py-2 text-slate-500 hidden xl:table-cell max-w-[150px] truncate')}
                          {renderCell(asset.MACAddress, 'font-mono text-left px-2.5 py-2 text-slate-500 hidden xl:table-cell')}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-xs text-slate-400 font-normal">
                          Nenhum ativo "Entrou" correspondente aos filtros de busca.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SAÍRAM BLOCK */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 px-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Ativos Desconectados (Saíram da Rede)</h4>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm bg-white custom-scrollbar max-h-[350px] relative">
                <table className="w-full text-left table-auto">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50/50 sticky top-0 z-10 shadow-[inset_0_-1px_0_rgba(229,231,235,1)]">
                      <th className="px-2.5 py-2 text-center text-white bg-rose-600 font-bold rounded-tl-lg shadow-sm">
                        Saiu
                      </th>
                      <th className="px-2.5 py-2 text-slate-850 font-bold">AssetType</th>
                      <th className="px-2.5 py-2 text-slate-850 font-bold text-center">Domain</th>
                      <th className="px-2.5 py-2 text-slate-850 font-bold text-center hidden sm:table-cell">OS</th>
                      <th className="px-2.5 py-2 text-slate-850 font-bold hidden md:table-cell">Model</th>
                      <th className="px-2.5 py-2 text-slate-850 font-bold">IPAddress</th>
                      <th className="px-2.5 py-2 text-slate-850 font-bold hidden xl:table-cell">IPLocation</th>
                      <th className="px-2.5 py-2 text-slate-850 font-bold rounded-tr-lg hidden xl:table-cell">MACAddress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-600">
                    {finalFilteredSaiu.length > 0 ? (
                       finalFilteredSaiu.map((asset) => (
                         <tr key={asset.AssetName} className="group hover:bg-slate-50/50 transition-colors">
                          <td 
                            className="px-2.5 py-2 text-[11px] text-slate-900 font-bold whitespace-nowrap bg-slate-50/5 group-hover:bg-slate-50/85 transition-all border-r border-slate-100"
                            title={asset.AssetName}
                          >
                            {asset.AssetName}
                          </td>
                          {renderCell(asset.AssetType, 'text-left px-2.5 py-2')}
                          {renderDomainCell(asset.Domain, false, 'px-2.5 py-2')}
                          {renderCell(asset.OS, 'text-center px-2.5 py-2 hidden sm:table-cell')}
                          {renderCell(asset.Model, 'text-left px-2.5 py-2 text-slate-500 hidden md:table-cell max-w-[150px] truncate')}
                          {renderCell(asset.IPAddress, 'font-mono text-left px-2.5 py-2 text-slate-500')}
                          {renderCell(asset.IPLocation, 'text-left px-2.5 py-2 text-slate-500 hidden xl:table-cell max-w-[150px] truncate')}
                          {renderCell(asset.MACAddress, 'font-mono text-left px-2.5 py-2 text-slate-500 hidden xl:table-cell')}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-xs text-slate-400 font-normal">
                          Nenhum ativo "Saiu" correspondente aos filtros de busca.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          /* ==================================== */
          /* TABELA FILTROS (Unified with paging)  */
          /* ==================================== */
          <div id={`${id}-layout-filtros`} className="w-full p-6 space-y-4 animate-in fade-in duration-250">
            <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-sm custom-scrollbar">
              <table className="w-full text-left table-auto">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    {/* Headers with clickable sorting */}
                    {[
                      { key: 'Status', label: 'Status', align: 'text-left', responsiveClass: '' },
                      { key: 'AssetName', label: 'AssetName', align: 'text-left', responsiveClass: '' },
                      { key: 'AssetType', label: 'AssetType', align: 'text-left', responsiveClass: '' },
                      { key: 'Domain', label: 'Domain', align: 'text-center', responsiveClass: '' },
                      { key: 'OS', label: 'OS', align: 'text-center', responsiveClass: 'hidden sm:table-cell' },
                      { key: 'Model', label: 'Model', align: 'text-left', responsiveClass: 'hidden md:table-cell max-w-[150px] truncate' },
                      { key: 'IPAddress', label: 'IPAddress', align: 'text-left', responsiveClass: '' },
                      { key: 'IPLocation', label: 'IPLocation', align: 'text-left', responsiveClass: 'hidden xl:table-cell max-w-[150px] truncate' },
                      { key: 'MACAddress', label: 'MACAddress', align: 'text-left', responsiveClass: 'hidden xl:table-cell' },
                    ].map((col) => {
                      const isSorted = sortField === col.key;
                      return (
                        <th
                          key={col.key}
                          onClick={() => {
                            if (sortField === col.key) {
                              setSortAsc(!sortAsc);
                            } else {
                              setSortField(col.key as any);
                              setSortAsc(true);
                            }
                          }}
                          className={`px-2.5 py-2 border-b border-slate-200 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors ${col.align || 'text-left'} ${col.responsiveClass || ''}`}
                        >
                          <div className={`flex items-center space-x-1 ${col.align === 'text-center' ? 'justify-center' : 'justify-between'}`}>
                            <span className="font-bold">{col.label}</span>
                            <span className="text-slate-400">
                              {isSorted ? (
                                sortAsc ? <ChevronUp className="h-3 w-3 text-blue-600" /> : <ChevronDown className="h-3 w-3 text-blue-600" />
                              ) : (
                                <span className="text-slate-300 block w-3"></span>
                              )}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal text-slate-600">
                  {paginatedList.length > 0 ? (
                    paginatedList.map((asset) => (
                       <tr key={asset.AssetName} className="group hover:bg-slate-50/50 transition-colors">
                        {/* Status Column */}
                        <td className="px-2.5 py-2 text-xs">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-3xs ${
                            asset.status === 'Entrou'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {asset.status}
                          </span>
                        </td>
                        <td 
                          className="px-2.5 py-2 text-[11px] text-slate-900 font-bold whitespace-nowrap group-hover:bg-slate-50/85 transition-all border-r border-slate-100"
                          title={asset.AssetName}
                        >
                          {asset.AssetName}
                        </td>
                        {renderCell(asset.AssetType, 'text-left px-2.5 py-2')}
                        {renderDomainCell(asset.Domain, asset.status === 'Entrou', 'px-2.5 py-2')}
                        {renderCell(asset.OS, 'text-center px-2.5 py-2 hidden sm:table-cell')}
                        {renderCell(asset.Model, 'text-left px-2.5 py-2 text-slate-500 hidden md:table-cell max-w-[150px] truncate')}
                        {renderCell(asset.IPAddress, 'font-mono text-left px-2.5 py-2 text-slate-500')}
                        {renderCell(asset.IPLocation, 'text-left px-2.5 py-2 text-slate-500 hidden xl:table-cell max-w-[150px] truncate')}
                        {renderCell(asset.MACAddress, 'font-mono text-left px-2.5 py-2 text-slate-500 hidden xl:table-cell')}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-xs text-slate-400 font-normal">
                        Nenhum ativo correspondente encontrado na busca.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {totalItems > 0 && (
              <div id={`${id}-pagination-bar`} className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 px-1">
                <div className="text-xs text-slate-500">
                  Mostrando <span className="text-slate-800">{(currentPage - 1) * pageSize + 1}</span> a{' '}
                  <span className="text-slate-800">{Math.min(currentPage * pageSize, totalItems)}</span> de{' '}
                  <span className="text-blue-600 font-extrabold">{totalItems}</span> ativos
                </div>

                <div className="flex items-center space-x-4">
                  {/* Page Size Selector */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-slate-400">Itens por página:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-slate-200 rounded-xl text-xs text-slate-700 py-1 px-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                      title="Primeira Página"
                    >
                      <ChevronLeft className="h-4 w-4 stroke-[3]" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                      title="Página Anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <span className="text-xs font-semibold text-slate-700 px-3 bg-white py-1.5 rounded-lg border border-slate-200">
                      {currentPage} / {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                      title="Próxima Página"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                      title="Última Página"
                    >
                      <ChevronRight className="h-4 w-4 stroke-[3]" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
