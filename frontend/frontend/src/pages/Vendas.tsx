import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import { ComprovanteModal } from "../components/ComprovanteModal";
import type {
    VendaRegistro,
    VendasListResponse,
    VendaDetalhada,
    VendaDetalhadaResponse,
    FormasPagamentoResponse,
    FormaPagamentoItem
} from "../types/venda";
import "./Vendas.css";

export default function Vendas() {
    const [vendas, setVendas] = useState<VendaRegistro[]>([]);
    const [formasPagamento, setFormasPagamento] = useState<FormaPagamentoItem[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    // Filtros
    const [busca, setBusca] = useState("");
    const [filtroStatus, setFiltroStatus] = useState("todos");
    const [filtroForma, setFiltroForma] = useState("todas");
    const [filtroDataInicio, setFiltroDataInicio] = useState("");
    const [filtroDataFim, setFiltroDataFim] = useState("");
    const [ordemCampo, setOrdemCampo] = useState<"data" | "valor">("data");
    const [ordemDirecao, setOrdemDirecao] = useState<"asc" | "desc">("desc");

    // Paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const ITENS_POR_PAGINA = 10;

    // Modais
    const [vendaDetalhada, setVendaDetalhada] = useState<VendaDetalhada | null>(null);
    const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
    const [vendaComprovante, setVendaComprovante] = useState<VendaDetalhada | null>(null);
    const [modalComprovanteAberto, setModalComprovanteAberto] = useState(false);
    const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

    useEffect(() => {
        void carregarDadosIniciais();
    }, []);

    async function carregarDadosIniciais() {
        try {
            setCarregando(true);
            setErro("");

            const [vendasRes, formasRes] = await Promise.all([
                apiFetch<VendasListResponse>("/vendas"),
                apiFetch<FormasPagamentoResponse>("/vendas/formas-pagamento").catch(() => ({ dados: [] }))
            ]);

            setVendas(vendasRes.dados || []);
            setFormasPagamento(formasRes.dados || []);
        } catch (err) {
            setErro(err instanceof Error ? err.message : "Não foi possível carregar as vendas.");
        } finally {
            setCarregando(false);
        }
    }

    const formatarMoeda = (valor: number) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(valor);

    const formatarDataHora = (dataStr: string) => {
        try {
            const d = new Date(dataStr);
            return new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "short",
                timeStyle: "short"
            }).format(d);
        } catch {
            return dataStr;
        }
    };

    // Filtros e ordenação no cliente
    const vendasFiltradas = useMemo(() => {
        return vendas
            .filter((venda) => {
                // Filtro de busca por ID ou cliente
                if (busca.trim()) {
                    const termo = busca.trim().toLowerCase();
                    const idStr = String(venda.id);
                    const clienteStr = (venda.clienteNome || "consumidor não identificado").toLowerCase();
                    const cpfStr = (venda.clienteCpf || "").toLowerCase();
                    if (!idStr.includes(termo) && !clienteStr.includes(termo) && !cpfStr.includes(termo)) {
                        return false;
                    }
                }

                // Filtro por status
                if (filtroStatus !== "todos" && venda.status !== filtroStatus) {
                    return false;
                }

                // Filtro por forma de pagamento
                if (filtroForma !== "todas") {
                    const fp = (venda.formasPagamento || "").toLowerCase();
                    if (!fp.includes(filtroForma.toLowerCase())) {
                        return false;
                    }
                }

                // Filtro por data
                if (filtroDataInicio) {
                    const dtVenda = new Date(venda.dataVenda).toISOString().slice(0, 10);
                    if (dtVenda < filtroDataInicio) return false;
                }
                if (filtroDataFim) {
                    const dtVenda = new Date(venda.dataVenda).toISOString().slice(0, 10);
                    if (dtVenda > filtroDataFim) return false;
                }

                return true;
            })
            .sort((a, b) => {
                if (ordemCampo === "data") {
                    const tA = new Date(a.dataVenda).getTime();
                    const tB = new Date(b.dataVenda).getTime();
                    return ordemDirecao === "asc" ? tA - tB : tB - tA;
                } else {
                    return ordemDirecao === "asc" ? a.total - b.total : b.total - a.total;
                }
            });
    }, [vendas, busca, filtroStatus, filtroForma, filtroDataInicio, filtroDataFim, ordemCampo, ordemDirecao]);

    // Indicadores do topo (calculados a partir do resultado filtrado)
    const metricas = useMemo(() => {
        const vendasFinalizadas = vendasFiltradas.filter((v) => v.status === "finalizada");
        const totalVendas = vendasFiltradas.length;
        const faturamento = vendasFinalizadas.reduce((s, v) => s + v.total, 0);
        const ticketMedio = vendasFinalizadas.length > 0 ? faturamento / vendasFinalizadas.length : 0;
        const totalProdutos = vendasFinalizadas.reduce((s, v) => s + (v.totalUnidades ?? 0), 0);

        return {
            totalVendas,
            faturamento,
            ticketMedio,
            totalProdutos
        };
    }, [vendasFiltradas]);

    // Paginação
    const totalPaginas = Math.max(1, Math.ceil(vendasFiltradas.length / ITENS_POR_PAGINA));
    const vendasPaginadas = useMemo(() => {
        const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
        return vendasFiltradas.slice(inicio, inicio + ITENS_POR_PAGINA);
    }, [vendasFiltradas, paginaAtual]);

    function alternarOrdenacao(campo: "data" | "valor") {
        if (ordemCampo === campo) {
            setOrdemDirecao((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setOrdemCampo(campo);
            setOrdemDirecao("desc");
        }
        setPaginaAtual(1);
    }

    async function abrirDetalhes(id: number) {
        try {
            setCarregandoDetalhe(true);
            const res = await apiFetch<VendaDetalhadaResponse>(`/vendas/${id}`);
            setVendaDetalhada(res.dados);
            setModalDetalhesAberto(true);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Erro ao carregar detalhes da venda.");
        } finally {
            setCarregandoDetalhe(false);
        }
    }

    async function abrirComprovante(id: number) {
        try {
            setCarregandoDetalhe(true);
            const res = await apiFetch<VendaDetalhadaResponse>(`/vendas/${id}`);
            setVendaComprovante(res.dados);
            setModalComprovanteAberto(true);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Erro ao carregar comprovante.");
        } finally {
            setCarregandoDetalhe(false);
        }
    }

    return (
        <div className="vendas-page">
            {/* Cabeçalho */}
            <div className="vendas-hero">
                <div>
                    <h1>Histórico de Vendas</h1>
                    <p>
                        Acompanhe em tempo real todas as vendas registradas pelo PDV, visualize detalhes, consulte formas de pagamento e emita comprovantes.
                    </p>
                </div>
            </div>

            {/* Mensagem de Erro */}
            {erro && (
                <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)", marginBottom: "20px" }}>
                    {erro}
                </div>
            )}

            {/* Indicadores Resumidos */}
            <div className="vendas-metrics-grid">
                <div className="vendas-metric-card">
                    <div className="vendas-metric-icon">📦</div>
                    <div className="vendas-metric-info">
                        <span className="vendas-metric-label">Vendas Realizadas</span>
                        <strong className="vendas-metric-value">{metricas.totalVendas}</strong>
                    </div>
                </div>

                <div className="vendas-metric-card">
                    <div className="vendas-metric-icon">💰</div>
                    <div className="vendas-metric-info">
                        <span className="vendas-metric-label">Faturamento Total</span>
                        <strong className="vendas-metric-value">{formatarMoeda(metricas.faturamento)}</strong>
                    </div>
                </div>

                <div className="vendas-metric-card">
                    <div className="vendas-metric-icon">🎯</div>
                    <div className="vendas-metric-info">
                        <span className="vendas-metric-label">Ticket Médio</span>
                        <strong className="vendas-metric-value">{formatarMoeda(metricas.ticketMedio)}</strong>
                    </div>
                </div>

                <div className="vendas-metric-card">
                    <div className="vendas-metric-icon">🏷️</div>
                    <div className="vendas-metric-info">
                        <span className="vendas-metric-label">Produtos Vendidos</span>
                        <strong className="vendas-metric-value">{metricas.totalProdutos} un.</strong>
                    </div>
                </div>
            </div>

            {/* Filtros e Busca */}
            <div className="vendas-filters-panel">
                <div className="vendas-filters-grid">
                    <div className="vendas-filter-item">
                        <label>Buscar por Venda ou Cliente</label>
                        <input
                            type="text"
                            placeholder="Ex: #12, Maria ou CPF..."
                            value={busca}
                            onChange={(e) => {
                                setBusca(e.target.value);
                                setPaginaAtual(1);
                            }}
                        />
                    </div>

                    <div className="vendas-filter-item">
                        <label>Status</label>
                        <select
                            value={filtroStatus}
                            onChange={(e) => {
                                setFiltroStatus(e.target.value);
                                setPaginaAtual(1);
                            }}
                        >
                            <option value="todos">Todos os status</option>
                            <option value="finalizada">Finalizada</option>
                            <option value="cancelada">Cancelada</option>
                        </select>
                    </div>

                    <div className="vendas-filter-item">
                        <label>Forma de Pagamento</label>
                        <select
                            value={filtroForma}
                            onChange={(e) => {
                                setFiltroForma(e.target.value);
                                setPaginaAtual(1);
                            }}
                        >
                            <option value="todas">Todas as formas</option>
                            {formasPagamento.map((fp) => (
                                <option key={fp.id} value={fp.nome}>
                                    {fp.nome}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="vendas-filter-item">
                        <label>Data Início</label>
                        <input
                            type="date"
                            value={filtroDataInicio}
                            onChange={(e) => {
                                setFiltroDataInicio(e.target.value);
                                setPaginaAtual(1);
                            }}
                        />
                    </div>

                    <div className="vendas-filter-item">
                        <label>Data Fim</label>
                        <input
                            type="date"
                            value={filtroDataFim}
                            onChange={(e) => {
                                setFiltroDataFim(e.target.value);
                                setPaginaAtual(1);
                            }}
                        />
                    </div>

                </div>
            </div>

            {/* Tabela de Vendas */}
            <div className="vendas-table-container">
                <table className="vendas-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th onClick={() => alternarOrdenacao("data")}>
                                Data e Hora {ordemCampo === "data" ? (ordemDirecao === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th>Cliente</th>
                            <th>Operador</th>
                            <th>Qtd (Un.)</th>
                            <th>Itens</th>
                            <th>Subtotal</th>
                            <th>Desconto</th>
                            <th onClick={() => alternarOrdenacao("valor")}>
                                Total {ordemCampo === "valor" ? (ordemDirecao === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th>Pagamento</th>
                            <th>Status</th>
                            <th style={{ textAlign: "right" }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {carregando ? (
                            <tr>
                                <td colSpan={12} style={{ textAlign: "center", padding: "40px", color: "var(--vendas-muted)" }}>
                                    Carregando vendas do sistema...
                                </td>
                            </tr>
                        ) : vendasPaginadas.length === 0 ? (
                            <tr>
                                <td colSpan={12} style={{ textAlign: "center", padding: "40px", color: "var(--vendas-muted)" }}>
                                    Nenhuma venda encontrada com os critérios informados.
                                </td>
                            </tr>
                        ) : (
                            vendasPaginadas.map((v) => (
                                <tr key={v.id}>
                                    <td>
                                        <span className="vendas-id-pill">#{String(v.id).padStart(5, "0")}</span>
                                    </td>
                                    <td>{formatarDataHora(v.dataVenda)}</td>
                                    <td>
                                        <strong>{v.clienteNome || "Consumidor não identificado"}</strong>
                                        {v.clienteCpf && <div style={{ fontSize: "11px", color: "var(--vendas-muted)" }}>{v.clienteCpf}</div>}
                                    </td>
                                    <td>{v.usuarioNome || `ID ${v.usuarioId}`}</td>
                                    <td>{v.totalUnidades ?? "-"}</td>
                                    <td>{v.totalItens ?? "-"}</td>
                                    <td>{formatarMoeda(v.subtotal)}</td>
                                    <td style={{ color: v.desconto > 0 ? "var(--vendas-danger)" : "inherit" }}>
                                        {v.desconto > 0 ? `- ${formatarMoeda(v.desconto)}` : "R$ 0,00"}
                                    </td>
                                    <td>
                                        <strong>{formatarMoeda(v.total)}</strong>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: "0.85rem" }}>{v.formasPagamento || "Dinheiro"}</span>
                                    </td>
                                    <td>
                                        <span className={`vendas-status-badge vendas-status-${v.status}`}>
                                            {v.status === "finalizada" ? "Finalizada" : "Cancelada"}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                        <div style={{ display: "inline-flex", gap: "6px" }}>
                                            <button
                                                type="button"
                                                className="vendas-action-btn"
                                                title="Visualizar detalhes"
                                                onClick={() => abrirDetalhes(v.id)}
                                                disabled={carregandoDetalhe}
                                            >
                                                👁️ Detalhes
                                            </button>
                                            <button
                                                type="button"
                                                className="vendas-action-btn"
                                                title="Emitir ou imprimir comprovante"
                                                onClick={() => abrirComprovante(v.id)}
                                                disabled={carregandoDetalhe}
                                            >
                                                📄 Comprovante
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Paginação */}
                {totalPaginas > 1 && (
                    <div className="vendas-pagination">
                        <span>
                            Exibindo página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong> (total de {vendasFiltradas.length} vendas)
                        </span>
                        <div className="vendas-pagination-btns">
                            <button
                                type="button"
                                className="vendas-page-btn"
                                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                                disabled={paginaAtual === 1}
                            >
                                Anterior
                            </button>
                            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    className={`vendas-page-btn ${paginaAtual === num ? "is-active" : ""}`}
                                    onClick={() => setPaginaAtual(num)}
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                type="button"
                                className="vendas-page-btn"
                                onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                                disabled={paginaAtual === totalPaginas}
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Detalhes da Venda */}
            {modalDetalhesAberto && vendaDetalhada && (
                <div className="vendas-modal-backdrop" onClick={() => setModalDetalhesAberto(false)}>
                    <div className="vendas-modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="vendas-modal-header">
                            <h3>Detalhes da Venda #{String(vendaDetalhada.id).padStart(6, "0")}</h3>
                            <button
                                type="button"
                                className="vendas-action-btn"
                                onClick={() => setModalDetalhesAberto(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="vendas-modal-body">
                            <div className="vendas-detail-grid">
                                <div className="vendas-detail-row">
                                    <span>Data e Hora</span>
                                    <strong>{formatarDataHora(vendaDetalhada.dataVenda)}</strong>
                                </div>
                                <div className="vendas-detail-row">
                                    <span>Status</span>
                                    <strong>
                                        <span className={`vendas-status-badge vendas-status-${vendaDetalhada.status}`}>
                                            {vendaDetalhada.status.toUpperCase()}
                                        </span>
                                    </strong>
                                </div>
                                <div className="vendas-detail-row">
                                    <span>Cliente</span>
                                    <strong>{vendaDetalhada.clienteNome || "Consumidor não identificado"}</strong>
                                    {vendaDetalhada.clienteCpf && <small style={{ color: "var(--vendas-muted)" }}>CPF: {vendaDetalhada.clienteCpf}</small>}
                                </div>
                                <div className="vendas-detail-row">
                                    <span>Operador Responsável</span>
                                    <strong>{vendaDetalhada.usuarioNome || `Usuário #${vendaDetalhada.usuarioId}`}</strong>
                                </div>
                            </div>

                            <h4 style={{ margin: "16px 0 10px", fontSize: "0.95rem" }}>Produtos Comprados</h4>
                            <table className="vendas-items-table">
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Produto</th>
                                        <th className="text-right">Qtd</th>
                                        <th className="text-right">Preço Unit.</th>
                                        <th className="text-right">Total Item</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vendaDetalhada.itens.map((item) => (
                                        <tr key={item.id}>
                                            <td style={{ fontFamily: "monospace" }}>{item.produtoCodigo}</td>
                                            <td>{item.produtoNome}</td>
                                            <td className="text-right">{item.quantidade}</td>
                                            <td className="text-right">{formatarMoeda(item.precoUnitario)}</td>
                                            <td className="text-right">
                                                <strong>{formatarMoeda(item.subtotalItem ?? item.quantidade * item.precoUnitario)}</strong>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                                <div style={{ width: "240px", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>Subtotal:</span>
                                        <span>{formatarMoeda(vendaDetalhada.subtotal)}</span>
                                    </div>
                                    {vendaDetalhada.desconto > 0 && (
                                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--vendas-danger)" }}>
                                            <span>Desconto:</span>
                                            <span>- {formatarMoeda(vendaDetalhada.desconto)}</span>
                                        </div>
                                    )}
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: 800, borderTop: "1px solid var(--vendas-border)", paddingTop: "8px" }}>
                                        <span>Total:</span>
                                        <span>{formatarMoeda(vendaDetalhada.total)}</span>
                                    </div>
                                </div>
                            </div>

                            <h4 style={{ margin: "20px 0 10px", fontSize: "0.95rem" }}>Pagamentos Registrados</h4>
                            <div style={{ background: "var(--vendas-panel-subtle)", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--vendas-border)" }}>
                                {vendaDetalhada.pagamentos && vendaDetalhada.pagamentos.length > 0 ? (
                                    vendaDetalhada.pagamentos.map((p) => (
                                        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                                            <span>{p.formaPagamentoNome}:</span>
                                            <strong>{formatarMoeda(p.valor)}</strong>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>Forma utilizada:</span>
                                        <strong>{vendaDetalhada.formasPagamento || "Dinheiro"}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="vendas-modal-footer">
                            <button
                                type="button"
                                className="vendas-action-btn"
                                onClick={() => {
                                    setModalDetalhesAberto(false);
                                    setVendaComprovante(vendaDetalhada);
                                    setModalComprovanteAberto(true);
                                }}
                            >
                                📄 Emitir Comprovante
                            </button>
                            <button
                                type="button"
                                className="vendas-action-btn"
                                style={{ background: "var(--vendas-primary)", color: "#fff", borderColor: "var(--vendas-primary)" }}
                                onClick={() => setModalDetalhesAberto(false)}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Comprovante de Venda */}
            <ComprovanteModal
                venda={vendaComprovante}
                isOpen={modalComprovanteAberto}
                onClose={() => setModalComprovanteAberto(false)}
                isPosVenda={false}
            />
        </div>
    );
}

