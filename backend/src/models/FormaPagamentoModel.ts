import { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../config/database";
import { FormaPagamento } from "../types/formaPagamento";

// Representa uma forma de pagamento como ela e retornada pelo MySQL.
interface FormaPagamentoRow extends RowDataPacket {
    id: number;
    nome: string;
    ativo: number | boolean;
}

// Centraliza as consultas e alteracoes das formas de pagamento.
export class FormaPagamentoModel {
    // Insere uma forma de pagamento e devolve o ID gerado.
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

    // Busca uma forma de pagamento pelo ID e normaliza o campo ativo para boolean.
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

    // Consulta todas as formas e converte os valores de ativo para boolean.
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

    // Atualiza nome e situacao de uma forma de pagamento.
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

    // Remove uma forma de pagamento e informa se houve exclusao.
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