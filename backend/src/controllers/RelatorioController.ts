import type { Request, Response } from 'express';
import { RelatorioModel } from '../models/RelatorioModel';
import { ErroHttp, entradaRelatorio, filtrosPeriodo, idPositivo, inteiro } from '../utils/relatorioValidacao';
import { gerarCsv, gerarPdf } from '../utils/relatorioExportacao';
import type { RelatorioSalvo } from '../types/relatorio';

type Handler = (req: Request, res: Response) => Promise<void>;

// Converte erros esperados de validação em respostas HTTP e registra erros inesperados.
function tratarErro(error: unknown, res: Response): void {
  if (error instanceof ErroHttp) {
    res.status(error.status).json({ sucesso: false, mensagem: error.message });
    return;
  }
  console.error('[Relatorios] Erro:', error);
  res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao processar relatórios.' });
}

// Envolve cada ação para que erros assíncronos sejam tratados de forma uniforme.
function seguro(handler: Handler): Handler {
  return async (req, res) => {
    try { await handler(req, res); }
    catch (error) { tratarErro(error, res); }
  };
}

// Valida o ID da URL e busca a configuração salva usada para gerar/exportar relatórios.
async function carregarSalvo(req: Request): Promise<RelatorioSalvo> {
  const id = idPositivo(req.params.id);
  const salvo = await RelatorioModel.buscar(id);
  if (!salvo) throw new ErroHttp(404, 'Relatório não encontrado.');
  return salvo;
}

// Valida os filtros comuns das consultas analíticas antes de chamar o modelo.
function parametros(req: Request) {
  const periodo = filtrosPeriodo(req.query);
  const estoqueMinimo = inteiro(req.query.estoqueMinimo, 'estoqueMinimo', 5, 0, 1000000);
  const limite = inteiro(req.query.limite, 'limite', 10, 1, 100);
  return { periodo, estoqueMinimo, limite };
}

// Lê o tipo e os filtros da query string para exportações rápidas do período atual.
function entradaExportacaoAtual(req: Request): RelatorioSalvo {
  const input = entradaRelatorio({
    titulo: `Relatório ${String(req.query.tipo ?? '')}`,
    tipo: req.query.tipo,
    dataInicio: req.query.dataInicio,
    dataFim: req.query.dataFim,
    estoqueMinimo: req.query.estoqueMinimo
  });
  return {
    ...input,
    id: 0,
    criadoEm: '',
    atualizadoEm: ''
  };
}

export class RelatorioController {
  // Cria uma configuração de relatório e devolve o registro persistido.
  static criar = seguro(async (req, res) => {
    const input = entradaRelatorio(req.body);
    const salvo = await RelatorioModel.criar(input);
    res.status(201).json({ sucesso: true, mensagem: 'Relatório cadastrado.', dados: salvo });
  });

  // Lista relatórios salvos com paginação e busca opcional pelo título.
  static listar = seguro(async (req, res) => {
    const pagina = inteiro(req.query.pagina, 'pagina', 1, 1, 1000000);
    const limite = inteiro(req.query.limite, 'limite', 20, 1, 100);
    const busca = req.query.busca ?? '';
    if (typeof busca !== 'string' || busca.length > 120) {
      throw new ErroHttp(400, 'busca deve ser texto com até 120 caracteres.');
    }
    const resultado = await RelatorioModel.listar(pagina, limite, busca.trim());
    res.json({ sucesso: true, ...resultado });
  });

  // Busca um relatório salvo pelo ID ou responde com 404.
  static buscar = seguro(async (req, res) => {
    res.json({ sucesso: true, dados: await carregarSalvo(req) });
  });

  // Substitui todos os campos do relatório salvo; por isso o PUT exige o objeto completo.
  static atualizar = seguro(async (req, res) => {
    const atual = await carregarSalvo(req);
    const input = entradaRelatorio(req.body);
    await RelatorioModel.atualizar(atual.id, input);
    const salvo = await RelatorioModel.buscar(atual.id);
    if (!salvo) throw new ErroHttp(404, 'Relatório não encontrado.');
    res.json({ sucesso: true, mensagem: 'Relatório atualizado.', dados: salvo });
  });

  // Remove somente a configuração, sem modificar vendas nem registros financeiros.
  static excluir = seguro(async (req, res) => {
    const id = idPositivo(req.params.id);
    const removido = await RelatorioModel.excluir(id);
    if (!removido) throw new ErroHttp(404, 'Relatório não encontrado.');
    res.status(200).json({ sucesso: true, mensagem: 'Relatório excluído. As vendas foram preservadas.' });
  });

  // Retorna os indicadores resumidos do período e a contagem de produtos com estoque baixo.
  static dashboard = seguro(async (req, res) => {
    const { periodo, estoqueMinimo } = parametros(req);
    res.json({ sucesso: true, periodo, indicadores: await RelatorioModel.resumo(periodo, estoqueMinimo) });
  });

  // Agrupa o faturamento das vendas finalizadas por dia ou por mês.
  static faturamento = seguro(async (req, res) => {
    const { periodo } = parametros(req);
    const agrupar = req.query.agrupar === undefined ? 'dia' : req.query.agrupar;
    if (agrupar !== 'dia' && agrupar !== 'mes') {
      throw new ErroHttp(400, 'agrupar deve ser dia ou mes.');
    }
    res.json({ sucesso: true, periodo, agrupar, dados: await RelatorioModel.faturamento(periodo, agrupar) });
  });

  // Retorna os produtos com maior quantidade vendida no período informado.
  static produtosMaisVendidos = seguro(async (req, res) => {
    const { periodo, limite } = parametros(req);
    res.json({ sucesso: true, periodo, dados: await RelatorioModel.produtos(periodo, 'mais', limite) });
  });

  // Retorna os produtos com menor quantidade vendida, incluindo produtos sem vendas.
  static produtosMenosVendidos = seguro(async (req, res) => {
    const { periodo, limite } = parametros(req);
    res.json({ sucesso: true, periodo, dados: await RelatorioModel.produtos(periodo, 'menos', limite) });
  });

  // Agrupa quantidade de vendas e valores recebidos por forma de pagamento.
  static formasPagamento = seguro(async (req, res) => {
    const { periodo, limite } = parametros(req);
    res.json({ sucesso: true, periodo, dados: await RelatorioModel.formasPagamento(periodo, limite) });
  });

  // Agrupa vendas finalizadas e faturamento por operador.
  static operadores = seguro(async (req, res) => {
    const { periodo, limite } = parametros(req);
    res.json({ sucesso: true, periodo, dados: await RelatorioModel.operadores(periodo, limite) });
  });

  // Lista produtos ativos cujo estoque está abaixo do limite solicitado.
  static estoqueBaixo = seguro(async (req, res) => {
    const { estoqueMinimo, limite } = parametros(req);
    res.json({ sucesso: true, estoqueMinimo, dados: await RelatorioModel.estoqueBaixo(estoqueMinimo, limite) });
  });

  // Exporta o tipo escolhido para o período ativo, sem criar uma configuração salva.
  static exportarAtualCsv = seguro(async (req, res) => {
    const relatorio = entradaExportacaoAtual(req);
    const maximo = 10000;
    const dados = await RelatorioModel.gerar(
      relatorio.tipo,
      { dataInicio: relatorio.dataInicio, dataFim: relatorio.dataFim },
      relatorio.estoqueMinimo,
      maximo + 1
    );
    if (dados.length > maximo) throw new ErroHttp(413, 'O relatório supera 10.000 linhas. Reduza o período.');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${relatorio.tipo}.csv"`);
    res.status(200).send(gerarCsv(relatorio.tipo, dados));
  });

  // Exporta o período ativo como PDF respeitando o mesmo limite da exportação salva.
  static exportarAtualPdf = seguro(async (req, res) => {
    const relatorio = entradaExportacaoAtual(req);
    const maximo = 300;
    const dados = await RelatorioModel.gerar(
      relatorio.tipo,
      { dataInicio: relatorio.dataInicio, dataFim: relatorio.dataFim },
      relatorio.estoqueMinimo,
      maximo + 1
    );
    if (dados.length > maximo) throw new ErroHttp(413, 'PDF limitado a 300 linhas. Reduza o período ou exporte em CSV.');
    const documento = gerarPdf(relatorio, dados);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${relatorio.tipo}.pdf"`);
    documento.pipe(res);
    documento.end();
  });

  // Gera os dados usando o tipo e os filtros guardados na configuração salva.
  static gerar = seguro(async (req, res) => {
    const salvo = await carregarSalvo(req);
    const limite = inteiro(req.query.limite, 'limite', 100, 1, 1000);
    const filtros = { dataInicio: salvo.dataInicio, dataFim: salvo.dataFim };
    const dados = await RelatorioModel.gerar(salvo.tipo, filtros, salvo.estoqueMinimo, limite);
    res.json({ sucesso: true, relatorio: salvo, dados });
  });

  // Exporta no máximo 10.000 linhas para evitar arquivos CSV excessivamente grandes.
  static exportarCsv = seguro(async (req, res) => {
    const salvo = await carregarSalvo(req);
    const maximo = 10000;
    const filtros = { dataInicio: salvo.dataInicio, dataFim: salvo.dataFim };
    const dados = await RelatorioModel.gerar(salvo.tipo, filtros, salvo.estoqueMinimo, maximo + 1);
    if (dados.length > maximo) throw new ErroHttp(413, 'O relatório supera 10.000 linhas. Reduza o período.');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${salvo.id}.csv"`);
    res.status(200).send(gerarCsv(salvo.tipo, dados));
  });

  // Cria o PDF em memória e transmite o arquivo para o cliente; limita a 300 linhas.
  static exportarPdf = seguro(async (req, res) => {
    const salvo = await carregarSalvo(req);
    const maximo = 300;
    const filtros = { dataInicio: salvo.dataInicio, dataFim: salvo.dataFim };
    const dados = await RelatorioModel.gerar(salvo.tipo, filtros, salvo.estoqueMinimo, maximo + 1);
    if (dados.length > maximo) throw new ErroHttp(413, 'PDF limitado a 300 linhas. Reduza o período ou exporte em CSV.');
    const documento = gerarPdf(salvo, dados);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${salvo.id}.pdf"`);
    documento.pipe(res);
    documento.end();
  });
}
