import { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../config/database";
import { ItemVenda } from "../types/itemvenda";

interface ItemVendaRow extends RowDataPacket {
    id: number;
    venda_id: number;
    produto_id: number;
    quantidade: number;
    preco_unitario: number;
}

type NovoItemVenda = Omit<ItemVenda, "id">;

export class ItemVendaModel {
    static async create(
        itemVenda: NovoItemVenda
    ): Promise<number> {
        const [result] = await database.execute<ResultSetHeader>(
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
                itemVenda.vendaId,
                itemVenda.produtoId,
                itemVenda.quantidade,
                itemVenda.precoUnitario
            ]
        );

        return result.insertId;
    }

    static async findById(
        id: number
    ): Promise<ItemVenda | null> {
        const [rows] = await database.execute<ItemVendaRow[]>(
            `
                SELECT
                    id,
                    venda_id,
                    produto_id,
                    quantidade,
                    preco_unitario
                FROM itens_venda
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
            produtoId: rows[0].produto_id,
            quantidade: Number(rows[0].quantidade),
            precoUnitario: Number(rows[0].preco_unitario)
        };
    }

    static async findAll(): Promise<ItemVenda[]> {
        const [rows] = await database.execute<ItemVendaRow[]>(
            `
                SELECT
                    id,
                    venda_id,
                    produto_id,
                    quantidade,
                    preco_unitario
                FROM itens_venda
            `
        );

        return rows.map((row) => ({
            id: row.id,
            vendaId: row.venda_id,
            produtoId: row.produto_id,
            quantidade: Number(row.quantidade),
            precoUnitario: Number(row.preco_unitario)
        }));
    }

    static async update(
        id: number,
        itemVenda: NovoItemVenda
    ): Promise<boolean> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                UPDATE itens_venda
                SET
                    venda_id = ?,
                    produto_id = ?,
                    quantidade = ?,
                    preco_unitario = ?
                WHERE id = ?
            `,
            [
                itemVenda.vendaId,
                itemVenda.produtoId,
                itemVenda.quantidade,
                itemVenda.precoUnitario,
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
                DELETE FROM itens_venda
                WHERE id = ?
            `,
            [id]
        );

        return result.affectedRows > 0;
    }

    static async findByVendaId(
        vendaId: number
    ): Promise<ItemVenda[]> {
        const [rows] = await database.execute<ItemVendaRow[]>(
            `
                SELECT
                    id,
                    venda_id,
                    produto_id,
                    quantidade,
                    preco_unitario
                FROM itens_venda
                WHERE venda_id = ?
            `,
            [vendaId]
        );

        return rows.map((row) => ({
            id: row.id,
            vendaId: row.venda_id,
            produtoId: row.produto_id,
            quantidade: Number(row.quantidade),
            precoUnitario: Number(row.preco_unitario)
        }));
    }
}