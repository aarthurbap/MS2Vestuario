import type { Request, Response } from "express";

import { ClienteModel } from "../models/ClienteModel";
import { ProdutoModel } from "../models/ProdutoModel";
import { VendaModel } from "../models/VendaModel";
import { FormaPagamentoModel } from "../models/FormaPagamentoModel";

import type { ItemVendaCriacao, PagamentoCriacao } from "../types/venda";
import type { UsuarioAutenticado } from "../types/auth";

type ItemVendaRequest = {
    // Identificador do produto que sera incluido na venda.
    produtoId: number;
    // Quantidade solicitada para o produto.
    quantidade: number;
};

type PagamentoRequest = {
    // Identificador da forma de pagamento cadastrada.
    formaPagamentoId: number;
    // Valor pago por esta forma de pagamento.
    valor: number;
};

// Converte nomes comuns de formas de pagamento nos identificadores usados no banco.
const MAPA_FORMAS_TEXTO: Record<string, number> = {
    dinheiro: 1,
    pix: 2,
    credito: 3,
    cartao_credito: 3,
    "cartão de crédito": 3,
    debito: 4,
    cartao_debito: 4,
    "cartão de débito": 4,
    boleto: 5,
    "boleto bancário": 5
};

export class VendaController {

    // ==================================================
    // CREATE - Registrar uma nova venda de forma atômica
    // ==================================================

    // Valida cliente, itens, estoque e pagamentos antes de registrar a venda.
    static async create(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const {
                clienteId,
                desconto = 0,
                itens,
                pagamentos,
                formaPagamento,
                formaPagamentoId,
                valorRecebido
            } = req.body ?? {};

            // 1. Identificação do funcionário autenticado via JWT
            const usuario = res.locals.usuario as UsuarioAutenticado | undefined;

            if (!usuario || !Number.isInteger(usuario.id) || usuario.id <= 0) {
                res.status(401).json({
                    erro: "Usuário não autenticado."
                });
                return;
            }

            const usuarioId = usuario.id;

            // 2. Validação dos itens da venda
            if (!Array.isArray(itens) || itens.length === 0) {
                res.status(400).json({
                    erro: "A venda deve possuir pelo menos um produto."
                });
                return;
            }

            // 3. Validação do desconto
            const descontoNum = Number(desconto);
            if (!Number.isFinite(descontoNum) || descontoNum < 0) {
                res.status(400).json({
                    erro: "O valor de desconto informado é inválido."
                });
                return;
            }

            // 4. Validação do cliente (opcional: aceita NULL para Consumidor não identificado)
            let idClienteFinal: number | null = null;
            if (clienteId !== undefined && clienteId !== null && clienteId !== "" && Number(clienteId) > 0) {
                const idNum = Number(clienteId);
                if (!Number.isInteger(idNum) || idNum <= 0) {
                    res.status(400).json({
                        erro: "ID do cliente inválido."
                    });
                    return;
                }

                const cliente = await ClienteModel.findById(idNum);
                if (!cliente) {
                    res.status(404).json({
                        erro: "Cliente informado não foi encontrado."
                    });
                    return;
                }

                idClienteFinal = idNum;
            }

            // 5. Validação dos produtos e cálculo do subtotal
            let subtotal = 0;
            const itensVenda: ItemVendaCriacao[] = [];
            const produtosAdicionados = new Set<number>();

            for (const item of itens as ItemVendaRequest[]) {
                if (
                    !item ||
                    typeof item !== "object" ||
                    !Number.isInteger(item.produtoId) ||
                    item.produtoId <= 0
                ) {
                    res.status(400).json({
                        erro: "Existe um produto com identificador inválido na venda."
                    });
                    return;
                }

                const qtd = Number(item.quantidade);
                if (!Number.isInteger(qtd) || qtd <= 0) {
                    res.status(400).json({
                        erro: "A quantidade de cada produto deve ser maior que zero."
                    });
                    return;
                }

                if (produtosAdicionados.has(item.produtoId)) {
                    res.status(400).json({
                        erro: "O mesmo produto não pode ser informado mais de uma vez na mesma venda."
                    });
                    return;
                }

                produtosAdicionados.add(item.produtoId);

                // Consulta preço e estoque real no banco de dados
                const produto = await ProdutoModel.findById(item.produtoId);

                if (!produto) {
                    res.status(404).json({
                        erro: `Produto com ID ${item.produtoId} não encontrado no catálogo.`
                    });
                    return;
                }

                if (!produto.ativo) {
                    res.status(400).json({
                        erro: `O produto "${produto.nome}" está desativado para vendas.`
                    });
                    return;
                }

                if (produto.estoque < qtd) {
                    res.status(400).json({
                        erro: `Estoque insuficiente para o produto "${produto.nome}". Disponível: ${produto.estoque}, solicitado: ${qtd}.`
                    });
                    return;
                }

                const preco = Number(produto.preco);
                subtotal += Number((preco * qtd).toFixed(2));

                itensVenda.push({
                    produtoId: produto.id,
                    quantidade: qtd,
                    precoUnitario: preco
                });
            }

            subtotal = Number(subtotal.toFixed(2));

            if (descontoNum > subtotal) {
                res.status(400).json({
                    erro: "O desconto não pode ser maior que o subtotal da venda."
                });
                return;
            }

            const total = Number((subtotal - descontoNum).toFixed(2));

            // 6. Validação e resolução das formas de pagamento
            const formasExistentes = await FormaPagamentoModel.findAll();
            const mapaFormasValidas = new Map(formasExistentes.map(f => [f.id, f]));

            const pagamentosFinal: PagamentoCriacao[] = [];

            if (Array.isArray(pagamentos) && pagamentos.length > 0) {
                let somaPagamentos = 0;

                for (const p of pagamentos as PagamentoRequest[]) {
                    const fId = Number(p.formaPagamentoId);
                    const val = Number(p.valor);

                    if (!Number.isInteger(fId) || !mapaFormasValidas.has(fId)) {
                        res.status(400).json({
                            erro: `Forma de pagamento com ID ${fId} é inválida ou não existe.`
                        });
                        return;
                    }

                    if (!Number.isFinite(val) || val <= 0) {
                        res.status(400).json({
                            erro: "O valor de cada pagamento deve ser maior que zero."
                        });
                        return;
                    }

                    somaPagamentos += val;
                    pagamentosFinal.push({
                        formaPagamentoId: fId,
                        valor: Number(val.toFixed(2))
                    });
                }

                somaPagamentos = Number(somaPagamentos.toFixed(2));

                if (Math.abs(somaPagamentos - total) > 0.05) {
                    res.status(400).json({
                        erro: `A soma dos pagamentos (R$ ${somaPagamentos.toFixed(2)}) não confere com o total da venda (R$ ${total.toFixed(2)}).`
                    });
                    return;
                }
            } else {
                // Pagamento único enviado via formaPagamentoId ou formaPagamento (string)
                let fId: number | null = null;

                if (formaPagamentoId && Number.isInteger(Number(formaPagamentoId))) {
                    fId = Number(formaPagamentoId);
                } else if (typeof formaPagamento === "string") {
                    const normalizado = formaPagamento.trim().toLowerCase();
                    fId = MAPA_FORMAS_TEXTO[normalizado] ?? null;
                }

                if (!fId || !mapaFormasValidas.has(fId)) {
                    // Fallback para a primeira forma ativa ou dinheiro
                    const primeiraAtiva = formasExistentes.find(f => f.ativo);
                    fId = primeiraAtiva ? primeiraAtiva.id : 1;
                }

                // Se em dinheiro, valida se o valor recebido é suficiente (se informado)
                if (fId === 1 && valorRecebido !== undefined && valorRecebido !== null && valorRecebido !== "") {
                    const rec = Number(valorRecebido);
                    if (Number.isFinite(rec) && rec < total) {
                        res.status(400).json({
                            erro: `Valor recebido em dinheiro (R$ ${rec.toFixed(2)}) é menor que o total da venda (R$ ${total.toFixed(2)}).`
                        });
                        return;
                    }
                }

                pagamentosFinal.push({
                    formaPagamentoId: fId,
                    valor: total
                });
            }

            // 7. Gravação atômica da venda no banco de dados (transação MySQL)
            const vendaId = await VendaModel.createComplete({
                clienteId: idClienteFinal,
                usuarioId,
                subtotal,
                desconto: descontoNum,
                total,
                itens: itensVenda,
                pagamentos: pagamentosFinal
            });

            res.status(201).json({
                mensagem: "Venda finalizada com sucesso.",
                id: vendaId,
                subtotal,
                desconto: descontoNum,
                total
            });

        } catch (error) {
            console.error("Erro ao registrar venda:", error);

            const msg = error instanceof Error ? error.message : "Erro interno do servidor.";
            res.status(500).json({
                erro: msg
            });
        }
    }

    // ==================================================
    // FIND ALL - Listar vendas com filtros
    // ==================================================

    // Converte os filtros da requisição e lista as vendas correspondentes.
    static async findAll(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const {
                busca,
                status,
                operadorId,
                formaPagamentoId,
                dataInicio,
                dataFim
            } = req.query;

            const filtros = {
                busca: typeof busca === "string" ? busca : undefined,
                status: typeof status === "string" ? status : undefined,
                operadorId: operadorId ? Number(operadorId) : undefined,
                formaPagamentoId: formaPagamentoId ? Number(formaPagamentoId) : undefined,
                dataInicio: typeof dataInicio === "string" ? dataInicio : undefined,
                dataFim: typeof dataFim === "string" ? dataFim : undefined
            };

            const vendas = await VendaModel.findAll(filtros);

            res.status(200).json({
                dados: vendas
            });

        } catch (error) {
            console.error("Erro ao buscar vendas:", error);

            res.status(500).json({
                erro: "Erro interno do servidor ao carregar histórico de vendas."
            });
        }
    }

    // ==================================================
    // FIND BY ID - Buscar venda detalhada
    // ==================================================

    // Valida o ID e retorna dados detalhados, itens e pagamentos da venda.
    static async findById(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                res.status(400).json({
                    erro: "ID da venda inválido."
                });
                return;
            }

            const venda = await VendaModel.findById(id);

            if (!venda) {
                res.status(404).json({
                    erro: "Venda não encontrada."
                });
                return;
            }

            res.status(200).json({
                dados: venda
            });

        } catch (error) {
            console.error("Erro ao buscar detalhes da venda:", error);

            res.status(500).json({
                erro: "Erro interno do servidor ao buscar detalhes da venda."
            });
        }
    }

    // ==================================================
    // CANCEL - Cancelar venda (Exclusivo Gerente)
    // ==================================================

    // Autoriza somente gerentes e solicita o cancelamento e estorno do estoque.
    static async cancel(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const id = Number(req.params.id);

            const usuario = res.locals.usuario as UsuarioAutenticado | undefined;

            if (!usuario) {
                res.status(401).json({
                    erro: "Usuário não autenticado."
                });
                return;
            }

            if (usuario.perfil !== "gerente") {
                res.status(403).json({
                    erro: "Somente usuários com perfil de gerente podem cancelar vendas."
                });
                return;
            }

            if (!Number.isInteger(id) || id <= 0) {
                res.status(400).json({
                    erro: "ID da venda inválido."
                });
                return;
            }

            const venda = await VendaModel.findById(id);

            if (!venda) {
                res.status(404).json({
                    erro: "Venda não encontrada."
                });
                return;
            }

            if (venda.status === "cancelada") {
                res.status(400).json({
                    erro: "Esta venda já está cancelada."
                });
                return;
            }

            await VendaModel.cancel(id);

            res.status(200).json({
                mensagem: "Venda cancelada com sucesso e estoque restituído."
            });

        } catch (error) {
            console.error("Erro ao cancelar venda:", error);

            res.status(500).json({
                erro: error instanceof Error ? error.message : "Erro interno do servidor."
            });
        }
    }

    // ==================================================
    // FORMAS DE PAGAMENTO - Listar formas ativas
    // ==================================================

    // Retorna somente as formas de pagamento que estao ativas.
    static async getFormasPagamento(
        _req: Request,
        res: Response
    ): Promise<void> {
        try {
            const formas = await FormaPagamentoModel.findAll();
            res.status(200).json({
                dados: formas.filter(f => f.ativo)
            });
        } catch (error) {
            console.error("Erro ao buscar formas de pagamento:", error);
            res.status(500).json({
                erro: "Erro interno do servidor ao carregar formas de pagamento."
            });
        }
    }
}
