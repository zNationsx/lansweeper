import * as XLSX from 'xlsx';
import { LansweeperAsset } from '../types';

// Helper to normalize keys for flexible matching
const KEY_MAPPINGS: { [key: string]: keyof LansweeperAsset } = {
  assetname: 'AssetName',
  assettype: 'AssetType',
  domain: 'Domain',
  os: 'OS',
  model: 'Model',
  manufacturer: 'Manufacturer',
  ipaddress: 'IPAddress',
  iplocation: 'IPLocation',
  macaddress: 'MACAddress',
  ou: 'OU',
  state: 'State',
  createdat: 'Created at',
  lastsuccessfulscan: 'Last successful scan',
  lastscanattempt: 'Last scan attempt',
  description: 'Description',
  purchasedate: 'PurchaseDate',
  warrantydate: 'Warrantydate',
  fqdn: 'FQDN',
  dnsname: 'DNSName',
  location: 'Location',
  contact: 'Contact',
  serialnumber: 'Serialnumber',
  tipodeativo: 'Tipo de Ativo',
  proprietariodoativo: 'Proprietário do Ativo',
  criticidade: 'Criticidade',
  lamina: 'Lamina',
};

function normalizeKey(key: string): string {
  // Remove accents, spaces, underscores, dashes, and lowercase
  return key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '');
}

/**
 * Extracts a date from filename. Format returned: DD/MM/YYYY
 */
export function extractDateFromFilename(filename: string, fileLastModified?: number): string {
  // 1. Specific match for TodosAtivos_DD_MM_YY or TodosAtivos_DD_MM_YYYY
  const todosAtivosMatch = filename.match(/TodosAtivos_(\d{2})[-_.](\d{2})[-_.](\d{2,4})/i);
  if (todosAtivosMatch) {
    const d = todosAtivosMatch[1];
    const m = todosAtivosMatch[2];
    let y = todosAtivosMatch[3];
    if (y.length === 2) {
      y = '20' + y;
    }
    return `${d}/${m}/${y}`;
  }

  // 2. Generic check for DD-MM-YYYY or DD-MM-YY (using non-digits to bypass underscore/boundary issues)
  const ddmmyyOrYyyy = /(?:^|[^0-9])(\d{2})[-_.](\d{2})[-_.](\d{2,4})(?:[^0-9]|$)/;
  let match = filename.match(ddmmyyOrYyyy);
  if (match) {
    const d = match[1];
    const m = match[2];
    let y = match[3];
    if (y.length === 2) {
      y = '20' + y;
    }
    return `${d}/${m}/${y}`;
  }

  // 3. Generic check for YYYY-MM-DD
  const yyyymmdd = /(?:^|[^0-9])(\d{4})[-_.](\d{2})[-_.](\d{2})(?:[^0-9]|$)/;
  match = filename.match(yyyymmdd);
  if (match) {
    const y = match[1];
    const m = match[2];
    const d = match[3];
    return `${d}/${m}/${y}`;
  }

  // 4. Compact date (8 digits) like 20260709 or 09072026
  const compactDate = /(?:^|[^0-9])(\d{8})(?:[^0-9]|$)/;
  match = filename.match(compactDate);
  if (match) {
    const s = match[1];
    // Check if it starts with 20xx (YYYYMMDD) or ends with 20xx (DDMMYYYY)
    if (s.startsWith('20')) {
      const y = s.substring(0, 4);
      const m = s.substring(4, 6);
      const d = s.substring(6, 8);
      return `${d}/${m}/${y}`;
    } else {
      const d = s.substring(0, 2);
      const m = s.substring(2, 4);
      const y = s.substring(4, 8);
      return `${d}/${m}/${y}`;
    }
  }

  // Fallback to last modified date
  const dateObj = fileLastModified ? new Date(fileLastModified) : new Date();
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Parses an Excel or CSV file buffer and returns deduplicated Lansweeper Assets
 */
export async function parseLansweeperFile(
  file: File
): Promise<{ assets: LansweeperAsset[]; dateStr: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Find sheet named "Report" (case insensitive)
        let sheetName = workbook.SheetNames.find(
          (name) => name.toLowerCase() === 'report'
        );
        if (!sheetName) {
          // If "Report" is not found, fallback to the first sheet
          sheetName = workbook.SheetNames[0];
        }

        if (!sheetName) {
          throw new Error('Nenhuma planilha encontrada no arquivo.');
        }

        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];

        const mappedAssets: LansweeperAsset[] = [];
        const seenAssetNames = new Set<string>();

        for (const row of rawRows) {
          const asset: Partial<LansweeperAsset> = {};
          
          // Map each cell based on matching header keys
          for (const rawKey of Object.keys(row)) {
            const normalized = normalizeKey(rawKey);
            const standardKey = KEY_MAPPINGS[normalized];
            if (standardKey) {
              asset[standardKey] = String(row[rawKey] ?? '').trim();
            }
          }

          // Ensure AssetName exists
          if (asset.AssetName) {
            const lowerName = asset.AssetName.toLowerCase();
            // Case-insensitive deduplication, keeping only the first occurrence
            if (!seenAssetNames.has(lowerName)) {
              seenAssetNames.add(lowerName);
              mappedAssets.push(asset as LansweeperAsset);
            }
          }
        }

        const dateStr = extractDateFromFilename(file.name, file.lastModified);

        resolve({
          assets: mappedAssets,
          dateStr,
          fileName: file.name,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parses an Excel or CSV ArrayBuffer directly and returns deduplicated Lansweeper Assets
 */
export async function parseLansweeperArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileName: string
): Promise<{ assets: LansweeperAsset[]; dateStr: string; fileName: string }> {
  try {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });

    // Find sheet named "Report" (case insensitive)
    let sheetName = workbook.SheetNames.find(
      (name) => name.toLowerCase() === 'report'
    );
    if (!sheetName) {
      // If "Report" is not found, fallback to the first sheet
      sheetName = workbook.SheetNames[0];
    }

    if (!sheetName) {
      throw new Error('Nenhuma planilha encontrada no arquivo.');
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];

    const mappedAssets: LansweeperAsset[] = [];
    const seenAssetNames = new Set<string>();

    for (const row of rawRows) {
      const asset: Partial<LansweeperAsset> = {};
      
      // Map each cell based on matching header keys
      for (const rawKey of Object.keys(row)) {
        const normalized = normalizeKey(rawKey);
        const standardKey = KEY_MAPPINGS[normalized];
        if (standardKey) {
          asset[standardKey] = String(row[rawKey] ?? '').trim();
        }
      }

      // Ensure AssetName exists
      if (asset.AssetName) {
        const lowerName = asset.AssetName.toLowerCase();
        if (!seenAssetNames.has(lowerName)) {
          seenAssetNames.add(lowerName);
          mappedAssets.push(asset as LansweeperAsset);
        }
      }
    }

    const dateStr = extractDateFromFilename(fileName);

    return {
      assets: mappedAssets,
      dateStr,
      fileName,
    };
  } catch (err: any) {
    throw new Error(err?.message || 'Falha ao processar arquivo excel de buffer.');
  }
}

