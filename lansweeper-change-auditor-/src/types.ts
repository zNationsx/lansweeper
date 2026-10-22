export interface LansweeperAsset {
  AssetName: string;
  AssetType?: string;
  Domain?: string;
  OS?: string;
  Model?: string;
  Manufacturer?: string;
  IPAddress?: string;
  IPLocation?: string;
  MACAddress?: string;
  OU?: string;
  State?: string;
  'Created at'?: string;
  'Last successful scan'?: string;
  'Last scan attempt'?: string;
  Description?: string;
  PurchaseDate?: string;
  Warrantydate?: string;
  FQDN?: string;
  DNSName?: string;
  Location?: string;
  Contact?: string;
  Serialnumber?: string;
  'Tipo de Ativo'?: string;
  'Proprietário do Ativo'?: string;
  Criticidade?: string;
  Lamina?: string;
}

export type AssetStatus = 'Entrou' | 'Saiu';

export interface ComparisonResult {
  diaAtualAssets: LansweeperAsset[];
  diaAnteriorAssets: LansweeperAsset[];
  entraram: LansweeperAsset[];
  sairam: LansweeperAsset[];
  diaAtualDateStr: string; // dd/mm/yyyy
  diaAnteriorDateStr: string; // dd/mm/yyyy
  diaAtualFileName: string;
  diaAnteriorFileName: string;
}
