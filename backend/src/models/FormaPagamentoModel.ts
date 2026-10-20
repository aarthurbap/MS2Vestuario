import { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../config/database";
import { FormaPagamento } from "../types/formaPagamento";

interface FormaPagamentoRow extends RowDataPacket {
    id: number;
    nome: string;
    ativo: number | boolean;
}

export class FormaPagamentoModel {
    static async create(
        formaPagamento: Omit<FormaPagamento, "id">
    ): Promise<number> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                INSERT INTO formas_pagamento (
                    nome,
                    ativo
                )
                VALUES (?, ?)
            `,
            [
                formaPagamento.nome,
                formaPagamento.ativo
            ]
        );

        return result.insertId;
    }

    static async findById(
        id: number
    ): Promise<FormaPagamento | null> {
        const [rows] = await database.execute<FormaPagamentoRow[]>(
            `
                SELECT
                    id,
                    nome,
                    ativo
                FROM formas_pagamento
                WHERE id = ?
            `,
            [id]
        );

        if (rows.length === 0) {
            return null;
        }

        return {
            id: rows[0].id,
            nome: rows[0].nome,
            ativo: Boolean(rows[0].ativo)
        };
    }

    static async findAll(): Promise<FormaPagamento[]> {
        const [rows] = await database.execute<FormaPagamentoRow[]>(
            `
                SELECT
                    id,
                    nome,
                    ativo
                FROM formas_pagamento
            `
        );

        return rows.map((row) => ({
            id: row.id,
            nome: row.nome,
            ativo: Boolean(row.ativo)
        }));
    }

    static async update(
        id: number,
        formaPagamento: Omit<FormaPagamento, "id">
    ): Promise<boolean> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                UPDATE formas_pagamento
                SET
                    nome = ?,
                    ativo = ?
                WHERE id = ?
            `,
            [
                formaPagamento.nome,
                formaPagamento.ativo,
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
                DELETE FROM formas_pagamento
                WHERE id = ?
            `,
            [id]
        );

        return result.affectedRows > 0;
    }
}