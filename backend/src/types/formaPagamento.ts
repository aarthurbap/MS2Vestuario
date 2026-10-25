// Dados de uma forma de pagamento disponível para registrar vendas.
export interface FormaPagamento {
    // Identificador gerado pelo banco.
    id: number;
    // Nome exibido para a forma de pagamento.
    nome: string;
    // Indica se a forma pode ser usada em novas vendas.
    ativo: boolean;
}