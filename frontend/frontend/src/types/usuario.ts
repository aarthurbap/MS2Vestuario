// ======================================================
// USUÁRIO - Dados do usuário autenticado
// ======================================================

export interface UsuarioLogado {
    id: number;
    nome: string;
    login: string;
    perfil: "caixa" | "gerente";
}

// ======================================================
// LOGIN - Resposta retornada pela API
// ======================================================

export interface LoginResponse {
    mensagem: string;

    token: string;

    usuario: UsuarioLogado;
}