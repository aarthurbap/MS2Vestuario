// ======================================================
// CARRINHO - Estrutura utilizada no PDV
// ======================================================

export interface ItemCarrinho {
    produtoId: number;
    codigo?: string;
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
// PAGAMENTO - Enviado ao backend
// ======================================================

export interface PagamentoRequest {
    formaPagamentoId: number;
    valor: number;
}

// ======================================================
// VENDA - Corpo da requisição POST /vendas
// ======================================================

export interface NovaVendaRequest {
    clienteId?: number | null;
    desconto: number;
    itens: ItemVendaRequest[];
    formaPagamento?: string;
    formaPagamentoId?: number;
    valorRecebido?: number;
    pagamentos?: PagamentoRequest[];
}

// ======================================================
// VENDA - Resposta do backend após o cadastro
// ======================================================

export interface CriarVendaResponse {
    mensagem: string;
    id: number;
    subtotal: number;
    desconto: number;
    total: number;
}

// ======================================================
// CONSULTA - Entidade Venda listada na tabela do Dashboard
// ======================================================

export interface VendaRegistro {
    id: number;
    clienteId: number | null;
    clienteNome: string | null;
    clienteCpf: string | null;
    usuarioId: number;
    usuarioNome?: string;
    dataVenda: string;
    subtotal: number;
    desconto: number;
    total: number;
    status: "finalizada" | "cancelada";
    totalItens?: number;
    totalUnidades?: number;
    formasPagamento?: string;
}

export interface ItemVendaDetalhado {
    id: number;
    vendaId: number;
    produtoId: number;
    produtoCodigo: string;
    produtoNome: string;
    quantidade: number;
    precoUnitario: number;
    subtotalItem: number;
}

export interface PagamentoDetalhado {
    id: number;
    vendaId: number;
    formaPagamentoId: number;
    formaPagamentoNome: string;
    valor: number;
}

export interface VendaDetalhada extends VendaRegistro {
    itens: ItemVendaDetalhado[];
    pagamentos: PagamentoDetalhado[];
    cliente?: {
        id: number;
        nome: string;
        cpf?: string;
        telefone?: string;
        email?: string;
    } | null;
    usuario?: {
        id: number;
        nome: string;
        login: string;
    } | null;
}

export interface VendasListResponse {
    dados: VendaRegistro[];
}

export interface VendaDetalhadaResponse {
    dados: VendaDetalhada;
}

export interface FormaPagamentoItem {
    id: number;
    nome: string;
    ativo: boolean;
}

export interface FormasPagamentoResponse {
    dados: FormaPagamentoItem[];
}
