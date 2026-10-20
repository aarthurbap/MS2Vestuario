export interface Produto {
    id: number;
    codigo: string;
    nome: string;
    descricao: string | null;
    estoque: number;
    preco: number;
    ativo: boolean;
    categoriaId: number | null;
}

export interface ProdutosResponse {
    dados: Produto[];
}