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

// Recebe credenciais e devolve um token para acesso autenticado.
usuarioRoutes.post("/login", UsuarioController.login);
// Permite cadastro público, sempre atribuindo o perfil de caixa.
usuarioRoutes.post("/cadastro", UsuarioController.register);

// ======================================================
// Rotas protegidas - Somente gerentes
// O cadastro administrativo continua separado do cadastro público.
// ======================================================

usuarioRoutes.use(authMiddleware, gerenteMiddleware);

// Cadastra usuários pela área administrativa.
usuarioRoutes.post("/", UsuarioController.create);
// Lista usuários sem expor hashes de senha.
usuarioRoutes.get("/", UsuarioController.findAll);
// Consulta os dados públicos de um usuário pelo ID.
usuarioRoutes.get("/:id", UsuarioController.findById);
// Atualiza os dados e a senha de um usuário.
usuarioRoutes.put("/:id", UsuarioController.update);
// Exclui um usuário quando não houver vínculos impedindo a operação.
usuarioRoutes.delete("/:id", UsuarioController.delete);

export { usuarioRoutes };
