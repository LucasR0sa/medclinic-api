# MedClinic API

API REST de uma clínica médica: cadastro de pacientes e médicos, escala de trabalho por turno, agendamento de consultas sem conflito (inclusive sob concorrência) e prontuário com acesso restrito ao médico que atendeu.

**Escopo desta etapa (Projeto de Recuperação, Módulo 02):** todo o contrato da Seção 4.9 do enunciado, mais os requisitos adicionais da recuperação: documentação OpenAPI/Swagger (RA1) e log estruturado por resposta (RA2).

| | |
| :-- | :-- |
| **API publicada** | https://medclinic-api-k5m8.onrender.com |
| **Health** | https://medclinic-api-k5m8.onrender.com/api/v1/health |
| **Swagger (RA1)** | https://medclinic-api-k5m8.onrender.com/v1/docs |
| **Board do projeto** | BOARD_URL |

> O plano gratuito do Render suspende o serviço após 15 minutos sem uso. O workflow `keep-alive.yml` chama o health a cada 5 minutos para mantê-lo acordado. Se ainda assim a primeira resposta demorar, é o serviço voltando sozinho.

---

## Tecnologias

| Camada | Escolha |
| :-- | :-- |
| Linguagem | TypeScript 6 (`strict`), Node.js 22 |
| HTTP | Express 5 |
| Banco | PostgreSQL 17 (local, via Docker) / Neon (produção, com SSL) |
| ORM | TypeORM 0.3, com migrations escritas à mão em SQL |
| Validação | Zod 4 |
| Autenticação | JWT (HS256, `jsonwebtoken`) + bcrypt (`bcryptjs`) |
| Testes | Vitest 4 + cobertura V8 |
| Documentação | OpenAPI 3 + `swagger-ui-express` |
| Entrega | Docker multi-stage, GitHub Actions, GHCR, Render |

---

## Como executar localmente

**Pré-requisitos:** Node.js 22+, npm e Docker.

```bash
# 1. Dependências
npm ci

# 2. Variáveis de ambiente: copie o exemplo e troque as senhas
cp .env.example .env

# 3. Banco PostgreSQL local (lê DB_USER, DB_PASSWORD, DB_NAME e DB_PORT do .env)
docker compose up -d

# 4. API em modo desenvolvimento (aplica as migrations na inicialização)
npm run dev
```

A API sobe em `http://localhost:3000/api/v1` e o Swagger em `http://localhost:3000/v1/docs`.

### Comandos

| Comando | O que faz |
| :-- | :-- |
| `npm run dev` | Sobe a API com recarga automática (tsx watch) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Executa a versão compilada (`node dist/main.js`) |
| `npm run typecheck` | Confere os tipos sem gerar arquivos |
| `npm run migration:run` | Aplica as migrations pendentes |
| `npm run migration:revert` | Desfaz a última migration |
| `npm test` | Roda os testes unitários |
| `npm run test:cov` | Roda os testes com cobertura (reprova abaixo de 80%) |

As migrations também rodam sozinhas na inicialização da aplicação (`dataSource.runMigrations()` em `main.ts`). Assim o banco publicado é sempre criado pelas migrations, e nunca por `synchronize`, que está desligado.

### Variáveis de ambiente

Todas são validadas na inicialização (`src/config/env.ts`). Se faltar alguma ou o formato estiver errado, a API **não sobe** e diz qual variável está com problema, sem mostrar o valor.

| Variável | Papel | Exemplo / padrão |
| :-- | :-- | :-- |
| `NODE_ENV` | Ambiente de execução | `development` |
| `PORT` | Porta HTTP (no Render, a plataforma define) | `3000` |
| `DB_HOST` | Endereço do PostgreSQL | `localhost` |
| `DB_PORT` | Porta do PostgreSQL (5433 no local, para não conflitar com um Postgres nativo) | `5432` |
| `DB_USER` | Usuário do banco | `medclinic` |
| `DB_PASSWORD` | Senha do banco | segredo |
| `DB_NAME` | Nome do banco | `medclinic` |
| `DB_SSL` | `true` exige conexão criptografada (obrigatório no Neon) | `false` |
| `JWT_SECRET` | Segredo que assina os tokens (32+ caracteres aleatórios) | segredo |
| `JWT_EXPIRES_IN` | Validade do token, em segundos | `3600` |
| `ADMIN_NAME` | Nome do primeiro administrador (seed) | `Administrador` |
| `ADMIN_EMAIL` | E-mail do primeiro administrador (seed) | `admin@medclinic.com` |
| `ADMIN_PASSWORD` | Senha do primeiro administrador (seed, 8+ caracteres) | segredo |

O `.env` não é versionado; o `.env.example` lista todas as chaves sem valores reais. Em produção, as variáveis ficam no painel do Render.

---

## Arquitetura

Arquitetura em camadas. A requisição atravessa cada uma num sentido só, e cada camada conhece apenas a de baixo:

```
rota → middlewares (autenticação, perfil) → controller → service → repository (porta) → banco
```

| Camada | Pasta | Responsabilidade |
| :-- | :-- | :-- |
| Rotas | `src/routes` | URL + verbo → middlewares → controller. Declara o perfil exigido por rota. |
| Middlewares | `src/middlewares` | `authenticate` (401), `authorize` (403), log estruturado (RA2) e o tratador de erro único. |
| Controllers | `src/controllers` | Validam a entrada com o DTO, chamam o service e escolhem o status HTTP. Nenhuma regra de negócio. |
| DTOs | `src/dtos` | Schemas Zod de entrada e o formato de saída. A entidade nunca é devolvida direto (a senha não sai). |
| Services | `src/services` | **Regra de negócio**: escala, grade, conflito, transição de status, vínculo do prontuário. |
| Repositórios | `src/repositories` | Porta (interface) + implementação TypeORM. Os services dependem só da porta. |
| Entidades | `src/entities` | Formato das tabelas para o TypeORM. |
| Banco | `src/database` | DataSource, migrations e tradução de erros do Postgres. |
| Segurança | `src/security` | Portas e implementações de hash de senha e token. |
| Compartilhado | `src/shared` | Paginação, fuso da clínica, validação, logger. |
| Composição | `src/container.ts` | Único lugar que instancia e encaixa as peças (injeção de dependência pelo construtor). |

### Decisões de modelagem

- **Erro de domínio separado do HTTP.** Os services lançam `AppError` com um código do contrato (`HORARIO_INDISPONIVEL`). O único lugar que traduz código em status (409, 422...) é `error-handler.middleware.ts` (RP03). Um erro não previsto vira `500 ERRO_INTERNO`, sem detalhes na resposta; o stack trace vai só para o log.
- **Unicidade garantida pelo banco (RP04).** E-mail, CPF e CRM têm restrição `UNIQUE` no banco. O service faz uma checagem amigável antes, mas quem decide numa corrida é o banco, e o repositório traduz o erro `23505` para `EMAIL/CPF/CRM_JA_CADASTRADO`.
- **Médico e usuário na mesma transação (RN03).** `createWithUser` grava os dois dentro de `dataSource.transaction`. Se o CRM for recusado, o usuário é desfeito no ROLLBACK.
- **Agendamento sob concorrência (RN10).** A verificação de conflito e a gravação acontecem numa transação que começa com `SELECT ... FOR UPDATE` na **linha do médico** (e na do paciente). Requisições simultâneas para o mesmo médico entram em fila; a segunda já enxerga a consulta da primeira e recebe 409. Trava-se o médico, e não as consultas, porque numa agenda vazia não haveria consulta para travar.
- **Sobreposição é interseção, não igualdade de início.** `a.início < b.fim && b.início < a.fim` (estrito: encostado não conflita), numa função só (`period.service.ts`), usada para turnos e consultas.
- **Fuso da clínica.** Instantes são guardados em `timestamptz` (UTC) e devolvidos com `Z`. A escala é hora de relógio de `America/Sao_Paulo`; `clinic-time.ts` converte o instante para dia da semana e minuto local. Os turnos ficam guardados em minutos desde a meia-noite.
- **A consulta guarda o próprio fim (RN15).** `endsAt` é calculado no agendamento a partir do turno; mudar a escala depois não altera consultas já marcadas.
- **Transição de status sem corrida.** `UPDATE ... WHERE status = <status lido>`: se outra requisição mudou antes, nada é alterado e a resposta é 422.
- **Paciente com remoção lógica.** `deleted_at` preserva consultas e prontuários; o índice único de CPF é parcial (`WHERE deleted_at IS NULL`).
- **Primeiro admin por seed.** A migration `SeedAdmin` cria o administrador a partir de `ADMIN_*`. Nenhuma rota pública cria admin (RF13).

### Padrão de nomes (RNF06)

| O quê | Padrão | Exemplo |
| :-- | :-- | :-- |
| Arquivos | `kebab-case` + sufixo do papel | `appointment.service.ts`, `typeorm-patient.repository.ts` |
| Classes e interfaces | `PascalCase` | `AppointmentService`, `PatientRepository` |
| Variáveis, funções, campos JSON | `camelCase` | `slotDurationMinutes`, `findByCpf` |
| Tabelas e colunas | `snake_case`, tabelas no plural | `work_shifts.slot_duration_minutes` |
| Restrições e índices | prefixo do tipo + tabela + coluna | `uq_patients_cpf`, `ck_appointments_status`, `ix_appointments_doctor_starts` |
| Migrations | `<timestamp>-<acao>.ts` | `1794842477045-create-appointments.ts` |
| Códigos de erro | `MAIUSCULAS_COM_UNDERSCORE` | `HORARIO_FORA_DA_ESCALA` |
| Branches | `tipo/assunto` | `feat/agendamento`, `ci/deploy` |
| Commits | Conventional Commits no imperativo | `feat: impede agendamento duplicado com lock na linha do medico` |

---

## Testes e recorte da cobertura

Testes **unitários** sobre a camada de regra de negócio, com dublês em memória construídos sobre as portas de repositório (`tests/doubles`). Nenhum teste depende de banco, rede ou variável de ambiente.

**Recorte da cobertura:** `src/**/*.service.ts`, com limiar de 80% em lines, branches, functions e statements (`vitest.config.mts`). Todo arquivo de regra de negócio termina em `.service.ts`, então o recorte é uma linha e cobre automaticamente qualquer service novo. Controllers, entidades, migrations e repositórios ficam de fora porque não contêm regra de negócio: incluí-los inflaria o número sem testar regra nenhuma. O workflow do PR roda `npm run test:cov` e **reprova abaixo de 80%**.

Casos mínimos da Seção 4.5:

| Caso | Arquivo |
| :-- | :-- |
| 1. Sobreposição de períodos (os cinco cenários) | `tests/period.service.spec.ts` |
| 2. Criação de agendamento (sucesso, fora do turno, desalinhado, não cabe, conflito do médico e do paciente) | `tests/appointment.service.spec.ts` |
| 3. Validação da escala (sobrepostos recusados, encostados aceitos) | `tests/work-schedule.service.spec.ts` |
| 4. Transição de status (válidas e inválidas) | `tests/appointment.service.spec.ts` |
| 5. Prontuário (com vínculo escreve, sem vínculo recebe 403) | `tests/medical-record.service.spec.ts` |
| 6. Login (credencial inválida, senha comparada pelo hash) | `tests/auth.service.spec.ts` |

Há também um teste de **concorrência em memória**: duas criações simultâneas para o mesmo horário resultam em exatamente uma consulta.

---

## Log estruturado (RA2)

Cada resposta de uma rota válida gera **uma linha JSON** (`request-logger.middleware.ts`):

```json
{"timestamp":"2026-11-16T18:40:50.419Z","level":"warn","requestId":"4aef3b8c-...","method":"POST","path":"/api/v1/appointments","statusCode":409,"durationMs":12,"userId":1,"error":"HORARIO_INDISPONIVEL"}
```

- `level`: `info` em 2xx/3xx, `warn` em 4xx, `error` em 5xx.
- `requestId`: gerado no início da requisição e devolvido no cabeçalho `X-Request-Id`.
- `userId`: só quando a requisição é autenticada.
- Rotas inexistentes (404 de rota) não são logadas.
- Nunca entram no log: corpo da requisição, cabeçalho `Authorization`, senhas ou tokens.

---

## Endpoints

Todas as rotas vivem sob `/api/v1`. Exceto as públicas, exigem `Authorization: Bearer <accessToken>`. A especificação completa (corpos, query, respostas) está no Swagger em `/v1/docs`.

| Método | Rota | Perfis |
| :-- | :-- | :-- |
| GET | `/health` | público |
| POST | `/auth/login` | público |
| GET | `/users/me` | autenticado |
| POST | `/users` | `admin` |
| POST | `/patients` | `admin`, `secretary` |
| GET | `/patients` | autenticado |
| GET | `/patients/{id}` | autenticado |
| PATCH | `/patients/{id}` | `admin`, `secretary` |
| DELETE | `/patients/{id}` | `admin` |
| POST | `/doctors` | `admin` |
| GET | `/doctors` | autenticado |
| GET | `/doctors/{id}` | autenticado |
| PUT | `/doctors/{id}/work-schedule` | `admin` |
| GET | `/doctors/{id}/work-schedule` | autenticado |
| GET | `/doctors/{id}/calendar?from=&to=` | autenticado |
| POST | `/appointments` | `admin`, `secretary` |
| GET | `/appointments` | autenticado (o `doctor` só vê as próprias) |
| GET | `/appointments/{id}` | autenticado (o `doctor` só a própria) |
| PATCH | `/appointments/{id}/status` | conforme a transição |
| POST | `/patients/{id}/medical-records` | `doctor` com vínculo |
| GET | `/patients/{id}/medical-records` | `doctor` com vínculo, `admin` |

Fora do prefixo: `GET /v1/docs` (Swagger UI) e `GET /v1/docs.json` (especificação OpenAPI).

---

## Integração contínua e publicação

| Workflow | Gatilho | O que faz |
| :-- | :-- | :-- |
| `pr-workflow.yml` | pull request para a `main` | `npm ci` → build → testes com cobertura (reprova abaixo de 80%). O job `build-and-test` é check obrigatório na proteção da `main`. |
| `deploy.yml` | push na `main` (merge de PR) | Build da imagem Docker multi-stage → publicação no GHCR (`ghcr.io/lucasr0sa/medclinic-api`) → Deploy Hook do Render (segredo `RENDER_DEPLOY_HOOK_URL`). |
| `keep-alive.yml` | a cada 5 minutos | Chama o health da API publicada para o plano gratuito não suspender o serviço. |

A `main` é protegida: só recebe código por pull request com o check verde. Nenhum segredo da aplicação está no repositório ou nos workflows; eles ficam no painel do Render.
