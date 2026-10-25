import { Request, Response } from "express";
import { ProdutoModel } from "../models/ProdutoModel";

// Recebe requisicoes de produtos, valida os dados e coordena operacoes do modelo.
export class ProdutoController {
    // Valida os dados obrigatorios e cadastra um novo produto.
    static async create(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const {
                codigo,
                nome,
                descricao,
                estoque,
                preco,
                ativo,
                categoriaId
            } = req.body;

            if (
                !codigo ||
                !nome ||
                estoque === undefined ||
                preco === undefined
            ) {
                res.status(400).json({
                    erro: "Código, nome, estoque e preço são obrigatórios."
                });

                return;
            }

            if (estoque < 0) {
                res.status(400).json({
                    erro: "O estoque não pode ser negativo."
                });

                return;
            }

            if (preco < 0) {
                res.status(400).json({
                    erro: "O preço não pode ser negativo."
                });

                return;
            }

            const id = await ProdutoModel.create({
                codigo,
                nome,
                descricao: descricao ?? null,
                estoque,
                preco,
                ativo: ativo ?? true,
                categoriaId: categoriaId ?? null
            });

            res.status(201).json({
                mensagem: "Produto cadastrado com sucesso.",
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
                    erro: "Já existe um produto com esse código."
                });

                return;
            }

            console.error("Erro ao cadastrar produto:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // Consulta e retorna todos os produtos cadastrados.
    static async findAll(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const produtos = await ProdutoModel.findAll();

            res.status(200).json({
                dados: produtos
            });
        } catch (error) {
            console.error("Erro ao buscar produtos:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // Valida o identificador e retorna os dados de um produto.
    static async findById(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                res.status(400).json({
                    erro: "ID do produto inválido."
                });

                return;
            }

            const produto = await ProdutoModel.findById(id);

            if (!produto) {
                res.status(404).json({
                    erro: "Produto não encontrado."
                });

                return;
            }

            res.status(200).json({
                dados: produto
            });
        } catch (error) {
            console.error("Erro ao buscar produto:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // Confere a existencia e a validade dos campos antes de atualizar o produto.
    static async update(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                res.status(400).json({
                    erro: "ID do produto inválido."
                });

                return;
            }

            const produtoExistente = await ProdutoModel.findById(id);

            if (!produtoExistente) {
                res.status(404).json({
                    erro: "Produto não encontrado."
                });

                return;
            }

            const {
                codigo,
                nome,
                descricao,
                estoque,
                preco,
                ativo,
                categoriaId
            } = req.body;

            if (
                !codigo ||
                !nome ||
                estoque === undefined ||
                preco === undefined ||
                ativo === undefined
            ) {
                res.status(400).json({
                    erro: "Código, nome, estoque, preço e situação são obrigatórios."
                });

                return;
            }

            if (estoque < 0) {
                res.status(400).json({
                    erro: "O estoque não pode ser negativo."
                });

                return;
            }

            if (preco < 0) {
                res.status(400).json({
                    erro: "O preço não pode ser negativo."
                });

                return;
            }

            await ProdutoModel.update(id, {
                codigo,
                nome,
                descricao: descricao ?? null,
                estoque,
                preco,
                ativo,
                categoriaId: categoriaId ?? null
            });

            res.status(200).json({
                mensagem: "Produto atualizado com sucesso."
            });
        } catch (error) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "ER_DUP_ENTRY"
            ) {
                res.status(409).json({
                    erro: "Já existe um produto com esse código."
                });

                return;
            }

            console.error("Erro ao atualizar produto:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // Desativa um produto existente sem removê-lo do histórico do sistema.
    static async deactivate(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                res.status(400).json({
                    erro: "ID do produto inválido."
                });

                return;
            }

            const produto = await ProdutoModel.findById(id);

            if (!produto) {
                res.status(404).json({
                    erro: "Produto não encontrado."
                });

                return;
            }

            if (!produto.ativo) {
                res.status(400).json({
                    erro: "O produto já está desativado."
                });

                return;
            }

            await ProdutoModel.deactivate(id);

            res.status(200).json({
                mensagem: "Produto desativado com sucesso."
            });
        } catch (error) {
            console.error("Erro ao desativar produto:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }
}