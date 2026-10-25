// Formato dos dados de um cliente armazenado no sistema.
export interface Cliente {
    // Identificador gerado pelo banco.
    id: number;
    // Nome completo do cliente.
    nome: string;
    // CPF usado para identificar o cliente.
    cpf: string;
    // Telefone de contato, quando informado.
    telefone: string | null;
    // Endereço de e-mail, quando informado.
    email: string | null;
}