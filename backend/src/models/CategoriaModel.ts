import { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../config/database";
import { Categoria } from "../types/categoria";

interface CategoriaRow extends RowDataPacket {
    id: number;
    nome: string;
    descricao: string | null;
}

export class CategoriaModel {
    static async create(
        categoria: Omit<Categoria, "id">
    ): Promise<number> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                INSERT INTO categorias (
                    nome,
                    descricao
                )
                VALUES (?, ?)
            `,
            [
                categoria.nome,
                categoria.descricao
            ]
        );

        return result.insertId;
    }

    static async findById(
        id: number
    ): Promise<Categoria | null> {
        const [rows] = await database.execute<CategoriaRow[]>(
            `
                SELECT
                    id,
                    nome,
                    descricao
                FROM categorias
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
            descricao: rows[0].descricao
        };
    }

    static async findAll(): Promise<Categoria[]> {
        const [rows] = await database.execute<CategoriaRow[]>(
            `
                SELECT
                    id,
                    nome,
                    descricao
                FROM categorias
            `
        );

        return rows.map((row) => ({
            id: row.id,
            nome: row.nome,
            descricao: row.descricao
        }));
    }

    static async update(
        id: number,
        categoria: Omit<Categoria, "id">
    ): Promise<boolean> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                UPDATE categorias
                SET
                    nome = ?,
                    descricao = ?
                WHERE id = ?
            `,
            [
                categoria.nome,
                categoria.descricao,
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
                DELETE FROM categorias
                WHERE id = ?
            `,
            [id]
        );

        return result.affectedRows > 0;
    }
}