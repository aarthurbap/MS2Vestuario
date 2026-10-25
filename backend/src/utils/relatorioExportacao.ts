import PDFDocument from 'pdfkit';
import type { LinhaRelatorio, RelatorioSalvo, TipoRelatorio } from '../types/relatorio';

// Define as colunas e os rótulos exportados para cada tipo de relatório.
const COLUNAS: Record<TipoRelatorio, Array<{ chave: string; titulo: string }>> = {
  vendas: [
    { chave: 'id', titulo: 'Venda' }, { chave: 'dataVenda', titulo: 'Data' },
    { chave: 'cliente', titulo: 'Cliente' }, { chave: 'operador', titulo: 'Operador' },
    { chave: 'subtotal', titulo: 'Subtotal' }, { chave: 'desconto', titulo: 'Desconto' },
    { chave: 'total', titulo: 'Total' }
  ],
  produtos: [
    { chave: 'codigo', titulo: 'Código' }, { chave: 'nome', titulo: 'Produto' },
    { chave: 'unidadesVendidas', titulo: 'Unidades' }, { chave: 'receitaBruta', titulo: 'Receita bruta' }
  ],
  pagamentos: [
    { chave: 'formaPagamento', titulo: 'Forma de pagamento' },
    { chave: 'vendas', titulo: 'Vendas' }, { chave: 'valorRecebido', titulo: 'Valor recebido' }
  ],
  operadores: [
    { chave: 'operador', titulo: 'Operador' },
    { chave: 'vendasRealizadas', titulo: 'Vendas' }, { chave: 'faturamento', titulo: 'Faturamento' }
  ],
  estoque: [
    { chave: 'codigo', titulo: 'Código' }, { chave: 'nome', titulo: 'Produto' },
    { chave: 'estoque', titulo: 'Estoque' }, { chave: 'preco', titulo: 'Preço' }
  ]
};

// Converte valores numéricos e nulos para texto antes de gravar no arquivo.
const COLUNAS_MONETARIAS = new Set([
  'subtotal', 'desconto', 'total', 'receitaBruta', 'valorRecebido',
  'faturamento', 'preco'
]);

function valor(v: string | number | null | undefined): string {
  return v === null || v === undefined ? '' : String(v);
}

// Formata valores monetários no padrão brasileiro usado pela interface.
function valorExportado(chave: string, v: string | number | null | undefined): string {
  if (COLUNAS_MONETARIAS.has(chave) && v !== null && v !== undefined && Number.isFinite(Number(v))) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
  }
  return valor(v);
}

// Escapa aspas e prefixa conteúdo perigoso para planilhas não executarem fórmulas.
function escaparCsv(v: string): string {
  // Previne interpretacao como formula ao abrir em planilhas.
  const seguro = /^[=+\-@\t\r\n]/.test(v) ? `'${v}` : v;
  return `"${seguro.replace(/"/g, '""')}"`;
}

// Monta um CSV separado por ponto e vírgula com BOM para abrir acentos corretamente em planilhas.
export function gerarCsv(tipo: TipoRelatorio, dados: LinhaRelatorio[]): string {
  const colunas = COLUNAS[tipo];
  const cabecalho = colunas.map(c => escaparCsv(c.titulo)).join(';');
  const linhas = dados.map(linha =>
    colunas.map(c => escaparCsv(valorExportado(c.chave, linha[c.chave]))).join(';')
  );
  return '\uFEFF' + [cabecalho, ...linhas].join('\r\n');
}

// Monta o documento PDF com identificação do relatório e registros paginados.
export function gerarPdf(relatorio: RelatorioSalvo, dados: LinhaRelatorio[]): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true });
  const colunas = COLUNAS[relatorio.tipo];
  doc.font('Helvetica-Bold').fontSize(17).fillColor('#20283c').text('MS² Vestuário - Relatório');
  doc.moveDown(0.5).fontSize(13).text(relatorio.titulo);
  doc.font('Helvetica').fontSize(9).fillColor('#515b70');
  doc.text(`Tipo: ${relatorio.tipo}  |  Periodo: ${relatorio.dataInicio || 'sem limite'} ate ${relatorio.dataFim || 'sem limite'}`);
  if (relatorio.descricao) doc.text(relatorio.descricao);
  doc.moveDown(1);

  if (dados.length === 0) doc.text('Nenhum dado encontrado para os filtros selecionados.');

  for (let i = 0; i < dados.length; i++) {
    if (doc.y > 720) doc.addPage();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#263456').text(`Registro ${i + 1}`);
    doc.font('Helvetica').fontSize(9).fillColor('#263456');
    for (const c of colunas) {
      doc.text(`${c.titulo}: ${valorExportado(c.chave, dados[i][c.chave])}`, { width: 500 });
    }
    doc.moveDown(0.6);
  }

  return doc;
}
