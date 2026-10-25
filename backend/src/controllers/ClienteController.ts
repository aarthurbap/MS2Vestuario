import { Request, Response } from "express";
import { ClienteModel } from "../models/ClienteModel";

// Recebe requisicoes de clientes, valida os dados e devolve respostas HTTP.
export class ClienteController {
    // Valida os campos do cliente e solicita ao modelo a inclusão no banco.
    static async create(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const {
                nome,
                cpf,
                telefone,
                email
            } = req.body;

            if (!nome || !cpf) {
                res.status(400).json({
                    erro: "Nome e CPF são obrigatórios."
                });

                return;
            }

            if (!/^\d{11}$/.test(cpf)) {
                res.status(400).json({
                    erro: "O CPF deve conter 11 dígitos numéricos."
                });

                return;
            }

            const id = await ClienteModel.create({
                nome,
                cpf,
                telefone: telefone ?? null,
                email: email ?? null
            });

            res.status(201).json({
                mensagem: "Cliente cadastrado com sucesso.",
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
                    erro: "Já existe um cliente com esse CPF."
                });

                return;
            }

            console.error("Erro ao cadastrar cliente:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // Busca todos os clientes e retorna a lista no corpo da resposta.
    static async findAll(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const clientes = await ClienteModel.findAll();

            res.status(200).json({
                dados: clientes
            });
        } catch (error) {
            console.error("Erro ao buscar clientes:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // Valida o identificador da URL e retorna o cliente correspondente.
    static async findById(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                res.status(400).json({
                    erro: "ID do cliente inválido."
                });

                return;
            }

            const cliente = await ClienteModel.findById(id);

            if (!cliente) {
                res.status(404).json({
                    erro: "Cliente não encontrado."
                });

                return;
            }

            res.status(200).json({
                dados: cliente
            });
        } catch (error) {
            console.error("Erro ao buscar cliente:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // Confere se o cliente existe, valida os novos dados e atualiza o cadastro.
    static async update(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                res.status(400).json({
                    erro: "ID do cliente inválido."
                });

                return;
            }

            const clienteExistente = await ClienteModel.findById(id);

            if (!clienteExistente) {
                res.status(404).json({
                    erro: "Cliente não encontrado."
                });

                return;
            }

            const {
                nome,
                cpf,
                telefone,
                email
            } = req.body;

            if (!nome || !cpf) {
                res.status(400).json({
                    erro: "Nome e CPF são obrigatórios."
                });

                return;
            }

            if (!/^\d{11}$/.test(cpf)) {
                res.status(400).json({
                    erro: "O CPF deve conter 11 dígitos numéricos."
                });

                return;
            }

            await ClienteModel.update(id, {
                nome,
                cpf,
                telefone: telefone ?? null,
                email: email ?? null
            });

            res.status(200).json({
                mensagem: "Cliente atualizado com sucesso."
            });
        } catch (error) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "ER_DUP_ENTRY"
            ) {
                res.status(409).json({
                    erro: "Já existe um cliente com esse CPF."
                });

                return;
            }

            console.error("Erro ao atualizar cliente:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // Confere se o cliente existe e o remove, tratando vínculos com vendas.
    static async delete(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                res.status(400).json({
                    erro: "ID do cliente inválido."
                });

                return;
            }

            const cliente = await ClienteModel.findById(id);

            if (!cliente) {
                res.status(404).json({
                    erro: "Cliente não encontrado."
                });

                return;
            }

            await ClienteModel.delete(id);

            res.status(200).json({
                mensagem: "Cliente excluído com sucesso."
            });
        } catch (error) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "ER_ROW_IS_REFERENCED_2"
            ) {
                res.status(409).json({
                    erro: "O cliente não pode ser excluído porque possui vendas vinculadas."
                });

                return;
            }

            console.error("Erro ao excluir cliente:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }
}