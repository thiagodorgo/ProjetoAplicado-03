# TechSolutions – Sistema de Treinamentos Obrigatórios

Projeto acadêmico da entrega AV4 da Unidade Curricular Projeto Aplicado.

## Descrição

Empresas ainda controlam treinamentos obrigatórios por planilhas, e-mails e cobranças manuais. Esse processo gera retrabalho, dificulta a rastreabilidade e aumenta o risco de não conformidade em auditorias.

O TechSolutions é um sistema web para gestão de treinamentos obrigatórios, com cadastro de colaboradores, áreas, cargos, perfis, cursos, trilhas, regras de obrigatoriedade, inscrições, progresso e dashboard de conformidade.

## Integrantes

- Thiago
- Fabricio
- Pettrin
- Joseph

## Tecnologias

- Backend: FastAPI
- Frontend: React
- Banco de dados: MongoDB
- Banco em cloud: MongoDB Atlas
- Deploy do backend: AWS Elastic Beanstalk
- Deploy do frontend: AWS S3 + CloudFront
- Autenticação: JWT
- Senhas: hash com bcrypt/passlib, conforme implementação existente

## Fluxos principais do MVP

- Fluxo 1: Login e autenticação por token.
- Fluxo 2: Gestão administrativa de áreas, cargos, perfis, colaboradores, cursos e regras obrigatórias.
- Fluxo 3: Jornada do colaborador com visualização de cursos, inscrição, progresso e status.
- Fluxo 4: Dashboard e relatórios de conformidade.

## Variáveis de ambiente

As variáveis reais de produção devem ser configuradas no ambiente de execução, como Elastic Beanstalk e CloudFront/S3, e nunca devem ser versionadas.

### Exemplo de `backend/.env`

```env
MONGO_URL="mongodb+srv://<usuario>:<senha>@cluster0.rxtu0xk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME="techsolutions_treinamentos"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="troque-por-um-segredo-seguro"
```

Para usar MongoDB local em desenvolvimento:

```env
MONGO_URL="mongodb://localhost:27017/"
DB_NAME="techsolutions_treinamentos"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="troque-por-um-segredo-seguro"
```

### Exemplo de `frontend/.env`

```env
REACT_APP_BACKEND_URL="http://localhost:8000"
```

## Como rodar localmente

### Backend

Pré-requisitos:

- Python 3.10+
- MongoDB local ou MongoDB Atlas

Comandos:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

Endpoints úteis:

- Health check: `http://localhost:8000/health`
- Swagger: `http://localhost:8000/docs`
- API raiz: `http://localhost:8000/api/`

### Frontend

Pré-requisitos:

- Node.js
- npm

Comandos:

```powershell
cd frontend
npm install --legacy-peer-deps
npm start
```

Aplicação local:

- `http://localhost:3000`

## Build

### Backend

O backend pode ser iniciado no mesmo formato esperado pelo Elastic Beanstalk:

```powershell
cd backend
uvicorn server:app --host 0.0.0.0 --port 8000
```

### Frontend

```powershell
cd frontend
npm install --legacy-peer-deps
npm run build
```

A pasta gerada será `frontend/build/`.

## Usuários de teste

Se o banco estiver vazio, execute o script de criação de usuários:

```powershell
cd backend
python scripts_create_user.py
```

Credenciais criadas pelo script:

- Admin: `joao@example.com` / `senha123`
- Aluno: `senai@senai.com` / `senai`

Essas credenciais dependem da execução do script no banco configurado em `MONGO_URL` e `DB_NAME`.

## Deploy na AWS

### Backend no Elastic Beanstalk

1. Criar um ambiente Python no AWS Elastic Beanstalk.
2. Publicar o conteúdo da pasta `backend/`.
3. Garantir que o arquivo `Procfile` esteja presente em `backend/`.
4. Configurar as variáveis de ambiente no Elastic Beanstalk:
   - `MONGO_URL`
   - `DB_NAME`
   - `JWT_SECRET`
   - `CORS_ORIGINS`
5. Usar `DB_NAME="techsolutions_treinamentos"`.
6. Validar o deploy acessando `/health`, `/docs` e `/api/`.

### Banco no MongoDB Atlas

1. Criar o cluster no MongoDB Atlas.
2. Criar usuário e senha do banco.
3. Liberar o acesso de rede necessário para o Elastic Beanstalk.
4. Configurar a connection string em `MONGO_URL` no Elastic Beanstalk.
5. Não versionar a connection string real.

### Frontend no S3 + CloudFront

1. Criar o arquivo `frontend/.env` com `REACT_APP_BACKEND_URL` apontando para a URL pública do backend.
2. Gerar o build com `npm run build`.
3. Enviar o conteúdo de `frontend/build/` para um bucket S3 configurado para hospedagem estática ou origem do CloudFront.
4. Criar ou atualizar a distribuição CloudFront.
5. Atualizar `CORS_ORIGINS` no Elastic Beanstalk com o domínio do CloudFront, por exemplo:

```env
CORS_ORIGINS="http://localhost:3000,https://dominio-cloudfront.net"
```

## Segurança

- Não versionar arquivos `.env`.
- Não inserir senha real, `MONGO_URL` real ou `JWT_SECRET` real no código.
- Configurar secrets reais somente no ambiente local privado ou nas variáveis de ambiente do Elastic Beanstalk.
- Os exemplos deste README usam placeholders e não devem ser tratados como credenciais de produção.
