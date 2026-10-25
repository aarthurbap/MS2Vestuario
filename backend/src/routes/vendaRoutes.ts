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

// Lista as formas de pagamento disponíveis
// Consulta as formas ativas para preenchimento das opções de venda.
vendaRoutes.get(
    "/formas-pagamento",
    VendaController.getFormasPagamento
);

// Registra uma nova venda de forma atômica
// Cria uma venda completa usando o operador identificado pelo JWT.
vendaRoutes.post(
    "/",
    VendaController.create
);

// Lista as vendas cadastradas com suporte a filtros
// Retorna o histórico de vendas conforme os filtros enviados na consulta.
vendaRoutes.get(
    "/",
    VendaController.findAll
);

// Busca uma venda específica pelo ID com itens e pagamentos
// Retorna os dados completos de uma venda identificada pelo ID.
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
