# Fluxos do MVP

Sistema: https://d3rp0v05veneoq.cloudfront.net

Credenciais de teste:

- Administrador: `joao@example.com` / `senha123`
- Colaborador: `senai@senai.com` / `senai`
- Auditor: `ana.seguranca@example.com` / `senha123`

Os dados do MVP são persistidos no MongoDB Atlas, no banco `techsolutions_treinamentos`.

## Fluxo 1 — Login e Controle por Perfil

Perfil usado:

- Administrador, Colaborador e Auditor.

Passos:

1. Acessar o sistema.
2. Informar e-mail e senha.
3. Realizar login.
4. Validar menus e dashboard exibidos conforme perfil.

Telas e endpoints envolvidos:

- Tela `/login`
- Endpoint `POST /api/auth/login`
- Rotas protegidas pelo frontend conforme perfil
- Endpoints protegidos por JWT no backend

Evidência esperada para print:

- Tela de login.
- Dashboard diferente para admin, colaborador e auditor.
- Menu lateral com opções condizentes com o perfil.

Relação com AV1/AV2:

- Atende autenticação com perfis de acesso e experiência separada por tipo de usuário.

## Fluxo 2 — Gestão Administrativa

Perfil usado:

- Administrador.

Passos:

1. Entrar como administrador.
2. Acessar Cursos.
3. Criar, editar ou excluir curso, conforme necessidade da demonstração.
4. Acessar Trilhas e Regras Obrigatórias.
5. Validar cadastros persistidos.

Telas e endpoints envolvidos:

- `/cursos`
- `/trilhas`
- `/colaboradores`
- `/regras`
- `GET/POST/PUT/DELETE /api/cursos`
- `GET/POST/DELETE /api/trilhas`
- `GET/POST/DELETE /api/regras-obrigatorias`
- `GET /api/colaboradores`

Evidência esperada para print:

- Listagem de cursos.
- Tela de trilhas.
- Tela de regras obrigatórias.
- Dashboard administrativo com indicadores globais.

Relação com AV1/AV2:

- Cobre gestão de cursos, colaboradores, trilhas e regras previstas no backlog e na UX.

## Fluxo 3 — Jornada do Colaborador

Perfil usado:

- Colaborador.

Passos:

1. Entrar como colaborador.
2. Ver dashboard pessoal.
3. Acessar Cursos.
4. Inscrever-se em curso disponível, se aplicável.
5. Acessar Meus Cursos.
6. Conferir status de treinamentos vinculados.

Telas e endpoints envolvidos:

- `/dashboard`
- `/cursos`
- `/meus-cursos`
- `GET /api/cursos`
- `GET /api/inscricoes`
- `POST /api/inscricoes`

Evidência esperada para print:

- Dashboard do colaborador com progresso pessoal.
- Tela Meus Cursos.
- Curso com status de inscrição.

Relação com AV1/AV2:

- Cobre visualização de cursos obrigatórios, status, inscrição e acompanhamento pelo colaborador.

## Fluxo 4 — Relatórios e Conformidade

Perfil usado:

- Administrador e Auditor.

Passos:

1. Entrar como auditor ou administrador.
2. Acessar dashboard de conformidade.
3. Acessar Relatórios.
4. Conferir indicadores de cursos, inscrições, trilhas e regras obrigatórias.

Telas e endpoints envolvidos:

- `/dashboard`
- `/relatorios`
- `GET /api/dashboard/stats`
- `GET /api/cursos`
- `GET /api/trilhas`
- `GET /api/regras-obrigatorias`
- `GET /api/inscricoes`
- `GET /api/certificados`

Evidência esperada para print:

- Dashboard de conformidade.
- Relatórios com indicadores e tabelas.
- Cards de taxa de conclusão e pendências.

Relação com AV1/AV2:

- Cobre relatórios de conformidade, apoio a auditoria e visão gerencial.
