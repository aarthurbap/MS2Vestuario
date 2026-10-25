// Dados seguros do usuário autenticado, mantidos durante o processamento da requisição.
export interface UsuarioAutenticado {
    // Identificador numérico do usuário no banco.
    id: number;
    // Nome exibido para identificar o usuário.
    nome: string;
    // Perfil usado para controlar o nivel de acesso.
    perfil: "caixa" | "gerente";
}