
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

clienteRoutes.post("/", ClienteController.create);

clienteRoutes.get("/", ClienteController.findAll);

clienteRoutes.get("/:id", ClienteController.findById);

clienteRoutes.put("/:id", ClienteController.update);

clienteRoutes.delete("/:id", ClienteController.delete);

export { clienteRoutes };
