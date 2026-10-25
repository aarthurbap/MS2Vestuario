// Categorias de relatório aceitas pelo backend e pela interface.
export const TIPOS_RELATORIO = ['vendas', 'produtos', 'pagamentos', 'operadores', 'estoque'] as const;
export type TipoRelatorio = (typeof TIPOS_RELATORIO)[number];

// Datas opcionais que delimitam o período analisado.
export interface FiltrosPeriodo {
  dataInicio: string | null;
  dataFim: string | null;
}

// Campos enviados para criar ou atualizar uma configuração salva.
export interface RelatorioInput extends FiltrosPeriodo {
  titulo: string;
  descricao: string | null;
  tipo: TipoRelatorio;
  estoqueMinimo: number;
}

// Configuração persistida, incluindo seu identificador e datas de auditoria.
export interface RelatorioSalvo extends RelatorioInput {
  id: number;
  criadoEm: string;
  atualizadoEm: string;
}

// Uma linha genérica de resultado analítico, compartilhada por tabelas e exportações.
export type LinhaRelatorio = Record<string, string | number | null>;
