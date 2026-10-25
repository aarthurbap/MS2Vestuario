import { RowDataPacket } from "mysql2";

// Resumo de uma venda usado nas respostas de listagem da API.
export interface Venda {
    // Identificador gerado para a venda.
    id: number;
    // Cliente associado, ou null para consumidor não identificado.
    clienteId: number | null;
    // Nome do cliente quando retornado por uma consulta com relacionamento.
    clienteNome?: string | null;
    // CPF do cliente quando retornado por uma consulta com relacionamento.
    clienteCpf?: string | null;
    // Usuário responsável pelo registro da venda.
    usuarioId: number;
    // Nome do usuário responsável, quando disponível.
    usuarioNome?: string;
    // Data e hora em que a venda foi registrada.
    dataVenda: Date;
    // Soma dos valores dos itens antes de desconto.
    subtotal: number;
    // Desconto aplicado a venda.
    desconto: number;
    // Valor final cobrado do cliente.
    total: number;
    // Estado atual da venda.
    status: "finalizada" | "cancelada";
    // Quantidade de produtos distintos, quando calculada pela consulta.
    totalItens?: number;
    // Soma das unidades vendidas, quando calculada pela consulta.
    totalUnidades?: number;
    // Nomes das formas de pagamento usadas, quando disponiveis.
    formasPagamento?: string;
}

// Formato das colunas retornadas pelo MySQL antes da conversao para Venda.
export interface VendaRow extends RowDataPacket {
    id: number;
    cliente_id: number | null;
    cliente_nome?: string | null;
    cliente_cpf?: string | null;
    usuario_id: number;
    usuario_nome?: string;
    data_venda: Date;
    subtotal: number | string;
    desconto: number | string;
    total: number | string;
    status: "finalizada" | "cancelada";
    total_itens?: number | string;
    total_unidades?: number | string;
    formas_pagamento?: string | null;
}

// Dados de cada produto recebidos ao criar uma venda.
export interface ItemVendaCriacao {
    // Identificador do produto vendido.
    produtoId: number;
    // Quantidade solicitada.
    quantidade: number;
    // Preco unitario registrado para a venda.
    precoUnitario: number;
}

// Dados de cada forma e valor de pagamento recebidos ao criar uma venda.
export interface PagamentoCriacao {
    // Identificador da forma de pagamento escolhida.
    formaPagamentoId: number;
    // Valor destinado a esta forma de pagamento.
    valor: number;
}

// Conjunto completo de dados necessário para gravar uma venda atômica.
export interface NovaVendaCompleta {
    // Cliente relacionado ou null para consumidor não identificado.
    clienteId: number | null;
    // Usuario autenticado que realizou a venda.
    usuarioId: number;
    // Soma dos itens antes do desconto.
    subtotal: number;
    // Desconto aplicado ao subtotal.
    desconto: number;
    // Total final a ser pago.
    total: number;
    // Produtos e quantidades que compõem a venda.
    itens: ItemVendaCriacao[];
    // Pagamentos que quitam o total da venda.
    pagamentos: PagamentoCriacao[];
}

// Informacoes detalhadas de um produto que compoe uma venda.
export interface ItemVendaDetalhado {
    // Identificador do item registrado.
    id: number;
    // Identificador da venda relacionada.
    vendaId: number;
    // Identificador do produto vendido.
    produtoId: number;
    // Codigo do produto para exibicao.
    produtoCodigo: string;
    // Nome do produto para exibicao.
    produtoNome: string;
    // Unidades vendidas.
    quantidade: number;
    // Preco de uma unidade no momento da venda.
    precoUnitario: number;
    // Resultado da multiplicação entre quantidade e preço unitário.
    subtotalItem: number;
}

// Informacoes detalhadas de um pagamento de venda.
export interface PagamentoDetalhado {
    // Identificador do pagamento registrado.
    id: number;
    // Identificador da venda relacionada.
    vendaId: number;
    // Identificador da forma de pagamento.
    formaPagamentoId: number;
    // Nome da forma de pagamento para exibicao.
    formaPagamentoNome: string;
    // Valor pago por esta forma.
    valor: number;
}

// Venda acompanhada de seus itens, pagamentos e dados relacionados.
export interface VendaDetalhada extends Venda {
    // Produtos que foram incluidos na venda.
    itens: ItemVendaDetalhado[];
    // Pagamentos registrados para quitar a venda.
    pagamentos: PagamentoDetalhado[];
    // Dados do cliente, quando a venda possui um cliente associado.
    cliente?: {
        id: number;
        nome: string;
        cpf?: string;
        telefone?: string;
        email?: string;
    } | null;
    // Dados do usuário responsável pelo registro.
    usuario?: {
        id: number;
        nome: string;
        login: string;
    } | null;
}

// ======================================================
// RESPOSTA - Registro de venda
// ======================================================

// Formato devolvido pela API depois que uma venda e registrada com sucesso.
export interface CriarVendaResponse {
    // Mensagem informando o resultado da operação.
    mensagem: string;
    // Identificador da venda criada.
    id: number;
    // Soma dos itens antes do desconto.
    subtotal: number;
    // Desconto aplicado.
    desconto: number;
    // Total final cobrado.
    total: number;
}
