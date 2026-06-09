/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  ShoppingCart, 
  ClipboardList, 
  Search, 
  Plus, 
  UserPlus, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  FileCheck2,
  ShieldCheck,
  Scale,
  Activity,
  Building,
  MapPin,
  User,
  Briefcase,
  Calendar,
  DollarSign,
  TrendingUp,
  Box,
  Filter,
  X,
  ChevronRight,
  Coins,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Product, Client, Order, OrderItem } from '../types';

interface SalesCRMProps {
  products: Product[];
  clients: Client[];
  orders: Order[];
  onAddOrder: (order: Order) => void;
  onAddClient: (client: Client) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: Order['status'], invoiceNum?: string) => void;
  initialSubTab?: 'pipeline' | 'crm' | 'new-order';
}

export default function SalesCRM({ 
  products, 
  clients, 
  orders, 
  onAddOrder, 
  onAddClient,
  onUpdateOrderStatus,
  initialSubTab = 'pipeline'
}: SalesCRMProps) {
  const [activeSubTab, setActiveSubTab] = useState<'pipeline' | 'crm' | 'new-order'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  
  // States for Search & Filters
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [crmSearch, setCrmSearch] = useState<string>('');

  // States for New Order Formulation
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [paymentTerm, setPaymentTerm] = useState<Order['paymentTerm']>('30 Dias');
  const [basket, setBasket] = useState<OrderItem[]>([]);
  const [errorWarning, setErrorWarning] = useState<string>('');

  // States for New Client Formulation
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCNPJ, setNewClientCNPJ] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientRegion, setNewClientRegion] = useState<Client['region']>('Sudeste');
  const [newClientCreditLimit, setNewClientCreditLimit] = useState(30000);
  const [newClientCity, setNewClientCity] = useState('');
  const [newClientOwner, setNewClientOwner] = useState('');
  const [newClientSalesRep, setNewClientSalesRep] = useState('Marcos Pinheiro');
  const [newClientStatus, setNewClientStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [newClientConsignments, setNewClientConsignments] = useState('');

  // Premium CRM States & Filters
  const [selectedCrmClientId, setSelectedCrmClientId] = useState<string | null>(null);
  const [crmStatusFilter, setCrmStatusFilter] = useState<string>('all');
  const [crmRegionFilter, setCrmRegionFilter] = useState<string>('all');
  const [crmCityFilter, setCrmCityFilter] = useState<string>('all');
  const [crmSalesRepFilter, setCrmSalesRepFilter] = useState<string>('all');
  const [crmValueFilter, setCrmValueFilter] = useState<string>('all');

  // Fiscal simulation states
  const [billingOrderId, setBillingOrderId] = useState<string | null>(null);
  const [billingStep, setBillingStep] = useState<number>(0);
  const [generatedInvoice, setGeneratedInvoice] = useState<string>('');

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Dynamic values calculation for New Order Form
  const basketSubtotal = basket.reduce((acc, item) => acc + item.total, 0);
  
  // Tax formula simulation
  const taxICMS = basketSubtotal * 0.18; // 18% ICMS
  const taxIPI = basketSubtotal * 0.05;  // 5% IPI
  const taxPISCofins = basketSubtotal * 0.0925; // 9.25% PIS & COFINS
  const taxTotal = taxICMS + taxIPI + taxPISCofins;
  
  const basketTotal = basketSubtotal + taxTotal;

  // Dynamic average profit margin of current basket
  const basketTotalCost = basket.reduce((acc, item) => {
    const parentProd = products.find(p => p.id === item.productId);
    return acc + (parentProd ? parentProd.costPrice * item.quantity : 0);
  }, 0);
  
  const currentBasketMarginPercent = basketSubtotal > 0 
    ? ((basketSubtotal - basketTotalCost) / basketSubtotal) * 100 
    : 0;

  // Handling order basket logic
  const handleAddToBasket = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    if (prod.stock <= 0) {
      alert('Produto temporariamente fora de estoque na prateleira física.');
      return;
    }

    const existingIndex = basket.findIndex(item => item.productId === productId);
    if (existingIndex > -1) {
      const updated = [...basket];
      const newQty = updated[existingIndex].quantity + 1;
      
      if (newQty > prod.stock) {
        alert(`Alerta de limite de estoque: Apenas ${prod.stock} unidades disponíveis.`);
        return;
      }
      
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].total = newQty * prod.sellingPrice;
      setBasket(updated);
    } else {
      const newItem: OrderItem = {
        id: `item_${Date.now()}_${productId}`,
        productId: prod.id,
        productName: prod.name,
        quantity: 1,
        unitPrice: prod.sellingPrice,
        total: prod.sellingPrice
      };
      setBasket([...basket, newItem]);
    }
  };

  const handleUpdateBasketQty = (productId: string, newQty: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod || newQty <= 0) return;

    if (newQty > prod.stock) {
      alert(`Quantidade selecionada supera o estoque de ${prod.stock} un.`);
      return;
    }

    const updated = basket.map(item => {
      if (item.productId === productId) {
        return {
          ...item,
          quantity: newQty,
          total: newQty * item.unitPrice
        };
      }
      return item;
    });
    setBasket(updated);
  };

  const handleRemoveFromBasket = (productId: string) => {
    setBasket(basket.filter(item => item.productId !== productId));
  };

  // Submit Order Creation
  const handleCheckoutOrder = () => {
    if (!selectedClientId) {
      setErrorWarning('Selecione um cliente ativo cadastrado no CRM.');
      return;
    }
    if (basket.length === 0) {
      setErrorWarning('O carrinho de faturamento está vazio.');
      return;
    }

    // Check credit boundary limit
    if (selectedClient && selectedClient.debtBalance + basketTotal > selectedClient.creditLimit) {
      setErrorWarning(`⚠️ Limite de Crédito Excedido: O pedido total de R$ ${basketTotal.toFixed(2)} fará o cliente extrapolar seu limite operacional de R$ ${selectedClient.creditLimit.toFixed(2)} (Saldo devedor ativo de R$ ${selectedClient.debtBalance.toFixed(2)}).`);
      return;
    }

    const newOrder: Order = {
      id: `PED-2026-00${orders.length + 1}`,
      clientId: selectedClientId,
      clientName: selectedClient?.name || 'Cliente Indeterminado',
      date: new Date().toISOString().split('T')[0],
      items: basket,
      subtotal: basketSubtotal,
      taxes: {
        icms: taxICMS,
        ipi: taxIPI,
        pisCofins: taxPISCofins,
        total: taxTotal
      },
      total: basketTotal,
      marginPercent: currentBasketMarginPercent,
      status: 'Aguardando Faturamento',
      paymentTerm: paymentTerm
    };

    onAddOrder(newOrder);
    setBasket([]);
    setSelectedClientId('');
    setErrorWarning('');
    setActiveSubTab('pipeline');
  };

  // Create Client
  const handleCreateClient = () => {
    if (!newClientName || !newClientCNPJ) {
      alert('Preencha os campos obrigatórios (Razão Social e CNPJ).');
      return;
    }

    const consignmentsArray = newClientConsignments
      ? newClientConsignments.split(',').map(item => item.trim()).filter(Boolean)
      : [];

    const newCli: Client = {
      id: `cli_${clients.length + 1}`,
      name: newClientName,
      cnpj: newClientCNPJ,
      email: newClientEmail || 'comercial@empresa.com.br',
      phone: newClientPhone || '(11) 9999-9999',
      creditLimit: Number(newClientCreditLimit),
      debtBalance: 0,
      region: newClientRegion,
      purchaseCount: 0,
      totalSpent: 0,
      riskClass: 'A',
      city: newClientCity || 'Sorocaba',
      owner: newClientOwner || 'Sem Proprietário',
      salesRep: newClientSalesRep || 'Sem Vendedor',
      status: newClientStatus || 'Ativo',
      consignments: consignmentsArray
    };

    onAddClient(newCli);
    setShowClientModal(false);
    setNewClientName('');
    setNewClientCNPJ('');
    setNewClientEmail('');
    setNewClientPhone('');
    setNewClientCity('');
    setNewClientOwner('');
    setNewClientSalesRep('Marcos Pinheiro');
    setNewClientStatus('Ativo');
    setNewClientConsignments('');
  };

  // Emit Simulated NF-e Wizard
  const triggerBillingFlow = (orderId: string) => {
    setBillingOrderId(orderId);
    setBillingStep(1);
    setGeneratedInvoice('');

    // Step 1: Digital signing with corporate certificate
    setTimeout(() => {
      setBillingStep(2);
      // Step 2: Transmission to SEFAZ
      setTimeout(() => {
        setBillingStep(3);
        // Step 3: Authorization and Key registration
        const randomNFe = `NFe-${Math.floor(10000 + Math.random() * 90000)}`;
        setTimeout(() => {
          setBillingStep(4);
          setGeneratedInvoice(randomNFe);
          onUpdateOrderStatus(orderId, 'Em Separação', randomNFe);
        }, 1200);
      }, 1000);
    }, 800);
  };

  // Filtering Orders list
  const filteredOrders = orders.filter(item => {
    const matchesStatus = orderFilter === 'all' || item.status === orderFilter;
    const matchesSearch = item.clientName.toLowerCase().includes(orderSearch.toLowerCase()) || item.id.toLowerCase().includes(orderSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filtering Clients CRM list
  const filteredClients = clients.filter(c => {
    // text search
    const matchesSearch = c.name.toLowerCase().includes(crmSearch.toLowerCase()) || 
                          c.cnpj.includes(crmSearch) || 
                          c.email.toLowerCase().includes(crmSearch.toLowerCase()) ||
                          (c.owner && c.owner.toLowerCase().includes(crmSearch.toLowerCase()));
    
    // status filter
    const statusVal = c.status || 'Ativo';
    const matchesStatus = crmStatusFilter === 'all' || statusVal === crmStatusFilter;
    
    // region filter
    const matchesRegion = crmRegionFilter === 'all' || c.region === crmRegionFilter;
    
    // city filter
    const cityVal = c.city || 'Sorocaba';
    const matchesCity = crmCityFilter === 'all' || cityVal.toLowerCase() === crmCityFilter.toLowerCase();
    
    // sales rep filter
    const repVal = c.salesRep || 'Marcos Pinheiro';
    const matchesSalesRep = crmSalesRepFilter === 'all' || repVal.toLowerCase() === crmSalesRepFilter.toLowerCase();
    
    // purchased value filter
    let matchesValue = true;
    if (crmValueFilter === 'low') {
      matchesValue = c.totalSpent < 50000;
    } else if (crmValueFilter === 'mid') {
      matchesValue = c.totalSpent >= 50000 && c.totalSpent <= 150000;
    } else if (crmValueFilter === 'high') {
      matchesValue = c.totalSpent > 150000;
    }
    
    return matchesSearch && matchesStatus && matchesRegion && matchesCity && matchesSalesRep && matchesValue;
  });

  return (
    <div id="sales-crm-panel" className="space-y-6">
      
      {/* Tab Select Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200/60 gap-4">
        <div>
          <span className="text-xs font-bold text-brand-light uppercase tracking-wider">Gestão Comercial</span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">Vendas, CRM & Notas Fiscais</h2>
          <p className="text-xs text-slate-500 mt-1">Gere novos contratos comerciais, emita faturas e avalie limites creditícios.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/70 text-xs self-start sm:self-center font-medium">
          <button
            onClick={() => { setActiveSubTab('pipeline'); setBillingOrderId(null); }}
            className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-lg transition-transform ${
              activeSubTab === 'pipeline' ? 'bg-white text-brand-dark shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Pedidos de Venda ({filteredOrders.length})</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('crm'); setBillingOrderId(null); }}
            className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-lg transition-transform ${
              activeSubTab === 'crm' ? 'bg-white text-brand-dark shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Clientes & Risco ({clients.length})</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('new-order'); setBillingOrderId(null); }}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-[#1E94CF] text-white rounded-lg font-bold hover:bg-[#1a85bc] transition-all ml-1"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Pedido de Venda</span>
          </button>
        </div>
      </div>

      {/* Main Subview Selector */}

      {/* 1. PIPELINE DE PEDIDOS */}
      {activeSubTab === 'pipeline' && (
        <div id="subtab-pipeline" className="space-y-4">
          
          {/* Quick Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Buscar por código ou razão social..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-brand-light focus:outline-none"
              />
            </div>

            {/* Status Categories */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'Aguardando Faturamento', label: 'Aguardando Faturamento' },
                { id: 'Em Separação', label: 'Em Separação' },
                { id: 'Rota de Entrega', label: 'Rota de Entrega' },
                { id: 'Entregue', label: 'Entregues' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setOrderFilter(cat.id)}
                  className={`px-3.5 py-2 rounded-lg border transition-all ${
                    orderFilter === cat.id 
                      ? 'bg-brand-dark border-brand-dark text-white shadow-sm' 
                      : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Hub & Seffaz simulation splits */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Active Orders List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm md:col-span-8 overflow-hidden">
              
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] uppercase font-black text-slate-500">
                      <th className="p-4">Pedido ID</th>
                      <th className="p-4">Cliente / Comitente</th>
                      <th className="p-4">Itens</th>
                      <th className="p-4 text-right">Margem %</th>
                      <th className="p-4 text-right">Total Pedido</th>
                      <th className="p-4">Status Logística</th>
                      <th className="p-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-4 font-extrabold text-brand-dark">
                            {order.id}
                            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{order.date}</p>
                          </td>
                          <td className="p-4 max-w-[190px]">
                            <p className="font-bold text-slate-800 truncate">{order.clientName}</p>
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase mt-0.5 inline-block">
                              Pgto: {order.paymentTerm}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500 font-semibold">
                            <span className="font-extrabold text-slate-700">{order.items.reduce((s, it) => s + it.quantity, 0)} items</span>
                            <p className="text-[9px] text-slate-400 truncate max-w-[150px]">{order.items.map(it => it.productName).join(', ')}</p>
                          </td>
                          <td className="p-4 text-right">
                            <span className={`font-bold px-2 py-1 rounded text-[10px] ${order.marginPercent >= 42 ? 'text-brand-green bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                              {order.marginPercent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-4 text-right font-extrabold text-slate-900">
                            R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            <p className="text-[9px] text-slate-400 font-medium">Impostos: R$ {order.taxes.total.toFixed(2)}</p>
                          </td>
                          <td className="p-4">
                            <span className={`inline-block font-extrabold text-[10px] px-2.5 py-1 rounded-full ${
                              order.status === 'Entregue' ? 'bg-emerald-50 text-brand-green' :
                              order.status === 'Rota de Entrega' ? 'bg-sky-50 text-brand-light' :
                              order.status === 'Em Separação' ? 'bg-amber-50 text-amber-500' :
                              'bg-slate-100 text-slate-500 animate-pulse'
                            }`}>
                              {order.status}
                            </span>
                            {order.invoiceNumber && (
                              <p className="text-[9px] text-slate-400 font-bold mt-1 flex items-center space-x-1">
                                <FileText className="h-3 w-3 text-slate-400 inline" />
                                <span>{order.invoiceNumber}</span>
                              </p>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {order.status === 'Aguardando Faturamento' ? (
                              <button
                                onClick={() => triggerBillingFlow(order.id)}
                                className="font-bold text-[10px] uppercase tracking-wide bg-[#8BC039] hover:bg-[#7dab32] text-white px-3 py-1.5 rounded-lg shadow-sm transition-all inline-flex items-center space-x-1"
                              >
                                <FileCheck2 className="h-3.5 w-3.5" />
                                <span>Emitir NF-e</span>
                              </button>
                            ) : order.status === 'Em Separação' ? (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'Rota de Entrega')}
                                className="text-[10px] font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 p-2.5 py-1.5 rounded-lg transition-all shadow-inner"
                              >
                                Expedir Carga
                              </button>
                            ) : order.status === 'Rota de Entrega' ? (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'Entregue')}
                                className="text-[10px] font-bold bg-brand-dark hover:bg-[#2c477a] text-white p-2.5 py-1.5 rounded-lg transition-all"
                              >
                                Marcar Entregue
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px] font-bold flex items-center justify-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-brand-green" /> Concluído
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">Nenhum pedido atende aos filtros atuais.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card-Based View */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const isAguardando = order.status === 'Aguardando Faturamento';
                    return (
                      <div key={order.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-extrabold text-sm text-[#1F3767]">{order.id}</span>
                            <span className="text-[10px] text-slate-400 block">{order.date}</span>
                          </div>
                          <span className={`inline-block font-extrabold text-[9px] px-2 py-0.5 rounded-full ${
                            order.status === 'Entregue' ? 'bg-emerald-50 text-brand-green' :
                            order.status === 'Rota de Entrega' ? 'bg-sky-50 text-brand-light' :
                            order.status === 'Em Separação' ? 'bg-amber-50 text-amber-500' :
                            'bg-slate-150 text-slate-650 animate-pulse'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        <div>
                          <p className="font-black text-xs text-slate-800">{order.clientName}</p>
                          <p className="text-[10px] text-slate-400 font-bold">Prazo: {order.paymentTerm}</p>
                        </div>

                        <div className="flex items-center justify-between bg-slate-50/70 p-2.5 rounded-xl text-[10px]">
                          <div>
                            <span className="font-extrabold text-slate-700">{order.items.reduce((s, it) => s + it.quantity, 0)} itens</span>
                            <p className="text-[9px] text-slate-400 truncate max-w-[150px]">{order.items.map(it => it.productName).join(', ')}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900 block">R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[9px] text-brand-green font-extrabold">Margem: {order.marginPercent.toFixed(1)}%</span>
                          </div>
                        </div>

                        {order.invoiceNumber && (
                          <p className="text-[10px] text-slate-500 font-bold flex items-center space-x-1">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            <span>NF-e: {order.invoiceNumber}</span>
                          </p>
                        )}

                        <div className="pt-2">
                          {order.status === 'Aguardando Faturamento' ? (
                            <button
                              onClick={() => triggerBillingFlow(order.id)}
                              className="font-bold text-xs w-full justify-center opacity-95 hover:opacity-100 bg-[#8BC039] text-white py-2.5 rounded-xl shadow-sm transition-all flex items-center space-x-1.5 min-h-[44px]"
                            >
                              <FileCheck2 className="h-4 w-4" />
                              <span>Emitir NF-e</span>
                            </button>
                          ) : order.status === 'Em Separação' ? (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'Rota de Entrega')}
                              className="text-xs font-bold text-slate-650 border border-slate-200 hover:bg-slate-50 w-full py-2.5 rounded-xl transition-all min-h-[44px]"
                            >
                              Expedir Carga
                            </button>
                          ) : order.status === 'Rota de Entrega' ? (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'Entregue')}
                              className="text-xs font-bold bg-brand-dark hover:bg-[#2c477a] text-white w-full py-2.5 rounded-xl transition-all min-h-[44px]"
                            >
                              Marcar Entregue
                            </button>
                          ) : (
                            <div className="text-slate-400 text-xs font-bold flex items-center justify-center gap-1 bg-slate-50 py-2.5 rounded-xl min-h-[44px]">
                              <CheckCircle2 className="h-4 w-4 text-brand-green" /> Concluído
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="p-8 text-center text-slate-400 font-medium text-xs">Nenhum pedido atende aos filtros atuais.</p>
                )}
              </div>

            </div>

            {/* Simulated SEFAZ Billing Fiscal Panel */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm md:col-span-4 p-5">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-3 mb-3">Monitor Fiscal SEFAZ (Receita)</h4>
              
              {billingOrderId ? (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-xl font-mono text-[10px] text-brand-green overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Scale className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-slate-400 font-bold mb-2">NF-E TRANSMISSOR CORE v3.1</p>
                    <p className="text-slate-200">Processando contrato: {billingOrderId}</p>
                    
                    <div className="mt-3.5 space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${billingStep >= 1 ? 'bg-brand-green' : 'bg-slate-700'}`}></span>
                        <p className={billingStep >= 1 ? 'text-white' : 'text-slate-600'}>Assinando digitalmente Certificado A2...</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${billingStep >= 2 ? 'bg-brand-green' : 'bg-slate-700'}`}></span>
                        <p className={billingStep >= 2 ? 'text-white' : 'text-slate-600'}>Transmitindo lote XML à Receita Federal...</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${billingStep >= 3 ? 'bg-brand-green' : 'bg-slate-700'}`}></span>
                        <p className={billingStep >= 3 ? 'text-white' : 'text-slate-600'}>Calculando ICMS/IPI e gerando DANFE...</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${billingStep >= 4 ? 'bg-brand-green text-green-400' : 'bg-slate-700'}`}></span>
                        <p className={billingStep >= 4 ? 'text-white font-bold' : 'text-slate-600'}>Autorizado para uso comercial!</p>
                      </div>
                    </div>

                    {generatedInvoice && (
                      <div className="mt-4 p-2 bg-emerald-950/40 rounded border border-emerald-800 text-slate-100 text-[11px] font-bold">
                        🎉 Chave de Acesso: {generatedInvoice}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2.5 text-xs text-slate-500 font-semibold leading-relaxed">
                    <p className="flex items-center">
                      <ShieldCheck className="h-4 w-4 text-brand-green mr-2" />
                      <span>Certificado Digital IPC-Brasil ativo</span>
                    </p>
                    <p className="flex items-center">
                      <Activity className="h-4 w-4 text-[#1e94cf] mr-2" />
                      <span>Provedor SEFAZ Estadual On-line</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                  <p>Inicie a emissão da NF-e em algum pedido.</p>
                  <p className="text-[10px] text-slate-500 mt-1">O certificado eletrônico e as guias tributárias correspondentes serão anexados.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. AREA CRM DE CLIENTES */}
      {activeSubTab === 'crm' && (() => {
        // Compute unique values dynamically from clients list for the premium filter dropdowns
        const uniqueCities = Array.from(new Set(clients.map(c => c.city || 'Sorocaba'))).filter(Boolean);
        const uniqueSalesReps = Array.from(new Set(clients.map(c => c.salesRep || 'Marcos Pinheiro'))).filter(Boolean);

        return (
          <div id="subtab-crm" className="space-y-6">
            
            {/* Search clients and Add Client + Premium Filters Dropdowns */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={crmSearch}
                    onChange={(e) => setCrmSearch(e.target.value)}
                    placeholder="Pesquisar por razão social, CNPJ, e-mail do faturamento ou proprietário..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:ring-1 focus:ring-brand-light focus:outline-none"
                  />
                </div>
                
                <button
                  onClick={() => setShowClientModal(true)}
                  className="flex items-center justify-center space-x-1.5 bg-[#1E94CF] hover:bg-[#1a85bc] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Cadastrar Cliente CRM</span>
                </button>
              </div>

              {/* Filters grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 text-xs">
                 {/* Status Filter */}
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Status</label>
                   <select
                     value={crmStatusFilter}
                     onChange={(e) => setCrmStatusFilter(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-semibold focus:outline-none"
                   >
                     <option value="all">Todos (Ativos/Inativos)</option>
                     <option value="Ativo">Ativos</option>
                     <option value="Inativo">Inativos</option>
                   </select>
                 </div>

                 {/* Região Filter */}
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Região</label>
                   <select
                     value={crmRegionFilter}
                     onChange={(e) => setCrmRegionFilter(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-semibold focus:outline-none"
                   >
                     <option value="all">Todas as Regiões</option>
                     <option value="Norte">Norte</option>
                     <option value="Nordeste">Nordeste</option>
                     <option value="Sudeste">Sudeste</option>
                     <option value="Sul">Sul</option>
                     <option value="Centro-Oeste">Centro-Oeste</option>
                   </select>
                 </div>

                 {/* Cidade Filter */}
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Cidade</label>
                   <select
                     value={crmCityFilter}
                     onChange={(e) => setCrmCityFilter(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-semibold focus:outline-none"
                   >
                     <option value="all">Todas as Cidades</option>
                     {uniqueCities.map(city => (
                       <option key={city} value={city}>{city}</option>
                     ))}
                   </select>
                 </div>

                 {/* Vendedor Filter */}
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Vendedor Responsável</label>
                   <select
                     value={crmSalesRepFilter}
                     onChange={(e) => setCrmSalesRepFilter(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-semibold focus:outline-none"
                   >
                     <option value="all">Todos os Vendedores</option>
                     {uniqueSalesReps.map(rep => (
                       <option key={rep} value={rep}>{rep}</option>
                     ))}
                   </select>
                 </div>

                 {/* Valor Comprado Filter */}
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Valor Comprado Acumulado</label>
                   <select
                     value={crmValueFilter}
                     onChange={(e) => setCrmValueFilter(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-semibold focus:outline-none"
                   >
                     <option value="all">Qualquer volume</option>
                     <option value="low">Abaixo de R$ 50.000</option>
                     <option value="mid">R$ 50.000 a R$ 150.000</option>
                     <option value="high">Superior a R$ 150.000</option>
                   </select>
                 </div>
              </div>

              {/* Clear filters or count reports */}
              {(crmStatusFilter !== 'all' || crmRegionFilter !== 'all' || crmCityFilter !== 'all' || crmSalesRepFilter !== 'all' || crmValueFilter !== 'all' || crmSearch !== '') && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Filtragem ativa: <span className="text-slate-800 font-bold">{filteredClients.length}</span> de <span className="font-bold">{clients.length}</span> clientes encontrados.
                  </span>
                  <button
                    onClick={() => {
                      setCrmStatusFilter('all');
                      setCrmRegionFilter('all');
                      setCrmCityFilter('all');
                      setCrmSalesRepFilter('all');
                      setCrmValueFilter('all');
                      setCrmSearch('');
                    }}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-700 flex items-center space-x-1 cursor-pointer"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    <span>Limpar Filtros</span>
                  </button>
                </div>
              )}
            </div>

            {/* Premium Card Layout representation */}
            {filteredClients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map((client) => {
                  const isActive = (client.status || 'Ativo') === 'Ativo';
                  return (
                    <div
                      key={client.id}
                      onClick={() => setSelectedCrmClientId(client.id)}
                      className="bg-white rounded-2xl border border-slate-100/80 shadow-xs hover:shadow-md hover:border-[#1E94CF]/30 transition-all duration-300 p-5 cursor-pointer relative group flex flex-col justify-between"
                    >
                      {/* Header Badge Row */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className={`inline-flex items-center space-x-1 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                            isActive 
                              ? 'bg-emerald-50 text-brand-green border border-emerald-100' 
                              : 'bg-slate-100/70 text-slate-400 border border-slate-200/50'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-brand-green' : 'bg-slate-400'}`}></span>
                            <span>{client.status || 'Ativo'}</span>
                          </span>
                          
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                            client.riskClass === 'A' ? 'bg-emerald-50 text-brand-green' :
                            client.riskClass === 'B' ? 'bg-sky-50 text-brand-light' :
                            client.riskClass === 'C' ? 'bg-amber-50 text-amber-500' :
                            'bg-rose-50 text-rose-500'
                          }`}>
                            Risco {client.riskClass}
                          </span>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-800 line-clamp-1 group-hover:text-[#1E94CF] transition-colors mt-1">
                            {client.name}
                          </h4>
                          <p className="font-mono text-[9px] text-slate-400 font-medium">{client.cnpj}</p>
                        </div>
                      </div>

                      {/* Metadata Body */}
                      <div className="py-3 border-y border-slate-100/60 my-3.5 space-y-2 text-[11px] text-slate-500 font-medium">
                        <div className="flex items-center space-x-2">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>Proprietário: <strong className="text-slate-700">{client.owner || 'Antônio Rondon'}</strong></span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                          <span>Vendedor: <strong className="text-slate-700">{client.salesRep || 'Marcos Pinheiro'}</strong></span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>Cidade: <strong className="text-slate-700">{client.city || 'Sorocaba'} ({client.region})</strong></span>
                        </div>
                      </div>

                      {/* Financial statistics / limits progress */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[11px]">
                          <div>
                            <span className="text-slate-400 font-bold block">Total Comprado</span>
                            <strong className="text-slate-800 text-xs font-black">R$ {client.totalSpent.toLocaleString('pt-BR')}</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 font-bold block">Saldo Devedor</span>
                            <strong className={`text-xs font-black ${client.debtBalance > 0 ? 'text-amber-500 font-extrabold' : 'text-slate-705'}`}>
                              R$ {client.debtBalance.toLocaleString('pt-BR')}
                            </strong>
                          </div>
                        </div>
                        
                        {/* Limits bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                            <span>Limite utilizado: {((client.debtBalance / client.creditLimit) * 100).toFixed(0)}%</span>
                            <span>Teto: R$ {client.creditLimit.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                client.debtBalance > client.creditLimit * 0.8 
                                  ? 'bg-rose-500' 
                                  : client.debtBalance > client.creditLimit * 0.4 
                                    ? 'bg-amber-500' 
                                    : 'bg-[#1E94CF]'
                              }`} 
                              style={{ width: `${Math.min((client.debtBalance / client.creditLimit) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end text-[10px] text-brand-light font-bold pt-2 border-t border-slate-50/80 mt-1">
                          <span>Acessar Ficha Geral</span>
                          <ChevronRight className="h-3.5 w-3.5 ml-0.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 px-6 py-12 text-center text-slate-400 font-semibold text-xs space-y-2 col-span-3">
                <span className="inline-block bg-slate-50 p-3 rounded-full text-slate-300">
                  <Users className="h-8 w-8" />
                </span>
                <p>Nenhum cliente atende aos critérios de filtro aplicados.</p>
                <p className="text-[10px] text-slate-400 font-medium">Clique em "Limpar Filtros" no canto direito para retroceder às configurações normais.</p>
              </div>
            )}

            {/* Premium Sliding Lateral Drawer */}
            <AnimatePresence>
              {selectedCrmClientId && (() => {
                const crmClient = clients.find(c => c.id === selectedCrmClientId);
                if (!crmClient) return null;

                // Client orders list
                const clientOrders = orders.filter(o => o.clientId === crmClient.id);
                
                // Summarize distinct purchased products
                const purchasedProductsMap: { [prodId: string]: { name: string; qty: number; unitPrice: number; totalSpent: number } } = {};
                clientOrders.forEach(o => {
                  o.items.forEach(it => {
                    if (!purchasedProductsMap[it.productId]) {
                      purchasedProductsMap[it.productId] = {
                        name: it.productName,
                        qty: 0,
                        unitPrice: it.unitPrice,
                        totalSpent: 0
                      };
                    }
                    purchasedProductsMap[it.productId].qty += it.quantity;
                    purchasedProductsMap[it.productId].totalSpent += it.total;
                  });
                });
                const purchasedProducts = Object.values(purchasedProductsMap);

                // Sort orders to find last purchase
                const sortedOrders = [...clientOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const lastOrder = sortedOrders[0] || null;

                // Active comodatos/consignated items
                const activeConsignments = crmClient.consignments || [];

                // Ascending sorted orders for the SVG Purchase Evolution Chart
                const sortedOrdersAsc = [...clientOrders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                return (
                  <>
                    {/* Backdrop cover */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedCrmClientId(null)}
                      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end"
                    >
                      {/* Drawer component */}
                      <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: 'spring', damping: 26, stiffness: 210 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl bg-[#FCFDFE] h-full shadow-2xl flex flex-col justify-between overflow-hidden relative"
                      >
                        {/* Premium Drawer Header */}
                        <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-950 text-white shrink-0 relative">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-light/10 rounded-full blur-3xl pointer-events-none"></div>
                          
                          <div className="flex justify-between items-start relative z-10">
                            <div className="space-y-1">
                              <span className="inline-block bg-[#1E94CF]/20 text-[#1E94CF] border border-[#1E94CF]/30 px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">
                                CRM PROPRIEDADES PREMIUM
                              </span>
                              <h3 className="text-lg font-black tracking-tight">{crmClient.name}</h3>
                              <p className="text-xs text-slate-400 font-mono">
                                CNPJ: {crmClient.cnpj} • {crmClient.city || 'Sorocaba'} ({crmClient.region})
                              </p>
                            </div>
                            
                            <button 
                              onClick={() => setSelectedCrmClientId(null)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full p-2 transition-all cursor-pointer"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>

                          {/* Profile fast statistics */}
                          <div className="grid grid-cols-3 gap-4 pt-5 mt-5 border-t border-slate-800/80 text-xs text-slate-305">
                            <div>
                              <span className="text-slate-400 block font-semibold text-[10px] uppercase">Gasto Total</span>
                              <strong className="text-sm font-black text-white mt-1 block">
                                R$ {crmClient.totalSpent.toLocaleString('pt-BR')}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-semibold text-[10px] uppercase">Limite</span>
                              <strong className="text-sm font-black text-slate-100 mt-1 block">
                                R$ {crmClient.creditLimit.toLocaleString('pt-BR')}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-semibold text-[10px] uppercase">Risco</span>
                              <span className="inline-block bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded mt-1">
                                Classe {crmClient.riskClass} (Seguro)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Scrollable Contents representing client analytics */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                          
                          {/* A. GRAPHICAL EVOLUTION OF PURCHASES */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center space-x-1.5">
                                <TrendingUp className="h-4 w-4 text-[#1E94CF]" />
                                <span>Evolução das Compras ERP</span>
                              </h4>
                              <span className="text-[10px] font-bold text-slate-400">{clientOrders.length} faturamentos realizados</span>
                            </div>

                            {/* Beautiful clean SVG evolution chart */}
                            {sortedOrdersAsc.length > 0 ? (() => {
                              const maxVal = Math.max(...sortedOrdersAsc.map(o => o.total), 1000);
                              const minVal = 0;
                              const range = maxVal - minVal;
                              const totalCount = sortedOrdersAsc.length;
                              
                              const pts = sortedOrdersAsc.map((ord, idx) => {
                                const x = totalCount > 1 
                                  ? (idx / (totalCount - 1)) * 410 + 50 
                                  : 260;
                                const y = 135 - ((ord.total - minVal) / range) * 100;
                                return { x, y, ordId: ord.id, total: ord.total, date: ord.date };
                              });

                              const pathData = pts.map(p => `${p.x},${p.y}`).join(' ');

                              return (
                                <div className="space-y-2 pt-1">
                                  <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 relative">
                                    <svg className="w-full h-40 overflow-visible" viewBox="0 0 510 150">
                                      <defs>
                                        <linearGradient id="premiumChartGlow" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor="#1E94CF" stopOpacity="0.25" />
                                          <stop offset="100%" stopColor="#1E94CF" stopOpacity="0.0" />
                                        </linearGradient>
                                      </defs>

                                      {/* Horizontal Dash lines */}
                                      <line x1="45" y1="35" x2="490" y2="35" stroke="#E2E8F0" strokeDasharray="3,3" />
                                      <line x1="45" y1="85" x2="490" y2="85" stroke="#E2E8F0" strokeDasharray="3,3" />
                                      <line x1="45" y1="135" x2="490" y2="135" stroke="#CBD5E1" strokeWidth="1.2" />

                                      {/* Y axis text */}
                                      <text x="38" y="38" fontSize="7.5" fill="#94A3B8" textAnchor="end" className="font-mono font-bold">
                                        R$ {maxVal >= 1000 ? `${(maxVal/1000).toFixed(0)}k` : maxVal.toFixed(0)}
                                      </text>
                                      <text x="38" y="88" fontSize="7.5" fill="#94A3B8" textAnchor="end" className="font-mono font-bold">
                                        R$ {((maxVal/2)/1000).toFixed(0)}k
                                      </text>
                                      <text x="38" y="138" fontSize="7.5" fill="#94A3B8" textAnchor="end" className="font-mono font-bold">0</text>

                                      {/* Gradient Area Shape under evolution line */}
                                      {totalCount > 1 && (
                                        <polygon
                                          points={`50,135 ${pathData} ${pts[pts.length - 1].x},135`}
                                          fill="url(#premiumChartGlow)"
                                        />
                                      )}

                                      {/* Real Line Path */}
                                      {totalCount > 1 ? (
                                        <polyline
                                          fill="none"
                                          stroke="#1E94CF"
                                          strokeWidth="3.2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          points={pathData}
                                        />
                                      ) : (
                                        <line x1="50" y1={pts[0].y} x2="480" y2={pts[0].y} stroke="#1E94CF" strokeWidth="2.5" strokeDasharray="4,4" />
                                      )}

                                      {/* Interaction Nodes */}
                                      {pts.map((p, idx) => (
                                        <g key={idx} className="group/node cursor-pointer">
                                          <circle
                                            cx={p.x}
                                            cy={p.y}
                                            r="5"
                                            fill="#FFFFFF"
                                            stroke="#1E94CF"
                                            strokeWidth="2.5"
                                            className="transition-all hover:r-7 hover:fill-[#1e94cf]"
                                          />
                                          
                                          {/* Floating Custom tooltip on hovered node */}
                                          <g className="opacity-0 group-hover/node:opacity-100 transition-opacity duration-200 pointer-events-none">
                                            <rect
                                              x={p.x - 50}
                                              y={p.y - 42}
                                              width="100"
                                              height="30"
                                              rx="6"
                                              fill="#0F172A"
                                            />
                                            <text x={p.x} y={p.y - 30} fontSize="7.5" fill="#94A3B8" textAnchor="middle" fontWeight="bold">
                                              {p.ordId}
                                            </text>
                                            <text x={p.x} y={p.y - 18} fontSize="8.5" fill="#38BDF8" textAnchor="middle" fontWeight="black" className="font-mono">
                                              R$ {p.total.toFixed(0)}
                                            </text>
                                          </g>

                                          {/* X Date Label */}
                                          <text x={p.x} y="148" fontSize="7" fill="#64748B" textAnchor="middle" className="font-bold">
                                            {p.date.split('-')[2]}/{p.date.split('-')[1]}
                                          </text>
                                        </g>
                                      ))}
                                    </svg>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-semibold text-center italic mt-1">
                                    Navegue com o cursor pelos pontos para inspecionar os valores faturados individuais do cliente.
                                  </p>
                                </div>
                              );
                            })() : (
                              <div className="bg-slate-55 p-4 rounded-xl text-center text-slate-400 text-xs font-semibold border border-dashed border-slate-200">
                                <p>Este cliente não realizou compras que possibilitem visualizar a evolução financeira do gráfico.</p>
                                <p className="text-[10px] font-medium text-slate-400 mt-1">Gere um pedido de faturamento para ativar seu gráfico!</p>
                              </div>
                            )}
                          </div>

                          {/* B. ULTIMA COMPRA & METASTORE */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Último Faturamento</span>
                              {lastOrder ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-black text-slate-700 flex items-center space-x-1 mt-1">
                                    <Clock className="h-3.5 w-3.5 text-slate-400 inline" />
                                    <span>{lastOrder.date.split('-').reverse().join('/')}</span>
                                  </p>
                                  <p className="text-sm font-black text-[#1E94CF]">
                                    R$ {lastOrder.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                  <span className="text-[9px] font-bold text-slate-400 block">{lastOrder.id}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic block mt-1">Sem faturamento registrado</span>
                              )}
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-semibold flex flex-col justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Propriedade Contato</span>
                              <div className="space-y-1 mt-1.5 text-slate-600">
                                <p className="flex items-center">
                                  <User className="h-3.5 w-3.5 text-slate-400 mr-1 shrink-0" />
                                  <span>Dono: <strong className="text-slate-800">{crmClient.owner || 'Não Definido'}</strong></span>
                                </p>
                                <p className="flex items-center">
                                  <Briefcase className="h-3.5 w-3.5 text-slate-400 mr-1 shrink-0" />
                                  <span>Vendedor: <strong className="text-slate-800">{crmClient.salesRep || 'Marcos Pinheiro'}</strong></span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* C. CONSIGNADOS COMODATOS */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center space-x-1.5">
                              <Box className="h-4 w-4 text-[#1E94CF]" />
                              <span>Equipamentos Consignados / Comodato ({activeConsignments.length})</span>
                            </h4>
                            
                            {activeConsignments.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {activeConsignments.map((item, idx) => (
                                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-semibold">
                                    <div className="bg-[#1e94cf]/15 p-2 rounded-lg text-[#1e94cf]">
                                      <Box className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-slate-700 font-black">{item}</p>
                                      <span className="text-[9px] text-[#1E94CF] font-black uppercase mt-1 inline-block">Possessão Ativa</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 bg-slate-100/50 rounded-xl border border-slate-150 text-center text-slate-400 text-xs font-semibold">
                                <span>Nenhum ativo consignado associado a este estabelecimento de comércio.</span>
                              </div>
                            )}
                          </div>

                          {/* D. PRODUTOS COMPRADOS */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center space-x-1.5">
                                <ShoppingCart className="h-4 w-4 text-[#1E94CF]" />
                                <span>Linhas de Produtos Comprados ({purchasedProducts.length})</span>
                              </h4>
                              <span className="text-[10px] text-slate-400 font-bold">Unidades consolidadas</span>
                            </div>
                            
                            {purchasedProducts.length > 0 ? (
                              <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                                <table className="w-full text-left">
                                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 p-2">
                                    <tr>
                                      <th className="p-2.5">Descrição do Item</th>
                                      <th className="p-2.5 text-center">Unitário</th>
                                      <th className="p-2.5 text-center">Volume</th>
                                      <th className="p-2.5 text-right">Faturado</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-55 text-slate-600">
                                    {purchasedProducts.map((p, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50/40 font-semibold">
                                        <td className="p-2.5 font-bold text-slate-800">{p.name}</td>
                                        <td className="p-2.5 text-center text-slate-400">R$ {p.unitPrice.toFixed(2)}</td>
                                        <td className="p-2.5 text-center font-bold text-slate-800">{p.qty} un</td>
                                        <td className="p-2.5 text-right font-black text-slate-900 font-mono">R$ {p.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="p-4 bg-slate-100/50 rounded-xl border border-slate-150 text-center text-slate-400 text-xs font-semibold">
                                <span>Nenhum lote faturado para extrair catalogação de itens.</span>
                              </div>
                            )}
                          </div>

                          {/* E. HISTÓRICO DE PEDIDOS */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center space-x-1.5">
                              <ClipboardList className="h-4 w-4 text-[#1E94CF]" />
                              <span>Historial de Lotes & Pedidos ({clientOrders.length})</span>
                            </h4>
                            
                            {clientOrders.length > 0 ? (
                              <div className="relative border-l border-slate-200 pl-4 py-1 space-y-6">
                                {sortedOrders.map((ord) => (
                                  <div key={ord.id} className="relative">
                                    <div className="absolute -left-[20.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#1E94CF] border border-white ring-4 ring-[#1E94CF]/10"></div>
                                    
                                    <div className="space-y-1 font-semibold text-xs text-slate-650">
                                      <div className="flex justify-between items-center">
                                        <h5 className="font-extrabold text-slate-800">{ord.id}</h5>
                                        <span className="text-[10px] text-slate-400 font-mono">{ord.date.split('-').reverse().join('/')}</span>
                                      </div>
                                      
                                      <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-slate-400">{ord.items.reduce((s, i) => s + i.quantity, 0)} volumes integrados</span>
                                        <strong className="text-slate-900">R$ {ord.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                                      </div>

                                      <div className="flex justify-between items-center text-[9.5px] pt-1">
                                        <span className="text-slate-400 font-bold">Resgate: {ord.paymentTerm}</span>
                                        <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase ${
                                          ord.status === 'Entregue' ? 'bg-emerald-50 text-brand-green' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                          {ord.status}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 bg-slate-100/50 rounded-xl border border-slate-150 text-center text-slate-400 text-xs font-semibold">
                                <span>Nenhum pedido de venda no histórico operacional.</span>
                              </div>
                            )}
                          </div>

                        </div>

                        {/* Fast actions foot block */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex space-x-3 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedClientId(crmClient.id);
                              setSelectedCrmClientId(null);
                              setActiveSubTab('new-order');
                            }}
                            className="flex-1 bg-[#1E94CF] hover:bg-[#1a85bc] text-white text-xs font-bold py-3.5 rounded-xl text-center space-x-1.5 hover:shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center font-sans tracking-wide"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Novo Faturamento / Pedido</span>
                          </button>
                          
                          <button
                            onClick={() => setSelectedCrmClientId(null)}
                            className="px-5 bg-white border border-slate-200 hover:bg-slate-55 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Fechar Abas
                          </button>
                        </div>

                      </motion.div>
                    </motion.div>
                  </>
                );
              })()}
            </AnimatePresence>

          </div>
        );
      })()}

      {/* 3. FORMULÁRIO DE NOVO PEDIDO */}
      {activeSubTab === 'new-order' && (
        <div id="subtab-new-order" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Product Picker & Parameters Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-8 space-y-6">
            <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">Montagem do Carrinho de Venda</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Select Client */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cliente Comitente</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => { setSelectedClientId(e.target.value); setErrorWarning(''); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs focus:ring-1 focus:ring-brand-light focus:outline-none"
                >
                  <option value="">-- Selecione o Cliente --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (CNPJ: {c.cnpj})</option>
                  ))}
                </select>
              </div>

              {/* Select Payment Period */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Prazo de Faturamento</label>
                <select
                  value={paymentTerm}
                  onChange={(e) => setPaymentTerm(e.target.value as Order['paymentTerm'])}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs focus:ring-1 focus:ring-brand-light focus:outline-none"
                >
                  <option value="Vista">À Vista (PIX / TED)</option>
                  <option value="7 Dias">Faturado 7 Dias</option>
                  <option value="15 Dias">Faturado 15 Dias</option>
                  <option value="30 Dias">Faturado 30 Dias</option>
                  <option value="45 Dias">Faturado 45 Dias (Especial)</option>
                </select>
              </div>
            </div>

            {/* Client status summary if selected */}
            {selectedClient && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
                <div>
                  <span className="text-slate-400 font-bold block">Limite Disponível</span>
                  <p className="font-extrabold text-slate-800 mt-1">
                    R$ {(selectedClient.creditLimit - selectedClient.debtBalance).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-[10px] text-slate-400">Total: R$ {selectedClient.creditLimit.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Risco Cadastral</span>
                  <span className="inline-block bg-emerald-50 text-brand-green px-2 py-0.5 rounded font-black text-[10px] mt-1">
                    Classe {selectedClient.riskClass} (Baixo Risco)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Giro no Histórico</span>
                  <p className="font-bold text-slate-800 mt-1">{selectedClient.purchaseCount} faturas emitidas</p>
                </div>
              </div>
            )}

            {/* Selection Grid from active inventory */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Acrescentar Itens da Gôndola / Estoque</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {products.map(prod => (
                  <div 
                    key={prod.id} 
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs hover:border-brand-light/30 transition-all cursor-pointer"
                    onClick={() => handleAddToBasket(prod.id)}
                  >
                    <div>
                      <h5 className="font-bold text-slate-800">{prod.name}</h5>
                      <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-400 font-semibold">
                        <span>SKU: {prod.sku}</span>
                        <span>•</span>
                        <span className={prod.stock <= prod.minStock ? 'text-amber-500 font-extrabold' : 'text-slate-400'}>
                          Qtd: {prod.stock} {prod.unit}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-brand-dark">R$ {prod.sellingPrice.toFixed(2)}</p>
                      <span className="text-[9px] font-bold text-brand-light">Custo: R$ {prod.costPrice.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Shopping Basket List */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Produtos Escolhidos</label>
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-inner">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-black text-slate-500 text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Produto</th>
                      <th className="p-3 text-center">Preço de Tabela</th>
                      <th className="p-3 text-center">Quantidade</th>
                      <th className="p-3 text-right">Subtotal</th>
                      <th className="p-3 text-center">Excluir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {basket.length > 0 ? (
                      basket.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/30">
                          <td className="p-3 font-bold text-slate-800">{item.productName}</td>
                          <td className="p-3 text-center text-slate-500 font-semibold">R$ {item.unitPrice.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateBasketQty(item.productId, Number(e.target.value))}
                              className="w-16 bg-slate-50 border border-slate-200 rounded p-1 text-center font-bold text-xs"
                            />
                          </td>
                          <td className="p-3 text-right font-extrabold text-slate-900">R$ {item.total.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleRemoveFromBasket(item.productId)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 inline-block"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 font-medium">Nenhum produto escolhido ainda. Clique nos itens acima para inseri-los.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Checkout Checkout Receipt with Tax simulation */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-6">
            <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">Detalhamento Checkout & Impostos</h3>
            
            <div className="space-y-3.5 text-xs text-slate-600">
              
              {/* Margin review widget */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Margem Projetada Operacional</span>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-sm font-black ${currentBasketMarginPercent >= 38 ? 'text-brand-green' : 'text-amber-500'}`}>
                    {currentBasketMarginPercent.toFixed(1)}% de margem
                  </span>
                  <span className="text-[10px] text-slate-400">Target meta: 42%</span>
                </div>
              </div>

              {/* Formula and taxes sub-splits */}
              <div className="space-y-2 border-b border-slate-100 pb-3">
                <div className="flex justify-between font-semibold">
                  <span>Soma Mercadorias</span>
                  <span className="text-slate-800">R$ {basketSubtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between font-medium text-slate-400 text-[11px]">
                  <span className="flex items-center">ICMS SIMULADO (18%)</span>
                  <span>R$ {taxICMS.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium text-slate-400 text-[11px]">
                  <span>IPI DE PRODUTOS (5%)</span>
                  <span>R$ {taxIPI.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium text-slate-400 text-[11px]">
                  <span>PIS & COFINS (9.25%)</span>
                  <span>R$ {taxPISCofins.toFixed(2)}</span>
                </div>
              </div>

              {/* Absolute Total */}
              <div className="flex justify-between items-center my-4">
                <span className="text-sm font-extrabold text-slate-800">Custo Total Faturado</span>
                <span className="text-lg font-black text-brand-dark">
                  R$ {basketTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Error notifications or limitations */}
            {errorWarning && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-600 font-semibold space-y-1">
                <span className="flex items-center"><AlertTriangle className="h-4 w-4 mr-1.5 shrink-0" /> Restrição Crédito Fiscal:</span>
                <p className="leading-relaxed">{errorWarning}</p>
              </div>
            )}

            {/* Checkout Action */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleCheckoutOrder}
                className="w-full bg-[#1E94CF] hover:bg-[#1a85bc] text-white text-xs font-bold py-3.5 rounded-xl shadow-lg shadow-brand-light/20 tracking-wide transition-all active:scale-95"
              >
                Registrar no Pipeline
              </button>
              
              <button
                onClick={() => { setActiveSubTab('pipeline'); setErrorWarning(''); }}
                className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Cancelar Operação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR NOVO CLIENTE */}
      {showClientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="p-5 bg-brand-dark text-white flex items-center justify-between">
              <h3 className="font-extrabold text-sm tracking-wide">Ficha Cadastral CRM Cliente</h3>
              <button 
                onClick={() => setShowClientModal(false)}
                className="text-white hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div className="col-span-2">
                  <label className="block text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Razão Social (Completo)*</label>
                  <input
                    type="text"
                    required
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Supermercado Nova Esperança S/A"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-1 focus:ring-brand-light focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 uppercase tracking-wider mb-1.5 font-bold">CNPJ Fiscal*</label>
                  <input
                    type="text"
                    required
                    value={newClientCNPJ}
                    onChange={(e) => setNewClientCNPJ(e.target.value)}
                    placeholder="12.345.678/0001-90"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-[11px] focus:ring-1 focus:ring-brand-light focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 uppercase tracking-wider mb-1.5 font-bold">CNPJ Região Fiscal</label>
                  <select
                    value={newClientRegion}
                    onChange={(e) => setNewClientRegion(e.target.value as Client['region'])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-1 focus:ring-brand-light focus:outline-none"
                  >
                    <option value="Sudeste">Sudeste</option>
                    <option value="Centro-Oeste">Centro-Oeste</option>
                    <option value="Sul">Sul</option>
                    <option value="Nordeste">Nordeste</option>
                    <option value="Norte">Norte</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 uppercase tracking-wider mb-1.5 font-bold">E-mail de Faturamento</label>
                  <input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="financeiro@empresa.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-1 focus:ring-brand-light focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Telefone Comercial</label>
                  <input
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="(11) 3411-9988"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Limite de Crédito Atribuído (R$)</label>
                  <input
                    type="number"
                    value={newClientCreditLimit}
                    onChange={(e) => setNewClientCreditLimit(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  onClick={handleCreateClient}
                  className="flex-1 bg-[#1e94cf] hover:bg-brand-light font-bold text-xs text-white uppercase tracking-wider py-3.5 rounded-xl transition-all"
                >
                  Registrar Ficha
                </button>
                <button
                  onClick={() => setShowClientModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-500 uppercase tracking-wider py-3.5 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
