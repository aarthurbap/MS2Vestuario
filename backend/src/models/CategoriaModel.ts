import { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../config/database";
import { Categoria } from "../types/categoria";

// Representa uma linha de categoria retornada pelo MySQL.
interface CategoriaRow extends RowDataPacket {
    id: number;
    nome: string;
    descricao: string | null;
}

// Centraliza as consultas e alteracoes da tabela de categorias.
export class CategoriaModel {
    // Insere uma categoria e devolve o ID gerado pelo banco.
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

    // Busca uma categoria pelo ID ou retorna null quando ela nao existe.
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

    // Consulta todas as categorias e converte as linhas para o tipo da aplicacao.
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

    // Atualiza nome e descricao e informa se alguma linha foi afetada.
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

    // Remove uma categoria e informa se alguma linha foi excluida.
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