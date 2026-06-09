/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Award, 
  Target, 
  ChevronRight, 
  X, 
  Briefcase, 
  Percent, 
  Check, 
  MapPin, 
  Mail,
  Phone,
  ArrowUpRight,
  Coins,
  ShieldCheck,
  AlertCircle,
  ShoppingCart,
  History,
  Sparkles,
  Search,
  Building,
  ChevronLeft,
  QrCode,
  FileText,
  Printer,
  Trash2,
  Lock,
  ArrowRight,
  Package,
  Clock,
  Calendar
} from 'lucide-react';
import { Client, Order, FinancialRecord, Seller, Product, OrderItem } from '../types';

interface SalesPortalProps {
  sellers: Seller[];
  clients: Client[];
  products: Product[];
  orders: Order[];
  onAddOrder: (order: Order) => void;
  financialRecords: FinancialRecord[];
}

export default function SalesPortal({
  sellers,
  clients,
  products,
  orders,
  onAddOrder,
  financialRecords
}: SalesPortalProps) {
  // Find the first active seller as default, or fall back to any
  const activeSellers = sellers.filter(s => s.status === 'Ativo');
  const [selectedSellerId, setSelectedSellerId] = useState<string>(() => {
    return activeSellers.length > 0 ? activeSellers[0].id : (sellers[0]?.id || '');
  });

  // Target Seller Object
  const currentSeller = sellers.find(s => s.id === selectedSellerId) || sellers[0];

  // Portal view states: 'dashboard' | 'history' | 'new-sale'
  const [portalMode, setPortalMode] = useState<'dashboard' | 'history' | 'new-sale'>('dashboard');

  // Currently focused order (for showing invoice/receipt modal)
  const [focusOrder, setFocusOrder] = useState<Order | null>(null);

  // Search queries
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // ----------------------------------------------------
  // INDIVIDUAL METRICS AND SALES CALCULATIONS FOR SELLER
  // ----------------------------------------------------
  const sellerClients = clients.filter(
    c => currentSeller && (c.salesRep || '').trim().toLowerCase() === currentSeller.name.trim().toLowerCase()
  );
  
  const activeClientsCount = sellerClients.filter(c => (c.status || 'Ativo') === 'Ativo').length;

  // Seller orders: either explicitly tagged with seller name or belonging to seller's portfolio clients
  const sellerOrders = currentSeller ? orders.filter(
    o => o.salesRep === currentSeller.name || sellerClients.some(c => c.id === o.clientId)
  ) : [];

  const totalSold = sellerClients.reduce((sum, c) => sum + c.totalSpent, 0);

  // Commission Metrics
  const commissionRate = currentSeller ? currentSeller.commissionRate : 5.0;
  const totalCommissionsGenerated = totalSold * (commissionRate / 100);

  // Initial Paid Seed commissions
  let initialPaid = 0;
  if (currentSeller) {
    if (currentSeller.id === 'REP-001') initialPaid = 18000;
    if (currentSeller.id === 'REP-002') initialPaid = 1200;
    if (currentSeller.id === 'REP-003') initialPaid = 5500;
  }

  // Deduct paid logs
  const ledgerPaid = currentSeller ? financialRecords
    .filter(f => f.type === 'despesa' && f.category === 'Folha Pgto' && f.partyName.trim().toLowerCase() === currentSeller.name.trim().toLowerCase() && f.status === 'Pago')
    .reduce((sum, f) => sum + f.amount, 0) : 0;

  const commissionPaid = initialPaid + ledgerPaid;
  const commissionPending = Math.max(0, totalCommissionsGenerated - commissionPaid);

  // ----------------------------------------------------
  // NEW ORDER WIZARD STATE
  // ----------------------------------------------------
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardClient, setWizardClient] = useState<Client | null>(null);
  
  // Cart item represents state of selection during checkout step
  interface CartItem {
    product: Product;
    quantity: number;
    discountPercent: number; // custom discount per SKU item
  }
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentTerm, setPaymentTerm] = useState<'Vista' | '7 Dias' | '15 Dias' | '30 Dias' | '45 Dias'>('30 Dias');

  // Triggering new sale start
  const handleStartNewSale = () => {
    setWizardClient(null);
    setCart([]);
    setWizardStep(1);
    setPaymentTerm('30 Dias');
    setClientSearch('');
    setProductSearch('');
    setPortalMode('new-sale');
  };

  // Add Item to cart helpers
  const handleAddCartItem = (product: Product) => {
    const exists = cart.find(item => item.product.id === product.id);
    if (exists) {
      if (exists.quantity >= product.stock) {
        alert(`Atenção: Limite máximo atingido de acordo com o estoque atual (${product.stock} ${product.unit}).`);
        return;
      }
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      if (product.stock <= 0) {
        alert('Estoque esgotado para esse item no sistema central.');
        return;
      }
      setCart([...cart, { product, quantity: 1, discountPercent: 0 }]);
    }
  };

  const handleUpdateCartQuantity = (productId: string, val: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;
    
    const newQty = Math.max(1, val);
    if (newQty > item.product.stock) {
      alert(`Quantidade desejada excede o estoque físico disponível (${item.product.stock} ${item.product.unit}).`);
      return;
    }

    setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));
  };

  const handleUpdateCartDiscount = (productId: string, val: number) => {
    const cleanDiscount = Math.max(0, Math.min(100, val));
    setCart(cart.map(i => i.product.id === productId ? { ...i, discountPercent: cleanDiscount } : i));
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart(cart.filter(i => i.product.id !== productId));
  };

  // Advanced subtotal logic
  const calculateCartTotals = () => {
    // subtotal before discounts
    const rawSubtotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
    
    // total after distinct margins and item-wise discounts
    const totalAfterDiscounts = cart.reduce((sum, item) => {
      const originalItemTotal = item.product.sellingPrice * item.quantity;
      const discountAmount = originalItemTotal * (item.discountPercent / 100);
      return sum + (originalItemTotal - discountAmount);
    }, 0);

    const discountSum = rawSubtotal - totalAfterDiscounts;

    // Fixed legal tax calculation (ICMS 18%, IPI 5%, PIS/COFINS 9.25%)
    const icms = totalAfterDiscounts * 0.18;
    const ipi = totalAfterDiscounts * 0.05;
    const pisCofins = totalAfterDiscounts * 0.0925;
    const taxTotal = icms + ipi + pisCofins;

    const grandTotal = totalAfterDiscounts; // Note: In this distribution, taxes are styled as included or calculated over subtotal
    
    return {
      subtotal: rawSubtotal,
      discountTotal: discountSum,
      taxes: {
        icms,
        ipi,
        pisCofins,
        total: taxTotal
      },
      total: grandTotal,
      marginPercent: 32 // Simulated representative gross margin
    };
  };

  const cartTotals = calculateCartTotals();

  // Placing the actual order synchronously
  const handleConfirmOrder = () => {
    if (!wizardClient) return;
    if (cart.length === 0) return;

    // Convert wizard cart to system order details
    const orderItems: OrderItem[] = cart.map(item => {
      const originalTotal = item.product.sellingPrice * item.quantity;
      const discount = originalTotal * (item.discountPercent / 100);
      return {
        id: `Item-${Math.floor(1000 + Math.random() * 9000)}`,
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.sellingPrice,
        total: originalTotal - discount
      };
    });

    const newOrder: Order = {
      id: `PED-${Math.floor(40000 + Math.random() * 9999)}`,
      clientId: wizardClient.id,
      clientName: wizardClient.name,
      date: new Date().toISOString().split('T')[0],
      items: orderItems,
      subtotal: cartTotals.subtotal,
      taxes: {
        icms: cartTotals.taxes.icms,
        ipi: cartTotals.taxes.ipi,
        pisCofins: cartTotals.taxes.pisCofins,
        total: cartTotals.taxes.total
      },
      total: cartTotals.total,
      marginPercent: cartTotals.marginPercent,
      status: 'Aguardando Faturamento',
      paymentTerm: paymentTerm,
      salesRep: currentSeller?.name
    };

    // Commit to persistent global state
    onAddOrder(newOrder);

    // Zoom into invoice/receipt
    setFocusOrder(newOrder);

    // Reset wizard and redirect to history
    setPortalMode('history');
    setWizardStep(1);
    setWizardClient(null);
    setCart([]);
  };

  // Filter clients representing target seller's designated grid
  const filteredClientsForWizard = sellerClients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.cnpj.includes(clientSearch)
  );

  const filteredProductsForWizard = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Dynamic invoice URL for QR code
  const getReceiptURL = (orderId: string) => {
    return `https://verticedistribuidora.com.br/comprovante/digitais/${orderId}`;
  };

  return (
    <div className="min-h-screen bg-[#111827] text-slate-100 rounded-3xl overflow-hidden shadow-2xl flex flex-col font-sans">
      
      {/* Top Professional Portal branding header */}
      <div className="bg-slate-900 border-b border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl shadow-lg shadow-emerald-950/20 flex items-center justify-center text-white">
            <Sparkles className="h-5.5 w-5.5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              PORTAL DE VENDAS <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-emerald-500/20 tracking-widest">Atendimento Externo</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-0.5">Sincronização Ativa com Central corporativa</p>
          </div>
        </div>

        {/* Rep Swapper & navigation mode switch */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Identity Picker Simulator */}
          <div className="bg-slate-950/80 p-2 py-1.5 rounded-xl border border-slate-800/80 flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-extrabold text-[9px] uppercase tracking-wider block">Agente Comercial:</span>
            <select
              value={selectedSellerId}
              onChange={(e) => {
                setSelectedSellerId(e.target.value);
                setPortalMode('dashboard');
              }}
              className="bg-slate-900 text-emerald-400 font-bold focus:outline-none cursor-pointer text-xs pr-1"
            >
              {sellers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id}) {s.status === 'Inativo' ? ' - Licenciado' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick simulation banner */}
          <div className="hidden lg:flex items-center space-x-1 bg-slate-800 px-3 py-1.5 rounded-lg text-slate-400 text-[10px]">
            <Lock className="h-3 w-3 text-slate-500" />
            <span>Perfil: Representante Comercial</span>
          </div>

        </div>
      </div>

      {/* Navigation tabs row exclusive style */}
      <div className="bg-slate-900/60 px-6 py-3 border-b border-slate-800/45 flex flex-wrap justify-between items-center gap-3">
        
        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => setPortalMode('dashboard')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              portalMode === 'dashboard'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Acompanhamento Geral
          </button>
          
          <button
            onClick={() => setPortalMode('history')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              portalMode === 'history'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Histórico de Faturamentos ({sellerOrders.length})
          </button>
        </div>

        {/* Dynamic primary trigger */}
        <button
          onClick={handleStartNewSale}
          className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/10 transform transition-all cursor-pointer hover:scale-102 active:scale-97"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Faturar Nova Venda</span>
        </button>

      </div>

      {/* Main active portal page area */}
      <div className="flex-1 p-6 overflow-y-auto">
        
        <AnimatePresence mode="wait">
          
          {/* DASHBOARD MODE */}
          {portalMode === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              
              {/* Profile card summary info */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between md:items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-slate-800/10 rounded-full blur-3xl"></div>
                
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                    <span className="text-[10px] text-emerald-400 uppercase font-black tracking-widest">Painel Pessoal Ativo</span>
                  </div>
                  <h2 className="text-2xl font-black text-white leading-none">Boas-vindas, {currentSeller?.name}!</h2>
                  <p className="text-xs text-slate-400 max-w-lg">
                    Monitore sua comissão líquida, consulte clientes e gere pedidos diretamente no smartphone ou notebook. Todas as movimentações alteram o faturamento da central em tempo real.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 py-3 border border-slate-800 rounded-xl relative z-10 flex items-center space-x-4">
                  <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-black">
                    {commissionRate}%
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Comissão Pessoal</span>
                    <strong className="text-sm font-black text-white">Acordo Comercial de Distribuição</strong>
                  </div>
                </div>
              </div>

              {/* FIVE SPECIFIC MANDATED BULLET STATS CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* 1. Total vendido */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 relative overflow-hidden group">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Vendido</span>
                  <strong className="text-xl font-black block text-emerald-400 mt-2">
                    R$ {totalSold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                  <div className="text-[10px] text-slate-400 font-semibold mt-2.5 pt-2 border-t border-slate-800">
                    Acumulado de carteira ativa
                  </div>
                </div>

                {/* 2. Comissão paga */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 relative overflow-hidden group">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Comissão Recebida</span>
                  <strong className="text-xl font-black block text-indigo-400 mt-2">
                    R$ {commissionPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                  <div className="text-[10px] text-slate-400 font-semibold mt-2.5 pt-2 border-t border-slate-800">
                    Saldos liquidados na folha
                  </div>
                </div>

                {/* 3. Comissão pendente */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 relative overflow-hidden group">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Comissão Pendente</span>
                  <strong className={`text-xl font-black block mt-2 ${commissionPending > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    R$ {commissionPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                  <div className="text-[10px] text-slate-400 font-semibold mt-2.5 pt-2 border-t border-slate-800">
                    Aguardando liquidação do ERP
                  </div>
                </div>

                {/* 4. Clientes ativos */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 relative overflow-hidden group">
                  <span className="text-[10px] uppercase font-bold text-slate-405 block tracking-wider">Clientes Ativos</span>
                  <strong className="text-xl font-black block text-white mt-2">
                    {activeClientsCount} estabelecimentos
                  </strong>
                  <div className="text-[10px] text-slate-400 font-semibold mt-2.5 pt-2 border-t border-slate-800">
                    Em um portfólio de {sellerClients.length} contatos
                  </div>
                </div>

                {/* 5. Quantidade de pedidos */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 relative overflow-hidden group">
                  <span className="text-[10px] uppercase font-bold text-slate-405 block tracking-wider">Quantidade de Pedidos</span>
                  <strong className="text-xl font-black block text-white mt-2">
                    {sellerOrders.length} faturamentos
                  </strong>
                  <div className="text-[10px] text-slate-400 font-semibold mt-2.5 pt-2 border-t border-slate-800">
                    Registrados no canal de vendas
                  </div>
                </div>

              </div>

              {/* Bento Box showcasing assigned portfolio clients */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-emerald-400 animate-pulse" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Minha Carteira Exclusiva de Clientes</h3>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 font-bold text-[10px] uppercase px-2.5 py-0.5 rounded border border-emerald-500/20">
                    {sellerClients.length} contatos autorizados
                  </span>
                </div>

                {sellerClients.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sellerClients.map((client) => {
                      const isCliActive = (client.status || 'Ativo') === 'Ativo';
                      return (
                        <div key={client.id} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <strong className="text-slate-100 font-bold block truncate max-w-[190px] text-xs">
                                {client.name}
                              </strong>
                              <span className="font-mono text-[9px] text-slate-500 block mt-0.5">{client.cnpj}</span>
                            </div>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isCliActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {client.status || 'Ativo'}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-400 font-semibold mt-3 flex items-center space-x-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-650" />
                            <span>{client.city || 'São Paulo'} ({client.region})</span>
                          </div>

                          <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-500">Saldo Faturado:</span>
                            <strong className="text-emerald-400 font-black">R$ {client.totalSpent.toLocaleString('pt-BR')}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 font-semibold">
                    <span>Você não possui estabelecimentos atribuídos a sua carteira corporativa. Entre em contato com o D.O. para solicitar atribuições.</span>
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* REGISTER SALES WIZARD (NEW SALE STEP BY STEP FLOW) */}
          {portalMode === 'new-sale' && (
            <motion.div
              key="new-sale"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 relative max-w-4xl mx-auto"
            >
              
              {/* Wizard progress header bar layout */}
              <div className="flex justify-between items-center pb-5 border-b border-slate-800 gap-4">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Wizard Automatizado de Faturamento</h3>
                </div>

                <button
                  onClick={() => setPortalMode('dashboard')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-transform scale-100 hover:scale-102 active:scale-95 cursor-pointer"
                >
                  Sair do Wizard
                </button>
              </div>

              {/* Progress Indicator Dots */}
              <div className="flex items-center justify-between max-w-xl mx-auto text-[10px] font-bold text-slate-500 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
                <div className={`flex items-center space-x-1.5 ${wizardStep >= 1 ? 'text-emerald-400' : ''}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black ${wizardStep >= 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>1</span>
                  <span>Cliente</span>
                </div>
                <div className="h-px bg-slate-850 flex-1 mx-2"></div>
                <div className={`flex items-center space-x-1.5 ${wizardStep >= 2 ? 'text-emerald-400' : ''}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black ${wizardStep >= 2 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>2</span>
                  <span>Produtos</span>
                </div>
                <div className="h-px bg-slate-850 flex-1 mx-2"></div>
                <div className={`flex items-center space-x-1.5 ${wizardStep >= 3 ? 'text-emerald-400' : ''}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black ${wizardStep >= 3 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>3 & 4</span>
                  <span>Qtd & Descontos</span>
                </div>
                <div className="h-px bg-slate-850 flex-1 mx-2"></div>
                <div className={`flex items-center space-x-1.5 ${wizardStep >= 5 ? 'text-emerald-400' : ''}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black ${wizardStep >= 5 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>5 & 6</span>
                  <span>Revisão & Confirmar</span>
                </div>
              </div>

              {/* STEP 1: SELECT CLIENT */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Passo 1: Selecionar o Estabelecimento Comercial</h4>
                    <p className="text-[10px] text-slate-405 font-semibold">Escolha um dos clientes autorizados na sua carteira corporativa</p>
                  </div>

                  {/* Search query field */}
                  <div className="relative text-xs">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Search className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Filtrar por razão social, sigla ou CNPJ do contato..."
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Client Selector Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                    {filteredClientsForWizard.map((client) => {
                      const isSelected = wizardClient?.id === client.id;
                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => setWizardClient(client)}
                          className={`p-3.5 rounded-xl border text-left transition-all relative ${
                            isSelected 
                              ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500 text-white' 
                              : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-extrabold text-xs block truncate pr-3">{client.name}</span>
                            {isSelected && (
                              <Check className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                            )}
                          </div>
                          
                          <span className="font-mono text-[9px] text-slate-500 block mt-1">{client.cnpj}</span>
                          
                          <div className="flex justify-between items-center mt-3 text-[10px] text-slate-400">
                            <span>{client.city} ({client.region})</span>
                            <span className="font-semibold block">Risco: <strong className="text-slate-300">{client.riskClass}</strong></span>
                          </div>
                        </button>
                      );
                    })}

                    {filteredClientsForWizard.length === 0 && (
                      <p className="p-8 text-center text-slate-500 font-semibold col-span-2">
                        Nenhum estabelecimento comercial encontrado com este termo.
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex justify-between">
                    <div></div>
                    <button
                      type="button"
                      disabled={!wizardClient}
                      onClick={() => setWizardStep(2)}
                      className="flex items-center space-x-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      <span>Escolher Produtos</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CHOOSE PRODUCTS */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  
                  <div className="flex justify-between items-start flex-col sm:flex-row sm:items-center gap-2">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Passo 2: Escolher itens do carrinho faturável</h4>
                      <p className="text-[10px] text-slate-405 font-semibold">Cliente: <strong className="text-emerald-400">{wizardClient?.name}</strong></p>
                    </div>

                    <div className="bg-slate-950/60 px-3 py-1.5 border border-slate-800 rounded-lg text-[10.5px]">
                      Itens selecionados: <strong className="text-white font-bold">{cart.length} SKUs</strong>
                    </div>
                  </div>

                  {/* Search query field */}
                  <div className="relative text-xs">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Search className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Localizar produto por nome, marca ou categoria da gondola..."
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Products Grid selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                    {filteredProductsForWizard.map((product) => {
                      const itemInCart = cart.find(i => i.product.id === product.id);
                      const isOutOfStock = product.stock <= 0;
                      
                      return (
                        <div
                          key={product.id}
                          className={`p-3.5 rounded-xl border flex justify-between items-center gap-3 ${
                            itemInCart 
                              ? 'bg-emerald-500/5 border-emerald-500/60 text-white' 
                              : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <span className="font-extrabold text-xs block text-slate-200 truncate">{product.name}</span>
                            <span className="font-mono text-[9px] text-slate-500 block">SKU: {product.sku} • {product.category}</span>
                            
                            <div className="flex items-center space-x-3 text-[10px] text-slate-450 mt-1">
                              <span>Unitário: <strong className="text-emerald-400 font-bold">R$ {product.sellingPrice.toLocaleString('pt-BR')}</strong></span>
                              <span>Estoque: <strong className={isOutOfStock ? 'text-rose-500' : 'text-slate-350'}>{product.stock} {product.unit}</strong></span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isOutOfStock ? (
                              <span className="bg-rose-500/10 text-rose-450 border border-rose-500/20 text-[9px] font-black uppercase px-2 py-1 rounded">Sem Estoque</span>
                            ) : itemInCart ? (
                              <div className="flex items-center space-x-1.5">
                                <span className="bg-emerald-500 text-slate-950 font-black text-[9.5px] w-5 h-5 rounded-full flex items-center justify-center">
                                  {itemInCart.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddCartItem(product)}
                                  className="w-7 h-7 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddCartItem(product)}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-[10px] transition-all cursor-pointer uppercase tracking-tight"
                              >
                                Adicionar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredProductsForWizard.length === 0 && (
                      <p className="p-8 text-center text-slate-500 font-semibold col-span-2">
                        Nenhum produto cadastrado coincide com esse termo.
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Voltar ao Cliente</span>
                    </button>
                    
                    <button
                      type="button"
                      disabled={cart.length === 0}
                      onClick={() => setWizardStep(3)}
                      className="flex items-center space-x-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      <span>Ajustar Quantidades & Descontos</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                </div>
              )}

              {/* STEP 3 & 4: ADAPT QUANTITIES AND CUSTOM DISCOUNTS */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Passos 3 & 4: Definir Volumes & Aplicar Descontos por SKU</h4>
                    <p className="text-[10px] text-slate-405 font-semibold">Inspecione o limite de desconto individual por item ou mude a quantidade abaixo</p>
                  </div>

                  {/* Cart review table */}
                  <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/20">
                    <table className="w-full text-left font-sans text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-[9.5px] uppercase font-black text-slate-500">
                        <tr>
                          <th className="p-3">Item / SKU</th>
                          <th className="p-3 text-center">Quantidade</th>
                          <th className="p-3 text-center">Desconto (%)</th>
                          <th className="p-3 text-right">Preço de Tabela</th>
                          <th className="p-3 text-right">Total Faturado</th>
                          <th className="p-3 text-center">Excluir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 font-medium text-slate-300">
                        {cart.map((item) => {
                          const originalItemTotal = item.product.sellingPrice * item.quantity;
                          const discountAmount = originalItemTotal * (item.discountPercent / 100);
                          const cleanItemTotal = originalItemTotal - discountAmount;
                          
                          return (
                            <tr key={item.product.id} className="hover:bg-slate-900/60 transition-colors">
                              <td className="p-3">
                                <span className="font-bold text-slate-100 block">{item.product.name}</span>
                                <span className="font-mono text-[9px] text-slate-500 block">Stock: {item.product.stock} {item.product.unit} available</span>
                              </td>
                              
                              {/* Quantity slider/numeric */}
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCartQuantity(item.product.id, item.quantity - 1)}
                                    className="w-6 h-6 bg-slate-850 hover:bg-slate-800 rounded flex items-center justify-center font-bold font-mono text-slate-300 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateCartQuantity(item.product.id, Number(e.target.value))}
                                    className="w-12 bg-slate-950 border border-slate-800 text-center rounded p-1 font-bold text-white focus:outline-none"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCartQuantity(item.product.id, item.quantity + 1)}
                                    className="w-6 h-6 bg-slate-850 hover:bg-slate-800 rounded flex items-center justify-center font-bold font-mono text-slate-300 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              {/* Discount Percentage slider */}
                              <td className="p-3">
                                <div className="flex items-center space-x-2 justify-center max-w-[170px] mx-auto">
                                  <input
                                    type="range"
                                    min="0"
                                    max="20" // maximum commercial discount limit
                                    value={item.discountPercent}
                                    onChange={(e) => handleUpdateCartDiscount(item.product.id, Number(e.target.value))}
                                    className="w-24 accent-emerald-500 cursor-pointer"
                                  />
                                  <span className="font-mono text-[10px] bg-slate-950 px-2 py-0.5 rounded text-emerald-400 font-bold shrink-0">
                                    {item.discountPercent}%
                                  </span>
                                </div>
                              </td>

                              <td className="p-3 text-right text-slate-400 font-mono">
                                R$ {item.product.sellingPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>

                              <td className="p-3 text-right text-emerald-400 font-bold font-mono">
                                R$ {cleanItemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>

                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCartItem(item.product.id)}
                                  className="p-1.5 hover:bg-rose-500/10 hover:text-rose-450 rounded text-slate-500 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Payment terms conditional select dropdown */}
                  <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl max-w-sm">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Prazo de Pagamento Acordado</label>
                    <select
                      value={paymentTerm}
                      onChange={(e) => setPaymentTerm(e.target.value as any)}
                      className="bg-slate-900 border border-slate-805 text-emerald-400 font-bold text-xs p-2 rounded-lg w-full focus:outline-none cursor-pointer"
                    >
                      <option value="Vista">À Vista (PIX / Transferência)</option>
                      <option value="7 Dias">Boleto - 7 Dias directos</option>
                      <option value="15 Dias">Boleto - 15 Dias</option>
                      <option value="30 Dias">Boleto - 30 Dias (Standard)</option>
                      <option value="45 Dias">Boleto - 45 Dias (BNDES)</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Voltar aos Itens</span>
                    </button>
                    
                    <button
                      type="button"
                      disabled={cart.length === 0}
                      onClick={() => setWizardStep(5)}
                      className="flex items-center space-x-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      <span>Revisar e Concluir Venda</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                </div>
              )}

              {/* STEP 5 & 6: REVIEW AND CONFIRM DEALS */}
              {wizardStep === 5 && (
                <div className="space-y-4">
                  
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Passos 5 & 6: Revisão de Tributos & Confirmar Envio</h4>
                    <p className="text-[10px] text-slate-405 font-semibold">Examine as contas, margem estipulada e confirme o envio para a fila de faturamento nacional</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-300">
                    
                    {/* Summary card info */}
                    <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 space-y-3">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block pb-1 border-b border-slate-800">Associação Comercial</span>
                      
                      <div className="space-y-2">
                        <p className="font-semibold text-slate-400">Vendedor Atribuído:</p>
                        <strong className="text-slate-200 text-xs font-black block">{currentSeller?.name} ({currentSeller?.id})</strong>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-850/50">
                        <p className="font-semibold text-slate-400">Cliente / Estabelecimento:</p>
                        <strong className="text-slate-250 text-xs block font-bold">{wizardClient?.name}</strong>
                        <span className="font-mono text-[9px] text-slate-500 block">{wizardClient?.cnpj}</span>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-850/50">
                        <p className="font-semibold text-slate-400">Prazo de Cobrança:</p>
                        <strong className="text-emerald-400 font-black">{paymentTerm}</strong>
                      </div>
                    </div>

                    {/* Monetary resume block */}
                    <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 space-y-3.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block pb-1 border-b border-slate-800">Demonstrativo de Valores</span>
                      
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-400">Subtotal Bruto:</span>
                        <span className="font-mono text-slate-200">R$ {cartTotals.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div className="flex justify-between font-semibold text-rose-450 text-[11px]">
                        <span>Descontos Concedidos:</span>
                        <span className="font-mono">- R$ {cartTotals.discountTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-850/50 space-y-1.5 text-[10px] text-slate-405 leading-none">
                        <div className="flex justify-between">
                          <span>Provisão ICMS (18%):</span>
                          <span className="font-mono">R$ {cartTotals.taxes.icms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Provisão IPI (5%):</span>
                          <span className="font-mono">R$ {cartTotals.taxes.ipi.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Estimado Impostos Integrados:</span>
                          <span className="font-mono text-slate-350">R$ {cartTotals.taxes.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div className="pt-3.5 border-t border-slate-800 flex justify-between items-center">
                        <strong className="text-xs uppercase text-white font-black tracking-wider">Valor Líquido Faturado:</strong>
                        <strong className="text-base text-emerald-400 font-extrabold font-mono">
                          R$ {cartTotals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>

                  </div>

                  {/* Warning on limits and margins */}
                  <div className="bg-slate-950/30 p-3.5 rounded-lg border border-slate-850 flex items-start space-x-2 text-[10px] text-slate-400">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Conclusão segura. Os limites fiscais de venda foram auditados. Atribuir desconto médio de {( (cartTotals.discountTotal / (cartTotals.subtotal || 1)) * 100).toFixed(1)}% nesta comanda.</span>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Voltar aos Cálculos</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleConfirmOrder}
                      className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-3 rounded-xl text-xs font-black transition-all transform scale-100 hover:scale-102 active:scale-97 cursor-pointer uppercase shadow-lg shadow-emerald-500/10"
                    >
                      <Check className="h-4.5 w-4.5" />
                      <span>Sincronizar & Confirmar Venda</span>
                    </button>
                  </div>

                </div>
              )}

            </motion.div>
          )}

          {/* PORTAL HISTORIC LIST VIEW SCREEN */}
          {portalMode === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
              
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <History className="h-4 px-0.5 w-4 text-emerald-450" />
                    <span>Carteira de Pedidos e Notas Digitais</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Examine notas fiscais eletrônicas, re-imprima cupons de venda ou acompanhe entregas com geolocalização do ERP.</p>
                </div>

                {/* Sub-search field */}
                <div className="relative text-xs w-full max-w-xs">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Filtrar pedidos por cliente..."
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-[11px] text-slate-200 focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* History elegant list rendering */}
              <div className="grid grid-cols-1 gap-3">
                {sellerOrders
                  .filter(o => o.clientName.toLowerCase().includes(historySearch.toLowerCase()))
                  .map((order) => {
                    const isDelivered = order.status === 'Entregue';
                    const isSeparating = order.status === 'Em Separação';
                    const isWaiting = order.status === 'Aguardando Faturamento';
                    
                    return (
                      <div 
                        key={order.id} 
                        className="bg-slate-900 rounded-xl border border-slate-800/80 p-4.5 hover:border-slate-700 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-semibold text-slate-300"
                      >
                        <div className="space-y-2 min-w-0">
                          <div className="flex items-center space-x-2.5">
                            <span className="bg-slate-950 font-mono text-[10px] text-slate-400 p-1.5 rounded font-black border border-slate-800/50">
                              {order.id}
                            </span>
                            <strong className="text-slate-100 text-sm font-black truncate block max-w-[280px]">
                              {order.clientName}
                            </strong>
                          </div>

                          <div className="flex flex-wrap items-center gap-3.5 text-[10px] text-slate-450 mt-1 font-mono">
                            <span className="flex items-center">
                              <Calendar className="h-3.5 w-3.5 mr-1 text-slate-500" />
                              {order.date}
                            </span>
                            
                            <span className="flex items-center">
                              <Package className="h-3.5 w-3.5 mr-1 text-slate-500" />
                              {order.items.length} itens cadastrados
                            </span>

                            <span className="flex items-center mt-0.5">
                              <Clock className="h-3.5 w-3.5 mr-1 text-slate-500" />
                              Prazo: <strong className="text-white ml-0.5">{order.paymentTerm}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Status tracker */}
                        <div className="flex items-center space-x-4 shrink-0 w-full md:w-auto justify-between md:justify-end border-t border-slate-850 md:border-none pt-3 md:pt-0">
                          
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Total Faturado</span>
                            <strong className="font-mono text-emerald-400 font-extrabold text-sm">
                              R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded inline-block ${
                              isDelivered 
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                                : isSeparating 
                                ? 'bg-[#1E94CF]/15 text-[#1E94CF] border border-[#1e94cf]/20' 
                                : isWaiting
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/15'
                                : 'bg-slate-850 text-slate-400'
                            }`}>
                              {order.status}
                            </span>

                            <button
                              onClick={() => setFocusOrder(order)}
                              className="p-2 bg-[#1E94CF]/10 hover:bg-[#1E94CF] text-[#1E94CF] hover:text-slate-950 rounded-lg font-bold hover:shadow-md transition-all cursor-pointer flex items-center space-x-1"
                              title="Visualizar Nota de Venda Profissional"
                            >
                              <FileText className="h-4 w-4" />
                              <span className="text-[10px] uppercase font-bold pr-1">Nota Fiscal</span>
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}

                {sellerOrders.length === 0 && (
                  <div className="p-10 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-500 font-semibold space-y-2">
                    <p>Você ainda não realizou nenhuma venda sincronizada no ERP Corporativo.</p>
                    <button
                      onClick={handleStartNewSale}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs tracking-wide uppercase transition-colors inline-block cursor-pointer mt-1"
                    >
                      Realizar Primeiro Pedido
                    </button>
                  </div>
                )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </div>

      {/* DETAILED PROFESSIONAL SALES INVOICE MODAL WITH QR READER FOR CLIENT RECEIPTS */}
      <AnimatePresence>
        {focusOrder && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full text-slate-900 shadow-2xl overflow-hidden border border-slate-200 text-xs font-semibold flex flex-col max-h-[90vh]"
            >
              
              {/* Header Actionable Bar */}
              <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4.5 w-4.5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-black tracking-tight uppercase">Nota de Venda Profissional</h3>
                    <p className="text-[10px] text-slate-450 uppercase font-black tracking-wider leading-none mt-0.5">Vértice Distribuidora S.A.</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => window.print()}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Imprimir Cupom Auxiliar"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setFocusOrder(null)}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Printable Note Body */}
              <div id="sales-receipt-printable" className="flex-1 overflow-y-auto p-6 space-y-6 printable-container select-text">
                
                {/* Visual Corporate ticket header */}
                <div className="flex flex-col sm:flex-row justify-between items-start border-b border-dashed border-slate-200 pb-5 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-black text-white bg-[#1E94CF] px-2.5 py-1 rounded inline-block tracking-wider uppercase">
                      Documento Auxiliar de Venda
                    </span>
                    <h4 className="text-base font-black text-slate-850">Nº Pedido: {focusOrder.id}</h4>
                    <p className="text-[10.5px] text-slate-400 font-mono">Emissão Digital: {focusOrder.date} às 10:15 UTC-3</p>
                  </div>

                  <div className="text-left sm:text-right text-[10.5px] text-slate-500 font-medium">
                    <strong className="text-slate-800 font-extrabold uppercase">Vértice Distribuidora S.A.</strong>
                    <p className="mt-0.5">CNPJ: 14.556.882/0001-90</p>
                    <p>Sorocaba/SP - Tel: (15) 3211-5050</p>
                  </div>
                </div>

                {/* Cliente / Destinatário */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row justify-between gap-4 text-xs">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-black text-slate-405 block tracking-wider">Identificação do Destinatário</span>
                    <strong className="font-bold text-slate-800 text-xs block">{focusOrder.clientName}</strong>
                    <div className="space-y-1 font-medium text-slate-500">
                      <p>CNPJ / CPF: <strong className="text-slate-700 font-mono">{clients.find(c => c.id === focusOrder.clientId)?.cnpj || 'Cálculo Ativo'}</strong></p>
                      <p>E-mail: <strong className="text-slate-700">{clients.find(c => c.id === focusOrder.clientId)?.email || 'vendas@canal.com.br'}</strong></p>
                      <p>Telefone: <strong className="text-slate-700">{clients.find(c => c.id === focusOrder.clientId)?.phone || '(15) 99881-2233'}</strong></p>
                    </div>
                  </div>

                  <div className="sm:text-right space-y-2">
                    <span className="text-[10px] uppercase font-black text-slate-405 block tracking-wider">Representação / Canal</span>
                    <p className="font-bold text-slate-800 text-xs">{focusOrder.salesRep || currentSeller?.name}</p>
                    <div className="space-y-1 font-medium text-slate-505">
                      <p>Condição: <strong className="text-indigo-600 font-bold">{focusOrder.paymentTerm}</strong></p>
                      <span className="inline-block px-2.5 py-0.5 rounded bg-amber-50 text-amber-500 border border-amber-100 text-[9px] font-bold mt-1 uppercase">
                        {focusOrder.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Products detail grid list inside the note */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-black text-slate-405 block tracking-wider pl-1 font-bold">Relação de Bens e Produtos Faturados</span>
                  
                  <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                    <table className="w-full text-left font-sans text-xs">
                      <thead className="bg-slate-55 border-b border-slate-205 text-[9.5px] uppercase font-black text-slate-500">
                        <tr>
                          <th className="p-3">Mercadoria</th>
                          <th className="p-3 text-center">Quantidade</th>
                          <th className="p-3 text-right">Unitário</th>
                          <th className="p-3 text-right">Descontos</th>
                          <th className="p-3 text-right font-bold">Preço Líquido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-105 font-medium text-slate-650">
                        {focusOrder.items.map((item) => {
                          // Try to fetch products categories
                          const matchingProd = products.find(p => p.id === item.productId);
                          const matchingUnit = matchingProd ? matchingProd.unit : 'un';
                          const originalItemTotal = item.unitPrice * item.quantity;
                          const discountSum = originalItemTotal - item.total;
                          const discountPct = originalItemTotal > 0 ? (discountSum / originalItemTotal) * 100 : 0;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3">
                                <span className="font-extrabold text-slate-800 text-xs block">{item.productName}</span>
                                <span className="font-mono text-[9px] text-slate-405 block">ID: {item.productId}</span>
                              </td>
                              
                              <td className="p-3 text-center font-bold font-mono">
                                {item.quantity} {matchingUnit}
                              </td>

                              <td className="p-3 text-right font-mono">
                                R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>

                              <td className="p-3 text-right text-rose-500 font-mono">
                                {discountPct > 0 ? (
                                  <>
                                    - R$ {discountSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    <span className="text-[9px] font-bold block">({discountPct.toFixed(0)}% Off)</span>
                                  </>
                                ) : (
                                  '0.00'
                                )}
                              </td>

                              <td className="p-3 text-right font-black font-mono text-slate-800 text-xs">
                                R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Subtotals & tax breakdowns inside invoice sheet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  
                  {/* Dynamic QR Code for Digital Receipt scanning */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 flex items-center space-x-4">
                    <div className="p-1.5 bg-white border border-slate-200 rounded-xl shrink-0 flex items-center justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(getReceiptURL(focusOrder.id))}&color=0f172a`}
                        alt="QR Code Cupom de Venda"
                        className="w-20 h-20"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    
                    <div className="space-y-1.5 text-[10px] text-slate-450 leading-relaxed min-w-0">
                      <strong className="text-slate-800 uppercase tracking-widest font-black text-[9px] block">Comprovante Eletrônico</strong>
                      <p>Código autenticador de conformidade tributária.</p>
                      <span className="font-mono text-[8.5px] bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded truncate block mt-1">
                        Selo: SEFIP-A882-VRT
                      </span>
                    </div>
                  </div>

                  {/* Financial amounts summation sheet */}
                  <div className="space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-600 font-medium">
                    
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Bruto de Itens:</span>
                      <span className="font-mono">R$ {focusOrder.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between text-rose-500 font-bold">
                      <span>Total de Desconto:</span>
                      <span className="font-mono">- R$ {(focusOrder.subtotal - focusOrder.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between text-[11px] pt-1.5 border-t border-slate-105">
                      <span>Impostos Declarados (Provisão):</span>
                      <span className="font-mono text-slate-700">R$ {focusOrder.taxes.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200 font-black text-slate-800">
                      <strong className="text-xs uppercase tracking-wider">LÍQUIDO A PAGAR CNPJ:</strong>
                      <strong className="text-base text-emerald-600 font-black font-mono">
                        R$ {focusOrder.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                  </div>

                </div>

                {/* Footer disclaimer disclaimer */}
                <div className="border-t border-slate-150 pt-4 text-center text-[9px] text-slate-400 leading-normal space-y-1">
                  <p>Este documento autentica a entrega de mercadorias registradas sob a responsabilidade do operador de faturamento.</p>
                  <p className="font-mono">Chave de Acesso: 1526 8820 4410 0980 1522 9901 0288 #441A9</p>
                </div>

              </div>

              {/* Action Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200/60 flex space-x-2 shrink-0">
                <button
                  onClick={() => setFocusOrder(null)}
                  className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs uppercase tracking-wider text-center transition-colors hover:bg-slate-800 cursor-pointer"
                >
                  Confirmar e Fechar Nota
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
