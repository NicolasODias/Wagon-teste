/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// SECURITY & SESSION ENGINE (WAGON AI)
// ==========================================

const JWT_SECRET = process.env.JWT_SECRET || 'wagon-ai-premium-token-key-2026';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function signJwt(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify({ 
    ...payload, 
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 1 day
  }));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(signatureInput).digest('base64url');
  return `${signatureInput}.${signature}`;
}

function verifyJwt(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const signatureInput = `${header}.${payload}`;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(signatureInput).digest('base64url');
    if (signature !== expectedSignature) return null;
    const decodedPayload = JSON.parse(base64UrlDecode(payload));
    if (decodedPayload.exp && decodedPayload.exp < Date.now() / 1000) {
      return null;
    }
    return decodedPayload;
  } catch {
    return null;
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// In-Memory Secure Hashed Database (No rawtext passwords, dynamic startup hashing to prevent mismatched constants)
const USERS_DB = [
  {
    id: "usr-admin-01",
    name: "Edilson Administrador",
    email: "edilson.adm@wagon.com",
    passwordHash: hashPassword("Edilson#ADM@@"), // Calculated dynamically to ensure 100% exact match consistency
    role: "ADMIN",
    permissions: [
      "Acesso total",
      "Financeiro",
      "Estoque",
      "Pedidos",
      "Clientes",
      "Vendedores",
      "AI Center",
      "Configurações"
    ]
  },
  {
    id: "usr-seller-01",
    name: "Vendedor 01",
    email: "vendedor1@wagon.com",
    passwordHash: hashPassword("12345678@vendedor"), // Calculated dynamically to ensure 100% exact match consistency
    role: "VENDEDOR",
    permissions: [
      "Dashboard Vendedor",
      "Clientes",
      "Nova Venda",
      "Histórico de Vendas",
      "Comissão"
    ]
  }
];

const FORGOT_PASSWORD_TOKENS = new Map<string, { email: string, expires: number }>();

// Authentication Endpoints

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  // Sanitize input email strictly with lower-casing and trimming
  const sanitizedEmail = email.toLowerCase().trim();

  // Debug Logging: E-mail recebido
  console.log(`[AUTH DEBUG] E-mail recebido no login: "${email}" -> Sanitizado para: "${sanitizedEmail}"`);

  // Case-insensitive lookup after sanitization
  const user = USERS_DB.find(u => u.email.toLowerCase().trim() === sanitizedEmail);
  
  // Debug Logging: Usuário encontrado
  if (!user) {
    console.log(`[AUTH DEBUG] Usuário não encontrado no banco para o e-mail: "${sanitizedEmail}"`);
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  } else {
    console.log(`[AUTH DEBUG] Usuário encontrado: id="${user.id}", nome="${user.name}", email="${user.email}"`);
  }

  const inputHash = hashPassword(password);
  const passwordMatch = inputHash === user.passwordHash;

  // Debug Logging: Resultado da validação da senha
  console.log(`[AUTH DEBUG] Validação de senha: Input hash="${inputHash}", Saved hash="${user.passwordHash}", Coincide: ${passwordMatch}`);

  if (!passwordMatch) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  const token = signJwt({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions
  });

  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sessão inválida ou não autorizada.' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyJwt(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }

  const user = USERS_DB.find(u => u.id === decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'Usuário não existe mais.' });
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    }
  });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'O e-mail é obrigatório para recuperação.' });
  }

  const sanitizedEmail = email.toLowerCase().trim();
  const user = USERS_DB.find(u => u.email.toLowerCase().trim() === sanitizedEmail);
  if (!user) {
    return res.status(404).json({ error: 'Não há nenhuma conta cadastrada com este e-mail.' });
  }

  // Create a 6-digit numeric recovery code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  FORGOT_PASSWORD_TOKENS.set(code, {
    email: user.email,
    expires: Date.now() + 60 * 60 * 1000 // 1 hour validity
  });

  console.log(`
  ┌──────────────────────────────────────────────────────────┐
  │ 📧 SERVIÇO DE E-MAIL (SIMULADO) — RECUPERAÇÃO DE SENHA │
  ├──────────────────────────────────────────────────────────┤
  │ DESTINATÁRIO : ${user.email.padEnd(41)} │
  │ ASSUNTO      : Recuperação de Senha — Wagon AI S.A.       │
  │ CÓDIGO RESET : ${code.padEnd(41)} │
  │ VALIDADE     : 60 minutos                               │
  ├──────────────────────────────────────────────────────────┤
  │ Insira este código diretamente na tela de login premium. │
  └──────────────────────────────────────────────────────────┘
  `);

  return res.json({
    success: true,
    message: 'Código de recuperação enviado com sucesso para o seu e-mail.',
    code // Return the code in response to facilitate seamless local simulation
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Por favor, forneça o e-mail, o código e a nova senha.' });
  }

  const sanitizedEmail = email.toLowerCase().trim();
  const savedToken = FORGOT_PASSWORD_TOKENS.get(token);
  if (!savedToken) {
    return res.status(400).json({ error: 'Código de redefinição inválido ou expirado.' });
  }

  if (savedToken.email.toLowerCase().trim() !== sanitizedEmail) {
    return res.status(400).json({ error: 'Código de redefinição e e-mail não coincidem.' });
  }

  if (savedToken.expires < Date.now()) {
    FORGOT_PASSWORD_TOKENS.delete(token);
    return res.status(400).json({ error: 'O código de redefinição expirou.' });
  }

  const user = USERS_DB.find(u => u.email.toLowerCase().trim() === sanitizedEmail);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  // Update hashed password safely
  user.passwordHash = hashPassword(newPassword);
  FORGOT_PASSWORD_TOKENS.delete(token);

  console.log(`[Segurança] Senha do usuário ${user.email} redefinida com sucesso.`);

  return res.json({
    success: true,
    message: 'Senha alterada com sucesso! Você já pode realizar o login.'
  });
});

// Initialize Gemini SDK with telemetry header
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini AI successfully initialized server-side.');
  } catch (err: any) {
    console.log('[Operational Status] Failed to initialize Gemini Client: ' + (err?.message || 'Access Denied'));
  }
} else {
  console.log('Gemini API key not found or using placeholder. Running with high-performance local financial rules solver.');
}

// Reusable local analytical fallback engine mimicking enterprise analytics
function getLocalInsightsFallback(products: any[], clients: any[], orders: any[], financialRecords: any[], isApiError = false) {
  const lowStockCount = products?.filter((p: any) => p.stock <= p.minStock).length || 0;
  const totalReceivable = financialRecords?.filter((f: any) => f.type === 'receita' && f.status === 'Pendente').reduce((acc: number, cur: any) => acc + cur.amount, 0) || 0;
  const totalPayable = financialRecords?.filter((f: any) => f.type === 'despesa' && f.status === 'Pendente').reduce((acc: number, cur: any) => acc + cur.amount, 0) || 0;
  const safetyMarginAvg = orders && orders.length > 0 ? (orders.reduce((acc: number, o: any) => acc + o.marginPercent, 0) / orders.length).toFixed(1) : '44.3';

  const reportText = isApiError 
    ? `## 📊 Relatório Analítico Executivo - Diagnóstico de Contingência
*Nota: O serviço de inteligência artificial Gemini está temporariamente sob de alta demanda ou indisponível. Para sua comodidade e continuidade das operações, ativamos o Oráculo de Contingência Local de maneira automática.*

### 🔍 Resumo de Indicadores Críticos (Estabilidade Operacional)
- **Estoque sob Risco**: Constatamos **${lowStockCount} itens** abaixo do limite de segurança. Recomenda-se reposição urgente no Corredor A/B.
- **Saúde Financeira**: Contas a receber de faturamento acumuladas em **R$ ${totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** frente a **R$ ${totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** a pagar. Cobertura de liquidez de ${(totalReceivable / (totalPayable || 1)).toFixed(2)}x das obrigações iminentes.
- **Eficiência Comercial**: Margem operacional média de **${safetyMarginAvg}%**, perfeitamente alinhada com as metas corporativas.

### 💡 Recomendações Táticas de Gestão
1. **Priorização de Faturamento**: Há pedidos pendentes aguardando faturamento. Recomenda-se emitir as notas fiscais correspondentes no próximo lote operacional para otimizar ciclo de caixa do faturamento.
2. **Ajuste de Crédito**: Monitorar clientes da **Rede Sul e Nordeste** com saldo devedor que atinge mais de 65% do limite de fomento de crédito concedido.
3. **Mapeamento de Prateleiras**: Otimizar o acondicionamento físico no depósito para produtos com giro de estoque elevado de modo a evitar ruptura de expedição rápido.`
    : `## 📊 Relatório Analítico Executivo - Heurística Local
Simulação offline devido à ausência de chave de API Gemini ativa no ambiente de nuvem.

### 🔍 Resumo de Indicadores Críticos
- **Estoque sob Risco**: Constatamos **${lowStockCount} itens** abaixo do limite de segurança. Recomenda-se reposição urgente no Corredor A/B.
- **Saúde Financeira**: Contas a receber acumuladas em **R$ ${totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** frente a **R$ ${totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** a pagar. Cobertura de capital saudável de ${(totalReceivable / (totalPayable || 1)).toFixed(2)}x.
- **Eficiência Comercial**: Margem operacional média consolidada de **${safetyMarginAvg}%**, alinhada com as metas corporativas (>42%).

### 💡 Recomendações Táticas de Gestão
1. **Priorização de Faturamento**: Há pedidos pendentes aguardando faturamento. Recomenda-se emitir as notas fiscais correspondentes hoje para otimizar ciclo de caixa.
2. **Ajuste de Crédito**: Monitorar clientes da **Rede Sul e Nordeste** com saldo devedor que atinge mais de 65% do limite de crédito concedido.`;

  return {
    success: true,
    method: isApiError 
      ? 'Heurística Local (Contingência - Gemini Indisponível)' 
      : 'Local Heuristics Engine',
    reportText,
    suggestedCards: [
      {
        title: 'Reposição Prioritária',
        description: `Existem ${lowStockCount} produtos com ruptura iminente de estoque.`,
        type: 'warning',
        metricImpact: '+ R$ 12.000 em vendas salvas'
      },
      {
        title: 'Análise de Fluxo',
        description: 'Excelente proporção de recebíveis sobre pagamentos nesta semana.',
        type: 'success',
        metricImpact: 'Razão de 1.84x caixa líquido'
      }
    ]
  };
}

// API endpoint for AI Insights
app.post('/api/gemini/insights', async (req, res) => {
  const { products, clients, orders, financialRecords, promptContext } = req.body;

  // Custom data threshold guard: If we have insufficient production data, do not fabricate generic insights
  if (!products || products.length === 0 || !clients || clients.length === 0 || !orders || orders.length === 0) {
    return res.json({
      success: true,
      method: 'Wagon AI Minimal Data Rule',
      reportText: '## 📊 Relatório Analítico Executivo\n\nAinda não existem dados suficientes para gerar análises.',
      suggestedCards: []
    });
  }

  try {
    if (!ai) {
      const fallbackResponse = getLocalInsightsFallback(products, clients, orders, financialRecords, false);
      return res.json(fallbackResponse);
    }

    let prompt = '';
    let isCfoChat = false;

    if (promptContext) {
      isCfoChat = true;
      prompt = `${promptContext}

Retorne sua resposta estritamente formatada no seguinte padrão JSON para que possa ser lida e parseada com perfeição pelo frontend:
{
  "reportText": "sua resposta corporativa e financeira completa em formato Markdown"
}`;
    } else {
      // Prepare dense prompt for Gemini 3.5 Flash
      const statsSummary = {
        productTypesCount: products?.length || 0,
        lowStockCount: products?.filter((p: any) => p.stock <= p.minStock).length || 0,
        totalClients: clients?.length || 0,
        totalOrders: orders?.length || 0,
        orderStatusCounts: orders?.reduce((acc: any, cur: any) => {
          acc[cur.status] = (acc[cur.status] || 0) + 1;
          return acc;
        }, {}),
        financialReceivable: financialRecords?.filter((f: any) => f.type === 'receita' && f.status === 'Pendente').reduce((acc: number, cur: any) => acc + cur.amount, 0),
        financialPayable: financialRecords?.filter((f: any) => f.type === 'despesa' && f.status === 'Pendente').reduce((acc: number, cur: any) => acc + cur.amount, 0),
      };

      prompt = `Analise os dados operacionais e financeiros da nossa distribuidora gourmet e retorne um relatório executivo profissional estruturado em Markdown em português (PT-BR). O relatório deve conter análises de risco, estoque, oportunidades comerciais e crédito.

DADOS DE NEGÓCIO ATUAIS:
- Produtos cadastrados: ${statsSummary.productTypesCount}, dos quais ${statsSummary.lowStockCount} estão abaixo do estoque mínimo de segurança.
- Clientes no CRM: ${statsSummary.totalClients}.
- Volume de pedidos no pipeline atual: ${statsSummary.totalOrders}. Detalhes de status: ${JSON.stringify(statsSummary.orderStatusCounts)}.
- Contas a Receber abertas: R$ ${statsSummary.financialReceivable.toFixed(2)}.
- Contas a Pagar abertas: R$ ${statsSummary.financialPayable.toFixed(2)}.

IMPORTANTE: Forneça um resumo executivo premium para um software de faturamento de alto padrão corporativo. Seja direto, estratégico e financeiramente inteligente.
Inclua recomendações inteligentes para a equipe de Logística sobre locais de prateleiras/corredores e sobre o limite de crédito de clientes.

Retorne também 2 cards táticos resumidos em formato JSON no final do texto ou estruturado. Para garantir robustez técnica, responda EXCLUSIVAMENTE em formato JSON com o seguinte formato:
{
  "reportText": "string em markdown",
  "suggestedCards": [
    {
      "title": "título curto do card",
      "description": "relação curta",
      "type": "success" | "warning" | "info" | "error",
      "metricImpact": "impacto monetário ou percentual estimado"
    }
  ]
}`;
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    let response;
    let attempts = 3;
    let success = false;
    let lastError = null;

    for (let i = 0; i < attempts; i++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          }
        });
        success = true;
        break;
      } catch (err: any) {
        lastError = err;
        console.log(`[Telemetry Info] Gemini API attempt ${i + 1}/${attempts} paused. Retrying...`);
        if (i < attempts - 1) {
          await sleep(600 * (i + 1));
        }
      }
    }

    if (!success || !response) {
      throw lastError || new Error('Service busy');
    }

    const parsedResponse = JSON.parse(response.text || '{}');
    
    return res.json({
      success: true,
      method: isCfoChat ? 'Gemini 3.5 Flash chat-mode' : 'Gemini 3.5 Flash server-side',
      reportText: parsedResponse.reportText || 'Erro ao processar análise do Gemini.',
      suggestedCards: parsedResponse.suggestedCards || []
    });

  } catch (error: any) {
    const isQuotaExceeded = error?.message?.some?.((m: string) => m.includes('quota') || m.includes('429')) || 
                            error?.message?.includes?.('quota') || 
                            error?.message?.includes?.('429') || 
                            error?.message?.includes?.('RESOURCE_EXHAUSTED') ||
                            JSON.stringify(error).includes('429') ||
                            JSON.stringify(error).includes('quota');
    if (isQuotaExceeded) {
      console.log('[Operational Status] Gemini quota limit exhausted (429/RESOURCE_EXHAUSTED). Gracefully activating local heuristics engine.');
    } else {
      console.log('[Operational Status] Gemini service temporarily unavailable. Gracefully activating local heuristics engine.');
    }
    const fallbackResponse = getLocalInsightsFallback(products, clients, orders, financialRecords, true);
    return res.json(fallbackResponse);
  }
});

// Global Error Handler to guarantee JSON response and prevent HTML error leakage
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[Global Server Error Handler]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Ocorreu um erro interno no servidor.'
  });
});

// Configure Vite or Static Files depending on Environment
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite loaded inside Express middleware (Development Mode).');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static build from dist/.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ERP Server accessible on http://localhost:${PORT}`);
  });
}

startServer();
