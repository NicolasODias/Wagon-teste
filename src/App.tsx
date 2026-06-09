/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CLIENTS, 
  INITIAL_ORDERS, 
  INITIAL_LEDGER,
  INITIAL_SELLERS
} from './data';
import { Product, Client, Order, FinancialRecord, Seller, AuthUser } from './types';
import Sidebar from './components/Sidebar';
import DashboardBI from './components/DashboardBI';
import SalesCRM from './components/SalesCRM';
import Inventory from './components/Inventory';
import Finance from './components/Finance';
import Sellers from './components/Sellers';
import SalesPortal from './components/SalesPortal';
import VirtualCFO from './components/VirtualCFO';
import LoginPremium from './components/LoginPremium';
import { 
  Building2, 
  Bell, 
  Search, 
  HelpCircle, 
  User, 
  Activity, 
  DollarSign,
  AlertTriangle,
  Settings,
  LayoutDashboard,
  Boxes,
  Users,
  Cpu,
  Loader2,
  LogOut
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userPortal, setUserPortal] = useState<'admin' | 'vendedor'>('admin');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [salesSubTab, setSalesSubTab] = useState<'pipeline' | 'crm' | 'new-order'>('pipeline');

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const cached = localStorage.getItem('vertice_erp_theme');
    return cached === 'dark' ? 'dark' : 'light';
  });

  // Verify dynamic user session on mount
  useEffect(() => {
    const token = localStorage.getItem('vertice_erp_token');
    if (!token) {
      setIsLoadingSession(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Sessão expirada');
      return res.json();
    })
    .then(data => {
      if (data.success && data.user) {
        setCurrentUser(data.user);
        if (data.user.role === 'VENDEDOR') {
          setUserPortal('vendedor');
        } else {
          setUserPortal('admin');
        }
      } else {
        localStorage.removeItem('vertice_erp_token');
      }
    })
    .catch(() => {
      localStorage.removeItem('vertice_erp_token');
    })
    .finally(() => {
      setIsLoadingSession(false);
    });
  }, []);

  const handleLoginSuccess = (user: AuthUser, token: string) => {
    setCurrentUser(user);
    localStorage.setItem('vertice_erp_token', token);
    if (user.role === 'VENDEDOR') {
      setUserPortal('vendedor');
    } else {
      setUserPortal('admin');
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserPortal('admin');
    localStorage.removeItem('vertice_erp_token');
  };

  useEffect(() => {
    localStorage.setItem('vertice_erp_theme', theme);
  }, [theme]);

  // Sync activeTab with salesSubTab for pipeline/crm
  useEffect(() => {
    if (activeTab === 'pipeline') {
      setSalesSubTab('pipeline');
    } else if (activeTab === 'crm') {
      setSalesSubTab('crm');
    }
  }, [activeTab]);

  const toggleDarkMode = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Unified reactive state, persistent via localStorage
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = localStorage.getItem('vertice_erp_products');
    return cached ? JSON.parse(cached) : INITIAL_PRODUCTS;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const cached = localStorage.getItem('vertice_erp_clients');
    return cached ? JSON.parse(cached) : INITIAL_CLIENTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const cached = localStorage.getItem('vertice_erp_orders');
    return cached ? JSON.parse(cached) : INITIAL_ORDERS;
  });

  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(() => {
    const cached = localStorage.getItem('vertice_erp_ledger');
    return cached ? JSON.parse(cached) : INITIAL_LEDGER;
  });

  const [sellers, setSellers] = useState<Seller[]>(() => {
    const cached = localStorage.getItem('vertice_erp_sellers');
    return cached ? JSON.parse(cached) : INITIAL_SELLERS;
  });

  // Sync state to local storage when changed
  useEffect(() => {
    localStorage.setItem('vertice_erp_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('vertice_erp_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('vertice_erp_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('vertice_erp_ledger', JSON.stringify(financialRecords));
  }, [financialRecords]);

  useEffect(() => {
    localStorage.setItem('vertice_erp_sellers', JSON.stringify(sellers));
  }, [sellers]);

  // Operational notification indicators
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  
  const unbilledOrdersCount = orders.filter(o => o.status === 'Aguardando Faturamento').length;
  
  const pendingBillsCount = financialRecords.filter(f => f.type === 'despesa' && f.status === 'Pendente').length;

  // Global State Handlers
  const handleAddOrder = (newOrder: Order) => {
    setOrders([newOrder, ...orders]);
    
    // Auto-update stock levels of purchased products
    setProducts(prevProducts => {
      return prevProducts.map(prod => {
        const itemInOrder = newOrder.items.find(it => it.productId === prod.id);
        if (itemInOrder) {
          const updatedStock = Math.max(0, prod.stock - itemInOrder.quantity);
          return {
            ...prod,
            stock: updatedStock,
            status: updatedStock <= prod.minStock * 0.4 ? 'critico' : (updatedStock <= prod.minStock ? 'baixo_estoque' : 'normal') as any
          };
        }
        return prod;
      });
    });

    // Auto-adjust debtor balance on CRM client record
    setClients(prevClients => {
      return prevClients.map(cli => {
        if (cli.id === newOrder.clientId) {
          return {
            ...cli,
            debtBalance: cli.debtBalance + newOrder.total,
            purchaseCount: cli.purchaseCount + 1,
            totalSpent: cli.totalSpent + newOrder.total
          };
        }
        return cli;
      });
    });

    // Auto-append appropriate Receivable to financial ledger
    const newReceivable: FinancialRecord = {
      id: `FIN-${Math.floor(100 + Math.random() * 900)}`,
      type: 'receita',
      description: `Faturamento Pedido ${newOrder.id}`,
      amount: newOrder.total,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // standard 30d
      status: 'Pendente',
      partyName: newOrder.clientName,
      category: 'Vendas'
    };
    setFinancialRecords(prevLedger => [newReceivable, ...prevLedger]);
  };

  const handleAddClient = (newClient: Client) => {
    setClients([newClient, ...clients]);
  };

  const handleAddProduct = (newProduct: Product) => {
    setProducts([newProduct, ...products]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleReceiveStock = (productId: string, qtyToAdd: number) => {
    setProducts(products.map(prod => {
      if (prod.id === productId) {
        const newQty = prod.stock + qtyToAdd;
        return {
          ...prod,
          stock: newQty,
          status: newQty <= prod.minStock * 0.4 ? 'critico' : (newQty <= prod.minStock ? 'baixo_estoque' : 'normal') as any
        };
      }
      return prod;
    }));
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status'], invoiceNum?: string) => {
    setOrders(orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: newStatus,
          ...(invoiceNum ? { invoiceNumber: invoiceNum } : {})
        };
      }
      return o;
    }));
  };

  const handleAddTransaction = (record: FinancialRecord) => {
    setFinancialRecords([record, ...financialRecords]);
  };

  const handleSettleTransaction = (id: string, settleStatus: 'Pago' | 'Pendente') => {
    setFinancialRecords(financialRecords.map(record => {
      if (record.id === id) {
        
        // If settling a receivable customer, decrease their debtor balance on CRM too! (Operational consistency!)
        if (record.type === 'receita' && settleStatus === 'Pago' && record.status === 'Pendente') {
          const matchingClient = clients.find(c => c.name === record.partyName);
          if (matchingClient) {
            setClients(prevClients => prevClients.map(c => c.id === matchingClient.id ? {
              ...c,
              debtBalance: Math.max(0, c.debtBalance - record.amount)
            } : c));
          }
        }
        
        return {
          ...record,
          status: settleStatus,
          ...(settleStatus === 'Pago' ? { paymentDate: new Date().toISOString().split('T')[0] } : { paymentDate: undefined })
        };
      }
      return record;
    }));
  };

  // Reset demo databases to origin values easily
  const resetDatabaseToDefault = () => {
    if (window.confirm('Deseja realmente redefinir o banco de dados do ERP para os valores padrão de fábrica?')) {
      localStorage.removeItem('vertice_erp_products');
      localStorage.removeItem('vertice_erp_clients');
      localStorage.removeItem('vertice_erp_orders');
      localStorage.removeItem('vertice_erp_ledger');
      localStorage.removeItem('vertice_erp_sellers');
      window.location.reload();
    }
  };

  // 1. Loader screen during startup authentication check
  if (isLoadingSession) {
    return (
      <div className="min-h-screen w-screen bg-[#F5F7FB] flex flex-col items-center justify-center space-y-4">
        <div className="p-5 rounded-3xl bg-white shadow-2xl border border-slate-100 flex items-center justify-center">
          <Loader2 className="h-10 w-10 text-[#1F3767] animate-spin" />
        </div>
        <p className="text-xs font-extrabold text-[#1F3767] tracking-widest uppercase animate-pulse">
          Carregando Wagon AI...
        </p>
      </div>
    );
  }

  // 2. Render Premium Login screen if unauthenticated
  if (!currentUser) {
    return <LoginPremium onLoginSuccess={handleLoginSuccess} theme={theme} />;
  }

  // 3. Render SalesPortal for Vendedores (and Admin in Seller-Mode)
  if (userPortal === 'vendedor') {
    return (
      <div className={`flex h-screen w-screen overflow-hidden font-sans antialiased p-2 sm:p-4 absolute inset-0 z-50 ${
        theme === 'dark' ? 'bg-[#0F172A] text-slate-100' : 'bg-[#e2e8f0]/40 text-slate-800'
      }`}>
        <div className="absolute top-6 right-10 z-20 flex items-center space-x-3">
          {currentUser.role === 'ADMIN' ? (
            <button
              onClick={() => setUserPortal('admin')}
              className={`flex items-center space-x-1.5 border px-4 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-xl cursor-pointer ${
                theme === 'dark'
                  ? 'border-slate-850 bg-slate-900/90 text-[#1E94CF] hover:bg-slate-855'
                  : 'border-slate-200 bg-white text-[#1F3767] hover:bg-slate-50'
              }`}
            >
              <span>Retornar ao ERP Admin</span>
            </button>
          ) : null}

          <button
            onClick={handleLogout}
            className={`flex items-center space-x-1.5 border px-4 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-xl cursor-pointer ${
              theme === 'dark'
                ? 'border-red-950 bg-red-950/20 text-red-400 hover:bg-red-900/30'
                : 'border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100'
            }`}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sair ({currentUser.name.split(' ')[0]})</span>
          </button>
        </div>

        <div className="w-full h-full">
          <SalesPortal 
            sellers={sellers}
            clients={clients}
            products={products}
            orders={orders}
            onAddOrder={handleAddOrder}
            financialRecords={financialRecords}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans antialiased transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0F172A] text-slate-100' : 'bg-[#f8fafc] text-slate-850'
    }`}>
      
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        lowStockCount={lowStockCount}
        unbilledOrdersCount={unbilledOrdersCount}
        pendingBillsCount={pendingBillsCount}
        isDark={theme === 'dark'}
        toggleDarkMode={toggleDarkMode}
        onEnterSalesPortal={() => setUserPortal('vendedor')}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Navigation Topbar */}
        <header id="topbar" className={`h-16 shrink-0 flex items-center justify-between px-4 md:px-8 z-20 border-b transition-colors duration-300 ${
          theme === 'dark' ? 'bg-[#111827] border-slate-800/80 text-white' : 'bg-white border-slate-100 shadow-xs'
        }`}>
          
          {/* Mobile Hamburguer and App Brand */}
          <div className="flex items-center space-x-3 lg:hidden">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className={`p-2 rounded-xl border transition-all active:scale-95 ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-850 text-slate-200'
                  : 'bg-slate-50 border-slate-205 text-[#1F3767]'
              }`}
              title="Abrir marcas"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className={`text-xs font-black tracking-widest ${theme === 'dark' ? 'text-white' : 'text-[#1F3767]'}`}>
              VÉRTICE
            </span>
          </div>

          {/* Left search mock */}
          <div className={`hidden md:flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-lg border w-80 relative ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200/40 text-slate-400'
          }`}>
            <Search className="h-4 w-4" />
            <input 
              type="text" 
              placeholder="Pesquisa global rápida (Ctrl + K)..." 
              className={`bg-transparent border-none focus:outline-none w-full ${
                theme === 'dark' ? 'text-slate-350' : 'text-slate-700'
              }`} 
              readOnly 
            />
          </div>

          {/* Right Action panel */}
          <div className="flex items-center space-x-5">
            
            {/* Database resets */}
            <button
              onClick={resetDatabaseToDefault}
              className={`hidden sm:inline-block text-[10px] font-bold border p-2 py-1 rounded transition-colors cursor-pointer ${
                theme === 'dark' 
                  ? 'text-slate-400 border-slate-800 hover:bg-slate-900 hover:text-slate-200' 
                  : 'text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-slate-600'
              }`}
              title="Restaurar dados originais de simulação"
            >
              Resetar Base
            </button>

            {/* Quick alerts */}
            {lowStockCount > 0 && (
              <div className="flex items-center space-x-1 font-semibold text-amber-500 text-[10px] bg-amber-50/15 border border-amber-500/20 p-1.5 rounded-lg animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span> {lowStockCount} alertas de gôndola</span>
              </div>
            )}

            {/* User credentials */}
            <div className={`hidden sm:flex items-center space-x-3.5 pl-4 border-l ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div className="text-right">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-green block animate-pulse"></span>
                  <span className={`text-xs font-extrabold ${theme === 'dark' ? 'text-slate-250' : 'text-slate-700'}`}>
                    Canal Operador
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold tracking-tight">Terminal ID: #082A</span>
              </div>
            </div>

          </div>

        </header>

        {/* Dynamic transition viewport viewport */}
        <main className={`flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6 pb-24 lg:pb-6 z-10 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-[#0F172A]' : 'bg-[#f8fafc]'
        }`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="min-h-full"
            >
              {activeTab === 'dashboard' && (
                <DashboardBI 
                  products={products}
                  clients={clients}
                  orders={orders}
                  financialRecords={financialRecords}
                  onSettleTransaction={handleSettleTransaction}
                  isDark={theme === 'dark'}
                />
              )}

              {activeTab === 'crm' && (
                <SalesCRM 
                  products={products}
                  clients={clients}
                  orders={orders}
                  onAddOrder={handleAddOrder}
                  onAddClient={handleAddClient}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  initialSubTab="crm"
                />
              )}

              {activeTab === 'pipeline' && (
                <SalesCRM 
                  products={products}
                  clients={clients}
                  orders={orders}
                  onAddOrder={handleAddOrder}
                  onAddClient={handleAddClient}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  initialSubTab={salesSubTab}
                />
              )}

              {activeTab === 'inventory' && (
                <Inventory 
                  products={products}
                  onUpdateProduct={handleUpdateProduct}
                  onReceiveStock={handleReceiveStock}
                  onAddProduct={handleAddProduct}
                  onAddTransaction={handleAddTransaction}
                  isDark={theme === 'dark'}
                />
              )}

              {activeTab === 'finance' && (
                <Finance 
                  financialRecords={financialRecords}
                  onAddTransaction={handleAddTransaction}
                  onSettleTransaction={handleSettleTransaction}
                  products={products}
                  clients={clients}
                  orders={orders}
                />
              )}

              {activeTab === 'virtualCFO' && (
                <VirtualCFO 
                  products={products}
                  clients={clients}
                  orders={orders}
                  financialRecords={financialRecords}
                  sellers={sellers}
                />
              )}

              {activeTab === 'sellers' && (
                <Sellers 
                  sellers={sellers}
                  onUpdateSellers={setSellers}
                  clients={clients}
                  orders={orders}
                  financialRecords={financialRecords}
                  onAddTransaction={handleAddTransaction}
                />
              )}

              {activeTab === 'settings' && (
                <div 
                  id="settings-panel shadow"
                  className={`p-6 rounded-3xl border transition-all duration-300 max-w-4xl space-y-6 ${
                    theme === 'dark' ? 'glass-dark border-slate-800' : 'glass-light border-slate-100 shadow-sm'
                  }`}
                >
                  <div className="border-b border-slate-200/10 pb-4 flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-[#1E94CF]/10 text-[#1E94CF]">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className={`text-base font-black ${theme === 'dark' ? 'text-white' : 'text-[#1F3767]'}`}>
                        Configurações Corporativas do ERP
                      </h4>
                      <p className="text-xs text-slate-400 font-semibold">Conselho geral e gerenciamento do tenant corporativo.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-205'}`}>
                      <h5 className="text-xs font-bold uppercase mb-2">Informações da Plataforma</h5>
                      <div className="space-y-1.5 text-xs">
                        <p className="flex justify-between font-semibold"><span className="text-slate-400">Canal Ativo</span> <span className="text-emerald-400">Sucesso em Escala</span></p>
                        <p className="flex justify-between font-semibold"><span className="text-slate-400">Tenant ID</span> <span className="font-mono">#b2e8a51-vrt</span></p>
                        <p className="flex justify-between font-semibold"><span className="text-slate-400">Uptime Certificado</span> <span>99.991% SLA</span></p>
                      </div>
                    </div>
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-205'}`}>
                      <h5 className="text-xs font-bold uppercase mb-2">Garantia Tributária</h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                        Nossos geradores fiscais de faturamento seguem a regulamentação do ICMS, IPI e PIS/COFINS vigentes sob o Simples Nacional, garantindo 100% de integridade em cada transação financeira reconciliada.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-4 border-t border-slate-200/10">
                    <span>Versão da API: @google/genai@2.4.0 (Gemini 3.5 Flash)</span>
                    <span>Licenciado para: nicolasdeoliveira.dias901@gmail.com</span>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* FLOATING ACTION BUTTON (FAB) FOR MOBILE */}
        <button
          onClick={() => {
            setActiveTab('pipeline');
            setSalesSubTab('new-order');
          }}
          className="lg:hidden fixed bottom-20 right-4 z-45 bg-gradient-to-r from-[#1E94CF] to-[#8BC039] text-white p-3.5 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all font-black uppercase text-[10px] tracking-wider outline-none border-none cursor-pointer hover:brightness-110"
          title="Nova Venda"
        >
          <span className="text-sm mr-1 font-bold">+</span> Nova Venda
        </button>

        {/* BOTTOM FIXED INTERFERENCE FOR MOBILE NAVIGATION */}
        <nav className={`lg:hidden fixed bottom-0 left-0 right-0 h-16 border-t z-50 flex items-center justify-around px-2 ${
          theme === 'dark' 
            ? 'bg-[#111827] border-slate-850 text-slate-400' 
            : 'bg-white border-slate-200 text-slate-500 shadow-[0_-3px_15px_rgba(0,0,0,0.06)]'
        }`}>
          {[
            { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard },
            { id: 'finance', label: 'Finanças', icon: DollarSign },
            { id: 'inventory', label: 'Estoque', icon: Boxes },
            { id: 'crm', label: 'Clientes', icon: Users },
            { id: 'virtualCFO', label: 'CFO IA', icon: Cpu },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'crm') setSalesSubTab('crm');
                  if (tab.id === 'pipeline') setSalesSubTab('pipeline');
                }}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all text-center min-h-[44px] min-w-[44px] active:scale-95 ${
                  isCurrent
                    ? theme === 'dark' ? 'text-[#1E94CF]' : 'text-[#1E94CF]'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <IconComp className={`h-5 w-5 ${isCurrent ? 'scale-110 mb-0.5' : 'mb-0.5'}`} />
                <span className="text-[9px] font-black tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </nav>

      </div>
    </div>
  );
}
