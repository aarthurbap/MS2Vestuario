import { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../config/database";
import { ItemVenda } from "../types/itemvenda";

// Representa um item de venda no formato retornado pela tabela itens_venda.
interface ItemVendaRow extends RowDataPacket {
    id: number;
    venda_id: number;
    produto_id: number;
    quantidade: number;
    preco_unitario: number;
}

// Define os dados de um item ainda sem o identificador gerado pelo banco.
type NovoItemVenda = Omit<ItemVenda, "id">;

// Centraliza consultas e alteracoes dos itens associados as vendas.
export class ItemVendaModel {
    // Registra um item dentro de uma venda e devolve seu ID.
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

    // Busca um item pelo ID ou retorna null quando ele nao existe.
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

    // Consulta todos os itens e converte valores numericos do MySQL.
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

    // Atualiza os dados e os vinculos de um item de venda.
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

    // Exclui um item pelo ID e informa se alguma linha foi removida.
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

    // Lista todos os itens vinculados a uma venda especifica.
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