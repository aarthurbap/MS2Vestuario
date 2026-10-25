
import { Router } from "express";

import { ProdutoController } from "../controllers/ProdutoController";
import { authMiddleware } from "../middlewares/authMiddleware";

const produtoRoutes = Router();

// ======================================================
// AUTENTICAÇÃO - Proteger rotas de produtos
// ======================================================

produtoRoutes.use(authMiddleware);

// ======================================================
// ROTAS - Produtos
// ======================================================

// Cadastra um novo produto no catalogo.
produtoRoutes.post("/", ProdutoController.create);

// Lista os produtos cadastrados.
produtoRoutes.get("/", ProdutoController.findAll);

// Busca um produto pelo ID.
produtoRoutes.get("/:id", ProdutoController.findById);

// Atualiza os dados de um produto existente.
produtoRoutes.put("/:id", ProdutoController.update);

// Desativa o produto sem apagar seu histórico.
produtoRoutes.patch(
    "/:id/desativar",
    ProdutoController.deactivate
);

export { produtoRoutes };
