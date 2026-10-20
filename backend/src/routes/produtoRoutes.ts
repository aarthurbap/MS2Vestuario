
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

produtoRoutes.post("/", ProdutoController.create);

produtoRoutes.get("/", ProdutoController.findAll);

produtoRoutes.get("/:id", ProdutoController.findById);

produtoRoutes.put("/:id", ProdutoController.update);

produtoRoutes.patch(
    "/:id/desativar",
    ProdutoController.deactivate
);

export { produtoRoutes };
