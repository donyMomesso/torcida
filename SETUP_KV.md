# Como ativar o banco de dados de leads (Cloudflare KV)

## Passo 1 — Criar o KV Namespace no Cloudflare

1. Acesse https://dash.cloudflare.com
2. Vá em **Workers & Pages** → **KV**
3. Clique em **Create a namespace**
4. Nome: `pappi-leads`
5. Clique em **Add**
6. Copie o **ID** gerado (ex: `abc123def456...`)

## Passo 2 — Atualizar o wrangler.jsonc

Substitua `SUBSTITUA_PELO_ID_DO_KV` pelo ID copiado:

```json
"kv_namespaces": [
  {
    "binding": "LEADS_KV",
    "id": "SEU_ID_AQUI",
    "preview_id": "SEU_ID_AQUI"
  }
]
```

## Passo 3 — Definir a senha do painel admin

No Cloudflare Dashboard:
1. Vá em **Workers & Pages** → **torcida** → **Settings** → **Variables**
2. Adicione uma variável de ambiente:
   - Nome: `ADMIN_PASSWORD`
   - Valor: (escolha uma senha forte)
3. Clique em **Save**

## Passo 4 — Fazer deploy

```bash
npx wrangler deploy
```

## Acessar o painel

Após o deploy, acesse:
```
https://torcida.pappipizza.com.br/admin
```

Digite a senha que você definiu no Passo 3.

## O que você verá no painel

- Total de leads capturados
- Leads por time (ranking)
- Clientes recorrentes
- Lista completa com WhatsApp, time e data
- Botão para exportar CSV e disparar no WhatsApp
