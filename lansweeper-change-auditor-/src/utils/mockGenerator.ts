import { LansweeperAsset } from '../types';

export function generateMockAssets(): {
  diaAnterior: LansweeperAsset[];
  diaAtual: LansweeperAsset[];
} {
  // Common asset pools
  const manufacturers = ['Dell', 'Lenovo', 'HP', 'Cisco', 'VMware', 'Apple'];
  const systems = ['Windows 11', 'Windows 10', 'Windows Server 2022', 'RHEL 9', 'Cisco IOS', 'macOS Sonoma'];
  const locations = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Porto Alegre', 'Curitiba', 'Salvador'];

  // 30 base assets for Dia Anterior
  const diaAnterior: LansweeperAsset[] = [];
  for (let i = 1; i <= 30; i++) {
    const isServer = i % 5 === 0;
    const isNetwork = i % 8 === 0;
    const type = isServer ? 'Windows Server' : isNetwork ? 'Switch' : 'Workstation';
    const domain = i % 3 === 0 ? 'ALUPAR' : 'WORKGROUP';
    const mfg = manufacturers[i % manufacturers.length];
    
    let model = 'Latitude 3420';
    if (isServer) model = 'PowerEdge R750';
    else if (isNetwork) model = 'Catalyst 9300';
    else if (i % 2 === 0) model = 'OptiPlex 5000';

    diaAnterior.push({
      AssetName: `SRV-CORP-${1000 + i}`,
      AssetType: type,
      Domain: domain,
      OS: systems[i % systems.length],
      Model: model,
      Manufacturer: mfg,
      IPAddress: `192.168.233.${50 + i}`,
      IPLocation: locations[i % locations.length],
      MACAddress: `00:50:56:C0:00:${i.toString(16).toUpperCase().padStart(2, '0')}`,
      OU: 'OU=Servers,DC=corp,DC=alupar,DC=com',
      State: 'Active',
      'Created at': '2025-01-10 08:30:15',
      'Last successful scan': '2026-06-25 18:45:00',
      'Last scan attempt': '2026-06-25 18:45:00',
      Description: `Ativo de Rede Corp - ${model}`,
      PurchaseDate: '2025-01-10',
      Warrantydate: '2028-01-10',
      FQDN: `srv-corp-${1000 + i}.corp.alupar.com`,
      DNSName: `srv-corp-${1000 + i}`,
      Location: locations[i % locations.length],
      Contact: 'TI Corporativo',
      Serialnumber: `SN${987654 + i}`,
      'Tipo de Ativo': type,
      'Proprietário do Ativo': 'TI Infra',
      Criticidade: isServer ? 'Alta' : 'Média',
      Lamina: `Slot-${i % 4 + 1}`,
    });
  }

  // Dia Atual shares many assets, has some removed ("Saiu") and some new ("Entrou")
  const diaAtual: LansweeperAsset[] = [];
  
  // Keep assets 1 to 26 (removing assets 27, 28, 29, 30 -> these have "Saiu")
  for (let i = 1; i <= 26; i++) {
    diaAtual.push({ ...diaAnterior[i - 1] });
  }

  // Add 5 brand new assets (these will be categorized as "Entrou")
  const newAssetsData = [
    { name: 'SRV-CORP-1031', type: 'Workstation', mfg: 'Dell', model: 'OptiPlex 5000', ip: '192.168.233.101', mac: 'D0:94:66:E0:9B:6D', domain: 'ALUPAR', os: 'Windows 11', location: 'São Paulo' },
    { name: 'SRV-CORP-1032', type: 'Windows Server', mfg: 'HP', model: 'ProLiant DL380', ip: '192.168.233.102', mac: '00:09:0F:AA:00:02', domain: 'ALUPAR', os: 'Windows Server 2022', location: 'São Paulo' },
    { name: 'SRV-CORP-1033', type: 'Switch', mfg: 'Cisco', model: 'Nexus 9000', ip: '192.168.233.103', mac: 'CC:46:D6:1A:BC:02', domain: 'ALUPAR', os: 'Cisco IOS', location: 'São Paulo' },
    { name: 'SRV-CORP-1034', type: 'Workstation', mfg: 'Apple', model: 'MacBook Pro M3', ip: '192.168.233.104', mac: 'BC:D1:D3:45:EE:77', domain: 'ALUPAR', os: 'macOS Sonoma', location: 'São Paulo' },
    { name: 'NT-FELIPE', type: 'Windows', mfg: 'Fortinet, Inc.', model: 'Latitude 3420', ip: '192.168.251.32', mac: '00:09:0F:AA:00:01', domain: 'WORKGROUP', os: '—', location: 'ALUPAR - VPN CLIENT' },
  ];

  newAssetsData.forEach((item, index) => {
    const idNum = 31 + index;
    diaAtual.push({
      AssetName: item.name,
      AssetType: item.type,
      Domain: item.domain,
      OS: item.os,
      Model: item.model,
      Manufacturer: item.mfg,
      IPAddress: item.ip,
      IPLocation: item.location,
      MACAddress: item.mac,
      OU: item.domain === 'WORKGROUP' ? '—' : 'OU=Servers,DC=corp,DC=alupar,DC=com',
      State: 'Active',
      'Created at': '2026-06-27 09:00:00',
      'Last successful scan': '2026-06-27 10:15:00',
      'Last scan attempt': '2026-06-27 10:15:00',
      Description: `Novo Ativo - ${item.model}`,
      PurchaseDate: '2026-06-27',
      Warrantydate: '2029-06-27',
      FQDN: item.domain === 'WORKGROUP' ? '—' : `${item.name.toLowerCase()}.corp.alupar.com`,
      DNSName: item.name,
      Location: item.location,
      Contact: 'TI Corporativo',
      Serialnumber: `SN9911${index}`,
      'Tipo de Ativo': item.type,
      'Proprietário do Ativo': 'TI Infra',
      Criticidade: item.type === 'Switch' || item.type === 'Windows Server' ? 'Alta' : 'Média',
      Lamina: 'Slot-1',
    });
  });

  return { diaAnterior, diaAtual };
}
