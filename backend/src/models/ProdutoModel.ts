import { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../config/database";
import { Produto } from "../types/produto";

interface ProdutoRow extends RowDataPacket {
    id: number;
    codigo: string;
    nome: string;
    descricao: string | null;
    estoque: number;
    preco: number;
    ativo: number | boolean;
    categoria_id: number | null;
}

export class ProdutoModel {
    static async create(
        produto: Omit<Produto, "id">
    ): Promise<number> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                INSERT INTO produtos (
                    codigo,
                    nome,
                    descricao,
                    estoque,
                    preco,
                    ativo,
                    categoria_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                produto.codigo,
                produto.nome,
                produto.descricao,
                produto.estoque,
                produto.preco,
                produto.ativo,
                produto.categoriaId
            ]
        );

        return result.insertId;
    }

    static async findById(
        id: number
    ): Promise<Produto | null> {
        const [rows] = await database.execute<ProdutoRow[]>(
            `
                SELECT
                    id,
                    codigo,
                    nome,
                    descricao,
                    estoque,
                    preco,
                    ativo,
                    categoria_id
                FROM produtos
                WHERE id = ?
            `,
            [id]
        );

        if (rows.length === 0) {
            return null;
        }

        return {
            id: rows[0].id,
            codigo: rows[0].codigo,
            nome: rows[0].nome,
            descricao: rows[0].descricao,
            estoque: Number(rows[0].estoque),
            preco: Number(rows[0].preco),
            ativo: Boolean(rows[0].ativo),
            categoriaId: rows[0].categoria_id
        };
    }

    static async findAll(): Promise<Produto[]> {
        const [rows] = await database.execute<ProdutoRow[]>(
            `
                SELECT
                    id,
                    codigo,
                    nome,
                    descricao,
                    estoque,
                    preco,
                    ativo,
                    categoria_id
                FROM produtos
            `
        );

        return rows.map((row) => ({
            id: row.id,
            codigo: row.codigo,
            nome: row.nome,
            descricao: row.descricao,
            estoque: Number(row.estoque),
            preco: Number(row.preco),
            ativo: Boolean(row.ativo),
            categoriaId: row.categoria_id
        }));
    }

    static async update(
        id: number,
        produto: Omit<Produto, "id">
    ): Promise<boolean> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                UPDATE produtos
                SET
                    codigo = ?,
                    nome = ?,
                    descricao = ?,
                    estoque = ?,
                    preco = ?,
                    ativo = ?,
                    categoria_id = ?
                WHERE id = ?
            `,
            [
                produto.codigo,
                produto.nome,
                produto.descricao,
                produto.estoque,
                produto.preco,
                produto.ativo,
                produto.categoriaId,
                id
            ]
        );

        return result.affectedRows > 0;
    }

    static async deactivate(id: number): Promise<boolean> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                UPDATE produtos
                SET ativo = FALSE
                WHERE id = ?
            `,
            [id]
        );

        return result.affectedRows > 0;
    }
}