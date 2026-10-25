
import express from "express";
import cors from "cors";
import "dotenv/config";

import { produtoRoutes } from "./routes/produtoRoutes";
import { clienteRoutes } from "./routes/clienteRoutes";
import { usuarioRoutes } from "./routes/usuarioRoutes";
import { vendaRoutes } from "./routes/vendaRoutes";
import relatorioRoutes from "./routes/relatorioRoutes";

// ======================================================
// CONFIGURAÇÃO - Servidor Express
// ======================================================

const app = express();

// Define a porta configurada no ambiente ou usa 3000 como padrao.
const PORT = Number(process.env.PORT) || 3000;

// ======================================================
// MIDDLEWARE - CORS
// ======================================================

// Permite que o frontend React se comunique com a API.
// Aceita as portas 5173 e 5174 utilizadas pelo Vite.
// O cabeçalho Authorization permite enviar o token JWT.

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://localhost:5174"
        ],
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);

// ======================================================
// MIDDLEWARE - JSON
// ======================================================

// Permite que o Express receba dados em formato JSON
// enviados pelo frontend ou pelo Thunder Client.

app.use(express.json());

// ======================================================
// ROTA PRINCIPAL - Verificar funcionamento da API
// ======================================================

// Disponibiliza uma resposta simples para confirmar que a API esta ativa.
app.get("/", (req, res) => {
    res.status(200).json({
        nome: "MS² Vestuário API",
        status: "online",
        mensagem: "API funcionando corretamente."
    });
});

// ======================================================
// ROTAS - Produtos
// ======================================================

// Encaminha as requisicoes de /produtos para o roteador de produtos.
app.use("/produtos", produtoRoutes);

// ======================================================
// ROTAS - Clientes
// ======================================================

// Encaminha as requisicoes de /clientes para o roteador de clientes.
app.use("/clientes", clienteRoutes);

// ======================================================
// ROTAS - Usuários e autenticação
// ======================================================

// Encaminha as requisicoes de /usuarios para cadastro e autenticacao.
app.use("/usuarios", usuarioRoutes);

// ======================================================
// ROTAS - Vendas
// ======================================================

// Encaminha as requisicoes de /vendas para o roteador de vendas.
app.use("/vendas", vendaRoutes);

// Relatórios dependem de dados de vendas e exigem autenticação.
app.use("/relatorios", relatorioRoutes);

// ======================================================
// INICIALIZAÇÃO - Servidor
// ======================================================

// Inicia o servidor HTTP e informa no console o endereco de acesso.
app.listen(PORT, () => {
    console.log("");
    console.log("========================================");
    console.log("       MS² VESTUÁRIO - BACKEND");
    console.log("========================================");
    console.log("Servidor iniciado com sucesso.");
    console.log(`Porta: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log("========================================");
    console.log("");
});