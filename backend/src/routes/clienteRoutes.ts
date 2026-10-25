
import { Router } from "express";

import { ClienteController } from "../controllers/ClienteController";
import { authMiddleware } from "../middlewares/authMiddleware";

const clienteRoutes = Router();

// ======================================================
// AUTENTICAÇÃO - Proteger rotas de clientes
// ======================================================

clienteRoutes.use(authMiddleware);

// ======================================================
// ROTAS - Clientes
// ======================================================

// Cria um cliente e retorna o identificador do novo cadastro.
clienteRoutes.post("/", ClienteController.create);

// Lista os clientes cadastrados.
clienteRoutes.get("/", ClienteController.findAll);

// Consulta um cliente pelo ID informado na URL.
clienteRoutes.get("/:id", ClienteController.findById);

// Atualiza todos os campos aceitos de um cliente existente.
clienteRoutes.put("/:id", ClienteController.update);

// Exclui um cliente, se não houver vendas impedindo a operação.
clienteRoutes.delete("/:id", ClienteController.delete);

export { clienteRoutes };
