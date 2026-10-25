import {
    useEffect,
    useMemo,
    useState,
    type FormEvent
} from "react";

import { apiFetch } from "../services/api";
import { ComprovanteModal } from "../components/ComprovanteModal";

import type { Cliente, ClientesResponse } from "../types/cliente";
import type { Produto, ProdutosResponse } from "../types/produtos";
import type {
    ItemCarrinho,
    CriarVendaResponse,
    NovaVendaRequest,
    VendaDetalhada,
    VendaDetalhadaResponse
} from "../types/venda";
import type { UsuarioLogado } from "../types/usuario";

import "./PDV.css";

// ======================================================
// FORMATAÇÃO
// ======================================================

const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(valor);

// ======================================================
// FORMAS DE PAGAMENTO
// ======================================================

type FormaPagamento = "dinheiro" | "pix" | "credito" | "debito" | "boleto";

const FORMAS_PAGAMENTO: Array<{
    id: FormaPagamento;
    titulo: string;
    descricao: string;
    icone: string;
}> = [
    { id: "dinheiro", titulo: "Dinheiro", descricao: "Com troco", icone: "💵" },
    { id: "pix", titulo: "Pix", descricao: "Instantâneo", icone: "⚡" },
    { id: "credito", titulo: "Crédito", descricao: "À vista ou parcelado", icone: "💳" },
    { id: "debito", titulo: "Débito", descricao: "À vista", icone: "🏧" },
    { id: "boleto", titulo: "Boleto", descricao: "3 dias úteis", icone: "🧾" }
];

const NOME_PAGAMENTO: Record<FormaPagamento, string> = {
    dinheiro: "Dinheiro",
    pix: "Pix",
    credito: "Cartão de Crédito",
    debito: "Cartão de Débito",
    boleto: "Boleto Bancário"
};

// ======================================================
// IMAGENS DE PRODUTOS
// ======================================================

const IMAGENS_ROUPAS: Array<[string[], string]> = [
    [["moletom", "hoodie", "casaco", "blusa de frio"], "/produtos/moletom.jpg"],
    [["jaqueta", "jaco"], "/produtos/jaqueta.jpg"],
    [["vestido"], "/produtos/vestido.jpg"],
    [["saia"], "/produtos/saia.jpg"],
    [["bermuda", "short"], "/produtos/bermuda.jpg"],
    [["calca", "jeans"], "/produtos/calca.jpg"],
    [["camisa", "social"], "/produtos/camisa.jpg"],
    [["camiseta", "blusa", "regata", "polo"], "/produtos/camiseta.jpg"]
];

function imagemPorNome(nome: string) {
    const texto = nome
        .toLocaleLowerCase("pt-BR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    for (const [palavras, url] of IMAGENS_ROUPAS) {
        if (palavras.some((p) => texto.includes(p))) return url;
    }
    return "/produtos/camiseta.jpg";
}

// ======================================================
// PÁGINA - Ponto de Venda (PDV)
// ======================================================

function PDV() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [clienteId, setClienteId] = useState("");
    const [itens, setItens] = useState<ItemCarrinho[]>([]);
    const [desconto, setDesconto] = useState("");

    // Busca rápida de produtos
    const [buscaProduto, setBuscaProduto] = useState("");
    const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
    const [quantidadeInput, setQuantidadeInput] = useState(1);

    const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("dinheiro");
    const [parcelas, setParcelas] = useState(1);
    const [valorRecebido, setValorRecebido] = useState("");

    const [carregando, setCarregando] = useState(true);
    const [finalizando, setFinalizando] = useState(false);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");

    // Modal de Comprovante de Venda
    const [vendaFinalizada, setVendaFinalizada] = useState<VendaDetalhada | null>(null);
    const [modalComprovanteAberto, setModalComprovanteAberto] = useState(false);

    useEffect(() => {
        void carregarDados();
    }, []);

    async function carregarDados() {
        try {
            setCarregando(true);
            setErro("");
            const [clientesResponse, produtosResponse] = await Promise.all([
                apiFetch<ClientesResponse>("/clientes").catch(() => ({ dados: [] })),
                apiFetch<ProdutosResponse>("/produtos").catch(() => ({ dados: [] }))
            ]);
            setClientes(clientesResponse.dados || []);
            setProdutos((produtosResponse.dados || []).filter((p) => p.ativo));
        } catch (error) {
            setErro(
                error instanceof Error
                    ? error.message
                    : "Não foi possível carregar os dados do PDV."
            );
        } finally {
            setCarregando(false);
        }
    }

    // Produtos filtrados pela busca rápida
    const produtosFiltrados = useMemo(() => {
        if (!buscaProduto.trim()) return produtos;
        const termo = buscaProduto.trim().toLowerCase();
        return produtos.filter(
            (p) =>
                p.nome.toLowerCase().includes(termo) ||
                (p.codigo && p.codigo.toLowerCase().includes(termo))
        );
    }, [produtos, buscaProduto]);

    // ==================================================
    // CARRINHO
    // ==================================================

    function adicionarProdutoPorId(prodId: number, qtd: number) {
        if (carregando || finalizando) return;

        setErro("");
        setSucesso("");

        if (!Number.isInteger(prodId) || prodId <= 0) {
            setErro("Selecione um produto.");
            return;
        }
        if (!Number.isInteger(qtd) || qtd <= 0) {
            setErro("Informe uma quantidade válida maior que zero.");
            return;
        }

        const produto = produtos.find((p) => p.id === prodId);
        if (!produto) {
            setErro("Produto não encontrado no estoque.");
            return;
        }
        if (produto.estoque <= 0) {
            setErro(`O produto "${produto.nome}" está esgotado no momento.`);
            return;
        }

        const itemExistente = itens.find((it) => it.produtoId === prodId);
        const novaQtd = (itemExistente ? itemExistente.quantidade : 0) + qtd;

        if (novaQtd > produto.estoque) {
            setErro(
                `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque}, no carrinho: ${itemExistente ? itemExistente.quantidade : 0}.`
            );
            return;
        }

        if (itemExistente) {
            setItens((atuais) =>
                atuais.map((it) =>
                    it.produtoId === prodId ? { ...it, quantidade: novaQtd } : it
                )
            );
        } else {
            setItens((atuais) => [
                ...atuais,
                {
                    produtoId: produto.id,
                    codigo: produto.codigo,
                    nome: produto.nome,
                    quantidade: qtd,
                    precoUnitario: Number(produto.preco),
                    estoqueDisponivel: produto.estoque
                }
            ]);
        }

        // Limpar campos de entrada
        setProdutoSelecionadoId("");
        setQuantidadeInput(1);
    }

    function handleAdicionarProdutoForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const prodId = Number(produtoSelecionadoId);
        adicionarProdutoPorId(prodId, Number(quantidadeInput));
    }

    function alterarQuantidade(produtoId: number, delta: number) {
        if (finalizando) return;
        setItens((atuais) =>
            atuais.map((item) => {
                if (item.produtoId !== produtoId) return item;
                const nova = Math.min(
                    Math.max(item.quantidade + delta, 1),
                    item.estoqueDisponivel
                );
                return { ...item, quantidade: nova };
            })
        );
    }

    function handleRemoverProduto(produtoId: number) {
        if (finalizando) return;
        setItens((atuais) => atuais.filter((item) => item.produtoId !== produtoId));
        setErro("");
        setSucesso("");
    }

    // ==================================================
    // CÁLCULOS
    // ==================================================

    const subtotal = Number(
        itens.reduce((t, item) => t + item.precoUnitario * item.quantidade, 0).toFixed(2)
    );
    const descontoNumero = desconto === "" ? 0 : Number(desconto);
    const descontoValido =
        Number.isFinite(descontoNumero) && descontoNumero >= 0 ? descontoNumero : 0;
    const total = Math.max(Number((subtotal - descontoValido).toFixed(2)), 0);
    const totalUnidades = itens.reduce((t, item) => t + item.quantidade, 0);

    const valorParcela = parcelas > 0 ? total / parcelas : total;
    const recebidoNumero = valorRecebido === "" ? 0 : Number(valorRecebido);
    const troco =
        formaPagamento === "dinheiro" && recebidoNumero > total
            ? Number((recebidoNumero - total).toFixed(2))
            : 0;

    const opcoesParcelas = useMemo(
        () => Array.from({ length: 12 }, (_, i) => i + 1),
        []
    );

    function selecionarPagamento(forma: FormaPagamento) {
        setFormaPagamento(forma);
        if (forma !== "credito") setParcelas(1);
        if (forma !== "dinheiro") setValorRecebido("");
    }

    const clienteAtual = clientes.find((c) => String(c.id) === clienteId);

    // ==================================================
    // VENDA - Finalizar de forma atômica
    // ==================================================

    async function handleFinalizarVenda() {
        if (carregando || finalizando) return;

        setErro("");
        setSucesso("");

        // Validações
        if (itens.length === 0) {
            setErro("Adicione pelo menos um produto ao carrinho para finalizar a venda.");
            return;
        }

        if (!Number.isFinite(descontoNumero) || descontoNumero < 0) {
            setErro("Informe um valor de desconto válido.");
            return;
        }

        if (descontoNumero > subtotal) {
            setErro("O desconto não pode ser superior ao subtotal da compra.");
            return;
        }

        if (formaPagamento === "dinheiro" && recebidoNumero > 0 && recebidoNumero < total) {
            setErro(`O valor recebido em dinheiro (R$ ${recebidoNumero.toFixed(2)}) é menor que o total da venda (R$ ${total.toFixed(2)}).`);
            return;
        }

        // Usuário / Operador
        const usuarioSalvo = sessionStorage.getItem("usuario") || localStorage.getItem("usuario");
        let usuario: UsuarioLogado | null = null;
        if (usuarioSalvo) {
            try {
                usuario = JSON.parse(usuarioSalvo) as UsuarioLogado;
            } catch {
                usuario = null;
            }
        }

        // Cliente selecionado ou Consumidor não identificado (null)
        const idClienteFinal = clienteId !== "" && Number(clienteId) > 0 ? Number(clienteId) : null;

        const payload: NovaVendaRequest = {
            clienteId: idClienteFinal,
            desconto: Number(descontoValido.toFixed(2)),
            itens: itens.map((item) => ({
                produtoId: item.produtoId,
                quantidade: item.quantidade
            })),
            formaPagamento,
            valorRecebido: formaPagamento === "dinheiro" ? (recebidoNumero > 0 ? recebidoNumero : total) : total
        };

        try {
            setFinalizando(true);

            // POST /vendas
            const response = await apiFetch<CriarVendaResponse>("/vendas", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            // Buscar os detalhes completos da venda recém-registrada
            let detalhada: VendaDetalhada;
            try {
                const resDetalhe = await apiFetch<VendaDetalhadaResponse>(`/vendas/${response.id}`);
                detalhada = resDetalhe.dados;
            } catch {
                // Monta estrutura de fallback caso a rota de detalhe falhe
                detalhada = {
                    id: response.id,
                    clienteId: idClienteFinal,
                    clienteNome: clienteAtual ? clienteAtual.nome : null,
                    clienteCpf: clienteAtual ? clienteAtual.cpf || null : null,
                    usuarioId: usuario?.id ?? 1,
                    usuarioNome: usuario?.nome || usuario?.login || "Operador Caixa",
                    dataVenda: new Date().toISOString(),
                    subtotal: response.subtotal ?? subtotal,
                    desconto: response.desconto ?? descontoValido,
                    total: response.total ?? total,
                    status: "finalizada",
                    formasPagamento: NOME_PAGAMENTO[formaPagamento],
                    itens: itens.map((it, idx) => ({
                        id: idx + 1,
                        vendaId: response.id,
                        produtoId: it.produtoId,
                        produtoCodigo: it.codigo || `PROD-${it.produtoId}`,
                        produtoNome: it.nome,
                        quantidade: it.quantidade,
                        precoUnitario: it.precoUnitario,
                        subtotalItem: Number((it.quantidade * it.precoUnitario).toFixed(2))
                    })),
                    pagamentos: [
                        {
                            id: 1,
                            vendaId: response.id,
                            formaPagamentoId: 1,
                            formaPagamentoNome: NOME_PAGAMENTO[formaPagamento],
                            valor: response.total ?? total
                        }
                    ]
                };
            }

            // Exibir comprovante e sucesso
            setVendaFinalizada(detalhada);
            setModalComprovanteAberto(true);

            // Limpar formulário de venda
            setItens([]);
            setClienteId("");
            setDesconto("");
            setParcelas(1);
            setValorRecebido("");
            setSucesso(`Venda nº ${response.id} concluída com sucesso!`);

        } catch (error) {
            setErro(
                error instanceof Error ? error.message : "Não foi possível finalizar a venda."
            );
            return;
        } finally {
            setFinalizando(false);
        }

        // Atualizar estoque em tempo real
        try {
            const produtosResponse = await apiFetch<ProdutosResponse>("/produtos");
            setProdutos((produtosResponse.dados || []).filter((p) => p.ativo));
        } catch {
            // Silencioso
        }
    }

    function handleIniciarNovaVenda() {
        setModalComprovanteAberto(false);
        setVendaFinalizada(null);
        setItens([]);
        setClienteId("");
        setDesconto("");
        setParcelas(1);
        setValorRecebido("");
        setErro("");
        setSucesso("");
    }

    const bloqueado = carregando || finalizando;

    return (
        <section className="pdv-page">
            <header className="pdv-hero">
                <div>
                    <span className="pdv-eyebrow">
                        <span className="pdv-pulse" /> Caixa aberto • Pronto para vendas
                    </span>
                    <h1>Ponto de Venda (PDV)</h1>
                    <p>Adicione produtos pelo código ou catálogo, selecione o cliente e emita o comprovante.</p>
                </div>
                <div className="pdv-hero-stats">
                    <div>
                        <small>Total Itens</small>
                        <strong>{totalUnidades} un.</strong>
                    </div>
                    <div>
                        <small>Valor Total</small>
                        <strong>{formatarMoeda(total)}</strong>
                    </div>
                </div>
            </header>

            {erro && (
                <p className="pdv-alert pdv-alert--error" role="alert">
                    <span>!</span> {erro}
                </p>
            )}

            {sucesso && (
                <p className="pdv-alert pdv-alert--success" role="status">
                    <span>✓</span> {sucesso}
                    {vendaFinalizada && (
                        <button
                            type="button"
                            className="pdv-link"
                            onClick={() => setModalComprovanteAberto(true)}
                        >
                            Ver comprovante
                        </button>
                    )}
                </p>
            )}

            <div className="pdv-grid">
                <div className="pdv-main">
                    {/* ---------- 1. Identificação do Cliente ---------- */}
                    <div className="pdv-card">
                        <div className="pdv-card-header">
                            <div className="pdv-step">1</div>
                            <div>
                                <h2>Cliente</h2>
                                <p>Identificação na compra (opcional para venda balcão)</p>
                            </div>
                        </div>

                        <div className="pdv-field">
                            <label htmlFor="clienteId">Cliente da Venda</label>
                            <select
                                id="clienteId"
                                name="clienteId"
                                value={clienteId}
                                onChange={(e) => {
                                    setClienteId(e.target.value);
                                    setSucesso("");
                                }}
                                disabled={bloqueado}
                            >
                                <option value="">Consumidor não identificado (Venda Balcão)</option>
                                {clientes.map((cliente) => (
                                    <option key={cliente.id} value={cliente.id}>
                                        {cliente.nome} {cliente.cpf ? `— CPF: ${cliente.cpf}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {clienteAtual && (
                            <div className="pdv-client-chip">
                                <div className="pdv-avatar">
                                    {clienteAtual.nome.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <strong>{clienteAtual.nome}</strong>
                                    <small>CPF: {clienteAtual.cpf || "não informado"} • Tel: {clienteAtual.telefone || "não informado"}</small>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ---------- 2. Catálogo e Seleção de Produtos ---------- */}
                    <div className="pdv-card">
                        <div className="pdv-card-header">
                            <div className="pdv-step">2</div>
                            <div>
                                <h2>Adicionar Produto</h2>
                                <p>Pesquise por nome ou código e adicione ao carrinho</p>
                            </div>
                        </div>

                        {/* Barra de pesquisa rápida */}
                        <div className="pdv-field" style={{ marginBottom: "14px" }}>
                            <label htmlFor="buscaProduto">Pesquisa Rápida de Produtos</label>
                            <input
                                id="buscaProduto"
                                type="text"
                                placeholder="Digite o nome ou código do produto..."
                                value={buscaProduto}
                                onChange={(e) => setBuscaProduto(e.target.value)}
                                disabled={bloqueado}
                            />
                        </div>

                        <form className="pdv-add-form" onSubmit={handleAdicionarProdutoForm}>
                            <div className="pdv-field pdv-field--grow">
                                <label htmlFor="produtoId">Selecione o Produto</label>
                                <select
                                    id="produtoId"
                                    name="produtoId"
                                    value={produtoSelecionadoId}
                                    onChange={(e) => setProdutoSelecionadoId(e.target.value)}
                                    disabled={bloqueado}
                                    required
                                >
                                    <option value="">
                                        {carregando
                                            ? "Carregando catálogo..."
                                            : produtosFiltrados.length === 0
                                                ? "Nenhum produto encontrado"
                                                : "Selecione um produto..."}
                                    </option>
                                    {produtosFiltrados.map((produto) => (
                                        <option key={produto.id} value={produto.id} disabled={produto.estoque <= 0}>
                                            {produto.nome} {produto.codigo ? `[${produto.codigo}]` : ""} — {formatarMoeda(produto.preco)} — {produto.estoque > 0 ? `Estoque: ${produto.estoque}` : "ESGOTADO"}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="pdv-field pdv-field--qty">
                                <label htmlFor="quantidade">Qtd.</label>
                                <input
                                    id="quantidade"
                                    name="quantidade"
                                    type="number"
                                    min="1"
                                    value={quantidadeInput}
                                    onChange={(e) => setQuantidadeInput(Math.max(1, Number(e.target.value)))}
                                    disabled={bloqueado}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="pdv-btn pdv-btn--primary"
                                disabled={bloqueado || !produtoSelecionadoId}
                            >
                                + Adicionar
                            </button>
                        </form>
                    </div>

                    {/* ---------- 3. Carrinho de Compras ---------- */}
                    <div className="pdv-card">
                        <div className="pdv-card-header">
                            <div className="pdv-step">3</div>
                            <div>
                                <h2>Carrinho de Compras</h2>
                                <p>{itens.length} produto(s) distintos • {totalUnidades} unidade(s) total</p>
                            </div>
                        </div>

                        {itens.length === 0 ? (
                            <div className="pdv-empty">
                                <div className="pdv-empty-icon">🛍️</div>
                                <strong>Carrinho vazio</strong>
                                <p>Selecione produtos acima para iniciar o atendimento.</p>
                            </div>
                        ) : (
                            <ul className="pdv-cart">
                                {itens.map((item) => (
                                    <li key={item.produtoId} className="pdv-cart-item">
                                        <img
                                            src={imagemPorNome(item.nome)}
                                            alt={item.nome}
                                            className="pdv-cart-img"
                                            loading="lazy"
                                        />
                                        <div className="pdv-cart-info">
                                            <strong>{item.nome}</strong>
                                            {item.codigo && <span style={{ fontSize: "11px", color: "var(--pdv-muted)", fontFamily: "monospace" }}>{item.codigo}</span>}
                                            <small>{formatarMoeda(item.precoUnitario)} / un. • Disp: {item.estoqueDisponivel}</small>
                                        </div>
                                        <div className="pdv-qty">
                                            <button
                                                type="button"
                                                onClick={() => alterarQuantidade(item.produtoId, -1)}
                                                disabled={finalizando || item.quantidade <= 1}
                                                aria-label="Diminuir quantidade"
                                            >
                                                −
                                            </button>
                                            <span>{item.quantidade}</span>
                                            <button
                                                type="button"
                                                onClick={() => alterarQuantidade(item.produtoId, 1)}
                                                disabled={finalizando || item.quantidade >= item.estoqueDisponivel}
                                                aria-label="Aumentar quantidade"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <strong className="pdv-cart-total">
                                            {formatarMoeda(item.precoUnitario * item.quantidade)}
                                        </strong>
                                        <button
                                            type="button"
                                            className="pdv-remove"
                                            onClick={() => handleRemoverProduto(item.produtoId)}
                                            disabled={finalizando}
                                            aria-label={`Remover ${item.nome}`}
                                        >
                                            ✕
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* ---------- 4. Resumo e Pagamento ---------- */}
                <aside className="pdv-summary">
                    <div className="pdv-card pdv-card--summary">
                        <div className="pdv-card-header">
                            <div className="pdv-step">4</div>
                            <div>
                                <h2>Pagamento</h2>
                                <p>Forma de pagamento da venda</p>
                            </div>
                        </div>

                        <div className="pdv-pay-grid" role="radiogroup" aria-label="Forma de pagamento">
                            {FORMAS_PAGAMENTO.map((forma) => (
                                <button
                                    key={forma.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={formaPagamento === forma.id}
                                    className={`pdv-pay-option ${formaPagamento === forma.id ? "is-active" : ""}`}
                                    onClick={() => selecionarPagamento(forma.id)}
                                    disabled={finalizando}
                                >
                                    <span className="pdv-pay-icon">{forma.icone}</span>
                                    <strong>{forma.titulo}</strong>
                                    <small>{forma.descricao}</small>
                                </button>
                            ))}
                        </div>

                        {formaPagamento === "credito" && (
                            <div className="pdv-installments">
                                <label>Opções de Parcelamento</label>
                                <div className="pdv-installments-grid">
                                    {opcoesParcelas.map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            className={`pdv-installment ${parcelas === n ? "is-active" : ""}`}
                                            onClick={() => setParcelas(n)}
                                            disabled={finalizando}
                                        >
                                            {n}x
                                        </button>
                                    ))}
                                </div>
                                <p className="pdv-installment-info">
                                    {parcelas}x de <strong>{formatarMoeda(valorParcela)}</strong> sem juros
                                </p>
                            </div>
                        )}

                        {formaPagamento === "pix" && (
                            <div className="pdv-pay-info">
                                ⚡ Pagamento instantâneo via Pix gerado no comprovante.
                            </div>
                        )}

                        {formaPagamento === "boleto" && (
                            <div className="pdv-pay-info">
                                🧾 Boleto bancário com vencimento em 3 dias úteis.
                            </div>
                        )}

                        {formaPagamento === "debito" && (
                            <div className="pdv-pay-info">
                                🏧 Pagamento à vista com cartão de débito.
                            </div>
                        )}

                        {formaPagamento === "dinheiro" && (
                            <div className="pdv-field">
                                <label htmlFor="valorRecebido">Valor recebido (R$)</label>
                                <input
                                    id="valorRecebido"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Informe o valor entregue pelo cliente"
                                    value={valorRecebido}
                                    onChange={(e) => setValorRecebido(e.target.value)}
                                    disabled={bloqueado}
                                />
                                {troco > 0 && (
                                    <small className="pdv-troco">Troco a devolver: <strong>{formatarMoeda(troco)}</strong></small>
                                )}
                            </div>
                        )}

                        <div className="pdv-divider" />

                        <div className="pdv-summary-row">
                            <span>Subtotal</span>
                            <strong>{formatarMoeda(subtotal)}</strong>
                        </div>

                        <div className="pdv-field pdv-field--inline">
                            <label htmlFor="desconto">Desconto (R$)</label>
                            <input
                                id="desconto"
                                name="desconto"
                                type="number"
                                min="0"
                                max={subtotal}
                                step="0.01"
                                placeholder="0,00"
                                value={desconto}
                                onChange={(e) => setDesconto(e.target.value)}
                                disabled={bloqueado}
                            />
                        </div>

                        <div className="pdv-total">
                            <span>Total a pagar</span>
                            <strong>{formatarMoeda(total)}</strong>
                            {formaPagamento === "credito" && parcelas > 1 && (
                                <small>
                                    em {parcelas}x de {formatarMoeda(valorParcela)}
                                </small>
                            )}
                        </div>

                        <button
                            type="button"
                            className="pdv-btn pdv-btn--finish"
                            onClick={() => void handleFinalizarVenda()}
                            disabled={bloqueado || itens.length === 0}
                        >
                            {finalizando ? (
                                <>
                                    <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite", marginRight: "8px" }} />
                                    Finalizando venda...
                                </>
                            ) : (
                                "Finalizar Venda"
                            )}
                        </button>
                    </div>
                </aside>
            </div>

            {/* Modal de Comprovante de Venda e Pós-Venda */}
            <ComprovanteModal
                venda={vendaFinalizada}
                isOpen={modalComprovanteAberto}
                onClose={() => setModalComprovanteAberto(false)}
                onNovaVenda={handleIniciarNovaVenda}
                isPosVenda={true}
            />
        </section>
    );
}

export default PDV;
