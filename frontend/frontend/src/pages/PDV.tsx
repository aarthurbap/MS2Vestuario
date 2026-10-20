import {
    useEffect,
    useMemo,
    useState,
    type FormEvent
} from "react";

import { apiFetch } from "../services/api";

import type { Cliente, ClientesResponse } from "../types/cliente";
import type { Produto, ProdutosResponse } from "../types/produtos";
import type {
    ItemCarrinho,
    CriarVendaResponse,
    NovaVendaRequest
} from "../types/venda";
import type { UsuarioLogado } from "../types/usuario";

import "./PDV.css";

// ======================================================
// CONFIGURAÇÃO - Dados da loja (ajuste para os reais)
// ======================================================

const LOJA = {
    nome: "MS² Vestuário",
    razaoSocial: "MS² VESTUÁRIO LTDA",
    cnpj: "00.000.000/0001-00",
    ie: "000.000.000.000",
    endereco: "Rua Exemplo, 123 — Centro",
    cidade: "São Paulo — SP",
    telefone: "(11) 0000-0000"
};

// Percentual aproximado de tributos (Lei 12.741/2012)
const PERCENTUAL_TRIBUTOS = 0.1845;

// ======================================================
// FORMATAÇÃO
// ======================================================

const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(valor);

const formatarDataHora = (data: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium"
    }).format(data);

// ======================================================
// PAGAMENTO
// ======================================================

type FormaPagamento = "credito" | "debito" | "pix" | "boleto" | "dinheiro";

const FORMAS_PAGAMENTO: Array<{
    id: FormaPagamento;
    titulo: string;
    descricao: string;
    icone: string;
}> = [
    { id: "credito", titulo: "Crédito", descricao: "Até 12x", icone: "💳" },
    { id: "debito", titulo: "Débito", descricao: "À vista", icone: "🏧" },
    { id: "pix", titulo: "Pix", descricao: "Instantâneo", icone: "⚡" },
    { id: "boleto", titulo: "Boleto", descricao: "Vence em 3 dias", icone: "🧾" },
    { id: "dinheiro", titulo: "Dinheiro", descricao: "Com troco", icone: "💵" }
];

const NOME_PAGAMENTO: Record<FormaPagamento, string> = {
    credito: "Cartão de Crédito",
    debito: "Cartão de Débito",
    pix: "Pix",
    boleto: "Boleto Bancário",
    dinheiro: "Dinheiro"
};

// ======================================================
// IMAGENS - mesmas fotos da tela de Produtos
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
// NOTA FISCAL - tipos e utilidades
// ======================================================

type NotaFiscal = {
    numeroVenda: number | string;
    numeroNota: string;
    serie: string;
    chave: string;
    emissao: Date;
    cliente: Cliente | undefined;
    operador: string;
    itens: ItemCarrinho[];
    subtotal: number;
    desconto: number;
    total: number;
    pagamento: FormaPagamento;
    parcelas: number;
    valorRecebido: number;
    troco: number;
};

function gerarChaveAcesso(numero: string | number) {
    let base = `35${Date.now()}${String(numero).padStart(9, "0")}`;
    while (base.length < 44) base += Math.floor(Math.random() * 10);
    return base.slice(0, 44).replace(/(\d{4})(?=\d)/g, "$1 ");
}

// Gera um padrão visual tipo QR Code a partir da chave
function padraoQr(chave: string) {
    const digitos = chave.replace(/\D/g, "");
    const celulas: boolean[] = [];
    for (let i = 0; i < 21 * 21; i++) {
        const linha = Math.floor(i / 21);
        const coluna = i % 21;
        const canto =
            (linha < 7 && coluna < 7) ||
            (linha < 7 && coluna > 13) ||
            (linha > 13 && coluna < 7);
        if (canto) {
            const l = linha % 14 > 6 ? linha - 14 : linha;
            const c = coluna % 14 > 6 ? coluna - 14 : coluna;
            const ll = l < 0 ? l + 14 : l;
            const cc = c < 0 ? c + 14 : c;
            const borda = ll === 0 || ll === 6 || cc === 0 || cc === 6;
            const miolo = ll >= 2 && ll <= 4 && cc >= 2 && cc <= 4;
            celulas.push(borda || miolo);
        } else {
            const d = Number(digitos[(i * 7) % digitos.length]);
            celulas.push((d + linha + coluna) % 3 === 0);
        }
    }
    return celulas;
}

// ======================================================
// PÁGINA - Ponto de Venda
// ======================================================

function PDV() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [clienteId, setClienteId] = useState("");
    const [itens, setItens] = useState<ItemCarrinho[]>([]);
    const [desconto, setDesconto] = useState("");

    const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("credito");
    const [parcelas, setParcelas] = useState(1);
    const [valorRecebido, setValorRecebido] = useState("");

    const [carregando, setCarregando] = useState(true);
    const [finalizando, setFinalizando] = useState(false);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");
    const [notaFiscal, setNotaFiscal] = useState<NotaFiscal | null>(null);

    useEffect(() => {
        void carregarDados();
    }, []);

    async function carregarDados() {
        try {
            setCarregando(true);
            setErro("");
            const [clientesResponse, produtosResponse] = await Promise.all([
                apiFetch<ClientesResponse>("/clientes"),
                apiFetch<ProdutosResponse>("/produtos")
            ]);
            setClientes(clientesResponse.dados);
            setProdutos(produtosResponse.dados.filter((p) => p.ativo));
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

    // ==================================================
    // CARRINHO
    // ==================================================

    function handleAdicionarProduto(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (carregando || finalizando) return;

        setErro("");
        setSucesso("");

        const form = event.currentTarget;
        const formData = new FormData(form);
        const produtoId = Number(formData.get("produtoId"));
        const quantidade = Number(formData.get("quantidade"));

        if (!Number.isInteger(produtoId) || produtoId <= 0) {
            setErro("Selecione um produto.");
            return;
        }
        if (!Number.isInteger(quantidade) || quantidade <= 0) {
            setErro("Informe uma quantidade válida.");
            return;
        }

        const produto = produtos.find((p) => p.id === produtoId);
        if (!produto) {
            setErro("Produto não encontrado.");
            return;
        }
        if (quantidade > produto.estoque) {
            setErro(`Estoque insuficiente para "${produto.nome}".`);
            return;
        }
        if (itens.some((item) => item.produtoId === produtoId)) {
            setErro("Esse produto já foi adicionado à venda.");
            return;
        }

        setItens((atuais) => [
            ...atuais,
            {
                produtoId: produto.id,
                nome: produto.nome,
                quantidade,
                precoUnitario: produto.preco,
                estoqueDisponivel: produto.estoque
            }
        ]);
        form.reset();
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
    // VENDA - Finalizar
    // ==================================================

    async function handleFinalizarVenda() {
        if (carregando || finalizando) return;

        setErro("");
        setSucesso("");

        const clienteSelecionado = Number(clienteId);

        if (!Number.isInteger(clienteSelecionado) || clienteSelecionado <= 0) {
            setErro("Selecione um cliente.");
            return;
        }
        if (itens.length === 0) {
            setErro("Adicione pelo menos um produto à venda.");
            return;
        }
        if (!Number.isFinite(descontoNumero) || descontoNumero < 0) {
            setErro("Informe um desconto válido.");
            return;
        }
        if (descontoNumero > subtotal) {
            setErro("O desconto não pode ser maior que o subtotal.");
            return;
        }
        if (formaPagamento === "dinheiro" && recebidoNumero < total) {
            setErro("O valor recebido em dinheiro é menor que o total.");
            return;
        }

        const usuarioSalvo = sessionStorage.getItem("usuario");
        if (!usuarioSalvo) {
            setErro("Usuário não autenticado. Faça login novamente.");
            return;
        }

        let usuario: UsuarioLogado;
        try {
            usuario = JSON.parse(usuarioSalvo) as UsuarioLogado;
        } catch {
            setErro("Sessão inválida. Faça login novamente.");
            return;
        }
        if (!Number.isInteger(usuario.id) || usuario.id <= 0) {
            setErro("Usuário inválido. Faça login novamente.");
            return;
        }

        const dadosVenda: NovaVendaRequest = {
            clienteId: clienteSelecionado,
            usuarioId: usuario.id,
            desconto: Number(descontoNumero.toFixed(2)),
            itens: itens.map((item) => ({
                produtoId: item.produtoId,
                quantidade: item.quantidade
            }))
        };

        // Forma de pagamento enviada junto (o backend pode ignorar
        // se ainda não tiver esses campos).
        const corpo = {
            ...dadosVenda,
            formaPagamento,
            parcelas: formaPagamento === "credito" ? parcelas : 1
        };

        const itensVendidos = [...itens];
        const clienteVenda = clienteAtual;
        const usuarioInfo = usuario as UsuarioLogado & { nome?: string; login?: string };

        try {
            setFinalizando(true);

            const response = await apiFetch<CriarVendaResponse>("/vendas", {
                method: "POST",
                body: JSON.stringify(corpo)
            });

            const numeroNota = String(response.id).padStart(9, "0");

            setNotaFiscal({
                numeroVenda: response.id,
                numeroNota: numeroNota.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3"),
                serie: "001",
                chave: gerarChaveAcesso(response.id),
                emissao: new Date(),
                cliente: clienteVenda,
                operador: usuarioInfo.nome || usuarioInfo.login || `Usuário ${usuario.id}`,
                itens: itensVendidos,
                subtotal,
                desconto: descontoValido,
                total,
                pagamento: formaPagamento,
                parcelas: formaPagamento === "credito" ? parcelas : 1,
                valorRecebido: formaPagamento === "dinheiro" ? recebidoNumero : total,
                troco
            });

            setItens([]);
            setClienteId("");
            setDesconto("");
            setParcelas(1);
            setValorRecebido("");
            setSucesso(`Venda nº ${response.id} registrada com sucesso!`);
        } catch (error) {
            setErro(
                error instanceof Error ? error.message : "Não foi possível finalizar a venda."
            );
            return;
        } finally {
            setFinalizando(false);
        }

        try {
            setCarregando(true);
            const produtosResponse = await apiFetch<ProdutosResponse>("/produtos");
            setProdutos(produtosResponse.dados.filter((p) => p.ativo));
        } catch {
            setProdutos([]);
            setErro(
                "A venda foi registrada, mas não foi possível atualizar o estoque. " +
                    "Recarregue a página antes de outra venda."
            );
        } finally {
            setCarregando(false);
        }
    }

    const bloqueado = carregando || finalizando;

    // ==================================================
    // INTERFACE
    // ==================================================

    return (
        <section className="pdv-page">
            <header className="pdv-hero">
                <div>
                    <span className="pdv-eyebrow">
                        <span className="pdv-pulse" /> Caixa aberto
                    </span>
                    <h1>Ponto de Venda</h1>
                    <p>Monte o carrinho, escolha o pagamento e emita a nota fiscal.</p>
                </div>
                <div className="pdv-hero-stats">
                    <div>
                        <small>Itens</small>
                        <strong>{totalUnidades}</strong>
                    </div>
                    <div>
                        <small>Total</small>
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
                    {notaFiscal && (
                        <button type="button" className="pdv-link" onClick={() => setNotaFiscal({ ...notaFiscal })}>
                            Ver nota fiscal
                        </button>
                    )}
                </p>
            )}

            <div className="pdv-grid">
                <div className="pdv-main">
                    {/* ---------- Cliente ---------- */}
                    <div className="pdv-card">
                        <div className="pdv-card-header">
                            <div className="pdv-step">1</div>
                            <div>
                                <h2>Cliente</h2>
                                <p>Quem está comprando</p>
                            </div>
                        </div>

                        <div className="pdv-field">
                            <label htmlFor="clienteId">Selecione o cliente</label>
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
                                <option value="">
                                    {carregando ? "Carregando clientes..." : "Selecione um cliente"}
                                </option>
                                {clientes.map((cliente) => (
                                    <option key={cliente.id} value={cliente.id}>
                                        {cliente.nome} {cliente.cpf ? `— ${cliente.cpf}` : ""}
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
                                    <small>CPF {clienteAtual.cpf || "não informado"}</small>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ---------- Produtos ---------- */}
                    <div className="pdv-card">
                        <div className="pdv-card-header">
                            <div className="pdv-step">2</div>
                            <div>
                                <h2>Adicionar produto</h2>
                                <p>Escolha a peça e a quantidade</p>
                            </div>
                        </div>

                        <form className="pdv-add-form" onSubmit={handleAdicionarProduto}>
                            <div className="pdv-field pdv-field--grow">
                                <label htmlFor="produtoId">Produto</label>
                                <select id="produtoId" name="produtoId" disabled={bloqueado} required>
                                    <option value="">
                                        {carregando ? "Carregando produtos..." : "Selecione um produto"}
                                    </option>
                                    {produtos.map((produto) => (
                                        <option key={produto.id} value={produto.id}>
                                            {produto.nome} — {formatarMoeda(produto.preco)} — Estoque: {produto.estoque}
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
                                    defaultValue="1"
                                    disabled={bloqueado}
                                    required
                                />
                            </div>

                            <button type="submit" className="pdv-btn pdv-btn--primary" disabled={bloqueado}>
                                + Adicionar
                            </button>
                        </form>
                    </div>

                    {/* ---------- Carrinho ---------- */}
                    <div className="pdv-card">
                        <div className="pdv-card-header">
                            <div className="pdv-step">3</div>
                            <div>
                                <h2>Carrinho</h2>
                                <p>{itens.length} produto(s) • {totalUnidades} unidade(s)</p>
                            </div>
                        </div>

                        {itens.length === 0 ? (
                            <div className="pdv-empty">
                                <div className="pdv-empty-icon">🛍️</div>
                                <strong>Carrinho vazio</strong>
                                <p>Adicione produtos para começar a venda.</p>
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
                                            <small>{formatarMoeda(item.precoUnitario)} / un.</small>
                                        </div>
                                        <div className="pdv-qty">
                                            <button
                                                type="button"
                                                onClick={() => alterarQuantidade(item.produtoId, -1)}
                                                disabled={finalizando || item.quantidade <= 1}
                                                aria-label="Diminuir"
                                            >
                                                −
                                            </button>
                                            <span>{item.quantidade}</span>
                                            <button
                                                type="button"
                                                onClick={() => alterarQuantidade(item.produtoId, 1)}
                                                disabled={finalizando || item.quantidade >= item.estoqueDisponivel}
                                                aria-label="Aumentar"
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

                {/* ---------- Resumo / Pagamento ---------- */}
                <aside className="pdv-summary">
                    <div className="pdv-card pdv-card--summary">
                        <div className="pdv-card-header">
                            <div className="pdv-step">4</div>
                            <div>
                                <h2>Pagamento</h2>
                                <p>Escolha a forma de pagamento</p>
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
                                <label>Parcelamento</label>
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
                                ⚡ O QR Code Pix será gerado na nota fiscal após finalizar.
                            </div>
                        )}
                        {formaPagamento === "boleto" && (
                            <div className="pdv-pay-info">
                                🧾 Boleto com vencimento em 3 dias úteis.
                            </div>
                        )}
                        {formaPagamento === "debito" && (
                            <div className="pdv-pay-info">🏧 Pagamento à vista no débito.</div>
                        )}
                        {formaPagamento === "dinheiro" && (
                            <div className="pdv-field">
                                <label htmlFor="valorRecebido">Valor recebido</label>
                                <input
                                    id="valorRecebido"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0,00"
                                    value={valorRecebido}
                                    onChange={(e) => setValorRecebido(e.target.value)}
                                    disabled={bloqueado}
                                />
                                {troco > 0 && (
                                    <small className="pdv-troco">Troco: {formatarMoeda(troco)}</small>
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
                            disabled={bloqueado || itens.length === 0 || !clienteId}
                        >
                            {finalizando ? "Finalizando..." : "Finalizar venda e emitir nota"}
                        </button>
                    </div>
                </aside>
            </div>

            {notaFiscal && (
                <NotaFiscalModal nota={notaFiscal} onFechar={() => setNotaFiscal(null)} />
            )}
        </section>
    );
}

// ======================================================
// COMPONENTE - Nota Fiscal (NFC-e)
// ======================================================

function NotaFiscalModal({ nota, onFechar }: { nota: NotaFiscal; onFechar: () => void }) {
    const qr = useMemo(() => padraoQr(nota.chave), [nota.chave]);
    const tributos = nota.total * PERCENTUAL_TRIBUTOS;

    useEffect(() => {
        const fecharComEsc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
        window.addEventListener("keydown", fecharComEsc);
        return () => window.removeEventListener("keydown", fecharComEsc);
    }, [onFechar]);

    return (
        <div className="nf-overlay" onClick={onFechar}>
            <div className="nf-wrapper" onClick={(e) => e.stopPropagation()}>
                <div className="nf-actions">
                    <button type="button" className="pdv-btn pdv-btn--primary" onClick={() => window.print()}>
                        🖨️ Imprimir nota
                    </button>
                    <button type="button" className="pdv-btn pdv-btn--ghost" onClick={onFechar}>
                        Fechar
                    </button>
                </div>

                <article className="nf-paper" id="nota-fiscal">
                    <header className="nf-header">
                        <div className="nf-logo">
                            MS<sup>2</sup>
                        </div>
                        <div>
                            <h3>{nota.cliente ? LOJA.razaoSocial : LOJA.nome}</h3>
                            <p>CNPJ {LOJA.cnpj} • IE {LOJA.ie}</p>
                            <p>{LOJA.endereco} • {LOJA.cidade}</p>
                            <p>Tel. {LOJA.telefone}</p>
                        </div>
                    </header>

                    <div className="nf-title">
                        <strong>DANFE NFC-e</strong>
                        <span>Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</span>
                    </div>

                    <div className="nf-meta">
                        <div>
                            <small>Nº da nota</small>
                            <strong>{nota.numeroNota}</strong>
                        </div>
                        <div>
                            <small>Série</small>
                            <strong>{nota.serie}</strong>
                        </div>
                        <div>
                            <small>Venda</small>
                            <strong>#{nota.numeroVenda}</strong>
                        </div>
                        <div>
                            <small>Emissão</small>
                            <strong>{formatarDataHora(nota.emissao)}</strong>
                        </div>
                    </div>

                    <table className="nf-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Descrição</th>
                                <th>Qtd</th>
                                <th>Vl. unit.</th>
                                <th>Vl. total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {nota.itens.map((item, i) => (
                                <tr key={item.produtoId}>
                                    <td>{String(i + 1).padStart(3, "0")}</td>
                                    <td>
                                        {item.nome}
                                        <small>Cód. {item.produtoId} • UN</small>
                                    </td>
                                    <td>{item.quantidade}</td>
                                    <td>{formatarMoeda(item.precoUnitario)}</td>
                                    <td>{formatarMoeda(item.precoUnitario * item.quantidade)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="nf-totals">
                        <div>
                            <span>Qtd. total de itens</span>
                            <span>{nota.itens.reduce((t, i) => t + i.quantidade, 0)}</span>
                        </div>
                        <div>
                            <span>Subtotal</span>
                            <span>{formatarMoeda(nota.subtotal)}</span>
                        </div>
                        <div>
                            <span>Desconto</span>
                            <span>− {formatarMoeda(nota.desconto)}</span>
                        </div>
                        <div className="nf-grand-total">
                            <span>Valor a pagar</span>
                            <span>{formatarMoeda(nota.total)}</span>
                        </div>
                    </div>

                    <div className="nf-payment">
                        <div>
                            <span>Forma de pagamento</span>
                            <strong>
                                {NOME_PAGAMENTO[nota.pagamento]}
                                {nota.pagamento === "credito" &&
                                    ` — ${nota.parcelas}x de ${formatarMoeda(nota.total / nota.parcelas)}`}
                            </strong>
                        </div>
                        <div>
                            <span>Valor pago</span>
                            <strong>{formatarMoeda(nota.valorRecebido)}</strong>
                        </div>
                        {nota.troco > 0 && (
                            <div>
                                <span>Troco</span>
                                <strong>{formatarMoeda(nota.troco)}</strong>
                            </div>
                        )}
                    </div>

                    <div className="nf-consumer">
                        <small>Consumidor</small>
                        <strong>{nota.cliente?.nome ?? "Consumidor não identificado"}</strong>
                        {nota.cliente?.cpf && <span>CPF {nota.cliente.cpf}</span>}
                        <span>Operador: {nota.operador}</span>
                    </div>

                    <div className="nf-footer">
                        <div className="nf-qr" aria-label="QR Code da nota">
                            {qr.map((on, i) => (
                                <span key={i} className={on ? "on" : ""} />
                            ))}
                        </div>
                        <div className="nf-key">
                            <small>Chave de acesso</small>
                            <code>{nota.chave}</code>
                            <p>
                                Consulte pela chave de acesso em
                                <br />
                                www.nfce.fazenda.sp.gov.br
                            </p>
                            <p className="nf-taxes">
                                Tributos totais aproximados: {formatarMoeda(tributos)} (
                                {(PERCENTUAL_TRIBUTOS * 100).toFixed(2).replace(".", ",")}%) — Lei 12.741/2012
                            </p>
                        </div>
                    </div>

                    <p className="nf-thanks">Obrigado pela preferência! Volte sempre 💜</p>
                </article>
            </div>
        </div>
    );
}

export default PDV;