import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Google OAuth provider with requested Drive & Sheets read-only scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');

// Keep access token cached in-memory and localStorage
let cachedAccessToken: string | null = localStorage.getItem('google_drive_access_token');
let isSigningIn = false;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        const storedToken = localStorage.getItem('google_drive_access_token');
        if (storedToken) {
          cachedAccessToken = storedToken;
          if (onAuthSuccess) onAuthSuccess(user, storedToken);
        } else {
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('google_drive_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso do Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    localStorage.setItem('google_drive_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro no login do Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Log out
export const logoutUser = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('google_drive_access_token');
};

// Get current cached token
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Define interface for Drive items
export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
}

/**
 * Lists files and folders inside a given Google Drive directory
 */
export const listDriveFiles = async (folderId: string = 'root'): Promise<DriveItem[]> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Usuário não autenticado. Efetue login com o Google.');
  }

  // Filter for:
  // - Folders (mimeType = 'application/vnd.google-apps.folder')
  // - Excel files (.xlsx, .xls)
  // - CSV files (.csv)
  // - Google Sheets (mimeType = 'application/vnd.google-apps.spreadsheet')
  const q = `'${folderId}' in parents and trashed = false and (mimeType = 'application/vnd.google-apps.folder' or mimeType = 'application/vnd.google-apps.spreadsheet' or name contains '.xlsx' or name contains '.xls' or name contains '.csv')`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime)&pageSize=100&orderBy=folder,name`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null; // Token expired
      localStorage.removeItem('google_drive_access_token');
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Erro ao listar arquivos do Google Drive.');
  }

  const data = await response.json();
  return data.files || [];
};

/**
 * Downloads a Google Drive file as ArrayBuffer.
 * For native Google Sheets, exports it to Excel first.
 */
export const downloadDriveFile = async (fileId: string, mimeType: string): Promise<{ arrayBuffer: ArrayBuffer; name: string }> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Usuário não autenticado.');
  }

  // 1. Get file metadata (specifically the original name if exporting)
  const metaUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let fileName = 'drive_file.xlsx';
  if (metaRes.ok) {
    const meta = await metaRes.json();
    fileName = meta.name;
  }

  let downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  
  // If native Google Sheet, export as Excel (.xlsx)
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
    if (!fileName.endsWith('.xlsx')) {
      fileName += '.xlsx';
    }
  }

  const response = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      localStorage.removeItem('google_drive_access_token');
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Falha ao baixar arquivo do Google Drive.');
  }

  const arrayBuffer = await response.arrayBuffer();
  return { arrayBuffer, name: fileName };
};

/**
 * Searches for a folder by name in the user's Google Drive.
 */
export const findFolderByName = async (name: string): Promise<string | null> => {
  const token = getAccessToken();
  if (!token) return null;

  // Search for folder with name, not trashed, and is of type folder
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${name.replace(/'/g, "\\'")}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  } catch (error) {
    console.error('Error finding folder by name:', error);
  }
  return null;
};

