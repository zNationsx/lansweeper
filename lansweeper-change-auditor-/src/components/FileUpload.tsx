import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { parseLansweeperFile } from '../utils/excelParser';
import { LansweeperAsset } from '../types';

interface FileUploadProps {
  id: string;
  label: string;
  fileName?: string;
  assetCount?: number;
  dateStr?: string;
  onFileLoaded: (assets: LansweeperAsset[], dateStr: string, fileName: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export default function FileUpload({
  id,
  label,
  fileName,
  assetCount,
  dateStr,
  onFileLoaded,
  onClear,
  disabled = false,
}: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (disabled) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      setError('Formato inválido. Aceita apenas arquivos .xlsx, .xls ou .csv.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const result = await parseLansweeperFile(file);
      onFileLoaded(result.assets, result.dateStr, result.fileName);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Falha ao analisar o arquivo. Certifique-se de que é um formato válido.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleAreaClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div id={`${id}-wrapper`} className="flex flex-col space-y-2">
      <label id={`${id}-title`} className="text-sm font-semibold text-slate-700 flex items-center justify-between gap-2 whitespace-nowrap flex-nowrap">
        <span className="shrink-0">{label}</span>
        {dateStr && (
          <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
            Ref: {dateStr}
          </span>
        )}
      </label>

      {fileName ? (
        <div
          id={`${id}-success-card`}
          className="relative group flex items-start space-x-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm transition-all"
        >
          <div className="p-2 rounded-lg bg-emerald-100/60 text-emerald-600">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <p className="text-sm font-semibold text-slate-900 truncate">{fileName}</p>
            <p className="text-xs text-slate-500 mt-1">
              Ativos identificados: <strong className="text-emerald-700">{assetCount}</strong>
            </p>
          </div>
          <button
            id={`${id}-delete-btn`}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="absolute right-3 top-3 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Remover arquivo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="absolute right-3 bottom-3 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
      ) : (
        <div
          id={`${id}-dropzone`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={handleAreaClick}
          className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all min-h-[120px] ${
            disabled
              ? 'border-slate-200 bg-slate-100/50 cursor-not-allowed opacity-80'
              : isDragActive
              ? 'border-indigo-500 bg-indigo-50/40 scale-[1.01] cursor-pointer'
              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />

          {isLoading ? (
            <div className="flex flex-col items-center space-y-3 py-2">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500">Processando planilha Lansweeper...</p>
            </div>
          ) : disabled ? (
            <div className="flex flex-col items-center text-center space-y-2 py-1">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-amber-500 shadow-sm">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  Envio Bloqueado
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Selecione o Responsável antes de carregar o arquivo
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-2.5 rounded-lg bg-white border border-slate-100 text-indigo-600 shadow-sm">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Arraste ou clique para carregar
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Formatos aceitos: .xlsx, .xls, .csv
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute -bottom-10 left-0 right-0 flex items-center space-x-1.5 text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-100 mt-2 z-10">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}
        </div>
      )}
      {/* Spacer when error is showing beneath absolute */}
      {error && <div className="h-8"></div>}
    </div>
  );
}
