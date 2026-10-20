
import type { Request, Response } from "express";

import { ClienteModel } from "../models/ClienteModel";
import { ProdutoModel } from "../models/ProdutoModel";
import { VendaModel } from "../models/VendaModel";
import { ItemVendaModel } from "../models/ItemVendaModel";

import type { ItemVendaCriacao } from "../types/venda";
import type { UsuarioAutenticado } from "../types/auth";

// ======================================================
// TIPO - Item recebido na requisição de venda
// ======================================================

type ItemVendaRequest = {
    produtoId: number;
    quantidade: number;
};

// ======================================================
// CONTROLLER - Vendas
// ======================================================

export class VendaController {

    // ==================================================
    // CREATE - Registrar uma nova venda
    // ==================================================

    static async create(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const {
                clienteId,
                desconto = 0,
                itens
            } = req.body ?? {};

            // ==========================================
            // Identificação do funcionário autenticado
            // ==========================================

            // O usuário vem do JWT validado pelo
            // authMiddleware, não do corpo da requisição.
            const usuario = res.locals.usuario as
                UsuarioAutenticado | undefined;

            if (!usuario) {
                res.status(401).json({
                    erro: "Usuário não autenticado."
                });

                return;
            }

            const usuarioId = usuario.id;

            // ==========================================
            // Validação dos dados principais
            // ==========================================

            if (
                !Number.isInteger(clienteId) ||
                clienteId <= 0
            ) {
                res.status(400).json({
                    erro: "ID do cliente inválido."
                });

                return;
            }

            if (
                !Array.isArray(itens) ||
                itens.length === 0
            ) {
                res.status(400).json({
                    erro: "A venda deve possuir pelo menos um item."
                });

                return;
            }

            if (
                typeof desconto !== "number" ||
                !Number.isFinite(desconto) ||
                desconto < 0
            ) {
                res.status(400).json({
                    erro: "O desconto informado é inválido."
                });

                return;
            }

            // ==========================================
            // Validação do cliente
            // ==========================================

            const cliente = await ClienteModel.findById(
                clienteId
            );

            if (!cliente) {
                res.status(404).json({
                    erro: "Cliente não encontrado."
                });

                return;
            }

            // ==========================================
            // Validação dos itens da venda
            // ==========================================

            let subtotal = 0;

            const itensVenda: ItemVendaCriacao[] = [];

            // Impede que o mesmo produto seja informado
            // mais de uma vez na mesma venda.
            const produtosAdicionados = new Set<number>();

            for (const item of itens as ItemVendaRequest[]) {

                // Valida a estrutura de cada item recebido.
                if (
                    !item ||
                    typeof item !== "object" ||
                    !Number.isInteger(item.produtoId) ||
                    item.produtoId <= 0
                ) {
                    res.status(400).json({
                        erro: "Existe um produto com ID inválido na venda."
                    });

                    return;
                }

                if (
                    !Number.isInteger(item.quantidade) ||
                    item.quantidade <= 0
                ) {
                    res.status(400).json({
                        erro: "A quantidade dos produtos deve ser maior que zero."
                    });

                    return;
                }

                // Verifica se o produto já foi adicionado.
                if (produtosAdicionados.has(item.produtoId)) {
                    res.status(400).json({
                        erro: "O mesmo produto não pode ser informado mais de uma vez na venda."
                    });

                    return;
                }

                produtosAdicionados.add(item.produtoId);

                // Busca o produto no banco de dados.
                const produto = await ProdutoModel.findById(
                    item.produtoId
                );

                if (!produto) {
                    res.status(404).json({
                        erro: `Produto ${item.produtoId} não encontrado.`
                    });

                    return;
                }

                // Impede a venda de produtos desativados.
                if (!produto.ativo) {
                    res.status(400).json({
                        erro: `O produto "${produto.nome}" está desativado.`
                    });

                    return;
                }

                // Verifica a disponibilidade em estoque.
                if (produto.estoque < item.quantidade) {
                    res.status(400).json({
                        erro: `Estoque insuficiente para o produto "${produto.nome}".`
                    });

                    return;
                }

                // Utiliza o preço registrado no banco,
                // sem confiar em valores enviados pelo frontend.
                const subtotalItem =
                    produto.preco * item.quantidade;

                subtotal += subtotalItem;

                itensVenda.push({
                    produtoId: produto.id,
                    quantidade: item.quantidade,
                    precoUnitario: produto.preco
                });
            }

            subtotal = Number(subtotal.toFixed(2));

            // ==========================================
            // Validação do desconto
            // ==========================================

            if (desconto > subtotal) {
                res.status(400).json({
                    erro: "O desconto não pode ser maior que o subtotal da venda."
                });

                return;
            }

            /**
             * REGRA DE NEGÓCIO - Grandes descontos
             *
             * O projeto determina autorização gerencial
             * para descontos considerados elevados.
             *
             * Entretanto, o limite que caracteriza um
             * grande desconto ainda não foi definido.
             *
             * Por isso, não aplicamos um percentual
             * arbitrário nesta etapa.
             *
             * Essa regra deverá ser implementada antes
             * de considerar a autorização de descontos
             * totalmente concluída.
             */

            // ==========================================
            // Cálculo do total da venda
            // ==========================================

            const total = Number(
                (subtotal - desconto).toFixed(2)
            );

            // ==========================================
            // Registro da venda
            // ==========================================

            // O VendaModel.createComplete registra a venda,
            // seus itens e a movimentação de estoque
            // dentro de uma transação no banco de dados.
            const vendaId = await VendaModel.createComplete({
                clienteId,
                usuarioId,
                subtotal,
                desconto,
                total,
                itens: itensVenda
            });

            res.status(201).json({
                mensagem: "Venda registrada com sucesso.",
                id: vendaId,
                subtotal,
                desconto,
                total
            });

        } catch (error) {
            console.error("Erro ao registrar venda:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // ==================================================
    // FIND ALL - Listar vendas
    // ==================================================

    static async findAll(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            // Busca todas as vendas cadastradas.
            const vendas = await VendaModel.findAll();

            res.status(200).json({
                dados: vendas
            });

        } catch (error) {
            console.error("Erro ao buscar vendas:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // ==================================================
    // FIND BY ID - Buscar venda e seus itens
    // ==================================================

    static async findById(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const id = Number(req.params.id);

            // ==========================================
            // Validação do ID da venda
            // ==========================================

            if (
                !Number.isInteger(id) ||
                id <= 0
            ) {
                res.status(400).json({
                    erro: "ID da venda inválido."
                });

                return;
            }

            // ==========================================
            // Busca da venda
            // ==========================================

            const venda = await VendaModel.findById(id);

            if (!venda) {
                res.status(404).json({
                    erro: "Venda não encontrada."
                });

                return;
            }

            // ==========================================
            // Busca dos itens relacionados
            // ==========================================

            const itens = await ItemVendaModel.findByVendaId(
                id
            );

            res.status(200).json({
                dados: {
                    ...venda,
                    itens
                }
            });

        } catch (error) {
            console.error("Erro ao buscar venda:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }

    // ==================================================
    // CANCEL - Cancelar venda
    // ==================================================

    static async cancel(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const id = Number(req.params.id);

            // ==========================================
            // Identificação do funcionário autenticado
            // ==========================================

            const usuario = res.locals.usuario as
                UsuarioAutenticado | undefined;

            if (!usuario) {
                res.status(401).json({
                    erro: "Usuário não autenticado."
                });

                return;
            }

            // ==========================================
            // Verificação da permissão gerencial
            // ==========================================

            // Mantemos a validação no Controller como
            // proteção adicional ao gerenteMiddleware.
            if (usuario.perfil !== "gerente") {
                res.status(403).json({
                    erro: "Somente usuários com perfil de gerente podem cancelar vendas."
                });

                return;
            }

            // ==========================================
            // Validação do ID da venda
            // ==========================================

            if (
                !Number.isInteger(id) ||
                id <= 0
            ) {
                res.status(400).json({
                    erro: "ID da venda inválido."
                });

                return;
            }

            // ==========================================
            // Busca da venda
            // ==========================================

            const venda = await VendaModel.findById(id);

            if (!venda) {
                res.status(404).json({
                    erro: "Venda não encontrada."
                });

                return;
            }

            // Impede o cancelamento de uma venda
            // que já está cancelada.
            if (venda.status === "cancelada") {
                res.status(400).json({
                    erro: "A venda já está cancelada."
                });

                return;
            }

            // ==========================================
            // Cancelamento da venda
            // ==========================================

            // A autorização já foi verificada.
            // O ID do gerente não precisa ser enviado
            // pelo frontend.
            await VendaModel.cancel(id);

            res.status(200).json({
                mensagem: "Venda cancelada com sucesso."
            });

        } catch (error) {
            console.error("Erro ao cancelar venda:", error);

            res.status(500).json({
                erro: "Erro interno do servidor."
            });
        }
    }
}
