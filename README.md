# -MS-Vestu-rio

## Relatórios

Antes de iniciar a API pela primeira vez após atualizar o banco, execute
`backend/src/config/migrations.sql` no MySQL configurado no `.env`. Esse script
cria a tabela de relatórios salvos e aplica os ajustes necessários para vendas.
As rotas ficam disponíveis em `/relatorios` para usuários autenticados.
# MS2 Vestuário — Sistema de Gestão Comercial

## 1. Sobre o Projeto

O **MS2 Vestuário** é um projeto de desenvolvimento de software voltado à gestão comercial de uma loja de vestuário, com o objetivo de centralizar informações, organizar processos administrativos e facilitar o gerenciamento das operações do estabelecimento.

O sistema utiliza uma arquitetura dividida entre frontend e backend, permitindo separar a interface utilizada pelo operador das regras de negócio e do processamento das informações.

O projeto também tem como finalidade aplicar conhecimentos de Análise e Desenvolvimento de Sistemas em um cenário prático, abrangendo desenvolvimento web, integração entre aplicações, persistência de dados e organização de código.

## 2. Objetivos

O desenvolvimento do MS2 Vestuário busca atender aos seguintes objetivos:

- Digitalizar processos de gerenciamento comercial.
- Centralizar informações em uma aplicação.
- Reduzir a necessidade de controles manuais.
- Facilitar a consulta e a organização de registros.
- Aplicar boas práticas de desenvolvimento de software.
- Estabelecer uma arquitetura que permita manutenção e evolução do sistema.

## 3. Arquitetura do Sistema

O projeto está organizado em duas camadas principais: frontend e backend.

### 3.1. Frontend

O frontend corresponde à camada de apresentação do sistema.

É responsável por disponibilizar a interface visual e permitir que o usuário interaja com as funcionalidades implementadas.

Entre suas responsabilidades arquiteturais estão:

- Apresentar informações ao usuário.
- Receber dados inseridos por meio de formulários.
- Realizar validações de interface.
- Enviar requisições ao backend.
- Interpretar as respostas recebidas da API.
- Exibir mensagens de sucesso e erro.
- Organizar a navegação entre as páginas.

A separação dessa camada permite que a interface seja aprimorada sem exigir alterações desnecessárias nas regras de negócio do servidor.

### 3.2. Backend

O backend representa a camada responsável pelo processamento das requisições e pela execução das regras de negócio.

Sua função é receber as solicitações realizadas pelo frontend, processar os dados e retornar respostas estruturadas.

As principais responsabilidades dessa camada incluem:

- Disponibilizar endpoints para comunicação com a aplicação.
- Receber e interpretar requisições HTTP.
- Validar informações recebidas.
- Executar regras de negócio.
- Intermediar operações com o banco de dados.
- Organizar o tratamento de erros.
- Retornar respostas para a interface.

A divisão entre frontend e backend contribui para a organização do projeto e facilita a manutenção das funcionalidades.

## 4. Estrutura do Repositório

A estrutura principal identificada no repositório é:

```text
MS2Vestuario/
|
|-- backend/
|   |-- Aplicação responsável pelo servidor
|   |-- Processamento das requisições
|   |-- Regras de negócio
|   |-- Integração com dados
|
|-- frontend/
|   |-- frontend/
|       |-- Aplicação de interface
|       |-- Componentes visuais
|       |-- Comunicação com o backend
|
|-- README.md
```

A organização interna de cada aplicação deve ser consultada diretamente no código-fonte para identificar seus módulos, arquivos de configuração e dependências.

## 5. Comunicação entre Frontend e Backend

A comunicação entre as camadas segue o modelo cliente-servidor.

O fluxo geral de uma operação é composto pelas seguintes etapas:

1. O usuário acessa uma funcionalidade na interface.
2. O frontend coleta os dados necessários.
3. Uma requisição HTTP é encaminhada ao backend.
4. O servidor recebe e interpreta a solicitação.
5. Os dados são validados conforme as regras implementadas.
6. O backend executa a operação solicitada.
7. Quando necessário, ocorre uma interação com o banco de dados.
8. O servidor retorna uma resposta ao frontend.
9. A interface apresenta o resultado ao usuário.

Esse modelo permite manter as responsabilidades de apresentação e processamento separadas.

## 6. Organização das Regras de Negócio

As regras de negócio definem como as operações do sistema devem ser executadas.

Em uma aplicação de gestão comercial, essas regras podem envolver validações de registros, consistência de informações, cálculos e condições necessárias para realizar determinadas operações.

A centralização dessas regras no backend ajuda a evitar comportamentos inconsistentes entre diferentes interfaces.

A implementação específica dessas validações depende dos módulos disponíveis no código-fonte.

## 7. Banco de Dados

A camada de persistência é responsável pelo armazenamento e pela recuperação das informações utilizadas pela aplicação.

Sua integração com o backend permite que os registros sejam mantidos além da execução temporária do sistema.

Entre os cuidados importantes no desenvolvimento dessa camada estão:

- Definição adequada das tabelas e seus relacionamentos.
- Utilização de identificadores para os registros.
- Validação de informações antes da persistência.
- Tratamento de falhas nas operações.
- Manutenção da integridade dos dados.
- Separação das credenciais de acesso do código-fonte.

O mecanismo de banco de dados, o esquema das tabelas e os relacionamentos efetivamente implementados devem ser documentados a partir dos arquivos de configuração e dos scripts SQL do projeto.

## 8. Integração por API

A integração entre aplicações pode ser realizada por meio de uma API HTTP, responsável por disponibilizar os recursos do backend.

Em uma arquitetura REST, os métodos HTTP são utilizados conforme a finalidade de cada operação.

| Método | Finalidade |
|---|---|
| GET | Consultar informações |
| POST | Criar registros |
| PUT | Atualizar registros |
| PATCH | Atualizar parcialmente um registro |
| DELETE | Excluir registros |

A tabela apresenta as convenções de uma API REST. Os endpoints realmente disponíveis no MS2 Vestuário precisam ser identificados nas rotas implementadas.

## 9. Tratamento de Erros

O tratamento de erros é uma parte importante da confiabilidade de uma aplicação.

O sistema deve diferenciar situações como dados inválidos, recursos não encontrados, operações não autorizadas e falhas internas.

Em uma API HTTP, os códigos de resposta ajudam a identificar o resultado de cada requisição.

| Código | Significado |
|---|---|
| 200 | Requisição processada com sucesso |
| 201 | Recurso criado com sucesso |
| 400 | Requisição inválida |
| 401 | Autenticação necessária ou inválida |
| 403 | Acesso não autorizado |
| 404 | Recurso não encontrado |
| 409 | Conflito na operação |
| 500 | Erro interno do servidor |

Esses códigos representam referências de implementação e não uma relação verificada das respostas utilizadas atualmente pelo projeto.

## 10. Segurança

A segurança deve ser considerada durante todo o desenvolvimento da aplicação.

Entre as práticas recomendadas estão:

- Manter senhas e credenciais fora do repositório.
- Utilizar variáveis de ambiente para configurações sensíveis.
- Validar os dados recebidos pelo servidor.
- Utilizar consultas parametrizadas no acesso ao banco de dados.
- Restringir operações de acordo com as permissões do usuário.
- Evitar a exposição de informações internas em mensagens de erro.
- Manter as dependências atualizadas.

Essas práticas contribuem para a proteção das informações e para a confiabilidade do sistema.

## 11. Instalação e Execução

Para executar o projeto em ambiente local, é necessário configurar separadamente as aplicações de frontend e backend.

### 11.1. Clonar o repositório

```bash
git clone https://github.com/zArthur16/MS2Vestuario.git
```

### 11.2. Acessar o diretório

```bash
cd MS2Vestuario
```

### 11.3. Instalar as dependências do backend

Caso o backend utilize Node.js e npm:

```bash
cd backend
npm install
```

### 11.4. Instalar as dependências do frontend

Em outro terminal:

```bash
cd frontend/frontend
npm install
```

### 11.5. Configurar o ambiente

Verifique os arquivos de configuração de cada aplicação e configure as variáveis de ambiente necessárias.

As credenciais do banco de dados e outras informações sensíveis não devem ser publicadas no GitHub.

### 11.6. Inicializar as aplicações

Consulte os scripts disponíveis no arquivo `package.json` de cada aplicação.

Em projetos configurados com um script de desenvolvimento, a execução normalmente ocorre por meio do comando:

```bash
npm run dev
```

Os comandos definitivos, as portas utilizadas e os requisitos de ambiente devem ser confirmados nos arquivos do projeto.

## 12. Manutenção e Evolução

A arquitetura separada em frontend e backend permite desenvolver melhorias de maneira progressiva.

As próximas etapas de evolução podem contemplar:

- Aprimoramento da interface.
- Ampliação dos módulos de gerenciamento.
- Implementação de relatórios operacionais.
- Melhorias nas validações.
- Otimização de consultas ao banco de dados.
- Implementação de testes automatizados.
- Documentação dos endpoints.
- Aperfeiçoamento dos mecanismos de autenticação e autorização.
- Melhorias de desempenho e segurança.

Essas possibilidades representam sugestões de evolução e não funcionalidades já concluídas.

## 13. Finalidade Acadêmica e Profissional

O MS2 Vestuário também representa uma oportunidade de desenvolvimento técnico e profissional na área de Análise e Desenvolvimento de Sistemas.

O projeto permite aplicar conceitos relacionados a:

- Arquitetura de software.
- Desenvolvimento de aplicações web.
- Programação frontend e backend.
- Integração por APIs.
- Modelagem e persistência de dados.
- Organização e manutenção de código.
- Versionamento de software com Git.
- Gerenciamento de projetos de desenvolvimento.

A construção e a evolução do sistema contribuem para consolidar conhecimentos técnicos por meio da resolução de problemas reais de desenvolvimento.

## 14. Repositório

O código-fonte do projeto está disponível em:

https://github.com/zArthur16/MS2Vestuario

## 15. Desenvolvedor

**Arthur Baptista**

Estudante do curso Técnico em Análise e Desenvolvimento de Sistemas, com foco no desenvolvimento de aplicações web, integração de sistemas e soluções tecnológicas.

**GitHub:** https://github.com/zArthur16

**Contato:** aarthurbap@gmail.com

---

**MS2 Vestuário — Sistema de Gestão Comercial**

Projeto voltado à aplicação prática de conhecimentos em desenvolvimento de software, organização de processos e construção de soluções digitais.
