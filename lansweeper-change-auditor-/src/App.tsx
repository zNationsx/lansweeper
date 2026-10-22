import React, { useState, useEffect } from 'react';
import { 
  ServerCrash, 
  RefreshCw, 
  Layers, 
  HelpCircle, 
  Calendar,
  AlertTriangle,
  Play,
  LogOut,
  Cloud,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import AssetTable from './components/AssetTable';
import LansweeperLogo from './components/LansweeperLogo';
import GoogleDrivePicker from './components/GoogleDrivePicker';
import { LansweeperAsset } from './types';
import { generateMockAssets } from './utils/mockGenerator';
import { exportToLansweeperExcel } from './utils/excelExporter';
import { parseLansweeperArrayBuffer } from './utils/excelParser';
import { initAuth, googleSignIn, logoutUser } from './utils/firebase';
import { User } from 'firebase/auth';


// Utility functions for date conversions
function formatDateToYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDDMMYYYYtoYYYYMMDD(ddmmyyyy: string): string {
  const parts = ddmmyyyy.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return ddmmyyyy;
}

function parseYYYYMMDDtoDDMMYYYY(yyyymmdd: string): string {
  const parts = yyyymmdd.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return yyyymmdd;
}

function getPreviousWorkingDay(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday
  
  if (day === 1) { // Monday -> previous Friday (subtract 3 days)
    result.setDate(result.getDate() - 3);
  } else if (day === 0) { // Sunday -> previous Friday (subtract 2 days)
    result.setDate(result.getDate() - 2);
  } else if (day === 6) { // Saturday -> previous Friday (subtract 1 day)
    result.setDate(result.getDate() - 1);
  } else { // Tuesday, Wednesday, Thursday, Friday -> subtract 1 day
    result.setDate(result.getDate() - 1);
  }
  return result;
}

export default function App() {
  // Google Auth & Drive States
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [drivePickerTarget, setDrivePickerTarget] = useState<'atual' | 'anterior' | null>(null);

  // File Upload State
  const [diaAtualAssets, setDiaAtualAssets] = useState<LansweeperAsset[] | null>(null);
  const [diaAtualFileName, setDiaAtualFileName] = useState<string>('');
  
  const [diaAnteriorAssets, setDiaAnteriorAssets] = useState<LansweeperAsset[] | null>(null);
  const [diaAnteriorFileName, setDiaAnteriorFileName] = useState<string>('');

  // Listen for Google Auth state on load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setGoogleUser(user),
      () => setGoogleUser(null)
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
      }
    } catch (err: any) {
      console.error('Falha ao conectar com o Google:', err);
      // Opens drive picker modal with the authorization troubleshooting interface
      setIsDrivePickerOpen(true);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutUser();
      setGoogleUser(null);
    } catch (err: any) {
      console.error('Erro ao desconectar:', err);
    }
  };

  const handleOpenDrivePicker = (target: 'atual' | 'anterior') => {
    setDrivePickerTarget(target);
    setIsDrivePickerOpen(true);
  };

  const handleDriveFileSelected = async (arrayBuffer: ArrayBuffer, fileName: string) => {
    try {
      const result = await parseLansweeperArrayBuffer(arrayBuffer, fileName);
      if (drivePickerTarget === 'atual') {
        setDiaAtualAssets(result.assets);
        setDiaAtualFileName(result.fileName);
        const yyyymmdd = parseDDMMYYYYtoYYYYMMDD(result.dateStr);
        handleDiaAtualDateChange(yyyymmdd);
      } else if (drivePickerTarget === 'anterior') {
        setDiaAnteriorAssets(result.assets);
        setDiaAnteriorFileName(result.fileName);
        const yyyymmdd = parseDDMMYYYYtoYYYYMMDD(result.dateStr);
        setDiaAnteriorInputDate(yyyymmdd);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao analisar a planilha do Google Drive: ${err?.message || err}`);
      throw err;
    }
  };


  // Date States (stored as YYYY-MM-DD for native HTML date inputs)
  const [diaAtualInputDate, setDiaAtualInputDate] = useState<string>(formatDateToYYYYMMDD(new Date()));
  const [diaAnteriorInputDate, setDiaAnteriorInputDate] = useState<string>(
    formatDateToYYYYMMDD(getPreviousWorkingDay(new Date()))
  );

  // Comparison Results
  const [entraram, setEntraram] = useState<LansweeperAsset[]>([]);
  const [sairam, setSairam] = useState<LansweeperAsset[]>([]);
  const [isCompared, setIsCompared] = useState(false);

  // Selected Responsible User
  const [responsavel, setResponsavel] = useState<string>('');

  // Filter Selection Sets (selected names)
  const [selectedEntrouNames, setSelectedEntrouNames] = useState<Set<string>>(new Set());
  const [selectedSaiuNames, setSelectedSaiuNames] = useState<Set<string>>(new Set());

  // Automatic Business Rule: When Dia Atual Date changes, calculate Dia Anterior Date
  const handleDiaAtualDateChange = (dateStr: string) => {
    setDiaAtualInputDate(dateStr);
    const dateObj = new Date(dateStr + 'T00:00:00'); // enforce local timezone parsing
    if (!isNaN(dateObj.getTime())) {
      const prevWorkingDay = getPreviousWorkingDay(dateObj);
      setDiaAnteriorInputDate(formatDateToYYYYMMDD(prevWorkingDay));
    }
  };

  // Automated Reactive Comparison Engine
  useEffect(() => {
    if (diaAtualAssets && diaAnteriorAssets) {
      const anteriorNamesLower = new Set(diaAnteriorAssets.map(a => a.AssetName.toLowerCase()));
      const atualNamesLower = new Set(diaAtualAssets.map(a => a.AssetName.toLowerCase()));

      const entered = diaAtualAssets.filter(a => !anteriorNamesLower.has(a.AssetName.toLowerCase()));
      const left = diaAnteriorAssets.filter(a => !atualNamesLower.has(a.AssetName.toLowerCase()));

      setEntraram(entered);
      setSairam(left);

      // Reset / initialize selection set for checkboxes to all matching assets
      setSelectedEntrouNames(new Set(entered.map(a => a.AssetName)));
      setSelectedSaiuNames(new Set(left.map(a => a.AssetName)));
      setIsCompared(true);
    } else {
      setEntraram([]);
      setSairam([]);
      setIsCompared(false);
    }
  }, [diaAtualAssets, diaAnteriorAssets]);

  // Load High-Fidelity Test Data
  const handleLoadTestData = () => {
    const { diaAnterior, diaAtual } = generateMockAssets();
    
    // Set mock files metadata
    setDiaAnteriorFileName('lansweeper_ref_anterior.xlsx');
    setDiaAtualFileName('lansweeper_ref_atual.xlsx');

    // Setup dates (Set Dia Atual to a Monday, so Dia Anterior auto-rolls to previous Friday!)
    const mockMonday = new Date('2026-06-29T00:00:00'); // 2026-06-29 is a Monday
    const currentFormatted = formatDateToYYYYMMDD(mockMonday);
    const previousFormatted = formatDateToYYYYMMDD(getPreviousWorkingDay(mockMonday));

    setDiaAtualInputDate(currentFormatted);
    setDiaAnteriorInputDate(previousFormatted);

    // Set assets
    setDiaAnteriorAssets(diaAnterior);
    setDiaAtualAssets(diaAtual);

    // Auto-select a high-fidelity responsible user for demonstration
    setResponsavel('Francisco Xavier');
  };

  // Handle clearing inputs
  const handleClearDiaAtual = () => {
    setDiaAtualAssets(null);
    setDiaAtualFileName('');
  };

  const handleClearDiaAnterior = () => {
    setDiaAnteriorAssets(null);
    setDiaAnteriorFileName('');
  };

  // Trigger professional multi-tab Excel export
  const handleExportExcel = async () => {
    if (isDateError) {
      alert('Erro de Validação: O período de auditoria possui datas iguais. Por favor, ajuste as datas antes de exportar.');
      return;
    }
    if (!diaAtualAssets || !diaAnteriorAssets) return;

    // Filter "Entrou" and "Saiu" arrays by selected checkboxes/dropdowns
    const filteredEntrou = entraram.filter(a => selectedEntrouNames.has(a.AssetName));
    const filteredSaiu = sairam.filter(a => selectedSaiuNames.has(a.AssetName));

    try {
      await exportToLansweeperExcel({
        diaAtualAssets,
        diaAnteriorAssets,
        filteredEntraram: filteredEntrou,
        filteredSairam: filteredSaiu,
        diaAtualDateStr: parseYYYYMMDDtoDDMMYYYY(diaAtualInputDate),
        diaAnteriorDateStr: parseYYYYMMDDtoDDMMYYYY(diaAnteriorInputDate),
        responsavel: responsavel || 'Não definido'
      });
    } catch (err: any) {
      console.error(err);
      alert('Erro ao exportar planilha Excel. Verifique o console para mais detalhes.');
    }
  };

  // Calculated display values
  const totalDiaAtualCount = diaAtualAssets?.length ?? 0;
  const totalDiaAnteriorCount = diaAnteriorAssets?.length ?? 0;
  const isDateError = diaAtualInputDate === diaAnteriorInputDate;
  
  // Security check: Find any newly connected assets outside the Alupar domain
  const workgroupAssets = entraram.filter((asset) => {
    const domainName = asset.Domain?.trim();
    return domainName && domainName.toUpperCase() !== 'ALUPAR';
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#374151] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Banner / Navbar */}
      <header className="border-b border-[#E5E7EB] bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <LansweeperLogo className="h-6 max-w-[130px]" isDarkBackground={false} />
            </div>
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <div className="hidden sm:block">
              <span className="text-sm font-bold text-slate-900 tracking-tight block leading-tight">
                Movimentação de Ativos
              </span>
              <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider block leading-none mt-0.5">
                Auditoria de Inventário Rede Alupar Brasil
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {googleUser ? (
              <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl">
                <div className="relative">
                  {googleUser.photoURL ? (
                    <img 
                      src={googleUser.photoURL} 
                      alt={googleUser.displayName || 'Google Account'} 
                      className="w-6 h-6 rounded-full border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-[11px] flex items-center justify-center border border-blue-700 uppercase">
                      {(googleUser.displayName || googleUser.email || 'G')[0]}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white"></span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                    {googleUser.displayName}
                  </p>
                  <p className="text-[9px] text-emerald-600 font-semibold leading-none flex items-center mt-0.5">
                    Drive Conectado
                  </p>
                </div>
                <button
                  onClick={handleGoogleLogout}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Desconectar do Google"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-xs font-semibold text-white rounded-xl flex items-center space-x-2 transition-all shadow-sm cursor-pointer border border-blue-700/50"
                title="Conectar com o Google Drive para importar planilhas"
              >
                <Cloud className="h-4 w-4" />
                <span>Conectar Google Drive</span>
              </button>
            )}

            <button
              id="btn-load-test"
              onClick={handleLoadTestData}
              className="px-4 py-2 bg-white border border-[#E5E7EB] text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:scale-[0.98] rounded-xl flex items-center space-x-1.5 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05)] shrink-0 cursor-pointer"
              title="Carrega dados simulados para demonstração imediata"
            >
              <Play className="h-3 w-3 text-blue-600 fill-blue-600/10" />
              <span>Dados de Teste</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Intro Card */}
        <section className="bg-white border border-[#E5E7EB] rounded-[18px] p-6 md:p-8 flex flex-col lg:flex-row items-stretch justify-between gap-8 relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.015)]">
          <div className="space-y-4 max-w-3xl flex-1">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/50">
                <Layers className="h-5 w-5" />
              </span>
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block leading-none">
                Auditoria de Segurança & Infraestrutura
              </p>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
              Relatório Diário de Movimentação de Ativos
            </h1>
            
            <div className="space-y-3.5 text-sm text-slate-500 leading-relaxed font-normal">
              <p>
                Realize a comparação entre duas exportações do Lansweeper (formatos <strong className="text-slate-700 font-semibold">.xlsx, .xls ou .csv</strong>, contendo a aba <strong className="text-slate-700 font-semibold">Report</strong>) para identificar de forma automatizada os ativos que ingressaram ou deixaram a rede corporativa da Alupar Brasil.
              </p>
              <p>
                A ferramenta executa uma análise rápida e precisa das diferenças entre os inventários, facilitando a auditoria de ativos, o controle patrimonial e a rápida identificação de alterações no ambiente de TI.
              </p>
              <p>
                Todo o processamento é realizado localmente no seu navegador, garantindo total privacidade dos dados sem envio de informações confidenciais para servidores externos.
              </p>
            </div>
          </div>
          
          <div className="lg:w-[320px] shrink-0 flex flex-col justify-center">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
              <div className="flex items-center space-x-2.5 text-xs text-slate-800">
                <HelpCircle className="h-5 w-5 text-blue-600 shrink-0" />
                <span className="font-bold text-slate-900 text-xs">Dica de Exportação</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Certifique-se de que as colunas possuam os headers de dados originais fornecidos pelo Lansweeper. Isso garante a extração correta das propriedades de cada máquina conectada.
              </p>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Versão 1.1.0</span>
                <span>Client-Side Only</span>
              </div>
            </div>
          </div>
        </section>

        {/* Identification of Responsável Card */}
        <section id="card-responsavel-wrapper" className="bg-white border border-[#E5E7EB] rounded-[18px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start space-x-4 max-w-3xl">
            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-100 shrink-0 hidden sm:block">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 id="title-responsavel" className="text-sm font-bold text-slate-950 uppercase tracking-wider flex items-center">
                <span className="w-2 h-2 rounded-full bg-blue-600 mr-2"></span>
                Identificação do Responsável Técnico
              </h2>
              <p id="desc-responsavel" className="text-xs text-slate-500 leading-relaxed">
                Campo obrigatório. Informe o nome do responsável técnico pela análise ou pelas alterações identificadas. Essa informação é necessária para registrar a auditoria e habilitar o envio das planilhas de inventário para processamento.
              </p>
            </div>
          </div>
          <div className="w-full lg:w-80 shrink-0">
            <select
              id="select-responsavel"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              className={`w-full bg-white border rounded-xl text-xs text-slate-800 py-3 px-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer font-bold shadow-sm ${
                !responsavel 
                  ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/5' 
                  : 'border-slate-200 bg-white text-slate-900'
              }`}
            >
              <option value="">-- Selecione o Responsável --</option>
              <option value="João Guerra">João Guerra</option>
              <option value="Francisco Xavier">Francisco Xavier</option>
              <option value="George Alves">George Alves</option>
              <option value="Thiago Souza">Thiago Souza</option>
            </select>
          </div>
        </section>

        {/* Upload & Date Setup Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* Card 1: Dia Atual */}
          <div className="bg-white border border-[#E5E7EB] p-6 rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  Inventário Atual
                </span>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 font-bold shrink-0">
                  Dia Atual (Nova)
                </span>
              </div>

              {diaAtualFileName ? (
                /* Success/Loaded State from Google Drive */
                <div className="space-y-3">
                  <div className="relative overflow-hidden bg-emerald-50/40 hover:bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 transition-all flex items-center justify-between">
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate" title={diaAtualFileName}>
                          {diaAtualFileName}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-bold mt-0.5 flex items-center">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1"></span>
                          {totalDiaAtualCount} ativos carregados
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleClearDiaAtual}
                      disabled={!responsavel}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent transition-all disabled:opacity-40 cursor-pointer"
                      title="Remover planilha"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty / Dedicated Google Drive Import Button Block */
                <div className="space-y-3">
                  <button
                    disabled={!responsavel}
                    onClick={() => handleOpenDrivePicker('atual')}
                    className={`w-full group p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-3.5 transition-all ${
                      !responsavel
                        ? 'border-slate-100 bg-slate-50/50 opacity-60 cursor-not-allowed'
                        : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/10 cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    <div className={`p-3 rounded-xl transition-all ${
                      !responsavel 
                        ? 'bg-slate-50 text-slate-300' 
                        : 'bg-slate-50 text-slate-400 group-hover:scale-105 group-hover:bg-blue-50 group-hover:text-blue-600'
                    }`}>
                      <svg viewBox="0 0 87.3 78" className="w-8 h-8">
                        <path fill="#00A852" d="M5.8 57.5L3.1 52.8l26-45.1 4.7 8.2c.4.7.4 1.5 0 2.2L11 52.8c-.4.7-1.1 1.2-1.9 1.5l-3.3 3.2z"/>
                        <path fill="#FFD300" d="M57.4 52.8H5.8l2.6 4.7c.4.7 1.1 1.2 1.9 1.5h51.5c.8-.3 1.5-.8 1.9-1.5l-6.3-4.7z"/>
                        <path fill="#1A73E8" d="M33.8 15.9l23.6 40.8c.4.7 1.1 1.2 1.9 1.5l6.3-4.7-25.5-44.1-1.6-1.7c-.8-.6-1.8-.7-2.6-.4l-6.1 8.6z"/>
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-xs font-bold ${!responsavel ? 'text-slate-400' : 'text-slate-700 group-hover:text-blue-900'}`}>
                        Importar do Google Drive
                      </p>
                      <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                        {!responsavel ? 'Selecione o responsável primeiro' : 'Buscar arquivo .xlsx ou planilha Google'}
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Date Input: Dia Atual */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Data do Inventário Atual
              </label>
              <input
                id="input-date-atual"
                type="date"
                value={diaAtualInputDate}
                onChange={(e) => handleDiaAtualDateChange(e.target.value)}
                className={`w-full bg-white border rounded-xl text-xs text-slate-800 py-2.5 px-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer font-medium ${
                  isDateError 
                    ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/10' 
                    : 'border-slate-200'
                }`}
              />
            </div>
          </div>

          {/* Card 2: Dia Anterior */}
          <div className="bg-white border border-[#E5E7EB] p-6 rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  Inventário Anterior
                </span>
                <span className="text-[10px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 font-bold shrink-0">
                  Dia Anterior (Referência)
                </span>
              </div>

              {diaAnteriorFileName ? (
                /* Success/Loaded State from Google Drive */
                <div className="space-y-3">
                  <div className="relative overflow-hidden bg-emerald-50/40 hover:bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 transition-all flex items-center justify-between">
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate" title={diaAnteriorFileName}>
                          {diaAnteriorFileName}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-bold mt-0.5 flex items-center">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1"></span>
                          {totalDiaAnteriorCount} ativos carregados
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleClearDiaAnterior}
                      disabled={!responsavel}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent transition-all disabled:opacity-40 cursor-pointer"
                      title="Remover planilha"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty / Dedicated Google Drive Import Button Block */
                <div className="space-y-3">
                  <button
                    disabled={!responsavel}
                    onClick={() => handleOpenDrivePicker('anterior')}
                    className={`w-full group p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-3.5 transition-all ${
                      !responsavel
                        ? 'border-slate-100 bg-slate-50/50 opacity-60 cursor-not-allowed'
                        : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/10 cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    <div className={`p-3 rounded-xl transition-all ${
                      !responsavel 
                        ? 'bg-slate-50 text-slate-300' 
                        : 'bg-slate-50 text-slate-400 group-hover:scale-105 group-hover:bg-blue-50 group-hover:text-blue-600'
                    }`}>
                      <svg viewBox="0 0 87.3 78" className="w-8 h-8">
                        <path fill="#00A852" d="M5.8 57.5L3.1 52.8l26-45.1 4.7 8.2c.4.7.4 1.5 0 2.2L11 52.8c-.4.7-1.1 1.2-1.9 1.5l-3.3 3.2z"/>
                        <path fill="#FFD300" d="M57.4 52.8H5.8l2.6 4.7c.4.7 1.1 1.2 1.9 1.5h51.5c.8-.3 1.5-.8 1.9-1.5l-6.3-4.7z"/>
                        <path fill="#1A73E8" d="M33.8 15.9l23.6 40.8c.4.7 1.1 1.2 1.9 1.5l6.3-4.7-25.5-44.1-1.6-1.7c-.8-.6-1.8-.7-2.6-.4l-6.1 8.6z"/>
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-xs font-bold ${!responsavel ? 'text-slate-400' : 'text-slate-700 group-hover:text-blue-900'}`}>
                        Importar do Google Drive
                      </p>
                      <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                        {!responsavel ? 'Selecione o responsável primeiro' : 'Buscar arquivo .xlsx ou planilha Google'}
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Date Input: Dia Anterior */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Data do Inventário Anterior
                </label>
                <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-bold border border-emerald-100">Automático</span>
              </div>
              <input
                id="input-date-anterior"
                type="date"
                value={diaAnteriorInputDate}
                onChange={(e) => setDiaAnteriorInputDate(e.target.value)}
                className={`w-full bg-white border rounded-xl text-xs text-slate-800 py-2.5 px-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer font-medium ${
                  isDateError 
                    ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/10' 
                    : 'border-slate-200'
                }`}
              />
            </div>
          </div>

          {/* Card 3: Período de Comparação & Regras */}
          <div className="bg-white border border-[#E5E7EB] p-6 rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col justify-between space-y-5 md:col-span-2 lg:col-span-1">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Calendar className="h-4.5 w-4.5" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Período de Comparação
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                As datas selecionadas identificam automaticamente os períodos históricos nas abas geradas e alimentam o algoritmo reativo de diferenças.
              </p>
            </div>

            {isDateError ? (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 space-y-1 animate-in fade-in duration-200">
                <div className="flex items-center space-x-1.5 font-bold text-rose-950 uppercase tracking-wide text-[10px]">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Erro: Datas Iguais</span>
                </div>
                <p className="leading-normal text-[11px] font-normal text-rose-700">
                  O Dia Atual e o Dia Anterior não podem ser o mesmo dia (<strong>{parseYYYYMMDDtoDDMMYYYY(diaAtualInputDate)}</strong>). Por favor, selecione datas distintas para habilitar a auditoria.
                </p>
              </div>
            ) : (
              /* Logical Rule Explainer Alert */
              <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-100/50 text-xs text-slate-600 flex items-start space-x-3">
                <AlertTriangle className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-bold block text-blue-900 uppercase tracking-wider text-[10px]">Regra Operacional Ativa</strong>
                  <p className="leading-relaxed text-[11px] text-slate-500 font-normal">
                    Se o Inventário Atual for de uma Segunda-Feira, o inventário anterior retrocede automaticamente 3 dias (para a Sexta-Feira anterior). Nos outros dias, retrocede 1 dia útil.
                  </p>
                </div>
              </div>
            )}
          </div>

        </section>

        {/* Dashboard and Table Results (Show only when compared) */}
        {isCompared ? (
          isDateError ? (
            <section className="bg-white border border-rose-200 rounded-[18px] p-8 shadow-[0_4px_20px_rgba(244,63,94,0.02)] flex flex-col items-center justify-center space-y-4 max-w-2xl mx-auto text-center animate-in fade-in duration-300">
              <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Período de Relatório Inválido
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  A Data Dia Atual e a Data Dia Anterior não podem ser iguais. O período de auditoria incorreto (<strong className="text-slate-800">{parseYYYYMMDDtoDDMMYYYY(diaAtualInputDate)} a {parseYYYYMMDDtoDDMMYYYY(diaAnteriorInputDate)}</strong>) impede o processamento e a comparação dos relatórios de rede.
                </p>
                <p className="text-xs text-rose-600 font-bold bg-rose-50 px-3.5 py-1.5 rounded-lg border border-rose-100/60 inline-block">
                  Por favor, selecione datas diferentes nos seletores "Data Dia Atual (Nova)" e "Data Dia Anterior (Ref)" acima.
                </p>
              </div>
            </section>
          ) : (
            <section className="space-y-6 animate-in fade-in duration-300">
              {/* Summary Cards */}
              <Dashboard
                id="main-dashboard"
                totalDiaAtual={totalDiaAtualCount}
                totalDiaAnterior={totalDiaAnteriorCount}
                totalEntraram={entraram.length}
                totalSairam={sairam.length}
              />

              {/* Attention Warning Card for WORKGROUP in Entraram */}
              {workgroupAssets.length > 0 && (
                <div id="alerta-workgroup" className="bg-[#FFFDF6] border border-yellow-400 rounded-[18px] p-6 shadow-[0_4px_16px_rgba(234,179,8,0.02)] animate-in slide-in-from-top-4 duration-300 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-yellow-200 pb-4">
                    <div className="flex items-start space-x-3.5">
                      <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl border border-yellow-300 shrink-0">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-extrabold text-amber-700 tracking-tight flex items-center">
                          Atenção: Ativos fora do domínio Alupar!
                        </h3>
                        <p className="text-xs text-slate-500 font-normal leading-relaxed">
                          Ativos recém-identificados na rede Alupar Brasil configurados fora do domínio corporativo padrão (ALUPAR).
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-yellow-50 text-yellow-700 px-3 py-1 rounded-lg border border-yellow-300 shrink-0 self-start sm:self-center font-mono">
                      Segurança de Domínio
                    </span>
                  </div>
                  
                  {/* Horizontal responsive table for the warning assets */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                    <table className="w-full text-left text-[11px] table-auto">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                          <th className="px-2.5 py-2 text-left font-bold text-slate-800">Ativo</th>
                          <th className="px-2.5 py-2 text-left font-bold text-slate-800">Tipo</th>
                          <th className="px-2.5 py-2 text-center font-bold text-slate-800">Domínio</th>
                          <th className="px-2.5 py-2 text-center font-bold text-slate-800 hidden sm:table-cell">Sistema Operacional</th>
                          <th className="px-2.5 py-2 text-left font-bold text-slate-800 hidden md:table-cell">Modelo</th>
                          <th className="px-2.5 py-2 text-left font-bold text-slate-800">Endereço IP</th>
                          <th className="px-2.5 py-2 text-left font-bold text-slate-800 hidden xl:table-cell">Localização IP</th>
                          <th className="px-2.5 py-2 text-left font-bold text-slate-800 hidden xl:table-cell">Endereço MAC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 font-normal">
                        {workgroupAssets.map((asset, index) => (
                          <tr key={asset.AssetName || index} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-2.5 py-2 font-bold text-slate-900 whitespace-nowrap">{asset.AssetName}</td>
                            <td className="px-2.5 py-2 whitespace-nowrap">{asset.AssetType || '—'}</td>
                            <td className="px-2.5 py-2 font-bold text-rose-600 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 rounded-md text-[10px]">
                                {asset.Domain}
                              </span>
                            </td>
                            <td className="px-2.5 py-2 text-center whitespace-nowrap hidden sm:table-cell">{asset.OS || '—'}</td>
                            <td className="px-2.5 py-2 hidden md:table-cell max-w-[150px] truncate" title={asset.Model || ''}>{asset.Model || '—'}</td>
                            <td className="px-2.5 py-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">{asset.IPAddress || '—'}</td>
                            <td className="px-2.5 py-2 hidden xl:table-cell max-w-[150px] truncate text-slate-500" title={asset.IPLocation || ''}>{asset.IPLocation || '—'}</td>
                            <td className="px-2.5 py-2 font-mono text-[11px] text-slate-500 whitespace-nowrap hidden xl:table-cell">{asset.MACAddress || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Results Table and Action Panel */}
              <AssetTable
                id="main-asset-table"
                entraram={entraram}
                sairam={sairam}
                selectedEntrouNames={selectedEntrouNames}
                setSelectedEntrouNames={setSelectedEntrouNames}
                selectedSaiuNames={selectedSaiuNames}
                setSelectedSaiuNames={setSelectedSaiuNames}
                onExportExcel={handleExportExcel}
                diaAtualDateStr={parseYYYYMMDDtoDDMMYYYY(diaAtualInputDate)}
                diaAnteriorDateStr={parseYYYYMMDDtoDDMMYYYY(diaAnteriorInputDate)}
                responsavel={responsavel}
              />
            </section>
          )
        ) : (
          /* Empty State Section */
          <section id="empty-state" className="border border-[#E5E7EB] rounded-[18px] p-12 text-center bg-white shadow-[0_4px_16px_rgba(0,0,0,0.01)] flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-full text-slate-400">
              <ServerCrash className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-1.5 max-w-xs">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Aguardando Planilhas Lansweeper</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Para iniciar o processamento automatizado, conecte-se ao seu Google Drive e selecione as planilhas ou carregue nossos dados de teste.
              </p>
            </div>
          </section>
        )}

      </main>

      {/* Footer Info */}
      <footer className="border-t border-[#E5E7EB] bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="font-normal">
            &copy; 2026 Lansweeper Compare. Processamento local seguro. Desenvolvido para Alupar Brasil.
          </div>
          <div className="flex items-center space-x-1.5 font-mono text-[10px] text-slate-400 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Estável (Client-Side)</span>
          </div>
        </div>
      </footer>

      {/* Google Drive Picker Modal */}
      <GoogleDrivePicker
        isOpen={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        onFileSelected={handleDriveFileSelected}
        title={
          drivePickerTarget === 'atual'
            ? 'Selecione a planilha Lansweeper do Dia Atual (Nova)'
            : 'Selecione a planilha Lansweeper do Dia Anterior (Referência)'
        }
      />

    </div>
  );
}
