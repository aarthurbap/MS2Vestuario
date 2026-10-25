import { FiltrosPeriodo, RelatorioInput, TIPOS_RELATORIO, TipoRelatorio } from '../types/relatorio';

export class ErroHttp extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ErroHttp';
  }
}

// Confirma que o valor recebido é um objeto JSON simples antes de ler seus campos.
function objeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

// Verifica tanto o formato YYYY-MM-DD quanto a existência real da data no calendário.
function dataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const d = new Date(`${data}T00:00:00.000Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === data;
}

// Converte campo de data opcional para string ou null; rejeita tipos e datas inválidos.
function lerData(valor: unknown, campo: string): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string' || !dataValida(valor)) {
    throw new ErroHttp(400, `${campo} deve estar no formato YYYY-MM-DD.`);
  }
  return valor;
}

// Garante que um período informado não esteja invertido.
function validarIntervalo(filtro: FiltrosPeriodo): void {
  if (filtro.dataInicio && filtro.dataFim && filtro.dataInicio > filtro.dataFim) {
    throw new ErroHttp(400, 'dataInicio não pode ser posterior a dataFim.');
  }
}

// Lê as datas enviadas na query string e devolve o período normalizado.
export function filtrosPeriodo(query: unknown): FiltrosPeriodo {
  if (!objeto(query)) throw new ErroHttp(400, 'Filtros inválidos.');
  const filtro = {
    dataInicio: lerData(query.dataInicio, 'dataInicio'),
    dataFim: lerData(query.dataFim, 'dataFim')
  };
  validarIntervalo(filtro);
  return filtro;
}

// Converte um parâmetro inteiro, aplicando valor padrão e limites para impedir valores fora da faixa.
export function inteiro(valor: unknown, nome: string, padrao: number, min: number, max: number): number {
  if (valor === undefined) return padrao;
  if (typeof valor !== 'string' && typeof valor !== 'number') {
    throw new ErroHttp(400, `${nome} deve ser um número inteiro entre ${min} e ${max}.`);
  }
  if (String(valor).trim() === '') throw new ErroHttp(400, `${nome} não pode ser vazio.`);
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero < min || numero > max) {
    throw new ErroHttp(400, `${nome} deve ser um número inteiro entre ${min} e ${max}.`);
  }
  return numero;
}

// Reaproveita a validação de inteiros para IDs positivos compatíveis com a coluna INT do banco.
export function idPositivo(valor: unknown): number {
  return inteiro(valor, 'id', -1, 1, 2147483647);
}

// Valida e normaliza o corpo usado para criar ou substituir uma configuração de relatório.
export function entradaRelatorio(body: unknown): RelatorioInput {
  if (!objeto(body)) throw new ErroHttp(400, 'Envie um JSON válido.');

  const { titulo, descricao, tipo } = body;
  if (typeof titulo !== 'string' || titulo.trim().length < 3 || titulo.trim().length > 120) {
    throw new ErroHttp(400, 'titulo deve ter entre 3 e 120 caracteres.');
  }
  if (descricao !== undefined && descricao !== null &&
    (typeof descricao !== 'string' || descricao.length > 500)) {
    throw new ErroHttp(400, 'descricao deve ser texto com até 500 caracteres ou null.');
  }
  if (typeof tipo !== 'string' || !TIPOS_RELATORIO.includes(tipo as TipoRelatorio)) {
    throw new ErroHttp(400, `tipo inválido. Use: ${TIPOS_RELATORIO.join(', ')}.`);
  }

  const filtro = {
    dataInicio: lerData(body.dataInicio, 'dataInicio'),
    dataFim: lerData(body.dataFim, 'dataFim')
  };
  validarIntervalo(filtro);
  return {
    titulo: titulo.trim(),
    descricao: typeof descricao === 'string' ? descricao.trim() || null : null,
    tipo: tipo as TipoRelatorio,
    ...filtro,
    estoqueMinimo: inteiro(body.estoqueMinimo, 'estoqueMinimo', 5, 0, 1000000)
  };
}
