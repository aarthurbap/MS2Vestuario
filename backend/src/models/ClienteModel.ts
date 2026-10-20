import { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../config/database";
import { Cliente } from "../types/cliente";

interface ClienteRow extends RowDataPacket {
    id: number;
    nome: string;
    cpf: string;
    telefone: string | null;
    email: string | null;
}

export class ClienteModel {
    static async create(
        cliente: Omit<Cliente, "id">
    ): Promise<number> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                INSERT INTO clientes (
                    nome,
                    cpf,
                    telefone,
                    email
                )
                VALUES (?, ?, ?, ?)
            `,
            [
                cliente.nome,
                cliente.cpf,
                cliente.telefone,
                cliente.email
            ]
        );

        return result.insertId;
    }

    static async findById(
        id: number
    ): Promise<Cliente | null> {
        const [rows] = await database.execute<ClienteRow[]>(
            `
                SELECT
                    id,
                    nome,
                    cpf,
                    telefone,
                    email
                FROM clientes
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
            cpf: rows[0].cpf,
            telefone: rows[0].telefone,
            email: rows[0].email
        };
    }

    static async findAll(): Promise<Cliente[]> {
        const [rows] = await database.execute<ClienteRow[]>(
            `
                SELECT
                    id,
                    nome,
                    cpf,
                    telefone,
                    email
                FROM clientes
            `
        );

        return rows.map((row) => ({
            id: row.id,
            nome: row.nome,
            cpf: row.cpf,
            telefone: row.telefone,
            email: row.email
        }));
    }

    static async update(
        id: number,
        cliente: Omit<Cliente, "id">
    ): Promise<boolean> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                UPDATE clientes
                SET
                    nome = ?,
                    cpf = ?,
                    telefone = ?,
                    email = ?
                WHERE id = ?
            `,
            [
                cliente.nome,
                cliente.cpf,
                cliente.telefone,
                cliente.email,
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
                DELETE FROM clientes
                WHERE id = ?
            `,
            [id]
        );

        return result.affectedRows > 0;
    }
}