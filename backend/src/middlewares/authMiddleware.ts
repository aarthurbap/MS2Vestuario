import type {
    Request,
    Response,
    NextFunction
} from "express";

import jwt from "jsonwebtoken";

import { UsuarioModel } from "../models/UsuarioModel";

import type {
    UsuarioAutenticado
} from "../types/auth";

// ======================================================
// AUTH MIDDLEWARE - Autenticação
// ======================================================

// Valida o JWT, confirma que o usuário continua cadastrado e guarda sua identidade.
export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authorization = req.headers.authorization;

    if (
        !authorization ||
        !authorization.startsWith("Bearer ")
    ) {
        res.status(401).json({
            erro: "Token de autenticação não informado."
        });

        return;
    }

    const token = authorization.slice(7).trim();
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        console.error("JWT_SECRET não configurado.");

        res.status(500).json({
            erro: "Erro interno do servidor."
        });

        return;
    }

    try {
        const decoded = jwt.verify(token, secret, {
            algorithms: ["HS256"]
        });

        if (
            typeof decoded === "string" ||
            typeof decoded.sub !== "string"
        ) {
            res.status(401).json({
                erro: "Token inválido."
            });

            return;
        }

        const usuarioId = Number(decoded.sub);

        if (
            !Number.isSafeInteger(usuarioId) ||
            usuarioId <= 0
        ) {
            res.status(401).json({
                erro: "Token inválido."
            });

            return;
        }

        const usuario = await UsuarioModel.findById(usuarioId);

        if (!usuario) {
            res.status(401).json({
                erro: "Usuário não encontrado ou inválido."
            });

            return;
        }

        const usuarioAutenticado: UsuarioAutenticado = {
            id: usuario.id,
            nome: usuario.nome,
            perfil: usuario.perfil
        };

        res.locals.usuario = usuarioAutenticado;

        next();

    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                erro: "Token inválido ou expirado."
            });

            return;
        }

        console.error("Erro na autenticação:", error);

        res.status(500).json({
            erro: "Erro interno do servidor."
        });
    }
}

// ======================================================
// GERENTE MIDDLEWARE - Autorização
// ======================================================

// Restringe a rota a usuários autenticados com perfil de gerente.
export function gerenteMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const usuario = res.locals.usuario as
        UsuarioAutenticado | undefined;

    if (!usuario) {
        res.status(401).json({
            erro: "Usuário não autenticado."
        });

        return;
    }

    if (usuario.perfil !== "gerente") {
        res.status(403).json({
            erro: "Acesso permitido apenas para gerentes."
        });

        return;
    }

    next();
}