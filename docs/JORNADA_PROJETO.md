# Jornada do Projeto

## AV1 — Diagnóstico e Backlog

O grupo identificou que empresas ainda controlam treinamentos obrigatórios com planilhas, e-mails e cobranças manuais. O backlog definiu funcionalidades como autenticação, perfis de acesso, cursos obrigatórios, inscrições, progresso e relatórios.

## AV2 — UX/UI

Foram definidos três perfis principais:

- Administrador/Gestor/RH
- Colaborador
- Auditor/Compliance

A experiência foi planejada com login, dashboards, gestão administrativa, jornada de cursos e relatórios de conformidade.

## AV3 — Arquitetura e Cloud

A arquitetura separou frontend, backend e banco de dados:

- Frontend React
- Backend FastAPI
- MongoDB como banco
- Publicação em cloud

## AV4 — MVP Funcional

O MVP foi desenvolvido, populado com dados de demonstração e publicado em ambiente de nuvem. A entrega final inclui sistema acessível por HTTPS, API com Swagger, persistência em MongoDB Atlas e documentação técnica.

## Principais Decisões Técnicas

- FastAPI no backend por simplicidade e boa documentação automática.
- React no frontend para SPA.
- MongoDB Atlas como banco em nuvem.
- AWS Elastic Beanstalk para hospedar o backend Python.
- AWS S3 Website para hospedar o frontend estático.
- CloudFront para HTTPS no frontend.
- CloudFront para HTTPS no backend.
- HashRouter no React para evitar 404 em rotas internas no S3/CloudFront.
- Controle por perfil no frontend e backend.
- Dashboards específicos por perfil.

## Desafios Encontrados

MongoDB Atlas:

- Foi necessário configurar a string de conexão, usuário, senha e liberação de rede.
- A solução foi usar `MONGO_URL` e `DB_NAME` como variáveis de ambiente.

Elastic Beanstalk:

- Foi necessário preparar o backend com `Procfile` e dependências corretas.
- A validação foi feita por `/health` e `/docs`.

Variáveis de ambiente:

- O backend depende de `MONGO_URL`, `DB_NAME`, `JWT_SECRET` e `CORS_ORIGINS`.
- As variáveis reais ficaram fora do repositório.

Frontend no S3:

- O build React foi enviado ao S3 Website.
- CloudFront foi usado para disponibilizar HTTPS.

CORS:

- O frontend HTTPS precisava chamar a API sem bloqueio.
- `CORS_ORIGINS` foi ajustado com o domínio final do frontend.

Mixed Content:

- O navegador bloqueava chamadas HTTPS para backend HTTP.
- A solução foi expor também o backend por CloudFront HTTPS.

404 em rotas SPA:

- Ao acessar `/dashboard`, o S3 tentava encontrar um arquivo físico.
- A solução foi trocar BrowserRouter por HashRouter, gerando rotas como `/#/dashboard`.

Controle por perfil:

- O sistema passou a separar menus, rotas e endpoints administrativos por perfil.

Dashboards por perfil:

- Admin ganhou visão gerencial.
- Colaborador ganhou visão pessoal de cursos.
- Auditor ganhou visão de conformidade.

## Estado Final do MVP

O MVP final possui:

- Login com JWT.
- Perfis de administrador, colaborador e auditor.
- Gestão de cursos, trilhas, colaboradores e regras obrigatórias.
- Jornada do colaborador com cursos e inscrições.
- Relatórios e indicadores de conformidade.
- Frontend e backend publicados em HTTPS.
- Persistência em MongoDB Atlas.
- Documentação técnica para entrega AV4.
