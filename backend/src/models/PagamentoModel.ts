import { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../config/database";
import { Pagamento } from "../types/pagamento";

// Representa um pagamento no formato retornado pela tabela pagamentos.
interface PagamentoRow extends RowDataPacket {
    id: number;
    venda_id: number;
    forma_pagamento_id: number;
    valor: number;
}

// Define os dados de um pagamento sem o ID gerado pelo banco.
type NovoPagamento = Omit<Pagamento, "id">;

// Centraliza consultas e alteracoes dos pagamentos registrados nas vendas.
export class PagamentoModel {
    // Registra um pagamento e devolve o ID gerado pelo banco.
    static async create(
        pagamento: NovoPagamento
    ): Promise<number> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                INSERT INTO pagamentos (
                    venda_id,
                    forma_pagamento_id,
                    valor
                )
                VALUES (?, ?, ?)
            `,
            [
                pagamento.vendaId,
                pagamento.formaPagamentoId,
                pagamento.valor
            ]
        );

        return result.insertId;
    }

    // Busca um pagamento pelo ID ou retorna null quando ele nao existe.
    static async findById(
        id: number
    ): Promise<Pagamento | null> {
        const [rows] = await database.execute<PagamentoRow[]>(
            `
                SELECT
                    id,
                    venda_id,
                    forma_pagamento_id,
                    valor
                FROM pagamentos
                WHERE id = ?
            `,
            [id]
        );

        if (rows.length === 0) {
            return null;
        }

        return {
            id: rows[0].id,
            vendaId: rows[0].venda_id,
            formaPagamentoId: rows[0].forma_pagamento_id,
            valor: Number(rows[0].valor)
        };
    }

    // Consulta todos os pagamentos e converte seus valores para numeros.
    static async findAll(): Promise<Pagamento[]> {
        const [rows] = await database.execute<PagamentoRow[]>(
            `
                SELECT
                    id,
                    venda_id,
                    forma_pagamento_id,
                    valor
                FROM pagamentos
            `
        );

        return rows.map((row) => ({
            id: row.id,
            vendaId: row.venda_id,
            formaPagamentoId: row.forma_pagamento_id,
            valor: Number(row.valor)
        }));
    }

    // Atualiza a venda, a forma de pagamento e o valor associado.
    static async update(
        id: number,
        pagamento: NovoPagamento
    ): Promise<boolean> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                UPDATE pagamentos
                SET
                    venda_id = ?,
                    forma_pagamento_id = ?,
                    valor = ?
                WHERE id = ?
            `,
            [
                pagamento.vendaId,
                pagamento.formaPagamentoId,
                pagamento.valor,
                id
            ]
        );

        return result.affectedRows > 0;
    }

    // Exclui um pagamento pelo ID e informa se houve alteracao.
    static async delete(
        id: number
    ): Promise<boolean> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                DELETE FROM pagamentos
                WHERE id = ?
            `,
            [id]
        );

        return result.affectedRows > 0;
    }

    // Lista todos os pagamentos vinculados a uma venda.
    static async findByVendaId(
        vendaId: number
    ): Promise<Pagamento[]> {
        const [rows] = await database.execute<PagamentoRow[]>(
            `
                SELECT
                    id,
                    venda_id,
                    forma_pagamento_id,
                    valor
                FROM pagamentos
                WHERE venda_id = ?
            `,
            [vendaId]
        );

        return rows.map((row) => ({
            id: row.id,
            vendaId: row.venda_id,
            formaPagamentoId: row.forma_pagamento_id,
            valor: Number(row.valor)
        }));
    }
}