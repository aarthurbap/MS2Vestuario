import type {
    ResultSetHeader,
    RowDataPacket
} from "mysql2";

import { database } from "../config/database";

import type {
    NovaVendaCompleta,
    Venda,
    VendaRow,
    VendaDetalhada,
    ItemVendaDetalhado,
    PagamentoDetalhado
} from "../types/venda";

// Representa somente os campos necessarios para conferir o estado da venda.
interface VendaStatusRow extends RowDataPacket {
    id: number;
    status: "finalizada" | "cancelada";
}

// Guarda os produtos e quantidades usados para devolver o estoque no cancelamento.
interface ItemVendaCancelamentoRow extends RowDataPacket {
    produto_id: number;
    quantidade: number;
}

// Representa cada item da consulta detalhada, incluindo dados legiveis do produto.
interface ItemVendaDetalhadoRow extends RowDataPacket {
    id: number;
    venda_id: number;
    produto_id: number;
    produto_codigo: string | null;
    produto_nome: string | null;
    quantidade: number;
    preco_unitario: number | string;
    subtotal_item: number | string;
}

// Representa cada pagamento e o nome da forma usada na venda.
interface PagamentoDetalhadoRow extends RowDataPacket {
    id: number;
    venda_id: number;
    forma_pagamento_id: number;
    forma_pagamento_nome: string;
    valor: number | string;
}

// ======================================================
// MODEL - Vendas
// ======================================================

export class VendaModel {

    // ==================================================
    // CREATE COMPLETE
    // Registrar venda, itens, pagamentos e baixa de estoque
    // dentro de uma transação atômica MySQL.
    // ==================================================

    // Grava venda, itens, pagamentos e baixa de estoque em uma unica transacao.
    static async createComplete(
        venda: NovaVendaCompleta
    ): Promise<number> {
        const connection = await database.getConnection();

        try {
            await connection.beginTransaction();

            // 1. Registrar a venda
            const [resultadoVenda] = await connection.execute<ResultSetHeader>(
                `
                INSERT INTO vendas (
                    cliente_id,
                    usuario_id,
                    subtotal,
                    desconto,
                    total,
                    status
                )
                VALUES (?, ?, ?, ?, ?, 'finalizada')
                `,
                [
                    venda.clienteId,
                    venda.usuarioId,
                    venda.subtotal,
                    venda.desconto,
                    venda.total
                ]
            );

            const vendaId = resultadoVenda.insertId;

            // 2. Processar os itens e baixar o estoque atomicamente
            for (const item of venda.itens) {
                const [resultadoEstoque] = await connection.execute<ResultSetHeader>(
                    `
                    UPDATE produtos
                    SET estoque = estoque - ?
                    WHERE id = ?
                    AND estoque >= ?
                    AND ativo = TRUE
                    `,
                    [
                        item.quantidade,
                        item.produtoId,
                        item.quantidade
                    ]
                );

                if (resultadoEstoque.affectedRows === 0) {
                    throw new Error(
                        `Estoque insuficiente ou produto inativo (ID: ${item.produtoId}).`
                    );
                }

                await connection.execute<ResultSetHeader>(
                    `
                    INSERT INTO itens_venda (
                        venda_id,
                        produto_id,
                        quantidade,
                        preco_unitario
                    )
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        vendaId,
                        item.produtoId,
                        item.quantidade,
                        item.precoUnitario
                    ]
                );
            }

            // 3. Registrar os pagamentos realizados
            for (const pag of venda.pagamentos) {
                await connection.execute<ResultSetHeader>(
                    `
                    INSERT INTO pagamentos (
                        venda_id,
                        forma_pagamento_id,
                        valor
                    )
                    VALUES (?, ?, ?)
                    `,
                    [
                        vendaId,
                        pag.formaPagamentoId,
                        pag.valor
                    ]
                );
            }

            // 4. Confirmar transação
            await connection.commit();

            return vendaId;

        } catch (error) {
            // Reverter todas as alterações caso ocorra qualquer falha
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ==================================================
    // FIND BY ID - Buscar venda detalhada
    // ==================================================

    // Monta os dados da venda junto com seu cliente, operador, itens e pagamentos.
    static async findById(
        id: number
    ): Promise<VendaDetalhada | null> {
        const [linhas] = await database.execute<VendaRow[]>(
            `
            SELECT
                v.id,
                v.cliente_id,
                c.nome AS cliente_nome,
                c.cpf AS cliente_cpf,
                v.usuario_id,
                u.nome AS usuario_nome,
                v.data_venda,
                v.subtotal,
                v.desconto,
                v.total,
                v.status
            FROM vendas v
            LEFT JOIN clientes c ON c.id = v.cliente_id
            JOIN usuarios u ON u.id = v.usuario_id
            WHERE v.id = ?
            `,
            [id]
        );

        if (linhas.length === 0) {
            return null;
        }

        const linha = linhas[0];

        // Buscar itens com informações dos produtos
        const [linhasItens] = await database.execute<ItemVendaDetalhadoRow[]>(
            `
            SELECT
                iv.id,
                iv.venda_id,
                iv.produto_id,
                p.codigo AS produto_codigo,
                p.nome AS produto_nome,
                iv.quantidade,
                iv.preco_unitario,
                (iv.quantidade * iv.preco_unitario) AS subtotal_item
            FROM itens_venda iv
            LEFT JOIN produtos p ON p.id = iv.produto_id
            WHERE iv.venda_id = ?
            ORDER BY iv.id ASC
            `,
            [id]
        );

        const itens: ItemVendaDetalhado[] = linhasItens.map((item) => ({
            id: item.id,
            vendaId: item.venda_id,
            produtoId: item.produto_id,
            produtoCodigo: item.produto_codigo || `PROD-${item.produto_id}`,
            produtoNome: item.produto_nome || "Produto não identificado",
            quantidade: Number(item.quantidade),
            precoUnitario: Number(item.preco_unitario),
            subtotalItem: Number(item.subtotal_item)
        }));

        // Buscar pagamentos realizados
        const [linhasPagamentos] = await database.execute<PagamentoDetalhadoRow[]>(
            `
            SELECT
                p.id,
                p.venda_id,
                p.forma_pagamento_id,
                fp.nome AS forma_pagamento_nome,
                p.valor
            FROM pagamentos p
            JOIN formas_pagamento fp ON fp.id = p.forma_pagamento_id
            WHERE p.venda_id = ?
            ORDER BY p.id ASC
            `,
            [id]
        );

        const pagamentos: PagamentoDetalhado[] = linhasPagamentos.map((pag) => ({
            id: pag.id,
            vendaId: pag.venda_id,
            formaPagamentoId: pag.forma_pagamento_id,
            formaPagamentoNome: pag.forma_pagamento_nome,
            valor: Number(pag.valor)
        }));

        const totalUnidades = itens.reduce((s, i) => s + i.quantidade, 0);
        const totalItens = itens.length;
        const formasPagamento = pagamentos.map(p => p.formaPagamentoNome).join(", ");

        return {
            id: linha.id,
            clienteId: linha.cliente_id ? Number(linha.cliente_id) : null,
            clienteNome: linha.cliente_nome ?? null,
            clienteCpf: linha.cliente_cpf ?? null,
            usuarioId: Number(linha.usuario_id),
            usuarioNome: linha.usuario_nome,
            dataVenda: linha.data_venda,
            subtotal: Number(linha.subtotal),
            desconto: Number(linha.desconto),
            total: Number(linha.total),
            status: linha.status,
            totalItens,
            totalUnidades,
            formasPagamento,
            itens,
            pagamentos,
            cliente: linha.cliente_id ? {
                id: Number(linha.cliente_id),
                nome: linha.cliente_nome ?? "Cliente",
                cpf: linha.cliente_cpf ?? undefined
            } : null,
            usuario: {
                id: Number(linha.usuario_id),
                nome: linha.usuario_nome ?? `Usuário ${linha.usuario_id}`,
                login: ""
            }
        };
    }

    // ==================================================
    // FIND ALL - Listar vendas com dados completos e filtros
    // ==================================================

    // Aplica filtros opcionais e retorna um resumo ordenado das vendas.
    static async findAll(filtros?: {
        busca?: string;
        status?: string;
        operadorId?: number;
        formaPagamentoId?: number;
        dataInicio?: string;
        dataFim?: string;
    }): Promise<Venda[]> {
        const condicoes: string[] = [];
        const parametros: Array<string | number> = [];

        if (filtros?.status && (filtros.status === "finalizada" || filtros.status === "cancelada")) {
            condicoes.push("v.status = ?");
            parametros.push(filtros.status);
        }

        if (filtros?.operadorId && filtros.operadorId > 0) {
            condicoes.push("v.usuario_id = ?");
            parametros.push(filtros.operadorId);
        }

        if (filtros?.dataInicio) {
            condicoes.push("DATE(v.data_venda) >= ?");
            parametros.push(filtros.dataInicio);
        }

        if (filtros?.dataFim) {
            condicoes.push("DATE(v.data_venda) <= ?");
            parametros.push(filtros.dataFim);
        }

        if (filtros?.formaPagamentoId && filtros.formaPagamentoId > 0) {
            condicoes.push(`EXISTS (
                SELECT 1 FROM pagamentos p2
                WHERE p2.venda_id = v.id AND p2.forma_pagamento_id = ?
            )`);
            parametros.push(filtros.formaPagamentoId);
        }

        if (filtros?.busca && filtros.busca.trim() !== "") {
            const termo = `%${filtros.busca.trim()}%`;
            condicoes.push("(CAST(v.id AS CHAR) LIKE ? OR c.nome LIKE ? OR c.cpf LIKE ?)");
            parametros.push(termo, termo, termo);
        }

        const clausulaWhere = condicoes.length > 0 ? `WHERE ${condicoes.join(" AND ")}` : "";

        const sql = `
            SELECT
                v.id,
                v.cliente_id,
                c.nome AS cliente_nome,
                c.cpf AS cliente_cpf,
                v.usuario_id,
                u.nome AS usuario_nome,
                v.data_venda,
                v.subtotal,
                v.desconto,
                v.total,
                v.status,
                COALESCE(SUM(iv.quantidade), 0) AS total_unidades,
                COUNT(DISTINCT iv.produto_id) AS total_itens,
                (
                    SELECT GROUP_CONCAT(DISTINCT fp.nome SEPARATOR ', ')
                    FROM pagamentos p
                    JOIN formas_pagamento fp ON fp.id = p.forma_pagamento_id
                    WHERE p.venda_id = v.id
                ) AS formas_pagamento
            FROM vendas v
            LEFT JOIN clientes c ON c.id = v.cliente_id
            JOIN usuarios u ON u.id = v.usuario_id
            LEFT JOIN itens_venda iv ON iv.venda_id = v.id
            ${clausulaWhere}
            GROUP BY
                v.id,
                v.cliente_id,
                c.nome,
                c.cpf,
                v.usuario_id,
                u.nome,
                v.data_venda,
                v.subtotal,
                v.desconto,
                v.total,
                v.status
            ORDER BY v.data_venda DESC, v.id DESC
        `;

        const [linhas] = await database.execute<VendaRow[]>(sql, parametros);

        return linhas.map((linha): Venda => ({
            id: linha.id,
            clienteId: linha.cliente_id ? Number(linha.cliente_id) : null,
            clienteNome: linha.cliente_nome ?? null,
            clienteCpf: linha.cliente_cpf ?? null,
            usuarioId: Number(linha.usuario_id),
            usuarioNome: linha.usuario_nome,
            dataVenda: linha.data_venda,
            subtotal: Number(linha.subtotal),
            desconto: Number(linha.desconto),
            total: Number(linha.total),
            status: linha.status,
            totalUnidades: Number(linha.total_unidades ?? 0),
            totalItens: Number(linha.total_itens ?? 0),
            formasPagamento: linha.formas_pagamento ?? "Não informada"
        }));
    }

    // ==================================================
    // CANCEL - Cancelar venda e devolver produtos ao estoque
    // ==================================================

    // Bloqueia a venda, devolve os itens ao estoque e atualiza seu status atomicamente.
    static async cancel(id: number): Promise<boolean> {
        const connection = await database.getConnection();

        try {
            await connection.beginTransaction();

            // 1. Bloquear a linha da venda
            const [vendas] = await connection.execute<VendaStatusRow[]>(
                `
                SELECT id, status
                FROM vendas
                WHERE id = ?
                FOR UPDATE
                `,
                [id]
            );

            if (vendas.length === 0) {
                await connection.rollback();
                return false;
            }

            const venda = vendas[0];

            if (venda.status !== "finalizada") {
                await connection.rollback();
                return false;
            }

            // 2. Buscar os itens vendidos para devolver ao estoque
            const [itens] = await connection.execute<ItemVendaCancelamentoRow[]>(
                `
                SELECT produto_id, quantidade
                FROM itens_venda
                WHERE venda_id = ?
                `,
                [id]
            );

            for (const item of itens) {
                await connection.execute<ResultSetHeader>(
                    `
                    UPDATE produtos
                    SET estoque = estoque + ?
                    WHERE id = ?
                    `,
                    [item.quantidade, item.produto_id]
                );
            }

            // 3. Atualizar status para 'cancelada'
            const [resultado] = await connection.execute<ResultSetHeader>(
                `
                UPDATE vendas
                SET status = 'cancelada'
                WHERE id = ?
                AND status = 'finalizada'
                `,
                [id]
            );

            if (resultado.affectedRows === 0) {
                throw new Error("Não foi possível cancelar a venda.");
            }

            await connection.commit();
            return true;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}
