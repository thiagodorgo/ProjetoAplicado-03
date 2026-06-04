# Checklist AV4

## Links

- [ ] GitHub acessível: https://github.com/thiagodorgo/ProjetoAplicado-03
- [ ] Sistema HTTPS acessível: https://d3rp0v05veneoq.cloudfront.net
- [ ] API HTTPS / Swagger acessível: https://d2imboazq11lsc.cloudfront.net/docs
- [ ] Health check acessível: https://d2imboazq11lsc.cloudfront.net/health

## Credenciais

- [ ] Administrador: `joao@example.com` / `senha123`
- [ ] Colaborador: `senai@senai.com` / `senai`
- [ ] Auditor: `ana.seguranca@example.com` / `senha123`

## Fluxos

- [ ] Fluxo 1: login e controle por perfil.
- [ ] Fluxo 2: gestão administrativa de cursos, trilhas, colaboradores e regras obrigatórias.
- [ ] Fluxo 3: jornada do colaborador com Meus Cursos, status e progresso.
- [ ] Fluxo 4: relatórios e conformidade para administrador/auditor.

## Evidências

- [ ] Prints do login.
- [ ] Prints do dashboard admin.
- [ ] Prints do dashboard colaborador.
- [ ] Prints do dashboard auditor.
- [ ] Prints de cursos/trilhas/regras/relatórios.

## Entrega Acadêmica

- [ ] Canvas da Solução.
- [ ] Justificativa do Canvas.
- [ ] Retrospectiva ágil.
- [ ] README revisado.
- [ ] Documentação em `docs/` revisada.
- [ ] Links testados em guia anônima.

## Verificação Técnica

- [ ] `cd backend && python -m py_compile server.py`
- [ ] `cd frontend && npm run build`
- [ ] `git diff --check`
- [ ] Nenhum `.env` versionado.
- [ ] Nenhum secret real documentado.
- [ ] Nenhum `node_modules/` versionado.
- [ ] Nenhum `build/` versionado.
