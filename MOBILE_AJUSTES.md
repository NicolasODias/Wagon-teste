# Ajustes mobile aplicados

Pacote ajustado para melhorar a estética e a usabilidade em celulares sem alterar a integração com Vercel/Supabase.

## Principais alterações

- Adicionado suporte a `viewport-fit=cover` para respeitar notch e área segura do celular.
- Criadas classes globais de layout mobile em `src/index.css`.
- Ajustada a navegação inferior com `safe-area-inset-bottom`.
- Ajustado o botão flutuante de nova venda para não ficar colado na barra inferior.
- Ajustado o menu lateral para ocupar largura adequada no celular.
- Convertidas tabelas densas em cards no mobile nos módulos:
  - Financeiro
  - Estoque
  - Auditoria de estoque
  - Vendedores
  - Comissões do vendedor
  - Carrinho / revisão de venda
  - Itens de nota / pedido público
  - Cesta de produtos do CRM
- Ajustados filtros, abas e grids para evitar rolagem lateral desnecessária.
- Melhorado o layout mobile do login.
- Ajustado o painel CFO Virtual para não forçar altura/tamanho excessivos em telas pequenas.
- Corrigida a tipagem do Vite adicionando `src/vite-env.d.ts`, permitindo `npm run lint` sem erro no `import.meta.env`.
- Corrigido o gráfico mobile do dashboard para usar a data atual dinamicamente, em vez de uma data fixa.

## Validação local

Executado com sucesso:

```bash
npm run lint
npm run build
```

O build final gera apenas o aviso padrão de bundle grande do Vite, sem quebrar a publicação.

## Deploy

Para publicar no Vercel:

1. Substitua os arquivos do projeto atual por este pacote.
2. Garanta que as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` continuam configuradas no painel da Vercel.
3. Faça um novo deploy, de preferência com redeploy sem cache se a interface antiga persistir.

Observação: o arquivo `.env` local não foi incluído neste pacote para evitar expor chaves. Use as variáveis já configuradas na Vercel.
