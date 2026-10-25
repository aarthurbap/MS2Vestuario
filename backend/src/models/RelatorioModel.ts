import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { database } from '../config/database';
import type {
  FiltrosPeriodo,
  LinhaRelatorio,
  RelatorioInput,
  RelatorioSalvo,
  TipoRelatorio
} from '../types/relatorio';

// Formato das colunas e aliases retornados pelas consultas de configuração salva.
interface RelatorioRow extends RowDataPacket {
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

// Formatos dos resultados agregados usados para tipar consultas MySQL.
interface ContagemRow extends RowDataPacket { total: number; }
interface ResumoVendasRow extends RowDataPacket {
  vendasRealizadas: number;
  faturamentoTotal: string;
  descontosConcedidos: string;
}
interface ResumoProdutosRow extends RowDataPacket { produtosVendidos: string; }
interface EstoqueBaixoRow extends RowDataPacket { produtosEstoqueBaixo: number; }

const CAMPOS_RELATORIO = `
  id, titulo, descricao, tipo,
  DATE_FORMAT(data_inicio, '%Y-%m-%d') AS dataInicio,
  DATE_FORMAT(data_fim, '%Y-%m-%d') AS dataFim,
  estoque_minimo AS estoqueMinimo,
  DATE_FORMAT(criado_em, '%Y-%m-%d %H:%i:%s') AS criadoEm,
  DATE_FORMAT(atualizado_em, '%Y-%m-%d %H:%i:%s') AS atualizadoEm
`;

// Seleciona somente vendas finalizadas e aplica limites de data com placeholders SQL.
// O alias é interno e fixo nas chamadas; os valores de data nunca são concatenados na consulta.
function condicaoVendas(filtro: FiltrosPeriodo, alias = 'v'): { sql: string; params: string[] } {
  const clausulas = [`${alias}.status = 'finalizada'`];
  const params: string[] = [];
  if (filtro.dataInicio) {
    clausulas.push(`${alias}.data_venda >= ?`);
    params.push(filtro.dataInicio);
  }
  if (filtro.dataFim) {
    clausulas.push(`${alias}.data_venda < DATE_ADD(?, INTERVAL 1 DAY)`);
    params.push(filtro.dataFim);
  }
  return { sql: clausulas.join(' AND '), params };
}

// Normaliza números e mantém o formato público camelCase da configuração.
function mapear(row: RelatorioRow): RelatorioSalvo {
  return {
    id: Number(row.id),
    titulo: row.titulo,
    descricao: row.descricao,
    tipo: row.tipo,
    dataInicio: row.dataInicio,
    dataFim: row.dataFim,
    estoqueMinimo: Number(row.estoqueMinimo),
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm
  };
}

export class RelatorioModel {
  // Persiste uma nova configuração, então consulta o registro para devolver os campos formatados.
  static async criar(data: RelatorioInput): Promise<RelatorioSalvo> {
    const [result] = await database.execute<ResultSetHeader>(`
      INSERT INTO relatorios
      (titulo, descricao, tipo, data_inicio, data_fim, estoque_minimo)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [data.titulo, data.descricao, data.tipo, data.dataInicio, data.dataFim, data.estoqueMinimo]);
    const salvo = await this.buscar(result.insertId);
    if (!salvo) throw new Error('Não foi possível consultar o relatório criado.');
    return salvo;
  }

  // Busca títulos por texto e pagina os resultados mais recentes primeiro.
  static async listar(pagina: number, limite: number, busca: string): Promise<{
    dados: RelatorioSalvo[]; pagina: number; limite: number; total: number; totalPaginas: number;
  }> {
    const where = busca ? 'WHERE LOCATE(?, titulo) > 0' : '';
    const params: string[] = busca ? [busca] : [];
    const [contagem] = await database.execute<ContagemRow[]>(
      `SELECT COUNT(*) AS total FROM relatorios ${where}`, params
    );
    const offset = (pagina - 1) * limite;
    const [rows] = await database.execute<RelatorioRow[]>(
      `SELECT ${CAMPOS_RELATORIO} FROM relatorios ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limite, offset]
    );
    const total = Number(contagem[0]?.total ?? 0);
    return { dados: rows.map(mapear), pagina, limite, total, totalPaginas: Math.ceil(total / limite) };
  }

  // Retorna uma configuração pelo ID; null indica que não existe.
  static async buscar(id: number): Promise<RelatorioSalvo | null> {
    const [rows] = await database.execute<RelatorioRow[]>(
      `SELECT ${CAMPOS_RELATORIO} FROM relatorios WHERE id = ? LIMIT 1`, [id]
    );
    return rows[0] ? mapear(rows[0]) : null;
  }

  // Atualiza os filtros e metadados, sem tocar nos dados de vendas.
  static async atualizar(id: number, data: RelatorioInput): Promise<boolean> {
    const [result] = await database.execute<ResultSetHeader>(`
      UPDATE relatorios SET titulo = ?, descricao = ?, tipo = ?,
      data_inicio = ?, data_fim = ?, estoque_minimo = ?
      WHERE id = ?
    `, [data.titulo, data.descricao, data.tipo, data.dataInicio, data.dataFim, data.estoqueMinimo, id]);
    return result.affectedRows > 0;
  }

  // Exclui somente a configuração salva e informa se algum registro foi removido.
  static async excluir(id: number): Promise<boolean> {
    const [result] = await database.execute<ResultSetHeader>('DELETE FROM relatorios WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Calcula métricas operacionais; consultas separadas evitam duplicar totais ao cruzar vários itens e pagamentos.
  static async resumo(filtro: FiltrosPeriodo, estoqueMinimo = 5) {
    const c = condicaoVendas(filtro);
    const [vendasResult, itensResult, estoqueResult] = await Promise.all([
      database.execute<ResumoVendasRow[]>(`
        SELECT COUNT(*) AS vendasRealizadas,
          COALESCE(SUM(v.total), 0) AS faturamentoTotal,
          COALESCE(SUM(v.desconto), 0) AS descontosConcedidos
        FROM vendas v WHERE ${c.sql}
      `, c.params),
      database.execute<ResumoProdutosRow[]>(`
        SELECT COALESCE(SUM(iv.quantidade), 0) AS produtosVendidos
        FROM itens_venda iv INNER JOIN vendas v ON v.id = iv.venda_id
        WHERE ${c.sql}
      `, c.params),
      database.execute<EstoqueBaixoRow[]>(`
        SELECT COUNT(*) AS produtosEstoqueBaixo FROM produtos
        WHERE ativo = TRUE AND estoque <= ?
      `, [estoqueMinimo])
    ]);
    const v = vendasResult[0][0];
    const vendasRealizadas = Number(v?.vendasRealizadas ?? 0);
    const faturamentoTotal = Number(v?.faturamentoTotal ?? 0);
    return {
      vendasRealizadas,
      faturamentoTotal,
      ticketMedio: vendasRealizadas ? Math.round((faturamentoTotal / vendasRealizadas) * 100) / 100 : 0,
      descontosConcedidos: Number(v?.descontosConcedidos ?? 0),
      produtosVendidos: Number(itensResult[0][0]?.produtosVendidos ?? 0),
      produtosEstoqueBaixo: Number(estoqueResult[0][0]?.produtosEstoqueBaixo ?? 0)
    };
  }

  // Agrupa faturamento, quantidade de vendas e descontos pela data escolhida.
  static async faturamento(filtro: FiltrosPeriodo, agrupar: 'dia' | 'mes'): Promise<LinhaRelatorio[]> {
    const c = condicaoVendas(filtro);
    const expressao = agrupar === 'mes' ? "DATE_FORMAT(v.data_venda, '%Y-%m')" : "DATE_FORMAT(v.data_venda, '%Y-%m-%d')";
    const [rows] = await database.execute<RowDataPacket[]>(`
      SELECT ${expressao} AS periodo, COUNT(*) AS quantidadeVendas,
      COALESCE(SUM(v.total), 0) AS faturamento,
      COALESCE(SUM(v.desconto), 0) AS descontos
      FROM vendas v WHERE ${c.sql}
      GROUP BY ${expressao} ORDER BY periodo ASC
    `, c.params);
    return rows.map(row => ({
      periodo: String(row.periodo), quantidadeVendas: Number(row.quantidadeVendas),
      faturamento: Number(row.faturamento), descontos: Number(row.descontos)
    }));
  }

  // Lista as vendas finalizadas mais recentes, incluindo cliente e operador se ainda existirem.
  static async vendas(filtro: FiltrosPeriodo, limite: number): Promise<LinhaRelatorio[]> {
    const c = condicaoVendas(filtro);
    const [rows] = await database.execute<RowDataPacket[]>(`
      SELECT v.id, DATE_FORMAT(v.data_venda, '%Y-%m-%d %H:%i:%s') AS dataVenda,
        COALESCE(c.nome, 'Consumidor não identificado') AS cliente,
        COALESCE(u.nome, 'Operador não localizado') AS operador,
        v.subtotal, v.desconto, v.total
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      WHERE ${c.sql} ORDER BY v.data_venda DESC, v.id DESC LIMIT ?
    `, [...c.params, limite]);
    return rows.map(row => ({
      id: Number(row.id), dataVenda: String(row.dataVenda),
      cliente: String(row.cliente), operador: String(row.operador),
      subtotal: Number(row.subtotal), desconto: Number(row.desconto), total: Number(row.total)
    }));
  }

  // Resume unidades e receita por produto; a ordenação seleciona os mais ou menos vendidos.
  static async produtos(filtro: FiltrosPeriodo, ordem: 'mais' | 'menos', limite: number): Promise<LinhaRelatorio[]> {
    const c = condicaoVendas(filtro);
    // Preserva produtos sem vendas (quantidade 0), úteis no ranking "menos vendidos".
    const direcao = ordem === 'mais' ? 'DESC' : 'ASC';
    const having = ordem === 'mais' ? 'HAVING unidadesVendidas > 0' : '';
    const [rows] = await database.execute<RowDataPacket[]>(`
      SELECT p.id, p.codigo, p.nome,
        COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN iv.quantidade ELSE 0 END), 0) AS unidadesVendidas,
        COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN iv.quantidade * iv.preco_unitario ELSE 0 END), 0) AS receitaBruta
      FROM produtos p
      LEFT JOIN itens_venda iv ON iv.produto_id = p.id
      LEFT JOIN vendas v ON v.id = iv.venda_id AND ${c.sql}
      GROUP BY p.id, p.codigo, p.nome
      ${having}
      ORDER BY unidadesVendidas ${direcao}, p.nome ASC LIMIT ?
    `, [...c.params, limite]);
    return rows.map(row => ({
      id: Number(row.id), codigo: String(row.codigo), nome: String(row.nome),
      unidadesVendidas: Number(row.unidadesVendidas), receitaBruta: Number(row.receitaBruta)
    }));
  }

  // Soma pagamentos por forma e conta vendas distintas para não contar uma venda parcelada duas vezes.
  static async formasPagamento(filtro: FiltrosPeriodo, limite: number): Promise<LinhaRelatorio[]> {
    const c = condicaoVendas(filtro);
    const [rows] = await database.execute<RowDataPacket[]>(`
      SELECT fp.id, fp.nome AS formaPagamento,
        COUNT(DISTINCT pg.venda_id) AS vendas,
        COALESCE(SUM(pg.valor), 0) AS valorRecebido
      FROM pagamentos pg
      INNER JOIN vendas v ON v.id = pg.venda_id
      INNER JOIN formas_pagamento fp ON fp.id = pg.forma_pagamento_id
      WHERE ${c.sql}
      GROUP BY fp.id, fp.nome ORDER BY valorRecebido DESC LIMIT ?
    `, [...c.params, limite]);
    return rows.map(row => ({
      id: Number(row.id), formaPagamento: String(row.formaPagamento),
      vendas: Number(row.vendas), valorRecebido: Number(row.valorRecebido)
    }));
  }

  // Compara o desempenho dos operadores usando vendas finalizadas no período.
  static async operadores(filtro: FiltrosPeriodo, limite: number): Promise<LinhaRelatorio[]> {
    const c = condicaoVendas(filtro);
    const [rows] = await database.execute<RowDataPacket[]>(`
      SELECT u.id, u.nome AS operador, COUNT(v.id) AS vendasRealizadas,
        COALESCE(SUM(v.total), 0) AS faturamento
      FROM usuarios u
      INNER JOIN vendas v ON v.usuario_id = u.id
      WHERE ${c.sql}
      GROUP BY u.id, u.nome ORDER BY faturamento DESC LIMIT ?
    `, [...c.params, limite]);
    return rows.map(row => ({
      id: Number(row.id), operador: String(row.operador),
      vendasRealizadas: Number(row.vendasRealizadas), faturamento: Number(row.faturamento)
    }));
  }

  // Lista produtos ativos abaixo do estoque mínimo, ordenados pelos níveis mais baixos.
  static async estoqueBaixo(estoqueMinimo: number, limite: number): Promise<LinhaRelatorio[]> {
    const [rows] = await database.execute<RowDataPacket[]>(`
      SELECT id, codigo, nome, estoque, preco
      FROM produtos WHERE ativo = TRUE AND estoque <= ?
      ORDER BY estoque ASC, nome ASC LIMIT ?
    `, [estoqueMinimo, limite]);
    return rows.map(row => ({
      id: Number(row.id), codigo: String(row.codigo), nome: String(row.nome),
      estoque: Number(row.estoque), preco: Number(row.preco)
    }));
  }

  // Direciona cada tipo salvo para a consulta correspondente.
  static async gerar(tipo: TipoRelatorio, filtro: FiltrosPeriodo, estoqueMinimo: number, limite = 100): Promise<LinhaRelatorio[]> {
    switch (tipo) {
      case 'vendas': return this.vendas(filtro, limite);
      case 'produtos': return this.produtos(filtro, 'mais', limite);
      case 'pagamentos': return this.formasPagamento(filtro, limite);
      case 'operadores': return this.operadores(filtro, limite);
      case 'estoque': return this.estoqueBaixo(estoqueMinimo, limite);
    }
  }
}
