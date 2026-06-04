# Deploy AWS — TechSolutions

## Visão Geral

A arquitetura final usa frontend React publicado em AWS S3 Website e exposto por CloudFront HTTPS. O backend FastAPI roda no AWS Elastic Beanstalk e também é exposto por CloudFront HTTPS. A API persiste dados no MongoDB Atlas.

Links atuais:

- Sistema HTTPS: https://d3rp0v05veneoq.cloudfront.net
- API HTTPS / Swagger: https://d2imboazq11lsc.cloudfront.net/docs
- Health: https://d2imboazq11lsc.cloudfront.net/health

## Pré-Requisitos

- Conta AWS com permissões para Elastic Beanstalk, S3 e CloudFront.
- AWS CLI configurado.
- EB CLI instalado para comandos `eb`.
- Cluster MongoDB Atlas criado.
- Node.js e npm para build do frontend.
- Python compatível com o backend.

## Backend no Elastic Beanstalk

O backend fica na pasta `backend/` e usa o arquivo `Procfile`:

```text
web: uvicorn server:app --host 0.0.0.0 --port 8000
```

Comandos típicos:

```powershell
cd backend
eb init
eb create techsolutions-api
eb deploy
```

Configuração de variáveis:

```powershell
eb setenv MONGO_URL="mongodb+srv://<usuario>:<senha>@cluster0.exemplo.mongodb.net/?retryWrites=true&w=majority" DB_NAME="techsolutions_treinamentos" JWT_SECRET="troque-por-um-segredo-seguro" CORS_ORIGINS="https://d3rp0v05veneoq.cloudfront.net"
```

Use placeholders em documentação. Configure os valores reais apenas no Elastic Beanstalk ou no ambiente local privado.

## MongoDB Atlas

Variáveis usadas pelo backend:

- `MONGO_URL`
- `DB_NAME`

O banco final usa:

```text
DB_NAME=techsolutions_treinamentos
```

Não versionar connection string real, usuário, senha ou qualquer secret.

## Frontend no S3

Crie `frontend/.env` antes do build:

```env
REACT_APP_BACKEND_URL="https://d2imboazq11lsc.cloudfront.net"
```

Build:

```powershell
cd frontend
npm install --legacy-peer-deps
npm run build
```

Upload para S3:

```powershell
aws s3 sync build/ s3://<bucket-frontend> --delete
```

## CloudFront do Frontend

O CloudFront entrega o frontend por HTTPS:

```text
https://d3rp0v05veneoq.cloudfront.net
```

Após novo deploy, invalide o cache:

```powershell
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```

## CloudFront do Backend

O backend também foi exposto por CloudFront HTTPS:

```text
https://d2imboazq11lsc.cloudfront.net
```

Motivo: evitar Mixed Content quando o frontend HTTPS chama uma API HTTP.

## CORS

Configure `CORS_ORIGINS` no Elastic Beanstalk com o domínio HTTPS do frontend:

```env
CORS_ORIGINS="https://d3rp0v05veneoq.cloudfront.net"
```

Para testes locais, pode-se incluir localhost:

```env
CORS_ORIGINS="http://localhost:3000,https://d3rp0v05veneoq.cloudfront.net"
```

## Troubleshooting

Mixed Content:

- Verifique se `REACT_APP_BACKEND_URL` aponta para a URL HTTPS do CloudFront do backend.
- Verifique se a API está acessível em `/docs` e `/health`.

CORS:

- Confirme `CORS_ORIGINS` no Elastic Beanstalk.
- Inclua o domínio HTTPS exato do frontend.

`/dashboard` 404:

- A aplicação usa HashRouter.
- As rotas devem aparecer como `/#/dashboard`, `/#/cursos` e `/#/relatorios`.
- Se aparecer `/dashboard` sem `#`, confirme se o build publicado contém o `HashRouter`.

Build com localhost:

- Antes do build de produção, confira `frontend/.env`.
- Use a URL HTTPS do backend em produção.

BrowserRouter vs HashRouter:

- BrowserRouter exige fallback do servidor para `index.html`.
- S3 Website não resolve rotas internas automaticamente.
- HashRouter evita o 404 usando rotas depois do `#`.

Cache do CloudFront:

- Invalide `/*` após upload de novo build.
- Aguarde propagação.

Variáveis ausentes:

- `MONGO_URL`, `DB_NAME`, `JWT_SECRET` e `CORS_ORIGINS` precisam estar configuradas no ambiente do backend.
