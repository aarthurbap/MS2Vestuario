// ======================================================
// CARRINHO - Estrutura utilizada somente no frontend
// ======================================================

export interface ItemCarrinho {
    produtoId: number;
    nome: string;
    quantidade: number;
    precoUnitario: number;
    estoqueDisponivel: number;
}

// ======================================================
// VENDA - Item enviado ao backend
// ======================================================

export interface ItemVendaRequest {
    produtoId: number;
    quantidade: number;
}

// ======================================================
// VENDA - Corpo do POST /vendas
// ======================================================

export interface NovaVendaRequest {
    clienteId: number;
    usuarioId: number;
    desconto: number;
    itens: ItemVendaRequest[];
}

// ======================================================
// VENDA - Resposta do backend após o cadastro
// ======================================================

export interface CriarVendaResponse {
    mensagem: string;
    id: number;
}