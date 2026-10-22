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
  CloudLightning,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { 
  googleSignIn, 
  logoutUser, 
  listDriveFiles, 
  downloadDriveFile, 
  DriveItem, 
  getAccessToken,
  findFolderByName
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
  const [resolvedFolderId, setResolvedFolderId] = useState<string>('1G3RFb6-J8GBj05oTYuEJIfXwW5ARkpy8');
  const [hasResolved, setHasResolved] = useState(false);
  
  // Navigation stack (initially contains Root and the project folder to allow backward navigation)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Meu Drive' },
    { id: '1G3RFb6-J8GBj05oTYuEJIfXwW5ARkpy8', name: 'Ativos Lansweeper (Pasta Compartilhada)' }
  ]);

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;

  // Sync state with current token and reset navigation on open
  useEffect(() => {
    if (isOpen) {
      const currentToken = getAccessToken();
      setToken(currentToken);
      if (currentToken && !user) {
        // If we have a token but user isn't set, try setting from firebase auth state
        import('../utils/firebase').then(({ auth }) => {
          if (auth.currentUser) {
            setUser(auth.currentUser);
          }
        });
      }
      // Open directly in the shared project folder by default
      setBreadcrumbs([
        { id: 'root', name: 'Meu Drive' },
        { id: '1G3RFb6-J8GBj05oTYuEJIfXwW5ARkpy8', name: 'Ativos Lansweeper (Pasta Compartilhada)' }
      ]);
      setResolvedFolderId('1G3RFb6-J8GBj05oTYuEJIfXwW5ARkpy8');
      setHasResolved(false);
      setSearchQuery('');
      setError(null);
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
      if (!hasResolved && folderId === '1G3RFb6-J8GBj05oTYuEJIfXwW5ARkpy8' && token) {
        setHasResolved(true);
        try {
          const foundId = await findFolderByName('Ativos Lansweeper (Pasta Compartilhada)');
          if (foundId && foundId !== '1G3RFb6-J8GBj05oTYuEJIfXwW5ARkpy8') {
            setResolvedFolderId(foundId);
            setBreadcrumbs([
              { id: 'root', name: 'Meu Drive' },
              { id: foundId, name: 'Ativos Lansweeper (Pasta Compartilhada)' }
            ]);
            targetFolderId = foundId;
          }
        } catch (err) {
          console.warn('Erro ao buscar ID dinâmico da pasta, usando ID padrão:', err);
        }
      }

      const files = await listDriveFiles(targetFolderId);
      setItems(files);
    } catch (err: any) {
      console.error(err);
      if (folderId === '1G3RFb6-J8GBj05oTYuEJIfXwW5ARkpy8' || folderId === resolvedFolderId) {
        setError(
          'Não foi possível acessar a pasta compartilhada "Ativos Lansweeper (Pasta Compartilhada)". Exibindo a raiz do seu Google Drive...'
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
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha na autenticação do Google.');
    } finally {
      setIsLoading(false);
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
      <div className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] z-10 animate-in zoom-in-95 duration-200">
        
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
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Panel */}
        <div className="flex-1 flex flex-col min-h-0">
          {!token ? (
            /* Login Request View */
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-5 my-12">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-3xs">
                <Lock className="h-8 w-8 animate-pulse" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h4 className="text-sm font-bold text-slate-800">
                  Conexão com Google Drive Requerida
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Para navegar entre as pastas de forma segura e ler os relatórios diretamente do seu Google Drive, precisamos de sua autorização de leitura.
                </p>
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
                  <span className="gsi-material-button-contents">Conectar Google Drive</span>
                </div>
              </button>

              {error && (
                <div className="flex items-center space-x-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
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
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-all mr-1.5 border border-transparent hover:border-slate-100 shadow-3xs bg-transparent shrink-0"
                      title="Voltar pasta"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}

                  {breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.id}>
                      {idx > 0 && <span className="text-slate-300 mx-1">/</span>}
                      <button
                        onClick={() => handleBreadcrumbClick(idx)}
                        disabled={idx === breadcrumbs.length - 1}
                        className={`hover:text-indigo-600 transition-colors py-0.5 px-1.5 rounded-md ${
                          idx === breadcrumbs.length - 1 
                            ? 'font-bold text-indigo-950 pointer-events-none' 
                            : 'hover:bg-white border border-transparent hover:border-slate-100 shadow-4xs'
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {/* Search / Filtering Input */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome de arquivo ou pasta..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-4xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Items List View */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[200px] max-h-[380px]">
                {isLoading ? (
                  /* Loading Folders State */
                  <div className="flex flex-col items-center justify-center space-y-3 py-16 text-slate-400">
                    <RefreshCw className="h-7 w-7 animate-spin text-indigo-600" />
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
                      Não encontramos subpastas ou arquivos compatíveis (.xlsx, .xls, .csv ou Planilhas Google) correspondentes.
                    </p>
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
