import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { UsuarioModel } from "../models/UsuarioModel";

// Controla cadastro, consulta, alteracao, exclusao e autenticacao de usuarios.
export class UsuarioController {

    // ======================================================
    // REGISTER - Cadastro público limitado ao perfil caixa
    // ======================================================

    // Cria uma conta publica com perfil fixo de caixa e senha protegida por hash.
    static async register(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const { nome, login, senha } = req.body ?? {};

            if (
                typeof nome !== "string" ||
                !nome.trim() ||
                typeof login !== "string" ||
                !login.trim() ||
                typeof senha !== "string" ||
                !senha
            ) {
                res.status(400).json({
                    erro: "Nome, login e senha são obrigatórios."
                });
                return;
            }

            if (senha.length < 6) {
                res.status(400).json({
                    erro: "A senha deve conter no mínimo 6 caracteres."
                });
                return;
            }

            const senhaHash = await bcrypt.hash(senha, 12);

            // Cadastro público nunca aceita perfil enviado pelo cliente.
            // Toda conta criada por esta rota recebe perfil de caixa.
            const id = await UsuarioModel.create({
                nome: nome.trim(),
                login: login.trim(),
                senha: senhaHash,
                perfil: "caixa"
            });

            res.status(201).json({
                mensagem: "Conta criada com sucesso. Agora você pode entrar.",
                id
            });
        } catch (error) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "ER_DUP_ENTRY"
            ) {
                res.status(409).json({
                    erro: "Já existe um usuário com esse login."
                });
                return;
            }

            console.error("Erro ao registrar conta pública:", error);
            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }


    // ======================================================
    // CREATE - Cadastrar usuário
    // ======================================================

    // Cadastra um usuario administrativo com perfil validado e senha criptografada.
    static async create(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const {
                nome,
                login,
                senha,
                perfil
            } = req.body ?? {};

            if (
                typeof nome !== "string" ||
                !nome.trim() ||
                typeof login !== "string" ||
                !login.trim() ||
                typeof senha !== "string" ||
                !senha ||
                !perfil
            ) {
                res.status(400).json({
                    erro: "Nome, login, senha e perfil são obrigatórios."
                });

                return;
            }

            if (perfil !== "caixa" && perfil !== "gerente") {
                res.status(400).json({
                    erro: "O perfil deve ser 'caixa' ou 'gerente'."
                });

                return;
            }

            if (senha.length < 6) {
                res.status(400).json({
                    erro: "A senha deve conter no mínimo 6 caracteres."
                });

                return;
            }

            const senhaHash = await bcrypt.hash(senha, 12);

            const id = await UsuarioModel.create({
                nome: nome.trim(),
                login: login.trim(),
                senha: senhaHash,
                perfil
            });

            res.status(201).json({
                mensagem: "Usuário cadastrado com sucesso.",
                id
            });

        } catch (error) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "ER_DUP_ENTRY"
            ) {
                res.status(409).json({
                    erro: "Já existe um usuário com esse login."
                });

                return;
            }

            console.error("Erro ao cadastrar usuário:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // ======================================================
    // FIND ALL - Listar usuários
    // ======================================================

    // Lista usuarios sem incluir o hash das senhas na resposta da API.
    static async findAll(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const usuarios = await UsuarioModel.findAll();

            const usuariosSemSenha = usuarios.map((usuario) => ({
                id: usuario.id,
                nome: usuario.nome,
                login: usuario.login,
                perfil: usuario.perfil
            }));

            res.status(200).json({
                dados: usuariosSemSenha
            });

        } catch (error) {
            console.error("Erro ao buscar usuários:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // ======================================================
    // FIND BY ID - Buscar usuário
    // ======================================================

    // Busca um usuario pelo identificador sem expor sua senha.
    static async findById(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (!Number.isSafeInteger(id) || id <= 0) {
                res.status(400).json({
                    erro: "ID do usuário inválido."
                });

                return;
            }

            const usuario = await UsuarioModel.findById(id);

            if (!usuario) {
                res.status(404).json({
                    erro: "Usuário não encontrado."
                });

                return;
            }

            res.status(200).json({
                dados: {
                    id: usuario.id,
                    nome: usuario.nome,
                    login: usuario.login,
                    perfil: usuario.perfil
                }
            });

        } catch (error) {
            console.error("Erro ao buscar usuário:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // ======================================================
    // UPDATE - Atualizar usuário
    // ======================================================

    // Valida os dados e atualiza o cadastro, gerando um novo hash para a senha.
    static async update(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (!Number.isSafeInteger(id) || id <= 0) {
                res.status(400).json({
                    erro: "ID do usuário inválido."
                });

                return;
            }

            const usuarioExistente = await UsuarioModel.findById(id);

            if (!usuarioExistente) {
                res.status(404).json({
                    erro: "Usuário não encontrado."
                });

                return;
            }

            const {
                nome,
                login,
                senha,
                perfil
            } = req.body ?? {};

            if (
                typeof nome !== "string" ||
                !nome.trim() ||
                typeof login !== "string" ||
                !login.trim() ||
                typeof senha !== "string" ||
                !senha ||
                !perfil
            ) {
                res.status(400).json({
                    erro: "Nome, login, senha e perfil são obrigatórios."
                });

                return;
            }

            if (perfil !== "caixa" && perfil !== "gerente") {
                res.status(400).json({
                    erro: "O perfil deve ser 'caixa' ou 'gerente'."
                });

                return;
            }

            if (senha.length < 6) {
                res.status(400).json({
                    erro: "A senha deve conter no mínimo 6 caracteres."
                });

                return;
            }

            const senhaHash = await bcrypt.hash(senha, 12);

            await UsuarioModel.update(id, {
                nome: nome.trim(),
                login: login.trim(),
                senha: senhaHash,
                perfil
            });

            res.status(200).json({
                mensagem: "Usuário atualizado com sucesso."
            });

        } catch (error) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "ER_DUP_ENTRY"
            ) {
                res.status(409).json({
                    erro: "Já existe um usuário com esse login."
                });

                return;
            }

            console.error("Erro ao atualizar usuário:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // ======================================================
    // DELETE - Excluir usuário
    // ======================================================

    // Exclui um usuario existente e trata impedimentos por vendas vinculadas.
    static async delete(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (!Number.isSafeInteger(id) || id <= 0) {
                res.status(400).json({
                    erro: "ID do usuário inválido."
                });

                return;
            }

            const usuario = await UsuarioModel.findById(id);

            if (!usuario) {
                res.status(404).json({
                    erro: "Usuário não encontrado."
                });

                return;
            }

            await UsuarioModel.delete(id);

            res.status(200).json({
                mensagem: "Usuário excluído com sucesso."
            });

        } catch (error) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "ER_ROW_IS_REFERENCED_2"
            ) {
                res.status(409).json({
                    erro: "O usuário não pode ser excluído porque possui vendas vinculadas."
                });

                return;
            }

            console.error("Erro ao excluir usuário:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // ======================================================
    // LOGIN - Autenticar usuário
    // ======================================================

    // Confere as credenciais e emite um token JWT valido por duas horas.
    static async login(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const {
                login,
                senha
            } = req.body ?? {};

            if (
                typeof login !== "string" ||
                !login.trim() ||
                typeof senha !== "string" ||
                !senha
            ) {
                res.status(400).json({
                    erro: "Login e senha são obrigatórios."
                });

                return;
            }

            const secret = process.env.JWT_SECRET;

            if (!secret) {
                console.error("JWT_SECRET não configurado.");

                res.status(500).json({
                    erro: "Erro interno do servidor."
                });

                return;
            }

            const usuario = await UsuarioModel.findByLogin(
                login.trim()
            );

            if (!usuario) {
                res.status(401).json({
                    erro: "Login ou senha inválidos."
                });

                return;
            }

            const senhaValida = await bcrypt.compare(
                senha,
                usuario.senha
            );

            if (!senhaValida) {
                res.status(401).json({
                    erro: "Login ou senha inválidos."
                });

                return;
            }

            const token = jwt.sign(
                {},
                secret,
                {
                    subject: String(usuario.id),
                    algorithm: "HS256",
                    expiresIn: "2h"
                }
            );

            res.status(200).json({
                mensagem: "Login realizado com sucesso.",
                token,
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    login: usuario.login,
                    perfil: usuario.perfil
                }
            });

        } catch (error) {
            console.error("Erro ao realizar login:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }
}