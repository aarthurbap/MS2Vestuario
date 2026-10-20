
export interface Cliente {
    id: number;
    nome: string;
    cpf: string;
    telefone: string | null;
    email: string | null;
}

export interface ClientesResponse {
    dados: Cliente[];
}

export interface NovoCliente {
    nome: string;
    cpf: string;
    telefone: string | null;
    email: string | null;
}

export interface CriarClienteResponse {
    mensagem: string;
    id: number;
}
