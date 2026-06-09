/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Client, Order, FinancialRecord, Seller } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: 'Azeite de Oliva Extra Virgem 500ml',
    sku: 'AL-AZE-050',
    category: 'Gourmet',
    stock: 240,
    minStock: 100,
    unit: 'un',
    costPrice: 28.50,
    sellingPrice: 48.90,
    corridor: 'C-04',
    shelf: 'Nível 2',
    status: 'normal'
  },
  {
    id: 'prod_2',
    name: 'Arroz Integral Cateto Orgânico 1kg',
    sku: 'AL-ARR-102',
    category: 'Grãos',
    stock: 450,
    minStock: 200,
    unit: 'un',
    costPrice: 8.20,
    sellingPrice: 15.60,
    corridor: 'A-01',
    shelf: 'Nível 1',
    status: 'normal'
  },
  {
    id: 'prod_3',
    name: 'Café Espresso Ristretto Cápsulas (C/10)',
    sku: 'BE-CAF-301',
    category: 'Bebidas',
    stock: 80,
    minStock: 150,
    unit: 'caixa',
    costPrice: 14.90,
    sellingPrice: 27.90,
    corridor: 'B-02',
    shelf: 'Nível 3',
    status: 'baixo_estoque'
  },
  {
    id: 'prod_4',
    name: 'Chocolate Belga 70% Cacau 100g',
    sku: 'DO-CHO-403',
    category: 'Doces',
    stock: 35,
    minStock: 80,
    unit: 'un',
    costPrice: 9.80,
    sellingPrice: 19.90,
    corridor: 'D-01',
    shelf: 'Nível 4',
    status: 'critico'
  },
  {
    id: 'prod_5',
    name: 'Suco de Uva Integral Prats 1L',
    sku: 'BE-SUC-011',
    category: 'Bebidas',
    stock: 600,
    minStock: 150,
    unit: 'un',
    costPrice: 7.40,
    sellingPrice: 14.80,
    corridor: 'B-01',
    shelf: 'Nível 1',
    status: 'normal'
  },
  {
    id: 'prod_6',
    name: 'Molho Pesto Genovese Importado 190g',
    sku: 'AL-PES-190',
    category: 'Gourmet',
    stock: 120,
    minStock: 50,
    unit: 'un',
    costPrice: 16.30,
    sellingPrice: 32.50,
    corridor: 'C-03',
    shelf: 'Nível 2',
    status: 'normal'
  },
  {
    id: 'prod_7',
    name: 'Leite de Amêndoas Sem Açúcar 1L',
    sku: 'BE-LEI-100',
    category: 'Bebidas',
    stock: 95,
    minStock: 100,
    unit: 'un',
    costPrice: 11.20,
    sellingPrice: 21.90,
    corridor: 'A-02',
    shelf: 'Nível 3',
    status: 'baixo_estoque'
  },
  {
    id: 'prod_8',
    name: 'Geleia de Damasco Premium 280g',
    sku: 'DO-GEL-280',
    category: 'Doces',
    stock: 180,
    minStock: 60,
    unit: 'un',
    costPrice: 13.50,
    sellingPrice: 24.90,
    corridor: 'D-02',
    shelf: 'Nível 2',
    status: 'normal'
  },
  {
    id: 'prod_9',
    name: 'Macarrão Grano Duro Fusilli 500g',
    sku: 'AL-MAC-500',
    category: 'Grãos',
    stock: 310,
    minStock: 150,
    unit: 'un',
    costPrice: 6.80,
    sellingPrice: 12.90,
    corridor: 'A-03',
    shelf: 'Nível 1',
    status: 'normal'
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli_1',
    name: 'Supermercados Rondon Ltda',
    cnpj: '45.223.111/0001-92',
    email: 'compras@rondon.com.br',
    phone: '(11) 3456-9900',
    creditLimit: 75000,
    debtBalance: 12500,
    region: 'Sudeste',
    purchaseCount: 42,
    totalSpent: 168400,
    riskClass: 'A',
    city: 'Sorocaba',
    owner: 'Antônio Rondon',
    salesRep: 'Marcos Pinheiro',
    status: 'Ativo',
    consignments: ['Gôndola Premium Autoescola', 'Refrigerador de Sucos Vet.']
  },
  {
    id: 'cli_2',
    name: 'Conveniência & Frutaria Sol Nascente',
    cnpj: '12.339.400/0001-05',
    email: 'financeiro@solnascente.com.br',
    phone: '(62) 99312-3456',
    creditLimit: 15000,
    debtBalance: 0,
    region: 'Centro-Oeste',
    purchaseCount: 18,
    totalSpent: 42600,
    riskClass: 'B',
    city: 'Goiânia',
    owner: 'Haruto Tanaka',
    salesRep: 'Patrícia Souza',
    status: 'Ativo',
    consignments: []
  },
  {
    id: 'cli_3',
    name: 'Distribuidora de Doces Fantasia S.A.',
    cnpj: '28.102.394/0002-12',
    email: 'importacao@docesfantasia.com.br',
    phone: '(51) 3211-1234',
    creditLimit: 120000,
    debtBalance: 45000,
    region: 'Sul',
    purchaseCount: 88,
    totalSpent: 394200,
    riskClass: 'A',
    city: 'Porto Alegre',
    owner: 'Cláudio Ferreira',
    salesRep: 'Marcos Pinheiro',
    status: 'Ativo',
    consignments: ['Expositor Vertical de Doces 300L']
  },
  {
    id: 'cli_4',
    name: 'Mercado Pão de Mel Express',
    cnpj: '92.110.456/0001-30',
    email: 'contato@paodemel.com.br',
    phone: '(81) 2765-8833',
    creditLimit: 25000,
    debtBalance: 18500,
    region: 'Nordeste',
    purchaseCount: 15,
    totalSpent: 35900,
    riskClass: 'C',
    city: 'Recife',
    owner: 'Maria das Graças',
    salesRep: 'Patrícia Souza',
    status: 'Inativo',
    consignments: []
  },
  {
    id: 'cli_5',
    name: 'Empório Gourmet da Amazônia',
    cnpj: '33.405.678/0001-88',
    email: 'compras@emporioamazonia.com.br',
    phone: '(92) 3411-9002',
    creditLimit: 40000,
    debtBalance: 4100,
    region: 'Norte',
    purchaseCount: 22,
    totalSpent: 87400,
    riskClass: 'A',
    city: 'Manaus',
    owner: 'Thiago Castanho',
    salesRep: 'Letícia Lima',
    status: 'Ativo',
    consignments: ['Adega Climatizada Smart-24']
  },
  {
    id: 'cli_6',
    name: 'Rede de Hotéis Plazza Corp',
    cnpj: '07.388.922/0001-44',
    email: 'suprimentos@plazzahoteis.com.br',
    phone: '(21) 2544-0101',
    creditLimit: 60000,
    debtBalance: 24000,
    region: 'Sudeste',
    purchaseCount: 31,
    totalSpent: 112000,
    riskClass: 'B',
    city: 'Rio de Janeiro',
    owner: 'Roberto Marinho Jr',
    salesRep: 'Letícia Lima',
    status: 'Ativo',
    consignments: ['Frigobar Premium Vértice x4']
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'PED-2026-001',
    clientId: 'cli_1',
    clientName: 'Supermercados Rondon Ltda',
    date: '2026-05-28',
    items: [
      { id: 'item_1', productId: 'prod_1', productName: 'Azeite de Oliva Extra Virgem 500ml', quantity: 50, unitPrice: 48.90, total: 2445.00 },
      { id: 'item_2', productId: 'prod_6', productName: 'Molho Pesto Genovese Importado 190g', quantity: 30, unitPrice: 32.50, total: 975.00 }
    ],
    subtotal: 3420.00,
    taxes: { icms: 615.60, ipi: 171.00, pisCofins: 316.35, total: 1102.95 },
    total: 4522.95,
    marginPercent: 43.5,
    status: 'Entregue',
    paymentTerm: '30 Dias',
    invoiceNumber: 'NFe-21840'
  },
  {
    id: 'PED-2026-002',
    clientId: 'cli_3',
    clientName: 'Distribuidora de Doces Fantasia S.A.',
    date: '2026-06-01',
    items: [
      { id: 'item_3', productId: 'prod_8', productName: 'Geleia de Damasco Premium 280g', quantity: 100, unitPrice: 24.90, total: 2490.00 },
      { id: 'item_4', productId: 'prod_5', productName: 'Suco de Uva Integral Prats 1L', quantity: 200, unitPrice: 14.80, total: 2960.00 }
    ],
    subtotal: 5450.00,
    taxes: { icms: 981.00, ipi: 272.50, pisCofins: 504.13, total: 1757.63 },
    total: 7207.63,
    marginPercent: 45.1,
    status: 'Rota de Entrega',
    paymentTerm: '15 Dias',
    invoiceNumber: 'NFe-21841'
  },
  {
    id: 'PED-2026-003',
    clientId: 'cli_5',
    clientName: 'Empório Gourmet da Amazônia',
    date: '2026-06-02',
    items: [
      { id: 'item_5', productId: 'prod_1', productName: 'Azeite de Oliva Extra Virgem 500ml', quantity: 20, unitPrice: 48.90, total: 978.00 },
      { id: 'item_6', productId: 'prod_3', productName: 'Café Espresso Ristretto Cápsulas (C/10)', quantity: 50, unitPrice: 27.90, total: 1395.00 }
    ],
    subtotal: 2373.00,
    taxes: { icms: 427.14, ipi: 118.65, pisCofins: 219.50, total: 765.29 },
    total: 3138.29,
    marginPercent: 41.8,
    status: 'Em Separação',
    paymentTerm: '7 Dias',
    invoiceNumber: 'NFe-21842'
  },
  {
    id: 'PED-2026-004',
    clientId: 'cli_4',
    clientName: 'Mercado Pão de Mel Express',
    date: '2026-06-02',
    items: [
      { id: 'item_7', productId: 'prod_2', productName: 'Arroz Integral Cateto Orgânico 1kg', quantity: 80, unitPrice: 15.60, total: 1248.00 },
      { id: 'item_8', productId: 'prod_9', productName: 'Macarrão Grano Duro Fusilli 500g', quantity: 150, unitPrice: 12.90, total: 1935.00 }
    ],
    subtotal: 3183.00,
    taxes: { icms: 572.94, ipi: 159.15, pisCofins: 294.43, total: 1026.52 },
    total: 4209.52,
    marginPercent: 47.3,
    status: 'Aguardando Faturamento',
    paymentTerm: '30 Dias'
  }
];

export const INITIAL_LEDGER: FinancialRecord[] = [
  {
    id: 'FIN-001',
    type: 'receita',
    description: 'Faturamento Pedido PED-2026-001',
    amount: 4522.95,
    dueDate: '2026-06-28',
    status: 'Pendente',
    partyName: 'Supermercados Rondon Ltda',
    cnpj: '45.223.111/0001-92',
    category: 'Vendas'
  },
  {
    id: 'FIN-002',
    type: 'receita',
    description: 'Faturamento Pedido PED-2025-098 (Histórico)',
    amount: 8750.00,
    dueDate: '2026-06-01',
    paymentDate: '2026-06-01',
    status: 'Pago',
    partyName: 'Distribuidora de Doces Fantasia S.A.',
    cnpj: '28.102.394/0002-12',
    category: 'Vendas'
  },
  {
    id: 'FIN-003',
    type: 'despesa',
    description: 'Imposto do Simples Nacional Ref Maio',
    amount: 14200.00,
    dueDate: '2026-06-20',
    status: 'Pendente',
    partyName: 'Receita Federal do Brasil',
    category: 'Impostos'
  },
  {
    id: 'FIN-004',
    type: 'despesa',
    description: 'Fatura Fornecedor Alimentos do Oeste',
    amount: 28540.00,
    dueDate: '2026-06-05',
    status: 'Pendente',
    partyName: 'Agro Alimentos do Oeste S/A',
    category: 'Fornecedores'
  },
  {
    id: 'FIN-005',
    type: 'despesa',
    description: 'Combustível Frota Logística',
    amount: 4200.00,
    dueDate: '2026-06-02',
    paymentDate: '2026-06-02',
    status: 'Pago',
    partyName: 'Posto Petro Center S.A.',
    category: 'Logística'
  },
  {
    id: 'FIN-006',
    type: 'receita',
    description: 'Parcela Antecipada Evento Gourmet',
    amount: 6000.00,
    dueDate: '2026-05-30',
    paymentDate: '2026-05-30',
    status: 'Pago',
    partyName: 'Rede de Hotéis Plazza Corp',
    cnpj: '07.388.922/0001-44',
    category: 'Vendas'
  },
  {
    id: 'FIN-007',
    type: 'despesa',
    description: 'Licenciamento Licença Microsoft 365 e ERP',
    amount: 1850.00,
    dueDate: '2026-06-10',
    status: 'Pendente',
    partyName: 'Softwares e Soluções Brasil Ltda',
    category: 'Infraestrutura'
  }
];

export const INITIAL_SELLERS: Seller[] = [
  {
    id: 'REP-001',
    name: 'Marcos Pinheiro',
    email: 'marcos.pinheiro@vertice.com.br',
    phone: '(11) 98877-1234',
    status: 'Ativo',
    commissionRate: 5.0,
    target: 150000
  },
  {
    id: 'REP-002',
    name: 'Patrícia Souza',
    email: 'patricia.souza@vertice.com.br',
    phone: '(11) 97766-5678',
    status: 'Ativo',
    commissionRate: 4.5,
    target: 100000
  },
  {
    id: 'REP-003',
    name: 'Letícia Lima',
    email: 'leticia.lima@vertice.com.br',
    phone: '(21) 96655-9012',
    status: 'Ativo',
    commissionRate: 5.5,
    target: 120000
  },
  {
    id: 'REP-004',
    name: 'Anderson Neves',
    email: 'anderson.neves@vertice.com.br',
    phone: '(51) 95544-3456',
    status: 'Inativo',
    commissionRate: 4.0,
    target: 80000
  }
];

export const BRAND_COLORS = {
  darkBlue: '#1F3767',
  lightBlue: '#1E94CF',
  green: '#8BC039',
  white: '#FFFFFF',
};
