import { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../config/database";
import { Pagamento } from "../types/pagamento";

interface PagamentoRow extends RowDataPacket {
    id: number;
    venda_id: number;
    forma_pagamento_id: number;
    valor: number;
}

type NovoPagamento = Omit<Pagamento, "id">;

export class PagamentoModel {
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