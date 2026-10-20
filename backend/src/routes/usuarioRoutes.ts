import { Router } from "express";
import { UsuarioController } from "../controllers/UsuarioController";

import {
    authMiddleware,
    gerenteMiddleware
} from "../middlewares/authMiddleware";

const usuarioRoutes = Router();

// ======================================================
// Autenticação e cadastro inicial - Rotas públicas
// ======================================================

usuarioRoutes.post("/login", UsuarioController.login);
usuarioRoutes.post("/cadastro", UsuarioController.register);

// ======================================================
// Rotas protegidas - Somente gerentes
// O cadastro administrativo continua separado do cadastro público.
// ======================================================

usuarioRoutes.use(authMiddleware, gerenteMiddleware);

usuarioRoutes.post("/", UsuarioController.create);
usuarioRoutes.get("/", UsuarioController.findAll);
usuarioRoutes.get("/:id", UsuarioController.findById);
usuarioRoutes.put("/:id", UsuarioController.update);
usuarioRoutes.delete("/:id", UsuarioController.delete);

export { usuarioRoutes };
