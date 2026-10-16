# Checklist de Instalação Multimídia Nissan

Sistema web para digitalizar o **CHECK LIST – INSTALAÇÃO MULTIMÍDIA**: preenchimento digital com leitura de chassi por scanner, salvamento automático no PostgreSQL, consulta, relatórios e PDF fiel ao formulário (individual e em lote do dia, com separação para impressão frente e verso).

**Um único projeto Next.js** faz front-end e back-end: telas em `app/`, API REST em `app/api/*` (route handlers). Banco: PostgreSQL via **Prisma ORM**. PDF: HTML/CSS A4 convertido com **Playwright (Chromium)**. Validação: **Zod**. Autenticação: JWT (`jose`) + senhas com `bcryptjs`.

```
nissan-checklist-multimidia/
├── app/
│   ├── api/                 # BACK-END (rotas REST: auth, users, checklists, reports, pdf)
│   ├── (app)/               # telas: dashboard, checklists, novo, imprimir do dia, relatórios, usuários
│   └── login/
├── components/  hooks/  services/  types/   # FRONT-END
├── lib/
│   ├── shared/              # catálogo de itens + regras de validação (usado por servidor E interface)
│   └── server/              # serviços: checklists, reports, users, auth, pdf, template do PDF
├── prisma/                  # schema.prisma, migrations, seed.ts
├── assets/                  # coloque aqui nissan-logo.png
├── tests/                   # Vitest (unitários, PDF, integração)
├── docker-compose.yml  .env.example
```

## 1. Pré-requisitos (Windows)

- **Node.js 20 ou superior** (`node -v`).
- **PostgreSQL 16**: Docker Desktop (usa o `docker-compose.yml`) **ou** PostgreSQL instalado (crie os bancos `checklist` e, para testes, `checklist_test`).
- Para PDF: Chromium do Playwright (`npm run browsers:install`) **ou** Edge/Chrome via `CHROMIUM_PATH`.

## 2. Instalação e inicialização

No PowerShell, dentro da pasta do projeto:

```powershell
Copy-Item .env.example .env        # EDITE: senha do banco, DATABASE_URL, JWT_SECRET, SEED_ADMIN_PASSWORD
docker compose up -d               # PostgreSQL (se usar Docker)
npm install                        # também roda "prisma generate"
npm run db:migrate                 # aplica as migrations
npm run db:seed                    # cria o usuário administrador (SEED_ADMIN_*)
npm run browsers:install           # baixa o Chromium usado nos PDFs (uma vez)
npm run dev                        # http://localhost:3000  (API em /api)
```

Entre com o usuário/senha do seed e **troque a senha** em *Usuários*. Produção: `npm run build` e `npm start`.
**Nunca versione o arquivo `.env`.** Use um `JWT_SECRET` longo e aleatório.

**Logotipo Nissan:** copie o logotipo extraído das imagens do formulário para `assets/nissan-logo.png` (ou aponte `LOGO_PATH`). Sem o arquivo o PDF mostra uma caixa “LOGO NISSAN” no lugar.

**Edge no lugar do Chromium:** `CHROMIUM_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`

## 3. Operação

1. **Novo Checklist** → o cursor já fica em **Chassi**; o scanner USB/Bluetooth (modo teclado) preenche e o **Enter** só confirma a leitura. Chassi fora do padrão VIN gera aviso, não bloqueio.
2. Preencha as 7 seções (abas). Tudo é salvo automaticamente (“Salvando… / Salvo / Erro ao salvar”); em falha de rede os dados ficam na tela e são reenviados.
3. **Finalizar checklist** valida todos os obrigatórios; rascunhos incompletos podem ser salvos sempre.
4. Finalizado só é corrigido por **ADMIN**, com histórico (usuário, data, campos alterados).
5. **Imprimir todos do dia** → data, turno, conferência da lista/páginas → **Baixar PDF** ou **Abrir para imprimir**. “Página em branco entre veículos” insere 1 página em branco após cada veículo (exceto o último) para o seguinte começar na frente de nova folha. A impressão duplex depende da configuração da impressora.

**Perfis:** ADMIN (tudo, usuários, correção e cancelamento) · OPERATOR (cria, preenche, finaliza) · VIEWER (consulta e exporta). Permissões são aplicadas **no servidor**, em toda rota.

**Datas:** `checklistDate`/`repairDate` são datas de calendário (coluna `DATE`); `checklistTime` é `HH:mm` no horário da planta (`APP_TIMEZONE`); `createdAt/updatedAt/finalizedAt` são instantes UTC.

**Indicadores:** Aprovados/Reprovados contam só checklists *finalizados* e seguem o resultado marcado pelo inspetor. “Pendência de reparo” = há item NOK ou auditoria reprovada e o reparo não está OK nem “não se aplica”.

## 4. Testes

```powershell
npm test     # unitários (catálogo, chassi, regras, template/páginas), PDF (Chromium) e integração
```
- Os testes de PDF validam 3 páginas A4 por veículo, separadores e ausência de conteúdo cortado; são ignorados se o Chromium não estiver instalado.
- A **integração** roda só se `DATABASE_URL_TEST` estiver definido (banco cujo nome **termina em `_test`**, que é limpo a cada teste):
  ```powershell
  $env:DATABASE_URL = "<mesma URL de DATABASE_URL_TEST>"; npx prisma migrate deploy
  npm test
  ```

## 5. Backup e restauração (PostgreSQL via Docker)

```powershell
docker compose exec db sh -c "pg_dump -U checklist -Fc checklist -f /backups/checklist-$(date +%F).dump"
docker compose exec db sh -c "pg_restore -U checklist -d checklist --clean --if-exists /backups/NOME-DO-ARQUIVO.dump"
```
Os arquivos ficam em `.\backups`. Agende o backup (Agendador de Tarefas) e guarde cópias fora do servidor; teste a restauração periodicamente.

## 6. API (`/api`)

`POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `GET|POST /checklists` · `GET|PATCH /checklists/:id` · `POST /checklists/:id/finalize|cancel` · `GET /checklists/:id/history` (ADMIN) · `GET /checklists/search/chassis/:chassis` · `GET /reports/summary|daily|nonconformities` · `GET /checklists/:id/pdf` · `POST /reports/daily/pdf` · `GET|POST /users` · `PATCH /users/:id` · `PATCH /users/:id/active`.

Erros seguem o formato `{ statusCode, message, errors? }`. Erros de validação listam os campos pendentes.

## 7. Limitações e pontos de atenção

- **Fidelidade visual do PDF:** o layout foi construído pela descrição textual do formulário (as 3 imagens de referência não foram recebidas). Compare com a folha física e ajuste em `lib/server/pdf-template.ts` (constante `CSS` e funções `page1/2/3`), inclusive em quais páginas o título aparece.
- Documentação Swagger do NestJS não existe mais; a lista de endpoints está acima.
- O limite de tentativas de login é em memória (por processo); com vários servidores, use um proxy/WAF.
- Logout é *stateless* (JWT descartado no cliente); tokens expiram em `JWT_EXPIRES_IN`.
- A geração de PDF exige servidor Node com Chromium (não funciona em hospedagem serverless sem esse navegador).
- `firmwareUpdatedStatus` do prompt é representado pelo item `SOF_01` (OK/NOK).
- Exclusão lógica existe no schema (`deletedAt`), mas a interface oferece *cancelar*. O histórico de auditoria é consultável só pela API.

# CHECK-LIST-VPC
