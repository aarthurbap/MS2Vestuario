import type {
    ResultSetHeader,
    RowDataPacket
} from "mysql2";

import { pool } from "../config/database";

import type {
    NovaVendaCompleta,
    Venda
} from "../types/venda";

// ======================================================
// TIPOS - Linhas retornadas pelo MySQL
// ======================================================

interface VendaRow extends RowDataPacket {
    id: number;
    cliente_id: number;
    usuario_id: number;
    data_venda: Date;
    subtotal: number | string;
    desconto: number | string;
    total: number | string;
    status: "finalizada" | "cancelada";
}

interface VendaStatusRow extends RowDataPacket {
    id: number;
    status: "finalizada" | "cancelada";
}

interface ItemVendaCancelamentoRow extends RowDataPacket {
    produto_id: number;
    quantidade: number;
}

// ======================================================
// MODEL - Vendas
// ======================================================

export class VendaModel {

    // ==================================================
    // CREATE - Registrar somente a venda
    // ==================================================

    static async create(
        venda: Omit<
            Venda,
            "id" | "dataVenda" | "status"
        >
    ): Promise<number> {

        const [resultado] =
            await pool.execute<ResultSetHeader>(
                `
                INSERT INTO vendas (
                    cliente_id,
                    usuario_id,
                    subtotal,
                    desconto,
                    total
                )
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    venda.clienteId,
                    venda.usuarioId,
                    venda.subtotal,
                    venda.desconto,
                    venda.total
                ]
            );

        return resultado.insertId;
    }

    // ==================================================
    // FIND BY ID - Buscar uma venda pelo ID
    // ==================================================

    static async findById(
        id: number
    ): Promise<Venda | null> {

        const [linhas] =
            await pool.execute<VendaRow[]>(
                `
                SELECT
                    id,
                    cliente_id,
                    usuario_id,
                    data_venda,
                    subtotal,
                    desconto,
                    total,
                    status
                FROM vendas
                WHERE id = ?
                `,
                [id]
            );

        if (linhas.length === 0) {
            return null;
        }

        const linha = linhas[0];

        return {
            id: linha.id,

            clienteId:
                linha.cliente_id,

            usuarioId:
                linha.usuario_id,

            dataVenda:
                linha.data_venda,

            // Campos DECIMAL podem ser retornados
            // como string pelo mysql2.
            subtotal: Number(
                linha.subtotal
            ),

            desconto: Number(
                linha.desconto
            ),

            total: Number(
                linha.total
            ),

            status:
                linha.status
        };
    }

    // ==================================================
    // FIND ALL - Listar todas as vendas
    // ==================================================

    static async findAll(): Promise<Venda[]> {

        const [linhas] =
            await pool.execute<VendaRow[]>(
                `
                SELECT
                    id,
                    cliente_id,
                    usuario_id,
                    data_venda,
                    subtotal,
                    desconto,
                    total,
                    status
                FROM vendas
                ORDER BY data_venda DESC
                `
            );

        return linhas.map(
            (linha): Venda => ({
                id:
                    linha.id,

                clienteId:
                    linha.cliente_id,

                usuarioId:
                    linha.usuario_id,

                dataVenda:
                    linha.data_venda,

                subtotal:
                    Number(
                        linha.subtotal
                    ),

                desconto:
                    Number(
                        linha.desconto
                    ),

                total:
                    Number(
                        linha.total
                    ),

                status:
                    linha.status
            })
        );
    }

    // ==================================================
    // UPDATE - Atualizar uma venda
    // ==================================================

    static async update(
        id: number,
        venda: Partial<
            Omit<
                Venda,
                "id" | "dataVenda"
            >
        >
    ): Promise<boolean> {

        const campos: string[] = [];

        /*
         * Os valores utilizados neste UPDATE
         * são números ou strings.
         *
         * Não usamos unknown[] porque o mysql2
         * precisa reconhecer os tipos enviados
         * ao método execute().
         */
        const valores:
            Array<string | number> = [];

        if (
            venda.clienteId !== undefined
        ) {
            campos.push(
                "cliente_id = ?"
            );

            valores.push(
                venda.clienteId
            );
        }

        if (
            venda.usuarioId !== undefined
        ) {
            campos.push(
                "usuario_id = ?"
            );

            valores.push(
                venda.usuarioId
            );
        }

        if (
            venda.subtotal !== undefined
        ) {
            campos.push(
                "subtotal = ?"
            );

            valores.push(
                venda.subtotal
            );
        }

        if (
            venda.desconto !== undefined
        ) {
            campos.push(
                "desconto = ?"
            );

            valores.push(
                venda.desconto
            );
        }

        if (
            venda.total !== undefined
        ) {
            campos.push(
                "total = ?"
            );

            valores.push(
                venda.total
            );
        }

        if (
            venda.status !== undefined
        ) {
            campos.push(
                "status = ?"
            );

            valores.push(
                venda.status
            );
        }

        // Nenhum campo foi informado.
        if (campos.length === 0) {
            return false;
        }

        valores.push(id);

        const [resultado] =
            await pool.execute<ResultSetHeader>(
                `
                UPDATE vendas
                SET ${campos.join(", ")}
                WHERE id = ?
                `,
                valores
            );

        return (
            resultado.affectedRows > 0
        );
    }

    // ==================================================
    // CREATE COMPLETE
    // Registrar venda, itens e baixa de estoque
    // ==================================================

    static async createComplete(
        venda: NovaVendaCompleta
    ): Promise<number> {

        /*
         * A finalização de uma venda envolve
         * várias alterações relacionadas:
         *
         * 1. Criar a venda.
         * 2. Baixar o estoque.
         * 3. Registrar os itens vendidos.
         *
         * Tudo é executado dentro da mesma
         * transação.
         *
         * Se qualquer etapa falhar, todas as
         * alterações são desfeitas.
         */

        const connection =
            await pool.getConnection();

        try {

            // ==========================================
            // Início da transação
            // ==========================================

            await connection.beginTransaction();

            // ==========================================
            // 1. Registrar a venda
            // ==========================================

            const [resultadoVenda] =
                await connection.execute<ResultSetHeader>(
                    `
                    INSERT INTO vendas (
                        cliente_id,
                        usuario_id,
                        subtotal,
                        desconto,
                        total
                    )
                    VALUES (?, ?, ?, ?, ?)
                    `,
                    [
                        venda.clienteId,
                        venda.usuarioId,
                        venda.subtotal,
                        venda.desconto,
                        venda.total
                    ]
                );

            const vendaId =
                resultadoVenda.insertId;

            // ==========================================
            // 2. Processar os itens
            // ==========================================

            for (
                const item of venda.itens
            ) {

                // ======================================
                // 2.1 Baixar estoque
                // ======================================

                /*
                 * A própria instrução UPDATE verifica
                 * novamente se existe estoque.
                 *
                 * Isso é importante porque o estoque
                 * pode ter sido alterado entre a
                 * validação do Controller e este ponto.
                 */

                const [resultadoEstoque] =
                    await connection.execute<ResultSetHeader>(
                        `
                        UPDATE produtos
                        SET estoque = estoque - ?
                        WHERE id = ?
                        AND estoque >= ?
                        AND ativo = TRUE
                        `,
                        [
                            item.quantidade,
                            item.produtoId,
                            item.quantidade
                        ]
                    );

                /*
                 * Se nenhuma linha foi atualizada,
                 * significa que o produto:
                 *
                 * - não existe;
                 * - está inativo;
                 * - ou não possui estoque suficiente.
                 *
                 * A venda inteira deve ser desfeita.
                 */

                if (
                    resultadoEstoque
                        .affectedRows === 0
                ) {
                    throw new Error(
                        `Não foi possível atualizar o estoque do produto ${item.produtoId}.`
                    );
                }

                // ======================================
                // 2.2 Registrar item da venda
                // ======================================

                await connection.execute<ResultSetHeader>(
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
                        vendaId,
                        item.produtoId,
                        item.quantidade,
                        item.precoUnitario
                    ]
                );
            }

            // ==========================================
            // 3. Confirmar transação
            // ==========================================

            await connection.commit();

            return vendaId;

        } catch (error) {

            // ==========================================
            // Falha - desfazer todas as alterações
            // ==========================================

            await connection.rollback();

            throw error;

        } finally {

            // ==========================================
            // Liberar conexão
            // ==========================================

            connection.release();
        }
    }

    // ==================================================
    // CANCEL
    // Cancelar venda e devolver estoque
    // ==================================================

    static async cancel(
        id: number
    ): Promise<boolean> {

        /*
         * O cancelamento também precisa acontecer
         * dentro de uma transação.
         *
         * Etapas:
         *
         * 1. Bloquear a venda.
         * 2. Confirmar que está finalizada.
         * 3. Buscar os itens vendidos.
         * 4. Devolver os itens ao estoque.
         * 5. Alterar o status para cancelada.
         */

        const connection =
            await pool.getConnection();

        try {

            // ==========================================
            // Início da transação
            // ==========================================

            await connection.beginTransaction();

            // ==========================================
            // 1. Buscar e bloquear a venda
            // ==========================================

            /*
             * FOR UPDATE bloqueia a linha durante
             * esta transação.
             *
             * Isso evita dois cancelamentos da
             * mesma venda ao mesmo tempo.
             */

            const [vendas] =
                await connection.execute<
                    VendaStatusRow[]
                >(
                    `
                    SELECT
                        id,
                        status
                    FROM vendas
                    WHERE id = ?
                    FOR UPDATE
                    `,
                    [id]
                );

            if (
                vendas.length === 0
            ) {
                await connection.rollback();

                return false;
            }

            const venda =
                vendas[0];

            // ==========================================
            // 2. Verificar status
            // ==========================================

            /*
             * Somente uma venda finalizada pode
             * devolver estoque.
             *
             * Assim uma venda já cancelada não
             * devolve os produtos duas vezes.
             */

            if (
                venda.status !==
                "finalizada"
            ) {
                await connection.rollback();

                return false;
            }

            // ==========================================
            // 3. Buscar itens vendidos
            // ==========================================

            const [itens] =
                await connection.execute<
                    ItemVendaCancelamentoRow[]
                >(
                    `
                    SELECT
                        produto_id,
                        quantidade
                    FROM itens_venda
                    WHERE venda_id = ?
                    `,
                    [id]
                );

            // ==========================================
            // 4. Devolver estoque
            // ==========================================

            for (
                const item of itens
            ) {
                await connection.execute<
                    ResultSetHeader
                >(
                    `
                    UPDATE produtos
                    SET estoque =
                        estoque + ?
                    WHERE id = ?
                    `,
                    [
                        item.quantidade,
                        item.produto_id
                    ]
                );
            }

            // ==========================================
            // 5. Alterar status da venda
            // ==========================================

            const [resultado] =
                await connection.execute<
                    ResultSetHeader
                >(
                    `
                    UPDATE vendas
                    SET status = 'cancelada'
                    WHERE id = ?
                    AND status = 'finalizada'
                    `,
                    [id]
                );

            if (
                resultado.affectedRows === 0
            ) {
                throw new Error(
                    "Não foi possível cancelar a venda."
                );
            }

            // ==========================================
            // 6. Confirmar transação
            // ==========================================

            await connection.commit();

            return true;

        } catch (error) {

            // ==========================================
            // Falha - desfazer alterações
            // ==========================================

            await connection.rollback();

            throw error;

        } finally {

            // ==========================================
            // Liberar conexão
            // ==========================================

            connection.release();
        }
    }
}