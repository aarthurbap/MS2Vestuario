import { RowDataPacket } from "mysql2";

export interface Venda {
    id: number;
    clienteId: number;
    usuarioId: number;
    dataVenda: Date;
    subtotal: number;
    desconto: number;
    total: number;
    status: "finalizada" | "cancelada";
}

export interface VendaRow extends RowDataPacket {
    id: number;
    cliente_id: number;
    usuario_id: number;
    data_venda: Date;
    subtotal: number;
    desconto: number;
    total: number;
    status: "finalizada" | "cancelada";
}

export interface ItemVendaCriacao {
    produtoId: number;
    quantidade: number;
    precoUnitario: number;
}

export type NovaVenda = Omit<
    Venda,
    "id" | "dataVenda" | "status"
>;

export interface NovaVendaCompleta extends NovaVenda {
    itens: ItemVendaCriacao[];
}

 // ======================================================
 // RESPOSTA - Registro de venda
 // ======================================================

export interface CriarVendaResponse {
    mensagem: string;
    id: number;
    subtotal: number;
    desconto: number;
    total: number;
}
