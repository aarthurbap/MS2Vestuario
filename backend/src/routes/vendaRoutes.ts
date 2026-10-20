
import { Router } from "express";

import { VendaController } from "../controllers/VendaController";

import {
    authMiddleware,
    gerenteMiddleware
} from "../middlewares/authMiddleware";

const vendaRoutes = Router();

// ======================================================
// AUTENTICAÇÃO - Proteger todas as rotas de vendas
// ======================================================

// Exige um JWT válido para acessar qualquer rota de vendas.
vendaRoutes.use(authMiddleware);

// ======================================================
// ROTAS - Vendas
// ======================================================

// Registra uma nova venda.
// Permitido para usuários autenticados (caixa ou gerente).
vendaRoutes.post(
    "/",
    VendaController.create
);

// Lista as vendas cadastradas.
// Permitido para usuários autenticados.
vendaRoutes.get(
    "/",
    VendaController.findAll
);

// Busca uma venda específica pelo ID.
// Permitido para usuários autenticados.
vendaRoutes.get(
    "/:id",
    VendaController.findById
);

// ======================================================
// CANCELAMENTO - Exclusivo para gerentes
// ======================================================

// Exige autenticação e perfil de gerente.
// O gerenteMiddleware impede que caixas cancelem vendas.
vendaRoutes.patch(
    "/:id/cancelar",
    gerenteMiddleware,
    VendaController.cancel
);

export { vendaRoutes };
