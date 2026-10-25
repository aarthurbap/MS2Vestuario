// Formato completo de um produto cadastrado no catalogo.
export interface Produto {
    // Identificador gerado pelo banco.
    id: number;
    // Codigo unico usado para localizar o produto.
    codigo: string;
    // Nome exibido no catalogo e nas vendas.
    nome: string;
    // Informacoes adicionais, quando cadastradas.
    descricao: string | null;
    // Quantidade disponivel para venda.
    estoque: number;
    // Preco unitario atual do produto.
    preco: number;
    // Indica se o produto pode ser vendido.
    ativo: boolean;
    // Categoria associada, ou null quando nao houver categoria.
    categoriaId: number | null;
}