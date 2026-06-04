# TechSolutions — Sistema de Treinamentos Obrigatórios

Sistema web acadêmico para a entrega AV4 — Desenvolvimento do MVP, da Unidade Curricular Projeto Aplicado.

## Problema

Empresas ainda controlam treinamentos obrigatórios com planilhas, e-mails e processos manuais. Esse modelo dificulta rastreabilidade, acompanhamento de pendências, controle por cargo/perfil e comprovação de conformidade em auditorias.

## Solução

O TechSolutions centraliza a gestão de treinamentos obrigatórios em uma aplicação web com autenticação por perfil, gestão de cursos, trilhas, colaboradores, regras obrigatórias, jornada do colaborador e relatórios de conformidade.

## Contexto Acadêmico

- AV1 — Diagnóstico e Backlog: identificação do problema, requisitos funcionais e backlog inicial.
- AV2 — UX/UI: definição das jornadas de Administrador/Gestor/RH, Colaborador e Auditor/Compliance.
- AV3 — Arquitetura e Cloud: planejamento da separação entre frontend, backend e banco de dados em nuvem.
- AV4 — MVP Funcional: desenvolvimento, publicação em cloud, validação dos fluxos e documentação final.

## Links Finais

- Sistema HTTPS: https://d3rp0v05veneoq.cloudfront.net
- API HTTPS / Swagger: https://d2imboazq11lsc.cloudfront.net/docs
- Health check: https://d2imboazq11lsc.cloudfront.net/health
- Repositório GitHub: https://github.com/thiagodorgo/ProjetoAplicado-03

## Credenciais de Teste

- Administrador: `joao@example.com` / `senha123`
- Colaborador: `senai@senai.com` / `senai`
- Auditor: `ana.seguranca@example.com` / `senha123`

## Tecnologias

Frontend:

- React
- Axios
- React Router com HashRouter
- Componentes UI existentes no projeto

Backend:

- Python
- FastAPI
- Uvicorn
- JWT
- bcrypt/passlib, conforme implementação existente
- Motor/PyMongo para MongoDB

Banco:

- MongoDB Atlas
- Banco: `techsolutions_treinamentos`

Cloud e versionamento:

- AWS Elastic Beanstalk
- AWS S3 Website
- AWS CloudFront
- GitHub

## Arquitetura em Cloud

O usuário acessa o frontend React por HTTPS via CloudFront. O frontend consome a API FastAPI também exposta por CloudFront HTTPS, que encaminha as requisições para o ambiente Python no AWS Elastic Beanstalk. O backend persiste os dados no MongoDB Atlas. O código-fonte é versionado no GitHub.

## Fluxos Validados no MVP

- Fluxo 1: Login e controle de acesso por perfil.
- Fluxo 2: Gestão administrativa de cursos, trilhas, colaboradores e regras obrigatórias.
- Fluxo 3: Jornada do colaborador com Meus Cursos, status e progresso.
- Fluxo 4: Relatórios e conformidade para administrador e auditor.

## Perfis de Acesso

Administrador:

- Dashboard
- Cursos
- Trilhas
- Colaboradores
- Regras obrigatórias
- Relatórios
- Meus cursos

Colaborador:

- Dashboard pessoal
- Cursos
- Meus cursos

Auditor:

- Dashboard de conformidade
- Cursos
- Trilhas
- Relatórios

## Como Rodar Localmente

### Backend

Crie um arquivo local `backend/.env` com placeholders como no exemplo abaixo. Não use secrets reais em arquivos versionados.

```env
MONGO_URL="mongodb+srv://<usuario>:<senha>@cluster0.exemplo.mongodb.net/?retryWrites=true&w=majority"
DB_NAME="techsolutions_treinamentos"
JWT_SECRET="troque-por-um-segredo-local"
CORS_ORIGINS="http://localhost:3000"
```

Comandos:

```powershell
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

Endpoints locais úteis:

- API: `http://localhost:8000/api/`
- Swagger: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### Frontend

Crie um arquivo local `frontend/.env`:

```env
REACT_APP_BACKEND_URL="http://localhost:8000"
```

Comandos:

```powershell
cd frontend
npm install --legacy-peer-deps
npm start
```

Aplicação local: `http://localhost:3000`

## Build

Frontend:

```powershell
cd frontend
npm run build
```

Backend:

```powershell
cd backend
python -m py_compile server.py
```

## Deploy

Resumo do deploy final:

- Backend publicado no AWS Elastic Beanstalk usando `backend/Procfile`.
- Variáveis reais configuradas no Elastic Beanstalk, nunca no repositório.
- Frontend buildado com React e enviado ao S3 Website.
- CloudFront usado para HTTPS do frontend.
- CloudFront usado para HTTPS do backend, evitando Mixed Content entre frontend HTTPS e API.
- CORS ajustado com `CORS_ORIGINS` para permitir o domínio HTTPS do frontend.

Detalhes operacionais estão em [docs/DEPLOY_AWS.md](docs/DEPLOY_AWS.md).

## Decisões Técnicas Importantes

- Uso de HashRouter para evitar erro 404 em rotas internas da SPA hospedada em S3/CloudFront.
- CloudFront no backend para garantir HTTPS ponta a ponta.
- MongoDB Atlas para persistência em nuvem.
- Separação entre frontend React e backend FastAPI.
- Controle por perfil aplicado no frontend e reforçado no backend para endpoints administrativos.
- Dashboards personalizados por perfil: admin, colaborador e auditor.

## Documentação Complementar

- [Deploy AWS](docs/DEPLOY_AWS.md)
- [Fluxos do MVP](docs/FLUXOS_MVP.md)
- [Jornada do Projeto](docs/JORNADA_PROJETO.md)
- [Checklist AV4](docs/CHECKLIST_AV4.md)

## Segurança

- Não versionar `.env`.
- Não versionar secrets.
- Não inserir `MONGO_URL` real, senha do MongoDB Atlas ou `JWT_SECRET` real no código ou documentação.
- Configurar variáveis reais apenas no ambiente local privado ou nos serviços de cloud.
- Trocar senhas e segredos em uma produção real.

## Integrantes

- Thiago
- Fabricio
- Pettrin
- Joseph
