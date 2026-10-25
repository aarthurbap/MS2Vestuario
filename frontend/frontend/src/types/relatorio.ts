// Tipos aceitos na criação de uma configuração de relatório.
export type TipoRelatorio = "vendas" | "produtos" | "pagamentos" | "operadores" | "estoque";

// Formato de cada linha retornada pelos relatórios analíticos.
export type LinhaRelatorio = Record<string, string | number | null>;

// Configuração salva devolvida pela API, incluindo datas e filtros.
export interface RelatorioSalvo {
    id: number;
    titulo: string;
    descricao: string | null;
    tipo: TipoRelatorio;
    dataInicio: string | null;
    dataFim: string | null;
    estoqueMinimo: number;
    criadoEm: string;
    atualizadoEm: string;
}
