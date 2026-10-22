import ExcelJS from 'exceljs';
import { LansweeperAsset } from '../types';

const REPORT_HEADERS_ENTROU = [
  'Entrou', 'AssetType', 'Domain', 'OS', 'Model', 'IPAddress', 'IPLocation', 'MACAddress'
];

const REPORT_HEADERS_SAIU = [
  'Saiu', 'AssetType', 'Domain', 'OS', 'Model', 'IPAddress', 'IPLocation', 'MACAddress'
];

const WARNING_HEADERS = [
  'Ativo', 'Tipo', 'Domínio', 'Sistema Operacional', 'Modelo', 'Endereço IP', 'Localização IP', 'Endereço MAC'
];

const DATA_KEYS = [
  'AssetName', 'AssetType', 'Domain', 'OS', 'Model', 'IPAddress', 'IPLocation', 'MACAddress'
];

/**
 * Converts a DD/MM/YYYY string to DD_MM_YY
 */
function formatDateToShort(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parts[0];
    const month = parts[1];
    const year = parts[2].substring(2); // last two digits
    return `${day}_${month}_${year}`;
  }
  return dateStr.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Dynamically adjusts column widths based on cell text lengths in header and data rows,
 * preventing truncated text while avoiding excessively large gaps.
 */
function adjustDynamicColumnWidths(
  ws: ExcelJS.Worksheet,
  colConfigs: { colIndex: number; minWidth?: number }[],
  contentRows: number[]
) {
  for (const { colIndex, minWidth = 10 } of colConfigs) {
    let maxLen = 0;
    for (const r of contentRows) {
      const cell = ws.getCell(r, colIndex);
      if (cell.value !== null && cell.value !== undefined) {
        const valStr = String(cell.value).trim();
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      }
    }
    // +3 characters padding for clean breathing room without large gaps
    ws.getColumn(colIndex).width = Math.max(minWidth, maxLen + 3);
  }
}

interface ExportParams {
  diaAtualAssets: LansweeperAsset[];
  diaAnteriorAssets: LansweeperAsset[];
  filteredEntraram: LansweeperAsset[];
  filteredSairam: LansweeperAsset[];
  diaAtualDateStr: string;
  diaAnteriorDateStr: string;
  responsavel: string;
}

export async function exportToLansweeperExcel({
  filteredEntraram,
  filteredSairam,
  diaAtualDateStr,
  diaAnteriorDateStr,
  responsavel
}: ExportParams): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Lansweeper Comparator';
  workbook.lastModifiedBy = 'Lansweeper Comparator';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Color Palette Constants
  const TEXT_DARK_SLATE = '1E293B'; // slate-800
  const TEXT_MUTED_SLATE = '475569'; // slate-600
  const EMERALD_GREEN = '059669'; // emerald-600
  const ROSE_RED = 'E11D48'; // rose-600
  const AMBER_ORANGE = 'D97706'; // amber-600
  const LIGHT_GREY_BG = 'F1F5F9'; // slate-100 for default headers

  // Full crisp borders
  const thinBlack = { style: 'thin', color: { argb: '000000' } } as ExcelJS.Border;

  const tableCellBorders: Partial<ExcelJS.Borders> = {
    top: thinBlack,
    bottom: thinBlack,
    left: thinBlack,
    right: thinBlack
  };

  const tableHeaderBorders: Partial<ExcelJS.Borders> = {
    top: thinBlack,
    bottom: thinBlack,
    left: thinBlack,
    right: thinBlack
  };

  // -------------------------------------------------------------------------
  // SHEET 1: RELATÓRIO DE MOVIMENTAÇÃO
  // -------------------------------------------------------------------------
  const wsReport = workbook.addWorksheet('Relatório de Movimentação');
  wsReport.views = [{ showGridLines: false }];

  // Column A is left free before the report (starts at column B)
  wsReport.getColumn(1).width = 4;

  // Track rows that contain individual column content for dynamic width calculation
  const sheet1ContentRows: number[] = [];

  // Row 1: empty space
  wsReport.getRow(1).height = 10;

  // 1. Branding & Header block (Rows 2 to 4, Columns B to J: 2 to 10)
  wsReport.getRow(2).height = 24;
  wsReport.getRow(3).height = 18;
  wsReport.getRow(4).height = 18;

  // Left side info (B2:C2, B3:C3, B4:C4)
  wsReport.mergeCells(2, 2, 2, 3); // B2:C2
  const cellBrand = wsReport.getCell(2, 2);
  cellBrand.value = 'Lansweeper';
  cellBrand.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FA5F0C' } };
  cellBrand.alignment = { vertical: 'middle', horizontal: 'left' };

  wsReport.mergeCells(3, 2, 3, 3); // B3:C3
  const cellPeriod = wsReport.getCell(3, 2);
  cellPeriod.value = `Periodo: ${diaAnteriorDateStr} a ${diaAtualDateStr}`;
  cellPeriod.font = { name: 'Segoe UI', size: 9.5, bold: false, color: { argb: TEXT_DARK_SLATE } };
  cellPeriod.alignment = { vertical: 'middle', horizontal: 'left' };

  wsReport.mergeCells(4, 2, 4, 3); // B4:C4
  const cellResp = wsReport.getCell(4, 2);
  cellResp.value = `Responsável: ${responsavel.toUpperCase()}`;
  cellResp.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: '2563EB' } };
  cellResp.alignment = { vertical: 'middle', horizontal: 'left' };

  // Right side info (D2:I2, D3:I4)
  wsReport.mergeCells(2, 4, 2, 9); // D2:I2
  const cellTitle = wsReport.getCell(2, 4);
  cellTitle.value = 'Alupar Brasil - Movimentação Diária de Ativos';
  cellTitle.font = { name: 'Segoe UI', size: 12.5, bold: true, color: { argb: '0F172A' } };
  cellTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  wsReport.mergeCells(3, 4, 4, 9); // D3:I4
  const cellSub = wsReport.getCell(3, 4);
  cellSub.value = 'Identificação de conexões e desconexões na rede.';
  cellSub.font = { name: 'Segoe UI', size: 9.5, color: { argb: '64748B' } };
  cellSub.alignment = { horizontal: 'center', vertical: 'middle' };

  // Apply complete borders and system card background around and inside the B2:I4 header box
  for (let r = 2; r <= 4; r++) {
    for (let c = 2; c <= 9; c++) {
      const cell = wsReport.getCell(r, c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F8FAFC' }
      };
      const cellBorder: Partial<ExcelJS.Borders> = {};

      // Outer perimeter
      if (r === 2) cellBorder.top = thinBlack;
      if (r === 4) cellBorder.bottom = thinBlack;
      if (c === 2) cellBorder.left = thinBlack;
      if (c === 9) cellBorder.right = thinBlack;

      // Divider between left block (cols B-C) and right block (cols D-I)
      if (c === 3) cellBorder.right = thinBlack;
      if (c === 4) cellBorder.left = thinBlack;

      // Dividers between rows in the left block
      if (c <= 3) {
        if (r === 2) cellBorder.bottom = thinBlack;
        if (r === 3) {
          cellBorder.top = thinBlack;
          cellBorder.bottom = thinBlack;
        }
        if (r === 4) cellBorder.top = thinBlack;
      }

      // Divider between top and bottom in right block (row 2 vs row 3)
      if (c >= 4) {
        if (r === 2) cellBorder.bottom = thinBlack;
        if (r === 3) cellBorder.top = thinBlack;
      }

      cell.border = cellBorder as ExcelJS.Borders;
    }
  }

  // Row 5: Blank row merged from B5 to I5
  wsReport.mergeCells(5, 2, 5, 9);
  wsReport.getRow(5).height = 16;
  for (let c = 2; c <= 9; c++) {
    const cell = wsReport.getCell(5, c);
    cell.value = '';
    cell.border = {
      top: thinBlack,
      bottom: thinBlack,
      left: c === 2 ? thinBlack : undefined,
      right: c === 9 ? thinBlack : undefined
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF' }
    };
  }

  let currentRowNum = 6;

  // -------------------------------------------------------------------------
  // SECTION 1: ATIVOS CONECTADOS (NOVOS INGRESSOS)
  // -------------------------------------------------------------------------
  wsReport.mergeCells(currentRowNum, 2, currentRowNum, 9);
  const rowSec1 = wsReport.getRow(currentRowNum);
  rowSec1.height = 20;
  const cellSec1 = wsReport.getCell(currentRowNum, 2);
  cellSec1.value = '● ATIVOS CONECTADOS (NOVOS INGRESSOS)';
  cellSec1.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '047857' } }; // emerald-700
  cellSec1.alignment = { vertical: 'middle', horizontal: 'left' };

  for (let c = 2; c <= 9; c++) {
    const cell = wsReport.getCell(currentRowNum, c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF' }
    };
    cell.border = {
      top: thinBlack,
      bottom: thinBlack,
      left: c === 2 ? thinBlack : undefined,
      right: c === 9 ? thinBlack : undefined
    };
  }

  currentRowNum++;

  // Table 1 Headers (Row 7)
  const headerRow1Num = currentRowNum;
  sheet1ContentRows.push(headerRow1Num);
  const rowH1 = wsReport.getRow(headerRow1Num);
  rowH1.height = 20;

  REPORT_HEADERS_ENTROU.forEach((headerText, i) => {
    const colIndex = i + 2; // Col B is 2, Col J is 10
    const cell = rowH1.getCell(colIndex);
    cell.value = headerText;
    cell.font = {
      name: 'Segoe UI',
      size: 10,
      bold: true,
      color: { argb: i === 0 ? 'FFFFFF' : TEXT_DARK_SLATE }
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: i === 0 ? EMERALD_GREEN : LIGHT_GREY_BG }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: i === 0 ? 'center' : 'left'
    };
    cell.border = tableHeaderBorders;
  });

  currentRowNum++;

  // Table 1 Data Rows
  if (filteredEntraram.length > 0) {
    filteredEntraram.forEach((asset, idx) => {
      sheet1ContentRows.push(currentRowNum);
      const row = wsReport.getRow(currentRowNum);
      row.height = 16;

      const isEven = idx % 2 === 1;
      const rowBgColor = isEven ? 'F8FAFC' : 'FFFFFF';

      DATA_KEYS.forEach((key, kIdx) => {
        const colIndex = kIdx + 2;
        const cell = row.getCell(colIndex);
        cell.value = asset[key as keyof LansweeperAsset] ?? '—';

        // Base font size 10
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: TEXT_MUTED_SLATE } };

        // Left alignment for all data
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left'
        };

        cell.border = tableCellBorders;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBgColor }
        };

        // Specific column styling
        if (colIndex === 2) {
          // AssetName (Col B)
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: TEXT_DARK_SLATE } };
        } else if (colIndex === 4) {
          // Domain (Col D): non-Alupar highlighted with red bold font, no background fill
          const domainVal = String(cell.value || '').trim();
          const isNonAlupar = domainVal && domainVal !== '—' && domainVal.toUpperCase() !== 'ALUPAR';
          if (isNonAlupar) {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'B91C1C' } };
          }
        } else if (colIndex === 7 || colIndex === 9) {
          // IPAddress (Col G) & MACAddress (Col I)
          cell.font = { name: 'Consolas', size: 10, color: { argb: '334155' } };
        }
      });

      currentRowNum++;
    });
  } else {
    // Empty connected assets row
    const rowEmpty = wsReport.getRow(currentRowNum);
    rowEmpty.height = 16;
    wsReport.mergeCells(currentRowNum, 2, currentRowNum, 9);
    const cellEmpty = wsReport.getCell(currentRowNum, 2);
    cellEmpty.value = 'Nenhum ativo "Entrou" correspondente aos filtros de busca.';
    cellEmpty.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: '64748B' } };
    cellEmpty.alignment = { vertical: 'middle', horizontal: 'center' };
    cellEmpty.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F8FAFC' }
    };

    for (let c = 2; c <= 9; c++) {
      const cell = rowEmpty.getCell(c);
      cell.border = tableCellBorders;
    }
    currentRowNum++;
  }

  // Merged empty line after Table 1
  wsReport.mergeCells(currentRowNum, 2, currentRowNum, 9);
  wsReport.getRow(currentRowNum).height = 16;
  for (let c = 2; c <= 9; c++) {
    const cell = wsReport.getCell(currentRowNum, c);
    cell.value = '';
    cell.border = {
      top: thinBlack,
      bottom: thinBlack,
      left: c === 2 ? thinBlack : undefined,
      right: c === 9 ? thinBlack : undefined
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF' }
    };
  }
  currentRowNum++;

  // -------------------------------------------------------------------------
  // SECTION 2: ATIVOS DESCONECTADOS (SAÍRAM DA REDE)
  // -------------------------------------------------------------------------
  wsReport.mergeCells(currentRowNum, 2, currentRowNum, 9);
  const rowSec2 = wsReport.getRow(currentRowNum);
  rowSec2.height = 20;
  const cellSec2 = wsReport.getCell(currentRowNum, 2);
  cellSec2.value = '● ATIVOS DESCONECTADOS (SAÍRAM DA REDE)';
  cellSec2.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'BE123C' } }; // rose-700
  cellSec2.alignment = { vertical: 'middle', horizontal: 'left' };

  for (let c = 2; c <= 9; c++) {
    const cell = wsReport.getCell(currentRowNum, c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF' }
    };
    cell.border = {
      top: thinBlack,
      bottom: thinBlack,
      left: c === 2 ? thinBlack : undefined,
      right: c === 9 ? thinBlack : undefined
    };
  }

  currentRowNum++;

  // Table 2 Headers
  const headerRow2Num = currentRowNum;
  sheet1ContentRows.push(headerRow2Num);
  const rowH2 = wsReport.getRow(headerRow2Num);
  rowH2.height = 20;

  REPORT_HEADERS_SAIU.forEach((headerText, i) => {
    const colIndex = i + 2;
    const cell = rowH2.getCell(colIndex);
    cell.value = headerText;
    cell.font = {
      name: 'Segoe UI',
      size: 10,
      bold: true,
      color: { argb: i === 0 ? 'FFFFFF' : TEXT_DARK_SLATE }
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: i === 0 ? ROSE_RED : LIGHT_GREY_BG }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: i === 0 ? 'center' : 'left'
    };
    cell.border = tableHeaderBorders;
  });

  currentRowNum++;

  // Table 2 Data Rows
  if (filteredSairam.length > 0) {
    filteredSairam.forEach((asset, idx) => {
      sheet1ContentRows.push(currentRowNum);
      const row = wsReport.getRow(currentRowNum);
      row.height = 16;

      const isEven = idx % 2 === 1;
      const rowBgColor = isEven ? 'F8FAFC' : 'FFFFFF';

      DATA_KEYS.forEach((key, kIdx) => {
        const colIndex = kIdx + 2;
        const cell = row.getCell(colIndex);
        cell.value = asset[key as keyof LansweeperAsset] ?? '—';

        cell.font = { name: 'Segoe UI', size: 10, color: { argb: TEXT_MUTED_SLATE } };

        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left'
        };

        cell.border = tableCellBorders;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBgColor }
        };

        if (colIndex === 2) {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: TEXT_DARK_SLATE } };
        } else if (colIndex === 4) {
          const domainVal = String(cell.value || '').trim();
          const isNonAlupar = domainVal && domainVal !== '—' && domainVal.toUpperCase() !== 'ALUPAR';
          if (isNonAlupar) {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'B91C1C' } };
          }
        } else if (colIndex === 7 || colIndex === 9) {
          cell.font = { name: 'Consolas', size: 10, color: { argb: '334155' } };
        }
      });

      currentRowNum++;
    });
  } else {
    const rowEmpty = wsReport.getRow(currentRowNum);
    rowEmpty.height = 16;
    wsReport.mergeCells(currentRowNum, 2, currentRowNum, 9);
    const cellEmpty = wsReport.getCell(currentRowNum, 2);
    cellEmpty.value = 'Nenhum ativo "Saiu" correspondente aos filtros de busca.';
    cellEmpty.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: '64748B' } };
    cellEmpty.alignment = { vertical: 'middle', horizontal: 'center' };
    cellEmpty.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F8FAFC' }
    };

    for (let c = 2; c <= 9; c++) {
      const cell = rowEmpty.getCell(c);
      cell.border = tableCellBorders;
    }
    currentRowNum++;
  }

  // Merged empty line at the end of Table 2
  wsReport.mergeCells(currentRowNum, 2, currentRowNum, 9);
  wsReport.getRow(currentRowNum).height = 16;
  for (let c = 2; c <= 9; c++) {
    const cell = wsReport.getCell(currentRowNum, c);
    cell.value = '';
    cell.border = {
      top: thinBlack,
      bottom: thinBlack,
      left: c === 2 ? thinBlack : undefined,
      right: c === 9 ? thinBlack : undefined
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF' }
    };
  }
  currentRowNum++;

  // Apply complete outer perimeter border for Sheet 1
  const lastReportRow = currentRowNum - 1;
  for (let r = 2; r <= lastReportRow; r++) {
    const leftCell = wsReport.getCell(r, 2);
    leftCell.border = { ...leftCell.border, left: thinBlack };

    const rightCell = wsReport.getCell(r, 9);
    rightCell.border = { ...rightCell.border, right: thinBlack };
  }
  for (let c = 2; c <= 9; c++) {
    const topCell = wsReport.getCell(2, c);
    topCell.border = { ...topCell.border, top: thinBlack };

    const bottomCell = wsReport.getCell(lastReportRow, c);
    bottomCell.border = { ...bottomCell.border, bottom: thinBlack };
  }

  // Adjust dynamic column widths for columns B to I in Sheet 1
  adjustDynamicColumnWidths(
    wsReport,
    [
      { colIndex: 2, minWidth: 12 }, // Entrou / Saiu
      { colIndex: 3, minWidth: 11 }, // AssetType
      { colIndex: 4, minWidth: 11 }, // Domain
      { colIndex: 5, minWidth: 8 },  // OS
      { colIndex: 6, minWidth: 12 }, // Model
      { colIndex: 7, minWidth: 14 }, // IPAddress
      { colIndex: 8, minWidth: 16 }, // IPLocation
      { colIndex: 9, minWidth: 15 }  // MACAddress
    ],
    sheet1ContentRows
  );

  // Two empty columns after the table (J and K)
  wsReport.getColumn(10).width = 6;
  wsReport.getColumn(11).width = 6;

  // Two empty rows after the table
  wsReport.getRow(currentRowNum).height = 16;
  wsReport.getRow(currentRowNum + 1).height = 16;

  // -------------------------------------------------------------------------
  // SHEET 2: SEGURANÇA DE DOMÍNIO (Created only if there are non-Alupar domain assets!)
  // -------------------------------------------------------------------------
  const warningAssets = filteredEntraram.filter((asset) => {
    const d = asset.Domain?.trim();
    return d && d !== '—' && d.toUpperCase() !== 'ALUPAR';
  });

  if (warningAssets.length > 0) {
    const wsAlert = workbook.addWorksheet('Segurança de Domínio');
    wsAlert.views = [{ showGridLines: false }];

    // Column A is left free before the report (starts at column B)
    wsAlert.getColumn(1).width = 4;

    const sheet2ContentRows: number[] = [];

    // Row 1: empty space
    wsAlert.getRow(1).height = 10;

    // Header heights: rows 2 to 4
    wsAlert.getRow(2).height = 18;
    wsAlert.getRow(3).height = 18;
    wsAlert.getRow(4).height = 18;

    // 1. Merged B2 to B4: Alert Symbol
    wsAlert.mergeCells(2, 2, 4, 2); // B2:B4
    const cellWarnIcon = wsAlert.getCell(2, 2);
    cellWarnIcon.value = '⚠';
    cellWarnIcon.font = { name: 'Segoe UI', size: 24, bold: true, color: { argb: AMBER_ORANGE } };
    cellWarnIcon.alignment = { vertical: 'middle', horizontal: 'center' };
    cellWarnIcon.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF' }
    };
    for (let r = 2; r <= 4; r++) {
      const cell = wsAlert.getCell(r, 2);
      cell.border = {
        top: r === 2 ? thinBlack : undefined,
        bottom: r === 4 ? thinBlack : undefined,
        left: thinBlack,
        right: thinBlack
      };
    }

    // 2. Merged C2 to G3: Text "Atenção: Ativos fora do domínio Alupar!"
    wsAlert.mergeCells(2, 3, 3, 7); // C2:G3
    const cellWarnTitle = wsAlert.getCell(2, 3);
    cellWarnTitle.value = 'Atenção: Ativos fora do domínio Alupar!';
    cellWarnTitle.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'B45309' } };
    cellWarnTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    cellWarnTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF' }
    };
    for (let r = 2; r <= 3; r++) {
      for (let c = 3; c <= 7; c++) {
        const cell = wsAlert.getCell(r, c);
        cell.border = {
          top: r === 2 ? thinBlack : undefined,
          bottom: r === 3 ? thinBlack : undefined,
          left: c === 3 ? thinBlack : undefined,
          right: c === 7 ? thinBlack : undefined
        };
      }
    }

    // 3. Merged H2 to I4: Text "SEGURANÇA DE DOMÍNIO"
    wsAlert.mergeCells(2, 8, 4, 9); // H2:I4
    const cellBadge = wsAlert.getCell(2, 8);
    cellBadge.value = 'SEGURANÇA DE DOMÍNIO';
    cellBadge.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'B45309' } };
    cellBadge.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let r = 2; r <= 4; r++) {
      for (let c = 8; c <= 9; c++) {
        const cell = wsAlert.getCell(r, c);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FEF3C7' } // Light amber background
        };
        cell.border = {
          top: r === 2 ? thinBlack : undefined,
          bottom: r === 4 ? thinBlack : undefined,
          left: c === 8 ? thinBlack : undefined,
          right: c === 9 ? thinBlack : undefined
        };
      }
    }

    // 4. Merged C4 to G4: Subtitle Text
    wsAlert.mergeCells(4, 3, 4, 7); // C4:G4
    const cellWarnSub = wsAlert.getCell(4, 3);
    cellWarnSub.value = 'Ativos recém-identificados na rede Alupar Brasil configurados fora do domínio corporativo padrão (ALUPAR).';
    cellWarnSub.font = { name: 'Segoe UI', size: 9.5, color: { argb: TEXT_MUTED_SLATE } };
    cellWarnSub.alignment = { vertical: 'middle', horizontal: 'center' };
    cellWarnSub.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF' }
    };
    for (let c = 3; c <= 7; c++) {
      const cell = wsAlert.getCell(4, c);
      cell.border = {
        top: thinBlack,
        bottom: thinBlack,
        left: c === 3 ? thinBlack : undefined,
        right: c === 7 ? thinBlack : undefined
      };
    }

    // Row 5: Empty line merged from B5 to I5
    wsAlert.mergeCells(5, 2, 5, 9);
    wsAlert.getRow(5).height = 16;
    for (let c = 2; c <= 9; c++) {
      const cell = wsAlert.getCell(5, c);
      cell.value = '';
      cell.border = {
        top: thinBlack,
        bottom: thinBlack,
        left: c === 2 ? thinBlack : undefined,
        right: c === 9 ? thinBlack : undefined
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF' }
      };
    }

    // Row 6: Table Headers (Ativo, Tipo, Domínio, Sistema Operacional, etc.)
    let currentAlertRow = 6;
    sheet2ContentRows.push(currentAlertRow);
    const rowHAlert = wsAlert.getRow(currentAlertRow);
    rowHAlert.height = 20;

    WARNING_HEADERS.forEach((headerText, i) => {
      const colIndex = i + 2;
      const cell = rowHAlert.getCell(colIndex);
      cell.value = headerText;
      cell.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: i === 0 ? 'FFFFFF' : TEXT_DARK_SLATE }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: i === 0 ? AMBER_ORANGE : LIGHT_GREY_BG }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: i === 0 ? 'center' : 'left'
      };
      cell.border = tableHeaderBorders;
    });

    currentAlertRow++;

    // Warning Assets Data Rows (Row 7 onwards)
    warningAssets.forEach((asset, idx) => {
      sheet2ContentRows.push(currentAlertRow);
      const row = wsAlert.getRow(currentAlertRow);
      row.height = 16;

      const isEven = idx % 2 === 1;
      const rowBgColor = isEven ? 'F8FAFC' : 'FFFFFF';

      DATA_KEYS.forEach((key, kIdx) => {
        const colIndex = kIdx + 2;
        const cell = row.getCell(colIndex);
        cell.value = asset[key as keyof LansweeperAsset] ?? '—';

        cell.font = { name: 'Segoe UI', size: 10, color: { argb: TEXT_MUTED_SLATE } };

        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left'
        };

        cell.border = tableCellBorders;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBgColor }
        };

        if (colIndex === 2) {
          // Ativo (Col B)
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: TEXT_DARK_SLATE } };
        } else if (colIndex === 4) {
          // Domínio (Col D) non-Alupar (WORKGROUP etc): red bold font, no background fill
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'B91C1C' } };
        } else if (colIndex === 7 || colIndex === 9) {
          cell.font = { name: 'Consolas', size: 10, color: { argb: '334155' } };
        }
      });

      currentAlertRow++;
    });

    // Merged empty line at the end of the warning table (e.g. B8 to I8)
    wsAlert.mergeCells(currentAlertRow, 2, currentAlertRow, 9);
    wsAlert.getRow(currentAlertRow).height = 16;
    for (let c = 2; c <= 9; c++) {
      const cell = wsAlert.getCell(currentAlertRow, c);
      cell.value = '';
      cell.border = {
        top: thinBlack,
        bottom: thinBlack,
        left: c === 2 ? thinBlack : undefined,
        right: c === 9 ? thinBlack : undefined
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF' }
      };
    }
    currentAlertRow++;

    // Outer perimeter border for Sheet 2
    const lastAlertRow = currentAlertRow - 1;
    for (let r = 2; r <= lastAlertRow; r++) {
      const leftCell = wsAlert.getCell(r, 2);
      leftCell.border = { ...leftCell.border, left: thinBlack };

      const rightCell = wsAlert.getCell(r, 9);
      rightCell.border = { ...rightCell.border, right: thinBlack };
    }
    for (let c = 2; c <= 9; c++) {
      const topCell = wsAlert.getCell(2, c);
      topCell.border = { ...topCell.border, top: thinBlack };

      const bottomCell = wsAlert.getCell(lastAlertRow, c);
      bottomCell.border = { ...bottomCell.border, bottom: thinBlack };
    }

    // Adjust dynamic column widths for columns B to I in Sheet 2
    adjustDynamicColumnWidths(
      wsAlert,
      [
        { colIndex: 2, minWidth: 12 }, // Ativo
        { colIndex: 3, minWidth: 11 }, // Tipo
        { colIndex: 4, minWidth: 11 }, // Domínio
        { colIndex: 5, minWidth: 19 }, // Sistema Operacional
        { colIndex: 6, minWidth: 12 }, // Modelo
        { colIndex: 7, minWidth: 14 }, // Endereço IP
        { colIndex: 8, minWidth: 16 }, // Localização IP
        { colIndex: 9, minWidth: 15 }  // Endereço MAC
      ],
      sheet2ContentRows
    );

    // Two empty columns after the table (J and K)
    wsAlert.getColumn(10).width = 6;
    wsAlert.getColumn(11).width = 6;

    // Two empty rows after the table
    wsAlert.getRow(currentAlertRow).height = 16;
    wsAlert.getRow(currentAlertRow + 1).height = 16;
  }

  // ----------------------------------------------------
  // Write and Save as Excel File
  // ----------------------------------------------------
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  
  const shortDate = formatDateToShort(diaAtualDateStr);
  const fileName = `Relatorio_Movimentacao_${shortDate}.xlsx`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
