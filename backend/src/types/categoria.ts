// Formato de categoria utilizado entre a API e a camada de dados.
export interface Categoria {
    // Identificador gerado pelo banco.
    id: number;
    // Nome que identifica a categoria.
    nome: string;
    // Descrição opcional da categoria.
    descricao: string | null;
}