// Dados de um pagamento associado a uma venda.
export interface Pagamento {
    // Identificador do pagamento.
    id: number;
    // Venda quitada por este pagamento.
    vendaId: number;
    // Forma de pagamento utilizada.
    formaPagamentoId: number;
    // Valor pago por esta forma.
    valor: number;
}