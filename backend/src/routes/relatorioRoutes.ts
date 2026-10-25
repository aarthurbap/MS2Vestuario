import { Router } from 'express';
import { RelatorioController } from '../controllers/RelatorioController';
import { authMiddleware } from '../middlewares/authMiddleware';

const relatorioRoutes = Router();

// Exige token válido para todas as consultas, alterações e exportações de relatórios.
relatorioRoutes.use(authMiddleware);

// Consultas analíticas. São declaradas antes de /:id para não serem interpretadas como IDs.
relatorioRoutes.get('/dashboard', RelatorioController.dashboard);
relatorioRoutes.get('/faturamento', RelatorioController.faturamento);
relatorioRoutes.get('/produtos-mais-vendidos', RelatorioController.produtosMaisVendidos);
relatorioRoutes.get('/produtos-menos-vendidos', RelatorioController.produtosMenosVendidos);
relatorioRoutes.get('/formas-pagamento', RelatorioController.formasPagamento);
relatorioRoutes.get('/operadores', RelatorioController.operadores);
relatorioRoutes.get('/estoque-baixo', RelatorioController.estoqueBaixo);
relatorioRoutes.get('/exportar.csv', RelatorioController.exportarAtualCsv);
relatorioRoutes.get('/exportar.pdf', RelatorioController.exportarAtualPdf);

// Endpoints para criar, listar, consultar, atualizar e excluir configurações salvas.
relatorioRoutes.post('/', RelatorioController.criar);
relatorioRoutes.get('/', RelatorioController.listar);
relatorioRoutes.get('/:id', RelatorioController.buscar);
relatorioRoutes.put('/:id', RelatorioController.atualizar);
relatorioRoutes.delete('/:id', RelatorioController.excluir);

// Gera os dados da configuração salva ou os entrega como arquivo CSV/PDF.
relatorioRoutes.get('/:id/gerar', RelatorioController.gerar);
relatorioRoutes.get('/:id/exportar.csv', RelatorioController.exportarCsv);
relatorioRoutes.get('/:id/exportar.pdf', RelatorioController.exportarPdf);

export default relatorioRoutes;
