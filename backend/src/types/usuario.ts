// Dados persistidos de um usuário do sistema, incluindo o hash da senha.
export interface Usuario {
    // Identificador gerado pelo banco.
    id: number;
    // Nome exibido para o usuario.
    nome: string;
    // Login usado para autenticar o acesso.
    login: string;
    // Hash criptografado da senha; não deve ser enviado ao frontend.
    senha: string;
    // Perfil que determina as permissões do usuário.
    perfil: "caixa" | "gerente";
}