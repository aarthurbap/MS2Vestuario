import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../services/api";
import type { LinhaRelatorio, RelatorioSalvo, TipoRelatorio } from "../types/relatorio";
import "./Relatorios.css";

// Valores preenchidos pelo usuário para filtrar as análises rápidas por data.
interface FiltroPeriodo {
    dataInicio: string;
    dataFim: string;
}

// Compara valores reais por barra proporcional; linhas vazias não recebem valores simulados.
function GraficoBarras({
    dados,
    chaveRotulo,
    chaveValor,
    moeda = false,
    carregando = false,
}: {
    dados: LinhaRelatorio[];
    chaveRotulo: string;
    chaveValor: string;
    moeda?: boolean;
    carregando?: boolean;
}) {
    if (carregando) return <p className="relatorios-empty">Carregando gráfico…</p>;
    if (dados.length === 0) return <p className="relatorios-empty">Sem movimentação neste período.</p>;
    const maiores = dados.slice(-10);
    const maximo = Math.max(...maiores.map(linha => Number(linha[chaveValor] ?? 0)), 0);
    return (
        <div className="relatorios-chart" role="img" aria-label={`${rotulo(chaveValor)} por ${rotulo(chaveRotulo)}`}>
            {maiores.map((linha, indice) => {
                const valor = Number(linha[chaveValor] ?? 0);
                const largura = maximo > 0 ? Math.max((valor / maximo) * 100, valor > 0 ? 2 : 0) : 0;
                return (
                    <div className="relatorios-chart-row" key={`${String(linha[chaveRotulo])}-${indice}`}>
                        <span className="relatorios-chart-label" title={String(linha[chaveRotulo] ?? "")}>{String(linha[chaveRotulo] ?? "—")}</span>
                        <div className="relatorios-chart-track"><span style={{ width: `${largura}%` }} /></div>
                        <strong>{moeda ? formatarMoeda(valor) : numeroFormatado.format(valor)}</strong>
                    </div>
                );
            })}
        </div>
    );
}

const numeroFormatado = new Intl.NumberFormat("pt-BR");

type PeriodoRapido = "todos" | "hoje" | "7dias" | "30dias" | "mesAtual" | "personalizado";
type Agrupamento = "dia" | "semana" | "mes";

// Indicadores que o endpoint /relatorios/dashboard devolve para os cards do topo.
interface ResumoRelatorio {
    vendasRealizadas: number;
    faturamentoTotal: number;
    ticketMedio: number;
    descontosConcedidos: number;
    produtosVendidos: number;
    produtosEstoqueBaixo: number;
}

// Formatos das respostas JSON usadas pelos endpoints de relatório.
interface RespostaResumo {
    indicadores: ResumoRelatorio;
}

interface RespostaDados {
    dados: LinhaRelatorio[];
}

interface RespostaRelatorios {
    dados: RelatorioSalvo[];
}

interface RespostaRelatorioSalvo {
    dados: RelatorioSalvo;
}

const TIPOS: Array<{ valor: TipoRelatorio; label: string }> = [
    { valor: "vendas", label: "Vendas" },
    { valor: "produtos", label: "Produtos mais vendidos" },
    { valor: "pagamentos", label: "Formas de pagamento" },
    { valor: "operadores", label: "Desempenho dos operadores" },
    { valor: "estoque", label: "Estoque baixo" },
];

// Colunas com valores monetários recebem formatação BRL antes de aparecer na tela.
const MOEDA = new Set(["faturamentoTotal", "ticketMedio", "descontosConcedidos", "faturamento", "valorRecebido", "receitaBruta", "subtotal", "desconto", "total", "preco"]);

function dataLocal(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function periodoRapido(periodo: PeriodoRapido): FiltroPeriodo {
    const hoje = new Date();
    const fim = dataLocal(hoje);
    if (periodo === "todos" || periodo === "personalizado") return { dataInicio: "", dataFim: "" };
    if (periodo === "hoje") return { dataInicio: fim, dataFim: fim };
    if (periodo === "mesAtual") {
        return { dataInicio: dataLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), dataFim: fim };
    }
    const dias = periodo === "7dias" ? 6 : 29;
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - dias);
    return { dataInicio: dataLocal(inicio), dataFim: fim };
}

function agruparPorSemana(dados: LinhaRelatorio[]): LinhaRelatorio[] {
    const grupos = new Map<string, { quantidadeVendas: number; faturamento: number; descontos: number }>();
    for (const linha of dados) {
        const data = new Date(`${String(linha.periodo)}T00:00:00Z`);
        const diaSemana = (data.getUTCDay() + 6) % 7;
        data.setUTCDate(data.getUTCDate() - diaSemana);
        const chave = data.toISOString().slice(0, 10);
        const grupo = grupos.get(chave) ?? { quantidadeVendas: 0, faturamento: 0, descontos: 0 };
        grupo.quantidadeVendas += Number(linha.quantidadeVendas ?? 0);
        grupo.faturamento += Number(linha.faturamento ?? 0);
        grupo.descontos += Number(linha.descontos ?? 0);
        grupos.set(chave, grupo);
    }
    return Array.from(grupos, ([periodo, valores]) => ({ periodo: `Semana de ${periodo}`, ...valores }));
}

// Monta a query string; datas vazias não são enviadas para a API.
function criarQuery(filtro: FiltroPeriodo, extras: Record<string, string> = {}): string {
    const params = new URLSearchParams(extras);
    if (filtro.dataInicio) params.set("dataInicio", filtro.dataInicio);
    if (filtro.dataFim) params.set("dataFim", filtro.dataFim);
    const query = params.toString();
    return query ? `?${query}` : "";
}

// Apresenta valores monetários no formato brasileiro.
function formatarMoeda(valor: number): string {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

// Formata valores de tabela conforme o tipo da coluna.
function formatarValor(chave: string, valor: string | number | null): string {
    if (valor === null) return "—";
    if (typeof valor === "number" && MOEDA.has(chave)) return formatarMoeda(valor);
    return String(valor);
}

// Converte nomes camelCase recebidos da API em rótulos legíveis para cabeçalhos.
function rotulo(chave: string): string {
    return chave
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, letra => letra.toLocaleUpperCase("pt-BR"));
}

export default function Relatorios() {
    // Dados do painel analítico e configurações de relatórios salvos.
    const [filtroForm, setFiltroForm] = useState<FiltroPeriodo>({ dataInicio: "", dataFim: "" });
    const [filtroAtivo, setFiltroAtivo] = useState<FiltroPeriodo>({ dataInicio: "", dataFim: "" });
    const [resumo, setResumo] = useState<ResumoRelatorio | null>(null);
    const [faturamento, setFaturamento] = useState<LinhaRelatorio[]>([]);
    const [produtos, setProdutos] = useState<LinhaRelatorio[]>([]);
    const [pagamentos, setPagamentos] = useState<LinhaRelatorio[]>([]);
    const [produtosMenos, setProdutosMenos] = useState<LinhaRelatorio[]>([]);
    const [estoqueBaixo, setEstoqueBaixo] = useState<LinhaRelatorio[]>([]);
    const [operadores, setOperadores] = useState<LinhaRelatorio[]>([]);
    const [salvos, setSalvos] = useState<RelatorioSalvo[]>([]);
    const [relatorioAberto, setRelatorioAberto] = useState<RelatorioSalvo | null>(null);
    const [linhasRelatorio, setLinhasRelatorio] = useState<LinhaRelatorio[]>([]);

    // Estado do formulário compartilhado por criação e edição.
    const [form, setForm] = useState({
        titulo: "",
        descricao: "",
        tipo: "vendas" as TipoRelatorio,
        dataInicio: "",
        dataFim: "",
        estoqueMinimo: "5",
    });
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [periodoRapidoAtivo, setPeriodoRapidoAtivo] = useState<PeriodoRapido>("todos");
    const [agrupamento, setAgrupamento] = useState<Agrupamento>("dia");
    const [tipoExportacao, setTipoExportacao] = useState<TipoRelatorio>("vendas");
    const [carregandoPainel, setCarregandoPainel] = useState(true);
    const [carregandoSalvos, setCarregandoSalvos] = useState(true);
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");

    // Carrega em paralelo indicadores, faturamento, produtos e pagamentos ao alterar o período.
    useEffect(() => {
        let vigente = true;
        const query = criarQuery(filtroAtivo);

        Promise.all([
            apiFetch<RespostaResumo>(`/relatorios/dashboard${query}`),
            apiFetch<RespostaDados>(`/relatorios/faturamento${criarQuery(filtroAtivo, { agrupar: agrupamento === "mes" ? "mes" : "dia" })}`),
            apiFetch<RespostaDados>(`/relatorios/produtos-mais-vendidos${criarQuery(filtroAtivo, { limite: "5" })}`),
            apiFetch<RespostaDados>(`/relatorios/formas-pagamento${criarQuery(filtroAtivo, { limite: "5" })}`),
            apiFetch<RespostaDados>(`/relatorios/produtos-menos-vendidos${criarQuery(filtroAtivo, { limite: "5" })}`),
            apiFetch<RespostaDados>(`/relatorios/estoque-baixo?estoqueMinimo=5&limite=10`),
            apiFetch<RespostaDados>(`/relatorios/operadores${criarQuery(filtroAtivo, { limite: "10" })}`),
        ]).then(([resumoResponse, faturamentoResponse, produtosResponse, pagamentosResponse, produtosMenosResponse, estoqueResponse, operadoresResponse]) => {
            if (!vigente) return;
            setResumo(resumoResponse.indicadores);
            setFaturamento(faturamentoResponse.dados);
            setProdutos(produtosResponse.dados);
            setPagamentos(pagamentosResponse.dados);
            setProdutosMenos(produtosMenosResponse.dados);
            setEstoqueBaixo(estoqueResponse.dados);
            setOperadores(operadoresResponse.dados);
            setErro("");
        }).catch((error: unknown) => {
            if (vigente) setErro(error instanceof Error ? error.message : "Não foi possível carregar os relatórios.");
        }).finally(() => {
            if (vigente) setCarregandoPainel(false);
        });

        // Evita atualizar o estado caso um período anterior termine depois do atual.
        return () => { vigente = false; };
    }, [filtroAtivo, agrupamento]);

    // Busca a lista inicial de configurações guardadas no banco.
    useEffect(() => {
        void carregarSalvos();
    }, []);

    // Atualiza a lista paginada de relatórios salvos e apresenta erros da API.
    async function carregarSalvos() {
        try {
            setCarregandoSalvos(true);
            const resposta = await apiFetch<RespostaRelatorios>("/relatorios?pagina=1&limite=100");
            setSalvos(resposta.dados);
        } catch (error) {
            setErro(error instanceof Error ? error.message : "Não foi possível carregar os relatórios salvos.");
        } finally {
            setCarregandoSalvos(false);
        }
    }

    // Verifica o intervalo no navegador e aplica as datas às consultas do painel.
    function aplicarFiltros(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (filtroForm.dataInicio && filtroForm.dataFim && filtroForm.dataInicio > filtroForm.dataFim) {
            setErro("A data inicial não pode ser posterior à data final.");
            return;
        }
        setErro("");
        setPeriodoRapidoAtivo("personalizado");
        setCarregandoPainel(true);
        setFiltroAtivo({ ...filtroForm });
    }

    function aplicarPeriodoRapido(periodo: PeriodoRapido) {
        if (periodo === "personalizado") {
            setPeriodoRapidoAtivo(periodo);
            return;
        }
        const intervalo = periodoRapido(periodo);
        setFiltroForm(intervalo);
        setFiltroAtivo(intervalo);
        setPeriodoRapidoAtivo(periodo);
        setCarregandoPainel(true);
    }

    // Copia a configuração escolhida para o formulário e ativa o modo de edição.
    function editarRelatorio(relatorio: RelatorioSalvo) {
        setEditandoId(relatorio.id);
        setForm({
            titulo: relatorio.titulo,
            descricao: relatorio.descricao ?? "",
            tipo: relatorio.tipo,
            dataInicio: relatorio.dataInicio ?? "",
            dataFim: relatorio.dataFim ?? "",
            estoqueMinimo: String(relatorio.estoqueMinimo),
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Limpa os campos e retorna o formulário ao modo de criação.
    function limparFormulario() {
        setEditandoId(null);
        setForm({ titulo: "", descricao: "", tipo: "vendas", dataInicio: "", dataFim: "", estoqueMinimo: "5" });
    }

    // Cria ou substitui uma configuração no backend e mostra imediatamente o resultado.
    async function salvarRelatorio(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErro("");
        setMensagem("");
        const corpo = {
            ...form,
            descricao: form.descricao.trim() || null,
            dataInicio: form.dataInicio || null,
            dataFim: form.dataFim || null,
            estoqueMinimo: Number(form.estoqueMinimo),
        };

        try {
            const endpoint = editandoId === null ? "/relatorios" : `/relatorios/${editandoId}`;
            const metodo = editandoId === null ? "POST" : "PUT";
            const resposta = await apiFetch<RespostaRelatorioSalvo>(endpoint, {
                method: metodo,
                body: JSON.stringify(corpo),
            });
            setMensagem(editandoId === null ? "Relatório salvo com sucesso." : "Relatório atualizado com sucesso.");
            limparFormulario();
            await carregarSalvos();
            await abrirRelatorio(resposta.dados);
        } catch (error) {
            setErro(error instanceof Error ? error.message : "Não foi possível salvar o relatório.");
        }
    }

    // Executa os filtros salvos e guarda as linhas para exibir na tabela de resultado.
    async function abrirRelatorio(relatorio: RelatorioSalvo) {
        setErro("");
        setMensagem("");
        try {
            const resposta = await apiFetch<RespostaDados>(`/relatorios/${relatorio.id}/gerar`);
            setRelatorioAberto(relatorio);
            setLinhasRelatorio(resposta.dados);
        } catch (error) {
            setErro(error instanceof Error ? error.message : "Não foi possível gerar o relatório.");
        }
    }

    // Confirma a exclusão e limpa resultados ou edição relacionados ao relatório removido.
    async function excluirRelatorio(relatorio: RelatorioSalvo) {
        if (!window.confirm(`Excluir o relatório "${relatorio.titulo}"?`)) return;
        try {
            await apiFetch(`/relatorios/${relatorio.id}`, { method: "DELETE" });
            if (relatorioAberto?.id === relatorio.id) {
                setRelatorioAberto(null);
                setLinhasRelatorio([]);
            }
            if (editandoId === relatorio.id) limparFormulario();
            setMensagem("Relatório excluído.");
            await carregarSalvos();
        } catch (error) {
            setErro(error instanceof Error ? error.message : "Não foi possível excluir o relatório.");
        }
    }

    // Baixa o arquivo autenticado e inicia o download no navegador.
    async function exportarRelatorio(formato: "csv" | "pdf", tipo: TipoRelatorio, filtro = filtroAtivo, estoqueMinimo = 5) {
        try {
            const token = sessionStorage.getItem("token");
            const query = criarQuery(filtro, { tipo, estoqueMinimo: String(estoqueMinimo) });
            const resposta = await fetch(
                `http://localhost:3000/relatorios/exportar.${formato}${query}`,
                { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
            );
            if (!resposta.ok) {
                const corpo: unknown = await resposta.json().catch(() => null);
                const mensagemErro = typeof corpo === "object" && corpo !== null && "mensagem" in corpo
                    ? String(corpo.mensagem)
                    : "Não foi possível exportar o relatório.";
                throw new Error(mensagemErro);
            }
            const url = URL.createObjectURL(await resposta.blob());
            const link = document.createElement("a");
            link.href = url;
            link.download = `relatorio-${tipo}.${formato}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            setErro(error instanceof Error ? error.message : "Não foi possível exportar o relatório.");
        }
    }

    const colunas = linhasRelatorio.length ? Object.keys(linhasRelatorio[0]) : [];
    const faturamentoGrafico = agrupamento === "semana" ? agruparPorSemana(faturamento) : faturamento;

    return (
        <main className="relatorios-page">
            {/* Título da área e mensagens globais de erro ou sucesso. */}
            <header className="relatorios-hero">
                <div>
                    <span className="relatorios-eyebrow">ANÁLISE DO NEGÓCIO</span>
                    <h1>Relatórios e Análises</h1>
                    <p>Acompanhe o desempenho das vendas, analise seus produtos e tenha uma visão estratégica do seu negócio.</p>
                </div>
            </header>

            {erro && <div className="relatorios-alert is-error" role="alert">{erro}</div>}
            {mensagem && <div className="relatorios-alert is-success" role="status">{mensagem}</div>}

            {/* Filtros rápidos aplicados somente às análises do painel. */}
            <section className="relatorios-panel">
                <div className="relatorios-section-heading">
                    <div><h2>Período de análise</h2><p>Filtre os indicadores e as tabelas por data da venda.</p></div>
                </div>
                <form className="relatorios-filter-form" onSubmit={aplicarFiltros}>
                    <label>Data inicial<input type="date" value={filtroForm.dataInicio} onChange={e => setFiltroForm({ ...filtroForm, dataInicio: e.target.value })} /></label>
                    <label>Data final<input type="date" value={filtroForm.dataFim} onChange={e => setFiltroForm({ ...filtroForm, dataFim: e.target.value })} /></label>
                    <button className="relatorios-button is-primary" type="submit">Aplicar período</button>
                </form>
                <div className="relatorios-period-actions" aria-label="Períodos rápidos">
                    {([
                        ["hoje", "Hoje"],
                        ["7dias", "Últimos 7 dias"],
                        ["30dias", "Últimos 30 dias"],
                        ["mesAtual", "Mês atual"],
                        ["todos", "Todo período"],
                        ["personalizado", "Personalizado"],
                    ] as Array<[PeriodoRapido, string]>).map(([valor, label]) => (
                        <button
                            className={`relatorios-button${periodoRapidoAtivo === valor ? " is-selected" : ""}`}
                            type="button"
                            key={valor}
                            aria-pressed={periodoRapidoAtivo === valor}
                            onClick={() => aplicarPeriodoRapido(valor)}
                        >
                            {label}
                        </button>
                    ))}
                    <label className="relatorios-grouping">Agrupar por
                        <select value={agrupamento} onChange={e => setAgrupamento(e.target.value as Agrupamento)}>
                            <option value="dia">Dia</option>
                            <option value="semana">Semana</option>
                            <option value="mes">Mês</option>
                        </select>
                    </label>
                </div>
            </section>

            {/* Cards de indicadores calculados a partir das vendas e do estoque atuais. */}
            <section className="relatorios-metrics" aria-label="Indicadores do período">
                {[
                    ["Faturamento", resumo ? formatarMoeda(resumo.faturamentoTotal) : "—"],
                    ["Vendas finalizadas", resumo?.vendasRealizadas ?? "—"],
                    ["Ticket médio", resumo ? formatarMoeda(resumo.ticketMedio) : "—"],
                    ["Unidades vendidas", resumo?.produtosVendidos ?? "—"],
                    ["Descontos concedidos", resumo ? formatarMoeda(resumo.descontosConcedidos) : "—"],
                    ["Produtos com estoque baixo", resumo?.produtosEstoqueBaixo ?? "—"],
                ].map(([titulo, valor]) => (
                    <article className="relatorios-metric" key={titulo}>
                        <span>{titulo}</span><strong>{carregandoPainel ? "…" : valor}</strong>
                    </article>
                ))}
            </section>

            {/* Tabelas analíticas que acompanham o período rápido selecionado. */}
            <section className="relatorios-export-panel relatorios-panel">
                <div className="relatorios-section-heading"><div><h2>Exportar dados do período</h2><p>Os arquivos usam os filtros de data selecionados acima.</p></div></div>
                <div className="relatorios-export-actions">
                    <label>Conteúdo do arquivo
                        <select value={tipoExportacao} onChange={e => setTipoExportacao(e.target.value as TipoRelatorio)}>
                            {TIPOS.map(tipo => <option key={tipo.valor} value={tipo.valor}>{tipo.label}</option>)}
                        </select>
                    </label>
                    <button className="relatorios-button" type="button" onClick={() => void exportarRelatorio("csv", tipoExportacao)}>Exportar CSV</button>
                    <button className="relatorios-button" type="button" onClick={() => void exportarRelatorio("pdf", tipoExportacao)}>Exportar PDF</button>
                </div>
            </section>

            <section className="relatorios-data-grid">
                <article className="relatorios-panel">
                    <div className="relatorios-section-heading"><div><h2>Faturamento por período</h2><p>Receita das vendas finalizadas.</p></div></div>
                    <GraficoBarras dados={faturamentoGrafico} chaveRotulo="periodo" chaveValor="faturamento" moeda carregando={carregandoPainel} />
                </article>
                <article className="relatorios-panel">
                    <div className="relatorios-section-heading"><div><h2>Produtos mais vendidos</h2><p>Ranking por unidades vendidas.</p></div></div>
                    <GraficoBarras dados={produtos} chaveRotulo="nome" chaveValor="unidadesVendidas" carregando={carregandoPainel} />
                </article>
                <article className="relatorios-panel">
                    <div className="relatorios-section-heading"><div><h2>Formas de pagamento</h2><p>Valores recebidos em vendas finalizadas.</p></div></div>
                    <GraficoBarras dados={pagamentos} chaveRotulo="formaPagamento" chaveValor="valorRecebido" moeda carregando={carregandoPainel} />
                </article>
                <article className="relatorios-panel">
                    <div className="relatorios-section-heading"><div><h2>Vendas por período</h2><p>Quantidade de vendas finalizadas.</p></div></div>
                    <GraficoBarras dados={faturamentoGrafico} chaveRotulo="periodo" chaveValor="quantidadeVendas" carregando={carregandoPainel} />
                </article>
            </section>

            <section className="relatorios-data-grid">
                <article className="relatorios-panel">
                    <div className="relatorios-section-heading"><div><h2>Histórico de faturamento</h2><p>Resumo por período selecionado.</p></div></div>
                    <Tabela dados={faturamentoGrafico} carregando={carregandoPainel} />
                </article>
                <article className="relatorios-panel">
                    <div className="relatorios-section-heading"><div><h2>Produtos mais vendidos</h2><p>Produtos com maior saída no período.</p></div></div>
                    <Tabela dados={produtos} carregando={carregandoPainel} />
                </article>
                <article className="relatorios-panel">
                    <div className="relatorios-section-heading"><div><h2>Produtos menos vendidos</h2><p>Inclui produtos sem vendas no período.</p></div></div>
                    <Tabela dados={produtosMenos} carregando={carregandoPainel} />
                </article>
                <article className="relatorios-panel">
                    <div className="relatorios-section-heading"><div><h2>Estoque baixo</h2><p>Produtos ativos com até 5 unidades.</p></div></div>
                    <Tabela dados={estoqueBaixo} carregando={carregandoPainel} />
                </article>
                <article className="relatorios-panel">
                    <div className="relatorios-section-heading"><div><h2>Vendas por operador</h2><p>Faturamento por operador no período.</p></div></div>
                    <Tabela dados={operadores} carregando={carregandoPainel} />
                </article>
            </section>

            {/* Formulário de configuração dos relatórios que podem ser reutilizados. */}
            <section className="relatorios-panel">
                <div className="relatorios-section-heading">
                    <div><h2>{editandoId === null ? "Criar relatório salvo" : "Editar relatório"}</h2><p>Salve filtros para gerar ou exportar novamente quando precisar.</p></div>
                </div>
                <form className="relatorios-save-form" onSubmit={salvarRelatorio}>
                    <label>Título<input required minLength={3} maxLength={120} value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></label>
                    <label>Tipo<select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as TipoRelatorio })}>{TIPOS.map(tipo => <option key={tipo.valor} value={tipo.valor}>{tipo.label}</option>)}</select></label>
                    <label>Data inicial<input type="date" value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })} /></label>
                    <label>Data final<input type="date" value={form.dataFim} onChange={e => setForm({ ...form, dataFim: e.target.value })} /></label>
                    <label>Estoque mínimo<input type="number" min="0" max="1000000" value={form.estoqueMinimo} onChange={e => setForm({ ...form, estoqueMinimo: e.target.value })} /></label>
                    <label className="relatorios-description">Descrição<textarea maxLength={500} rows={2} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></label>
                    <div className="relatorios-form-actions">
                        <button className="relatorios-button is-primary" type="submit">{editandoId === null ? "Salvar relatório" : "Salvar alterações"}</button>
                        {editandoId !== null && <button className="relatorios-button" type="button" onClick={limparFormulario}>Cancelar edição</button>}
                    </div>
                </form>
            </section>

            {/* Lista de configurações persistidas com ações de gerar, editar e excluir. */}
            <section className="relatorios-panel">
                <div className="relatorios-section-heading"><div><h2>Relatórios salvos</h2><p>Gere, edite, remova ou exporte suas configurações.</p></div></div>
                {carregandoSalvos ? <p className="relatorios-empty">Carregando relatórios salvos…</p> : salvos.length === 0 ? <p className="relatorios-empty">Nenhum relatório salvo ainda.</p> : (
                    <div className="relatorios-saved-list">
                        {salvos.map(relatorio => (
                            <article className="relatorios-saved-item" key={relatorio.id}>
                                <div className="relatorios-saved-copy">
                                    <strong>{relatorio.titulo}</strong>
                                    <span>{TIPOS.find(tipo => tipo.valor === relatorio.tipo)?.label ?? relatorio.tipo} · {relatorio.dataInicio ?? "sem início"} até {relatorio.dataFim ?? "sem fim"}</span>
                                    {relatorio.descricao && <small>{relatorio.descricao}</small>}
                                </div>
                                <div className="relatorios-actions">
                                    <button className="relatorios-button" type="button" onClick={() => void abrirRelatorio(relatorio)}>Gerar</button>
                                    <button className="relatorios-button" type="button" onClick={() => editarRelatorio(relatorio)}>Editar</button>
                                    <button className="relatorios-button is-danger" type="button" onClick={() => void excluirRelatorio(relatorio)}>Excluir</button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {/* Resultado de uma configuração, com opção de exportar para CSV ou PDF. */}
            {relatorioAberto && (
                <section className="relatorios-panel">
                    <div className="relatorios-section-heading relatorios-result-heading">
                        <div><h2>{relatorioAberto.titulo}</h2><p>Resultado gerado com os filtros salvos.</p></div>
                        <div className="relatorios-actions">
                            <button className="relatorios-button" type="button" onClick={() => void exportarRelatorio("csv", relatorioAberto.tipo, { dataInicio: relatorioAberto.dataInicio ?? "", dataFim: relatorioAberto.dataFim ?? "" }, relatorioAberto.estoqueMinimo)}>Exportar CSV</button>
                            <button className="relatorios-button" type="button" onClick={() => void exportarRelatorio("pdf", relatorioAberto.tipo, { dataInicio: relatorioAberto.dataInicio ?? "", dataFim: relatorioAberto.dataFim ?? "" }, relatorioAberto.estoqueMinimo)}>Exportar PDF</button>
                        </div>
                    </div>
                    {linhasRelatorio.length === 0 ? <p className="relatorios-empty">Nenhum dado encontrado para os filtros selecionados.</p> : (
                        <div className="relatorios-table-wrap">
                            <table className="relatorios-table">
                                <thead><tr>{colunas.map(chave => <th key={chave}>{rotulo(chave)}</th>)}</tr></thead>
                                <tbody>{linhasRelatorio.map((linha, indice) => <tr key={indice}>{colunas.map(chave => <td key={chave}>{formatarValor(chave, linha[chave])}</td>)}</tr>)}</tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
        </main>
    );
}

// Renderiza uma tabela analítica com estados de carregamento e sem resultados.
function Tabela({ dados, carregando }: { dados: LinhaRelatorio[]; carregando: boolean }) {
    if (carregando) return <p className="relatorios-empty">Carregando dados…</p>;
    if (dados.length === 0) return <p className="relatorios-empty">Nenhum dado encontrado neste período.</p>;
    const colunas = Object.keys(dados[0]);
    return (
        <div className="relatorios-table-wrap">
            <table className="relatorios-table">
                <thead><tr>{colunas.map(chave => <th key={chave}>{rotulo(chave)}</th>)}</tr></thead>
                <tbody>{dados.map((linha, indice) => <tr key={indice}>{colunas.map(chave => <td key={chave}>{formatarValor(chave, linha[chave])}</td>)}</tr>)}</tbody>
            </table>
        </div>
    );
}
