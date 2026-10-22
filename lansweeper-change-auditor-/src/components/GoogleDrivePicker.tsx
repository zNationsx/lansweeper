import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FileSpreadsheet, 
  ChevronLeft, 
  X, 
  Search, 
  RefreshCw, 
  Clock, 
  HardDrive, 
  AlertCircle, 
  CheckCircle2,
  Lock,
  Copy,
  ExternalLink,
  KeyRound,
  FolderSync
} from 'lucide-react';
import { 
  googleSignIn, 
  listDriveFiles, 
  downloadDriveFile, 
  DriveItem, 
  getAccessToken,
  findFolderByName,
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_DRIVE_FOLDER_URL,
  getActiveFirebaseConfig,
  setManualAccessToken
} from '../utils/firebase';
import { User } from 'firebase/auth';

interface GoogleDrivePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelected: (arrayBuffer: ArrayBuffer, fileName: string) => Promise<void>;
  title: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export default function GoogleDrivePicker({
  isOpen,
  onClose,
  onFileSelected,
  title,
}: GoogleDrivePickerProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [domainCopied, setDomainCopied] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [showManualToken, setShowManualToken] = useState(false);
  
  const [resolvedFolderId, setResolvedFolderId] = useState<string>(DEFAULT_DRIVE_FOLDER_ID);
  const [hasResolved, setHasResolved] = useState(false);
  
  // Navigation stack (initially contains Root and the updated project folder to allow backward navigation)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Meu Drive' },
    { id: DEFAULT_DRIVE_FOLDER_ID, name: 'Ativos Lansweeper (Pasta Compartilhada)' }
  ]);

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;
  const activeFirebase = getActiveFirebaseConfig();
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  // Sync state with current token and reset navigation on open
  useEffect(() => {
    if (isOpen) {
      const currentToken = getAccessToken();
      setToken(currentToken);
      if (currentToken && !user) {
        import('../utils/firebase').then(({ auth }) => {
          if (auth.currentUser) {
            setUser(auth.currentUser);
          }
        });
      }
      // Open directly in the shared project folder by default
      setBreadcrumbs([
        { id: 'root', name: 'Meu Drive' },
        { id: DEFAULT_DRIVE_FOLDER_ID, name: 'Ativos Lansweeper (Pasta Compartilhada)' }
      ]);
      setResolvedFolderId(DEFAULT_DRIVE_FOLDER_ID);
      setHasResolved(false);
      setSearchQuery('');
      setError(null);
      setIsUnauthorizedDomain(false);
    }
  }, [isOpen]);

  // Load items whenever folder changes or token is set
  useEffect(() => {
    if (isOpen && token) {
      loadFolderContents(currentFolderId);
    }
  }, [isOpen, token, currentFolderId]);

  const loadFolderContents = async (folderId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let targetFolderId = folderId;
      
      // Perform dynamic lookup only once per session when starting at the default folder
      if (!hasResolved && folderId === DEFAULT_DRIVE_FOLDER_ID && token) {
        setHasResolved(true);
        try {
          const foundId = await findFolderByName('Ativos Lansweeper (Pasta Compartilhada)');
          if (foundId && foundId !== DEFAULT_DRIVE_FOLDER_ID) {
            setResolvedFolderId(foundId);
            setBreadcrumbs([
              { id: 'root', name: 'Meu Drive' },
              { id: foundId, name: 'Ativos Lansweeper (Pasta Compartilhada)' }
            ]);
            targetFolderId = foundId;
          }
        } catch (err) {
          console.warn('Usando ID padrão da pasta compartilhada:', err);
        }
      }

      const files = await listDriveFiles(targetFolderId);
      setItems(files);
    } catch (err: any) {
      console.error(err);
      if (folderId === DEFAULT_DRIVE_FOLDER_ID || folderId === resolvedFolderId) {
        setError(
          'Não foi possível acessar diretamente a pasta configurada. Exibindo a raiz do seu Google Drive...'
        );
        // Fallback to root directory
        setBreadcrumbs([{ id: 'root', name: 'Meu Drive' }]);
      } else {
        setError(err?.message || 'Falha ao carregar conteúdo da pasta.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setIsUnauthorizedDomain(false);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      const isDomainError = 
        err?.code === 'auth/unauthorized-domain' || 
        String(err?.message || '').toLowerCase().includes('unauthorized-domain');
      
      if (isDomainError) {
        setIsUnauthorizedDomain(true);
        setError('O domínio atual não está autorizado nas configurações do Firebase Authentication.');
      } else {
        setError(err?.message || 'Falha na autenticação do Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyManualToken = () => {
    if (!manualTokenInput.trim()) {
      setError('Por favor, informe um token de acesso válido.');
      return;
    }
    setManualAccessToken(manualTokenInput.trim());
    setToken(manualTokenInput.trim());
    setError(null);
    setIsUnauthorizedDomain(false);
    setShowManualToken(false);
  };

  const handleCopyDomain = async () => {
    try {
      await navigator.clipboard.writeText(currentHostname);
      setDomainCopied(true);
      setTimeout(() => setDomainCopied(false), 3000);
    } catch (e) {
      console.error('Failed to copy domain:', e);
    }
  };

  const handleFolderClick = (folder: DriveItem) => {
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
    setSearchQuery('');
  };

  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setSearchQuery('');
  };

  const handleGoBack = () => {
    if (breadcrumbs.length > 1) {
      setBreadcrumbs(breadcrumbs.slice(0, -1));
      setSearchQuery('');
    }
  };

  const handleFileClick = async (file: DriveItem) => {
    setIsProcessing(true);
    setError(null);
    try {
      const { arrayBuffer, name } = await downloadDriveFile(file.id, file.mimeType);
      await onFileSelected(arrayBuffer, name);
      onClose(); // Close modal on success
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Falha ao processar e analisar o arquivo selecionado.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter items based on search query
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Google Drive Explorer
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                {title}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Panel */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {!token ? (
            /* Login Request View */
            <div className="p-6 md:p-8 flex flex-col items-center justify-center text-center space-y-5 my-auto">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-3xs">
                <Lock className="h-8 w-8 animate-pulse" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h4 className="text-sm font-bold text-slate-800">
                  Conexão com Google Drive Requerida
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Para navegar entre as pastas com segurança e importar os relatórios da pasta compartilhada, realize a autenticação com sua conta Google (<span className="font-mono text-indigo-600">developerjoaoad@gmail.com</span>).
                </p>
                <div className="pt-1 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
                  <FolderSync className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Pasta apontada: <span className="font-mono text-slate-600 font-semibold">{DEFAULT_DRIVE_FOLDER_ID}</span></span>
                </div>
              </div>
              
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="gsi-material-button font-bold text-xs scale-105 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">{isLoading ? 'Conectando...' : 'Conectar Google Drive'}</span>
                </div>
              </button>

              {/* Special Diagnostic Box for auth/unauthorized-domain */}
              {isUnauthorizedDomain && (
                <div className="w-full text-left bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 animate-fade-in shadow-xs">
                  <div className="flex items-start space-x-2.5">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <h5 className="text-xs font-bold text-amber-900">
                        Domínio não autorizado no Firebase Auth (<code className="font-mono text-amber-800">auth/unauthorized-domain</code>)
                      </h5>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        O Firebase Authentication bloqueia conexões vindas de domínios novos até serem liberados no console do projeto <span className="font-mono font-semibold">{activeFirebase.projectId}</span>.
                      </p>
                    </div>
                  </div>

                  {/* Domain Copy Box */}
                  <div className="bg-white/90 border border-amber-200/80 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <div className="min-w-0 w-full sm:w-auto">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        Domínio Atual para Autorizar:
                      </p>
                      <p className="text-xs font-mono font-bold text-slate-800 break-all select-all">
                        {currentHostname}
                      </p>
                    </div>
                    <button
                      onClick={handleCopyDomain}
                      className="w-full sm:w-auto px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer shrink-0"
                    >
                      {domainCopied ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar Domínio</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Instructions */}
                  <div className="text-[11px] text-amber-900 space-y-1.5 bg-amber-100/50 p-3 rounded-xl border border-amber-200/50">
                    <p className="font-bold">Como resolver no Firebase Console ({activeFirebase.projectId}):</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
                      <li>Acesse o Firebase Console logado como <span className="font-semibold text-slate-900">developerjoaoad@gmail.com</span></li>
                      <li>Vá em <strong>Authentication</strong> &rarr; aba <strong>Configurações (Settings)</strong> &rarr; <strong>Domínios autorizados</strong></li>
                      <li>Clique em <strong>Adicionar domínio</strong> e cole o domínio copiado acima: <code className="font-mono font-bold text-amber-900 bg-white px-1 py-0.5 rounded">{currentHostname}</code></li>
                    </ol>
                    <div className="pt-2">
                      <a 
                        href={`https://console.firebase.google.com/project/${activeFirebase.projectId}/authentication/settings`}
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-xs font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                      >
                        <span>Abrir Configurações do Firebase Console</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {error && !isUnauthorizedDomain && (
                <div className="flex items-center space-x-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 p-3 rounded-xl w-full text-left">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Direct Manual Token Toggle */}
              <div className="w-full pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualToken(!showManualToken)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center space-x-1 cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>{showManualToken ? 'Ocultar inserção manual de token' : 'Ou inserir token de acesso OAuth manualmente'}</span>
                </button>

                {showManualToken && (
                  <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2.5 animate-fade-in">
                    <p className="text-[11px] text-slate-600">
                      Caso prefira testar a leitura da pasta compartilhada imediatamente sem alterar o console do Firebase, cole um token de acesso temporário do Google OAuth:
                    </p>
                    <div className="flex space-x-2">
                      <input
                        type="password"
                        placeholder="Cole o Bearer access_token do Google..."
                        value={manualTokenInput}
                        onChange={(e) => setManualTokenInput(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                      <button
                        onClick={handleApplyManualToken}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs shrink-0"
                      >
                        Aplicar Token
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : isProcessing ? (
            /* File Downloading / Parsing Screen */
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 my-16">
              <div className="relative">
                <div className="w-14 h-14 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                  <FileSpreadsheet className="h-5 w-5 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">Baixando e Processando Relatório</h4>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  Buscando dados binários da planilha no Google Drive e extraindo o inventário do Lansweeper...
                </p>
              </div>
            </div>
          ) : (
            /* File / Folder Navigation Explorer */
            <>
              {/* Navigation Tools & Search */}
              <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 space-y-3">
                
                {/* Breadcrumbs Navigation Row */}
                <div className="flex items-center space-x-1 overflow-x-auto py-0.5 scrollbar-thin text-xs text-slate-500 font-medium whitespace-nowrap">
                  {breadcrumbs.length > 1 && (
                    <button
                      onClick={handleGoBack}
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-all mr-1.5 border border-transparent hover:border-slate-100 shadow-3xs bg-transparent shrink-0 cursor-pointer"
                      title="Voltar pasta"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                  {breadcrumbs.map((b, index) => (
                    <React.Fragment key={b.id}>
                      {index > 0 && <span className="text-slate-300">/</span>}
                      <button
                        onClick={() => handleBreadcrumbClick(index)}
                        className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                          index === breadcrumbs.length - 1
                            ? 'font-bold text-indigo-900 bg-indigo-50/60'
                            : 'hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {b.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {/* Filter and Refresh Bar */}
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar arquivos e subpastas..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400 font-medium"
                    />
                  </div>
                  <button
                    onClick={() => loadFolderContents(currentFolderId)}
                    disabled={isLoading}
                    className="p-2 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all shadow-3xs cursor-pointer shrink-0"
                    title="Atualizar listagem"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar min-h-[300px]">
                {isLoading ? (
                  /* Loading State */
                  <div className="flex flex-col items-center justify-center space-y-3 py-16 text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                    <p className="text-xs font-medium">Buscando conteúdo no Google Drive...</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  /* Empty Directory or No Matches */
                  <div className="flex flex-col items-center justify-center space-y-2 py-16 text-center">
                    <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl border border-slate-100">
                      <Folder className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Nenhum item compatível</p>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      Não encontramos subpastas ou arquivos compatíveis (.xlsx, .xls, .csv ou Planilhas Google) nesta pasta.
                    </p>
                    <div className="pt-2">
                      <a 
                        href={DEFAULT_DRIVE_FOLDER_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center space-x-1 underline cursor-pointer"
                      >
                        <span>Abrir pasta no Google Drive</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  /* Render Drive Items */
                  filteredItems.map((item) => {
                    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                    const isGoogleSheet = item.mimeType === 'application/vnd.google-apps.spreadsheet';
                    const sizeKB = item.size ? Math.round(parseInt(item.size) / 1024) : null;
                    const dateObj = item.modifiedTime ? new Date(item.modifiedTime) : null;
                    const formattedDate = dateObj ? dateObj.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }) : '';

                    return (
                      <div
                        key={item.id}
                        onClick={() => isFolder ? handleFolderClick(item) : handleFileClick(item)}
                        className={`flex items-center justify-between px-6 py-3.5 hover:bg-indigo-50/15 cursor-pointer transition-colors group`}
                      >
                        <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                          {isFolder ? (
                            <div className="p-2.5 bg-indigo-50/50 text-indigo-500 rounded-xl group-hover:bg-indigo-50 transition-all border border-indigo-100/10">
                              <Folder className="h-4.5 w-4.5 fill-indigo-500/10" />
                            </div>
                          ) : (
                            <div className="p-2.5 bg-emerald-50/50 text-emerald-600 rounded-xl group-hover:bg-emerald-50 transition-all border border-emerald-100/10">
                              <FileSpreadsheet className="h-4.5 w-4.5" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-950 transition-colors">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-1">
                              {isFolder ? (
                                <span>Pasta do Google Drive</span>
                              ) : (
                                <>
                                  <span>{isGoogleSheet ? 'Planilha Google' : 'Planilha Local'}</span>
                                  {sizeKB && <span>• {sizeKB} KB</span>}
                                  {formattedDate && (
                                    <>
                                      <span>•</span>
                                      <Clock className="h-3 w-3 shrink-0 inline-block text-slate-300" />
                                      <span>Modificado em {formattedDate}</span>
                                    </>
                                  )}
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Hover Action Badge */}
                        <div className="shrink-0 pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shadow-4xs ${
                            isFolder 
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/30' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100/30'
                          }`}>
                            {isFolder ? 'Abrir' : 'Importar'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer / Error Row */}
              {error && (
                <div className="px-6 py-3 bg-rose-50 border-t border-rose-100 flex items-center space-x-2 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
