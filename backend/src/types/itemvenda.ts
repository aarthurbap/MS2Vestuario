// Dados de um produto e sua quantidade dentro de uma venda registrada.
export interface ItemVenda {
    // Identificador do item de venda.
    id: number;
    // Venda a que este item pertence.
    vendaId: number;
    // Produto vendido.
    produtoId: number;
    // Quantidade vendida do produto.
    quantidade: number;
    // Preco unitario registrado no momento da venda.
    precoUnitario: number;
}