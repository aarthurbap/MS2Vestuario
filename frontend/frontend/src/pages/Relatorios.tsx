import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../services/api";
import type { LinhaRelatorio, RelatorioSalvo, TipoRelatorio } from "../types/relatorio";
import "./Relatorios.css";

// Valores preenchidos pelo usuário para filtrar as análises rápidas por data.
interface FiltroPeriodo {
    dataInicio: string;
    dataFim: string;
}


// Ícones locais em SVG: sem dependências adicionais ou bibliotecas externas.
type IconeNome =
    | "analytics" | "calendar" | "filter" | "money" | "receipt" | "ticket"
    | "package" | "discount" | "warning" | "download" | "file" | "save"
    | "trash" | "edit" | "play" | "check" | "clock" | "credit"
    | "layers" | "close" | "spark" | "users" | "arrow";

function IconeRelatorio({ nome, tamanho = 19 }: { nome: IconeNome; tamanho?: number }) {
    const svgProps = {
        width: tamanho,
        height: tamanho,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.8,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        "aria-hidden": true as const,
    };
    const caminhos: Record<IconeNome, ReactNode> = {
        analytics: <><path d="M3 3v18h18"/><path d="m7 16 4-4 3 2 5-7"/><path d="M16 7h3v3"/></>,
        calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
        filter: <><path d="M4 7h16M7 12h10M10 17h4"/><circle cx="8" cy="7" r="2" fill="currentColor" stroke="none"/></>,
        money: <><rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></>,
        receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></>,
        ticket: <><path d="M3 7h18v10H3V7Z"/><path d="M8 7v10M13 12h4"/></>,
        package: <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="M3 7v10l9 5 9-5V7M12 12v10"/></>,
        discount: <><path d="M20 12 12 20 3 11V4h7l10 8Z"/><circle cx="8" cy="8" r="1"/></>,
        warning: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 18h.01"/></>,
        download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 17v4h16v-4"/></>,
        file: <><path d="M6 2h8l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h5M8 13h8M8 17h6"/></>,
        save: <><path d="M4 3h14l3 3v15H3V3Z"/><path d="M7 3v7h10V3M7 21v-8h10v8"/></>,
        trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></>,
        edit: <><path d="M12 20h9M16 4a2 2 0 0 1 3 3L9 17l-5 1 1-5L16 4Z"/></>,
        play: <><path d="m9 5 10 7-10 7V5Z"/></>,
        check: <><path d="m4 12 5 5L20 6"/></>,
        clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
        credit: <><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h5"/></>,
        layers: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/></>,
        close: <path d="M18 6 6 18M6 6l12 12"/>,
        spark: <><path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2L12 2Z"/></>,
        users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1"/></>,
        arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    };
    return <svg {...svgProps}>{caminhos[nome]}</svg>;
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
    if (carregando) return <div className="relatorios-empty relatorios-empty--chart"><span className="relatorios-loading-mark" />Carregando gráfico…</div>;
    if (dados.length === 0) return <div className="relatorios-empty relatorios-empty--chart"><IconeRelatorio nome="analytics" tamanho={23} />Sem movimentação neste período.</div>;
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
                        <div className="relatorios-chart-track" aria-hidden="true"><span style={{ width: `${largura}%` }} /></div>
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
    const [relatorioParaExcluir, setRelatorioParaExcluir] = useState<RelatorioSalvo | null>(null);
    const [excluindo, setExcluindo] = useState(false);
    const [erroExclusao, setErroExclusao] = useState("");

    // Diálogo de exclusão acessível, com Escape e bloqueio de scroll.
    useEffect(() => {
        if (!relatorioParaExcluir) return;
        const scrollOriginal = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const aoPressionar = (evento: KeyboardEvent) => {
            if (evento.key === "Escape" && !excluindo) {
                setRelatorioParaExcluir(null);
                setErroExclusao("");
            }
        };
        window.addEventListener("keydown", aoPressionar);
        return () => {
            document.body.style.overflow = scrollOriginal;
            window.removeEventListener("keydown", aoPressionar);
        };
    }, [relatorioParaExcluir, excluindo]);

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

    // Solicita confirmação na própria tela em vez de abrir o alerta do navegador.
    function solicitarExclusao(relatorio: RelatorioSalvo) {
        setErroExclusao("");
        setRelatorioParaExcluir(relatorio);
    }

    // Exclui somente depois da confirmação e mantém resultados sincronizados.
    async function confirmarExclusao() {
        if (!relatorioParaExcluir || excluindo) return;
        const relatorio = relatorioParaExcluir;
        try {
            setExcluindo(true);
            setErroExclusao("");
            setErro("");
            await apiFetch(`/relatorios/${relatorio.id}`, { method: "DELETE" });
            if (relatorioAberto?.id === relatorio.id) {
                setRelatorioAberto(null);
                setLinhasRelatorio([]);
            }
            if (editandoId === relatorio.id) limparFormulario();
            setRelatorioParaExcluir(null);
            setMensagem("Relatório excluído com sucesso.");
            await carregarSalvos();
        } catch (error) {
            setErroExclusao(error instanceof Error ? error.message : "Não foi possível excluir o relatório.");
        } finally {
            setExcluindo(false);
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

    const indicadores: Array<{
        titulo: string;
        valor: string | number;
        detalhe: string;
        icone: IconeNome;
        tom: string;
    }> = [
        { titulo: "Faturamento total", valor: resumo ? formatarMoeda(resumo.faturamentoTotal) : "—", detalhe: "Receita de vendas finalizadas", icone: "money", tom: "violet" },
        { titulo: "Vendas finalizadas", valor: resumo ? numeroFormatado.format(resumo.vendasRealizadas) : "—", detalhe: "Pedidos concluídos no período", icone: "receipt", tom: "cyan" },
        { titulo: "Ticket médio", valor: resumo ? formatarMoeda(resumo.ticketMedio) : "—", detalhe: "Valor médio por venda", icone: "ticket", tom: "blue" },
        { titulo: "Unidades vendidas", valor: resumo ? numeroFormatado.format(resumo.produtosVendidos) : "—", detalhe: "Itens comercializados", icone: "package", tom: "emerald" },
        { titulo: "Descontos concedidos", valor: resumo ? formatarMoeda(resumo.descontosConcedidos) : "—", detalhe: "Reduções aplicadas nas vendas", icone: "discount", tom: "amber" },
        { titulo: "Produtos com estoque baixo", valor: resumo ? numeroFormatado.format(resumo.produtosEstoqueBaixo) : "—", detalhe: "Atenção à reposição do estoque", icone: "warning", tom: "rose" },
    ];

    return (
        <main className="relatorios-page">
            <header className="relatorios-hero">
                <div className="relatorios-hero__content">
                    <span className="relatorios-eyebrow"><span className="relatorios-eyebrow__line" /> INTELIGÊNCIA DE NEGÓCIO</span>
                    <h1>Relatórios <span>&amp; Análises</span></h1>
                    <p>Uma visão completa da operação: acompanhe resultados, identifique oportunidades e tome decisões com base nos dados da sua loja.</p>
                    <div className="relatorios-hero__tags">
                        <span><IconeRelatorio nome="analytics" tamanho={14} /> Dados da operação</span>
                        <span><IconeRelatorio nome="layers" tamanho={14} /> Visão gerencial</span>
                    </div>
                </div>
                <div className="relatorios-hero__symbol" aria-hidden="true">
                    <div className="relatorios-hero__symbol-ring"><IconeRelatorio nome="analytics" tamanho={42} /></div>
                </div>
            </header>

            {erro && <div className="relatorios-alert is-error" role="alert"><IconeRelatorio nome="warning" tamanho={19} /><span>{erro}</span><button type="button" aria-label="Fechar aviso" onClick={() => setErro("")}><IconeRelatorio nome="close" tamanho={16}/></button></div>}
            {mensagem && <div className="relatorios-alert is-success" role="status"><IconeRelatorio nome="check" tamanho={19} /><span>{mensagem}</span><button type="button" aria-label="Fechar mensagem" onClick={() => setMensagem("")}><IconeRelatorio nome="close" tamanho={16}/></button></div>}

            <section className="relatorios-panel relatorios-filter-panel" aria-label="Filtrar período de análise">
                <div className="relatorios-section-heading">
                    <div className="relatorios-heading-with-icon">
                        <span className="relatorios-heading-icon"><IconeRelatorio nome="calendar" tamanho={20} /></span>
                        <div><h2>Período de análise</h2><p>Selecione o intervalo para visualizar os indicadores.</p></div>
                    </div>
                    <span className="relatorios-section-chip"><IconeRelatorio nome="filter" tamanho={13}/> Filtros</span>
                </div>
                <form className="relatorios-filter-form" onSubmit={aplicarFiltros}>
                    <label>Data inicial<input type="date" value={filtroForm.dataInicio} onChange={e => setFiltroForm({ ...filtroForm, dataInicio: e.target.value })} /></label>
                    <label>Data final<input type="date" value={filtroForm.dataFim} onChange={e => setFiltroForm({ ...filtroForm, dataFim: e.target.value })} /></label>
                    <button className="relatorios-button is-primary" type="submit"><IconeRelatorio nome="filter" tamanho={16}/> Aplicar filtros</button>
                </form>
                <div className="relatorios-filter-bottom">
                    <div className="relatorios-period-actions" role="group" aria-label="Períodos rápidos">
                        {([
                            ["hoje", "Hoje"], ["7dias", "7 dias"], ["30dias", "30 dias"],
                            ["mesAtual", "Este mês"], ["todos", "Todo o período"], ["personalizado", "Personalizado"],
                        ] as Array<[PeriodoRapido, string]>).map(([valor, label]) => (
                            <button className={`relatorios-button relatorios-period-button${periodoRapidoAtivo === valor ? " is-selected" : ""}`}
                                type="button" key={valor} aria-pressed={periodoRapidoAtivo === valor}
                                onClick={() => aplicarPeriodoRapido(valor)}>{label}</button>
                        ))}
                    </div>
                    <label className="relatorios-grouping">Agrupar por
                        <select value={agrupamento} onChange={e => { setCarregandoPainel(true); setAgrupamento(e.target.value as Agrupamento); }}>
                            <option value="dia">Dia</option><option value="semana">Semana</option><option value="mes">Mês</option>
                        </select>
                    </label>
                </div>
            </section>

            <div className="relatorios-block-heading">
                <div><span className="relatorios-block-kicker">VISÃO GERAL</span><h2>Indicadores de desempenho</h2><p>Os números mais importantes da operação em um só lugar.</p></div>
                <span className="relatorios-block-aside"><span className="relatorios-live-dot"/> {periodoRapidoAtivo === "todos" ? "Todo o período" : periodoRapidoAtivo === "personalizado" ? "Período personalizado" : "Período selecionado"}</span>
            </div>
            <section className="relatorios-metrics" aria-label="Indicadores do período">
                {indicadores.map((indicador, indice) => (
                    <article className={`relatorios-metric relatorios-metric--${indicador.tom}${indice === 0 ? " relatorios-metric--featured" : ""}`} key={indicador.titulo}>
                        <div className="relatorios-metric__top"><span>{indicador.titulo}</span><span className="relatorios-metric__icon"><IconeRelatorio nome={indicador.icone} tamanho={21}/></span></div>
                        <strong>{carregandoPainel ? <span className="relatorios-metric__loading" aria-label="Carregando" /> : indicador.valor}</strong>
                        <small>{indicador.detalhe}</small>
                    </article>
                ))}
            </section>

            <section className="relatorios-export-panel relatorios-panel">
                <div className="relatorios-heading-with-icon"><span className="relatorios-heading-icon is-cyan"><IconeRelatorio nome="download" tamanho={21}/></span>
                    <div><h2>Exportar dados</h2><p>Baixe os relatórios com o período selecionado.</p></div>
                </div>
                <div className="relatorios-export-actions">
                    <label>Conteúdo do arquivo
                        <select value={tipoExportacao} onChange={e => setTipoExportacao(e.target.value as TipoRelatorio)}>
                            {TIPOS.map(tipo => <option key={tipo.valor} value={tipo.valor}>{tipo.label}</option>)}
                        </select>
                    </label>
                    <button className="relatorios-button" type="button" onClick={() => void exportarRelatorio("csv", tipoExportacao)}><IconeRelatorio nome="file" tamanho={16}/> CSV</button>
                    <button className="relatorios-button is-primary" type="button" onClick={() => void exportarRelatorio("pdf", tipoExportacao)}><IconeRelatorio nome="download" tamanho={16}/> Exportar PDF</button>
                </div>
            </section>

            <div className="relatorios-block-heading">
                <div><span className="relatorios-block-kicker">DESEMPENHO</span><h2>Análises visuais</h2><p>Explore a evolução das vendas e o comportamento dos produtos.</p></div>
            </div>
            <section className="relatorios-data-grid relatorios-data-grid--charts" aria-label="Gráficos de desempenho">
                <article className="relatorios-panel relatorios-chart-panel chart--violet">
                    <div className="relatorios-section-heading"><div className="relatorios-heading-with-icon"><span className="relatorios-heading-icon"><IconeRelatorio nome="analytics" tamanho={19}/></span><div><h2>Faturamento por período</h2><p>Receita de vendas finalizadas.</p></div></div><span className="relatorios-chart-tag">RECEITA</span></div>
                    <GraficoBarras dados={faturamentoGrafico} chaveRotulo="periodo" chaveValor="faturamento" moeda carregando={carregandoPainel}/>
                </article>
                <article className="relatorios-panel relatorios-chart-panel chart--cyan">
                    <div className="relatorios-section-heading"><div className="relatorios-heading-with-icon"><span className="relatorios-heading-icon is-cyan"><IconeRelatorio nome="package" tamanho={19}/></span><div><h2>Produtos mais vendidos</h2><p>Ranking por unidades vendidas.</p></div></div><span className="relatorios-chart-tag">PRODUTOS</span></div>
                    <GraficoBarras dados={produtos} chaveRotulo="nome" chaveValor="unidadesVendidas" carregando={carregandoPainel}/>
                </article>
                <article className="relatorios-panel relatorios-chart-panel chart--blue">
                    <div className="relatorios-section-heading"><div className="relatorios-heading-with-icon"><span className="relatorios-heading-icon is-blue"><IconeRelatorio nome="credit" tamanho={19}/></span><div><h2>Formas de pagamento</h2><p>Valores recebidos nas vendas.</p></div></div><span className="relatorios-chart-tag">PAGAMENTOS</span></div>
                    <GraficoBarras dados={pagamentos} chaveRotulo="formaPagamento" chaveValor="valorRecebido" moeda carregando={carregandoPainel}/>
                </article>
                <article className="relatorios-panel relatorios-chart-panel chart--emerald">
                    <div className="relatorios-section-heading"><div className="relatorios-heading-with-icon"><span className="relatorios-heading-icon is-emerald"><IconeRelatorio nome="receipt" tamanho={19}/></span><div><h2>Vendas por período</h2><p>Quantidade de vendas finalizadas.</p></div></div><span className="relatorios-chart-tag">VOLUME</span></div>
                    <GraficoBarras dados={faturamentoGrafico} chaveRotulo="periodo" chaveValor="quantidadeVendas" carregando={carregandoPainel}/>
                </article>
            </section>

            <div className="relatorios-block-heading">
                <div><span className="relatorios-block-kicker">ANÁLISE DETALHADA</span><h2>Dados e operações</h2><p>Informações organizadas para acompanhar vendas, estoque e equipe.</p></div>
            </div>
            <section className="relatorios-data-grid relatorios-data-grid--tables" aria-label="Tabelas analíticas">
                <article className="relatorios-panel relatorios-table-panel"><div className="relatorios-section-heading"><div><h2>Histórico de faturamento</h2><p>Resumo por período selecionado.</p></div><IconeRelatorio nome="analytics" tamanho={18}/></div><Tabela dados={faturamentoGrafico} carregando={carregandoPainel}/></article>
                <article className="relatorios-panel relatorios-table-panel"><div className="relatorios-section-heading"><div><h2>Produtos mais vendidos</h2><p>Produtos com maior saída no período.</p></div><IconeRelatorio nome="package" tamanho={18}/></div><Tabela dados={produtos} carregando={carregandoPainel}/></article>
                <article className="relatorios-panel relatorios-table-panel"><div className="relatorios-section-heading"><div><h2>Produtos menos vendidos</h2><p>Inclui itens sem vendas no período.</p></div><IconeRelatorio nome="layers" tamanho={18}/></div><Tabela dados={produtosMenos} carregando={carregandoPainel}/></article>
                <article className="relatorios-panel relatorios-table-panel"><div className="relatorios-section-heading"><div><h2>Estoque baixo</h2><p>Produtos ativos com até 5 unidades.</p></div><IconeRelatorio nome="warning" tamanho={18}/></div><Tabela dados={estoqueBaixo} carregando={carregandoPainel}/></article>
                <article className="relatorios-panel relatorios-table-panel"><div className="relatorios-section-heading"><div><h2>Vendas por operador</h2><p>Faturamento por operador no período.</p></div><IconeRelatorio nome="users" tamanho={18}/></div><Tabela dados={operadores} carregando={carregandoPainel}/></article>
            </section>

            <div className="relatorios-block-heading">
                <div><span className="relatorios-block-kicker">PERSONALIZAÇÃO</span><h2>Central de relatórios</h2><p>Crie configurações, recupere consultas salvas e exporte resultados.</p></div>
            </div>
            <section className="relatorios-panel relatorios-editor-panel">
                <div className="relatorios-section-heading"><div className="relatorios-heading-with-icon"><span className="relatorios-heading-icon"><IconeRelatorio nome={editandoId === null ? "save" : "edit"} tamanho={20}/></span><div><h2>{editandoId === null ? "Criar relatório personalizado" : "Editar relatório salvo"}</h2><p>Defina os filtros e salve para reutilizar sempre que precisar.</p></div></div><span className="relatorios-section-chip">{editandoId === null ? "NOVO" : "EDIÇÃO"}</span></div>
                <form className="relatorios-save-form" onSubmit={salvarRelatorio}>
                    <label className="relatorios-field-title">Título do relatório<input required minLength={3} maxLength={120} placeholder="Ex.: Vendas do mês" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}/></label>
                    <label>Tipo<select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as TipoRelatorio })}>{TIPOS.map(tipo => <option key={tipo.valor} value={tipo.valor}>{tipo.label}</option>)}</select></label>
                    <label>Data inicial<input type="date" value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })}/></label>
                    <label>Data final<input type="date" value={form.dataFim} onChange={e => setForm({ ...form, dataFim: e.target.value })}/></label>
                    <label>Estoque mínimo<input type="number" min="0" max="1000000" value={form.estoqueMinimo} onChange={e => setForm({ ...form, estoqueMinimo: e.target.value })}/></label>
                    <label className="relatorios-description">Descrição (opcional)<textarea maxLength={500} rows={2} placeholder="Adicione uma descrição para identificar este relatório." value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}/></label>
                    <div className="relatorios-form-actions">
                        <button className="relatorios-button is-primary" type="submit"><IconeRelatorio nome="save" tamanho={17}/>{editandoId === null ? "Salvar relatório" : "Salvar alterações"}</button>
                        {editandoId !== null && <button className="relatorios-button" type="button" onClick={limparFormulario}>Cancelar edição</button>}
                    </div>
                </form>
            </section>

            <section className="relatorios-panel relatorios-saved-panel">
                <div className="relatorios-section-heading"><div className="relatorios-heading-with-icon"><span className="relatorios-heading-icon is-cyan"><IconeRelatorio nome="file" tamanho={20}/></span><div><h2>Relatórios salvos</h2><p>Gere, edite ou exclua configurações existentes.</p></div></div><span className="relatorios-count">{salvos.length} {salvos.length === 1 ? "relatório" : "relatórios"}</span></div>
                {carregandoSalvos ? <p className="relatorios-empty"><span className="relatorios-loading-mark"/> Carregando relatórios salvos…</p> : salvos.length === 0 ? <div className="relatorios-empty relatorios-empty--saved"><IconeRelatorio nome="file" tamanho={27}/><strong>Nenhum relatório salvo</strong><span>Crie seu primeiro relatório personalizado no formulário acima.</span></div> : (
                    <div className="relatorios-saved-list">
                        {salvos.map(relatorio => (
                            <article className="relatorios-saved-item" key={relatorio.id}>
                                <span className="relatorios-saved-icon"><IconeRelatorio nome="file" tamanho={20}/></span>
                                <div className="relatorios-saved-copy"><strong>{relatorio.titulo}</strong>
                                    <span className="relatorios-saved-meta"><span className="relatorios-saved-type">{TIPOS.find(tipo => tipo.valor === relatorio.tipo)?.label ?? relatorio.tipo}</span><span><IconeRelatorio nome="calendar" tamanho={13}/>{relatorio.dataInicio ?? "sem início"} até {relatorio.dataFim ?? "sem fim"}</span></span>
                                    {relatorio.descricao && <small>{relatorio.descricao}</small>}
                                </div>
                                <div className="relatorios-actions">
                                    <button className="relatorios-button is-soft-primary" type="button" onClick={() => void abrirRelatorio(relatorio)}><IconeRelatorio nome="play" tamanho={15}/> Gerar</button>
                                    <button className="relatorios-button" type="button" onClick={() => editarRelatorio(relatorio)}><IconeRelatorio nome="edit" tamanho={15}/> Editar</button>
                                    <button className="relatorios-button is-danger" type="button" onClick={() => solicitarExclusao(relatorio)}><IconeRelatorio nome="trash" tamanho={15}/> Excluir</button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {relatorioAberto && (
                <section className="relatorios-panel relatorios-result-panel">
                    <div className="relatorios-section-heading relatorios-result-heading"><div className="relatorios-heading-with-icon"><span className="relatorios-heading-icon is-emerald"><IconeRelatorio nome="check" tamanho={20}/></span><div><h2>{relatorioAberto.titulo}</h2><p>Resultado gerado a partir dos filtros salvos.</p></div></div>
                        <div className="relatorios-actions"><button className="relatorios-button" type="button" onClick={() => void exportarRelatorio("csv", relatorioAberto.tipo, { dataInicio: relatorioAberto.dataInicio ?? "", dataFim: relatorioAberto.dataFim ?? "" }, relatorioAberto.estoqueMinimo)}><IconeRelatorio nome="file" tamanho={16}/> CSV</button>
                        <button className="relatorios-button is-primary" type="button" onClick={() => void exportarRelatorio("pdf", relatorioAberto.tipo, { dataInicio: relatorioAberto.dataInicio ?? "", dataFim: relatorioAberto.dataFim ?? "" }, relatorioAberto.estoqueMinimo)}><IconeRelatorio nome="download" tamanho={16}/> Exportar PDF</button></div>
                    </div>
                    {linhasRelatorio.length === 0 ? <p className="relatorios-empty">Nenhum dado encontrado para os filtros selecionados.</p> : (
                        <div className="relatorios-table-wrap"><table className="relatorios-table"><thead><tr>{colunas.map(chave => <th key={chave}>{rotulo(chave)}</th>)}</tr></thead>
                            <tbody>{linhasRelatorio.map((linha, indice) => <tr key={indice}>{colunas.map(chave => <td key={chave}>{formatarValor(chave, linha[chave])}</td>)}</tr>)}</tbody></table></div>
                    )}
                </section>
            )}

            {relatorioParaExcluir && createPortal(
                <div className="relatorios-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !excluindo) setRelatorioParaExcluir(null); }}>
                    <div className="relatorios-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="relatorios-excluir-titulo" aria-describedby="relatorios-excluir-descricao">
                        <button type="button" className="relatorios-modal-close" aria-label="Fechar confirmação" disabled={excluindo} onClick={() => setRelatorioParaExcluir(null)}><IconeRelatorio nome="close" tamanho={18}/></button>
                        <div className="relatorios-modal-danger-icon"><IconeRelatorio nome="trash" tamanho={25}/></div>
                        <h2 id="relatorios-excluir-titulo">Excluir relatório?</h2>
                        <p id="relatorios-excluir-descricao">Você está prestes a excluir a configuração abaixo. Esta ação não pode ser desfeita.</p>
                        <div className="relatorios-modal-target"><IconeRelatorio nome="file" tamanho={20}/><span>{relatorioParaExcluir.titulo}</span></div>
                        {erroExclusao && <div className="relatorios-modal-error" role="alert">{erroExclusao}</div>}
                        <div className="relatorios-modal-actions"><button type="button" className="relatorios-button" autoFocus disabled={excluindo} onClick={() => setRelatorioParaExcluir(null)}>Cancelar</button>
                            <button type="button" className="relatorios-button is-danger-solid" disabled={excluindo} onClick={() => void confirmarExclusao()}><IconeRelatorio nome="trash" tamanho={16}/>{excluindo ? "Excluindo…" : "Sim, excluir"}</button></div>
                    </div>
                </div>, document.body,
            )}
        </main>
    );
}

// Renderiza uma tabela analítica com estados de carregamento e sem resultados.
function Tabela({ dados, carregando }: { dados: LinhaRelatorio[]; carregando: boolean }) {
    if (carregando) return <p className="relatorios-empty"><span className="relatorios-loading-mark"/> Carregando dados…</p>;
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
