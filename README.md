# -MS-Vestu-rio

## Relatórios

Antes de iniciar a API pela primeira vez após atualizar o banco, execute
`backend/src/config/migrations.sql` no MySQL configurado no `.env`. Esse script
cria a tabela de relatórios salvos e aplica os ajustes necessários para vendas.
As rotas ficam disponíveis em `/relatorios` para usuários autenticados.
