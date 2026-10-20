import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { apiFetch } from "../../src/services/api";
import type { Produto } from "../../src/types/produtos";
import "./Produtos.css";

type ProdutoVisual = Produto & {
  imagemUrl?: string | null;
  imagem?: string | null;
  categoriaNome?: string | null;
};

type ProdutoFormulario = {
  codigo: string;
  nome: string;
  descricao: string | null;
  estoque: number;
  preco: number;
  ativo: boolean;
  categoriaId: number | null;
};

type FiltroEstoque =
  | "todos"
  | "disponiveis"
  | "baixo"
  | "esgotados"
  | "inativos";
type StatusClasse = "disponivel" | "baixo" | "esgotado" | "inativo";

const ESTOQUE_MINIMO = 5;
const TEMPO_MENSAGEM_MS = 4500;

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const numero = new Intl.NumberFormat("pt-BR");

function formatarMoeda(valor: number) {
  return moeda.format(Number.isFinite(valor) ? valor : 0);
}

/* Imagens padrão das roupas (coloque a pasta "produtos" dentro de /public) */
const IMAGENS_ROUPAS: Array<[string[], string]> = [
  [["moletom", "blusa de frio", "hoodie", "casaco"], "/produtos/moletom.jpg"],
  [["jaqueta", "jaco"], "/produtos/jaqueta.jpg"],
  [["vestido"], "/produtos/vestido.jpg"],
  [["saia"], "/produtos/saia.jpg"],
  [["bermuda", "short"], "/produtos/bermuda.jpg"],
  [["calca", "jeans"], "/produtos/calca.jpg"],
  [["camisa", "social"], "/produtos/camisa.jpg"],
  [
    ["camiseta", "blusa", "regata", "polo", "t-shirt"],
    "/produtos/camiseta.jpg",
  ],
];

function normalizarTexto(texto: string) {
  return texto
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function imagemDoProduto(produto: ProdutoVisual): string {
  const propria = produto.imagemUrl || produto.imagem;
  if (propria) return propria;
  const texto = normalizarTexto(
    `${produto.nome} ${produto.categoriaNome ?? ""}`,
  );
  for (const [palavras, url] of IMAGENS_ROUPAS) {
    if (palavras.some((p) => texto.includes(p))) return url;
  }
  return "/produtos/camiseta.jpg";
}

function obterStatus(produto: ProdutoVisual): {
  texto: string;
  classe: StatusClasse;
} {
  if (!produto.ativo) return { texto: "Inativo", classe: "inativo" };
  if (produto.estoque <= 0) return { texto: "Esgotado", classe: "esgotado" };
  if (produto.estoque <= ESTOQUE_MINIMO)
    return { texto: "Estoque baixo", classe: "baixo" };
  return { texto: "Disponível", classe: "disponivel" };
}

function nomeCategoria(produto: ProdutoVisual) {
  if (produto.categoriaNome) return produto.categoriaNome;
  if (produto.categoriaId != null) return `Categoria ${produto.categoriaId}`;
  return "Sem categoria";
}

function mensagemDeErro(error: unknown, padrao: string) {
  return error instanceof Error && error.message ? error.message : padrao;
}

function Produtos() {
  const [produtos, setProdutos] = useState<ProdutoVisual[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<ProdutoVisual | null>(
    null,
  );
  const [busca, setBusca] = useState("");
  const [filtroEstoque, setFiltroEstoque] = useState<FiltroEstoque>("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const editorRef = useRef<HTMLElement>(null);

  const carregarProdutos = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await apiFetch<{ dados: ProdutoVisual[] }>("/produtos");
      setProdutos(Array.isArray(resposta.dados) ? resposta.dados : []);
    } catch (error) {
      setErro(mensagemDeErro(error, "Não foi possível carregar os produtos."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarProdutos();
  }, [carregarProdutos]);

  // Mensagem de sucesso some sozinha
  useEffect(() => {
    if (!mensagem) return;
    const timer = window.setTimeout(() => setMensagem(""), TEMPO_MENSAGEM_MS);
    return () => window.clearTimeout(timer);
  }, [mensagem]);

  // Ao abrir o formulário: rola até ele, foca o primeiro campo e permite fechar com Esc
  useEffect(() => {
    if (!formAberto) return;

    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    editorRef.current
      ?.querySelector<HTMLInputElement>("input")
      ?.focus({ preventScroll: true });

    function aoPressionar(event: KeyboardEvent) {
      if (event.key === "Escape") fecharFormulario();
    }

    window.addEventListener("keydown", aoPressionar);
    return () => window.removeEventListener("keydown", aoPressionar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formAberto, produtoEditando]);

  const categorias = useMemo(() => {
    const mapa = new Map<string, string>();
    produtos.forEach((produto) => {
      if (produto.categoriaId != null) {
        mapa.set(String(produto.categoriaId), nomeCategoria(produto));
      }
    });
    return Array.from(mapa.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "pt-BR"),
    );
  }, [produtos]);

  const resumo = useMemo(() => {
    let unidades = 0;
    let baixo = 0;
    let esgotados = 0;

    produtos.forEach((produto) => {
      if (!produto.ativo) return;
      unidades += produto.estoque;
      if (produto.estoque <= 0) esgotados += 1;
      else if (produto.estoque <= ESTOQUE_MINIMO) baixo += 1;
    });

    return { unidades, baixo, esgotados };
  }, [produtos]);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    return produtos.filter((produto) => {
      const correspondeBusca =
        !termo ||
        produto.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
        produto.codigo.toLocaleLowerCase("pt-BR").includes(termo);

      const correspondeCategoria =
        filtroCategoria === "todas" ||
        String(produto.categoriaId ?? "") === filtroCategoria;

      const status = obterStatus(produto).classe;
      const correspondeEstoque =
        filtroEstoque === "todos" ||
        (filtroEstoque === "disponiveis" && status === "disponivel") ||
        (filtroEstoque === "baixo" && status === "baixo") ||
        (filtroEstoque === "esgotados" && status === "esgotado") ||
        (filtroEstoque === "inativos" && status === "inativo");

      return correspondeBusca && correspondeCategoria && correspondeEstoque;
    });
  }, [produtos, busca, filtroEstoque, filtroCategoria]);

  const filtrosAtivos =
    busca.trim() !== "" ||
    filtroEstoque !== "todos" ||
    filtroCategoria !== "todas";

  function limparFiltros() {
    setBusca("");
    setFiltroEstoque("todos");
    setFiltroCategoria("todas");
  }

  function abrirCadastro() {
    setProdutoEditando(null);
    setErro("");
    setMensagem("");
    setFormAberto(true);
  }

  function abrirEdicao(produto: ProdutoVisual) {
    setProdutoEditando(produto);
    setErro("");
    setMensagem("");
    setFormAberto(true);
  }

  function fecharFormulario() {
    if (salvando) return;
    setFormAberto(false);
    setProdutoEditando(null);
    setErro("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const dados = new FormData(event.currentTarget);
    const codigo = String(dados.get("codigo") ?? "").trim();
    const nome = String(dados.get("nome") ?? "").trim();
    const descricao = String(dados.get("descricao") ?? "").trim();
    const estoque = Number(dados.get("estoque"));
    const preco = Number(String(dados.get("preco") ?? "").replace(",", "."));
    const categoriaTexto = String(dados.get("categoriaId") ?? "");
    const ativo = dados.get("ativo") === "on";

    if (!codigo || !nome) return setErro("Código e nome são obrigatórios.");
    if (!Number.isInteger(estoque) || estoque < 0)
      return setErro("Informe uma quantidade de estoque válida.");
    if (!Number.isFinite(preco) || preco < 0)
      return setErro("Informe um preço válido.");

    const payload: ProdutoFormulario = {
      codigo,
      nome,
      descricao: descricao || null,
      estoque,
      preco,
      ativo,
      categoriaId: categoriaTexto ? Number(categoriaTexto) : null,
    };

    setSalvando(true);
    setErro("");
    setMensagem("");

    try {
      if (produtoEditando) {
        await apiFetch(`/produtos/${produtoEditando.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setMensagem("Produto atualizado com sucesso.");
      } else {
        await apiFetch("/produtos", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMensagem("Produto cadastrado com sucesso.");
      }

      setFormAberto(false);
      setProdutoEditando(null);
      await carregarProdutos();
    } catch (error) {
      setErro(mensagemDeErro(error, "Não foi possível salvar o produto."));
    } finally {
      setSalvando(false);
    }
  }

  async function desativarProduto(produto: ProdutoVisual) {
    const confirmar = window.confirm(
      `Deseja realmente desativar "${produto.nome}"? O registro será preservado.`,
    );
    if (!confirmar) return;

    setErro("");
    setMensagem("");

    try {
      await apiFetch(`/produtos/${produto.id}/desativar`, { method: "PATCH" });
      setMensagem(`Produto "${produto.nome}" desativado com sucesso.`);
      await carregarProdutos();
    } catch (error) {
      setErro(mensagemDeErro(error, "Não foi possível desativar o produto."));
    }
  }

  const indicadores = [
    {
      icone: "▦",
      label: "Produtos cadastrados",
      valor: produtos.length,
      ajuda: "Itens no catálogo",
      tom: "",
    },
    {
      icone: "▤",
      label: "Unidades em estoque",
      valor: resumo.unidades,
      ajuda: "Somente produtos ativos",
      tom: "is-info",
    },
    {
      icone: "!",
      label: "Estoque baixo",
      valor: resumo.baixo,
      ajuda: `Até ${ESTOQUE_MINIMO} unidades`,
      tom: "is-warning",
    },
    {
      icone: "×",
      label: "Esgotados",
      valor: resumo.esgotados,
      ajuda: "Precisam de reposição",
      tom: "is-danger",
    },
  ];

  return (
    <section className="produtos-page">
      <header className="produtos-page-header">
        <div>
          <div className="produtos-eyebrow">MS² Vestuário · Estoque</div>
          <h1>Produtos</h1>
          <p>
            Gerencie seu catálogo, acompanhe as quantidades e mantenha seu
            estoque organizado.
          </p>
        </div>

        <button
          type="button"
          className="produtos-btn produtos-btn-primary"
          onClick={abrirCadastro}
        >
          <span aria-hidden="true">+</span> Novo produto
        </button>
      </header>

      {mensagem && (
        <div className="produtos-alerta is-success" role="status">
          <span>{mensagem}</span>
          <button
            type="button"
            className="produtos-alerta-fechar"
            onClick={() => setMensagem("")}
            aria-label="Fechar aviso"
          >
            ×
          </button>
        </div>
      )}
      {erro && !formAberto && (
        <div className="produtos-alerta is-danger" role="alert">
          <span>{erro}</span>
          <button
            type="button"
            className="produtos-alerta-fechar"
            onClick={() => setErro("")}
            aria-label="Fechar aviso"
          >
            ×
          </button>
        </div>
      )}

      <div className="produtos-indicadores">
        {indicadores.map((item) => (
          <article key={item.label} className={`produto-indicador ${item.tom}`}>
            <div className="produto-indicador-topo">
              <span className="produto-indicador-label">{item.label}</span>
              <span className="produto-indicador-icone" aria-hidden="true">
                {item.icone}
              </span>
            </div>
            <strong className="produto-indicador-valor">
              {carregando ? (
                <span className="produtos-skeleton is-valor" />
              ) : (
                numero.format(item.valor)
              )}
            </strong>
            <small>{item.ajuda}</small>
          </article>
        ))}
      </div>

      {formAberto && (
        <section
          ref={editorRef}
          className="produtos-card produtos-editor"
          aria-labelledby="produtos-editor-titulo"
        >
          <div className="produtos-card-header">
            <div>
              <h2 id="produtos-editor-titulo">
                {produtoEditando ? "Editar produto" : "Cadastrar produto"}
              </h2>
              <p>
                Preencha os dados abaixo. Campos com{" "}
                <span className="produtos-obrigatorio">*</span> são
                obrigatórios.
              </p>
            </div>
            <button
              type="button"
              className="produtos-fechar"
              onClick={fecharFormulario}
              aria-label="Fechar formulário"
              disabled={salvando}
            >
              ×
            </button>
          </div>

          {erro && (
            <div className="produtos-alerta is-danger" role="alert">
              <span>{erro}</span>
            </div>
          )}

          {/* key força o formulário a recarregar os valores ao trocar de produto */}
          <form
            key={produtoEditando?.id ?? "novo"}
            className="produtos-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="produtos-form-grid">
              <div className="produtos-field">
                <label htmlFor="codigo">
                  Código <span className="produtos-obrigatorio">*</span>
                </label>
                <input
                  id="codigo"
                  name="codigo"
                  required
                  autoComplete="off"
                  defaultValue={produtoEditando?.codigo ?? ""}
                  placeholder="Ex.: CAM001"
                />
              </div>

              <div className="produtos-field">
                <label htmlFor="nome">
                  Nome do produto{" "}
                  <span className="produtos-obrigatorio">*</span>
                </label>
                <input
                  id="nome"
                  name="nome"
                  required
                  defaultValue={produtoEditando?.nome ?? ""}
                  placeholder="Ex.: Camiseta básica"
                />
              </div>

              <div className="produtos-field">
                <label htmlFor="estoque">
                  Quantidade em estoque{" "}
                  <span className="produtos-obrigatorio">*</span>
                </label>
                <input
                  id="estoque"
                  name="estoque"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  required
                  defaultValue={produtoEditando?.estoque ?? 0}
                />
              </div>

              <div className="produtos-field">
                <label htmlFor="preco">
                  Preço de venda <span className="produtos-obrigatorio">*</span>
                </label>
                <div className="produtos-input-prefixo">
                  <span aria-hidden="true">R$</span>
                  <input
                    id="preco"
                    name="preco"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={produtoEditando?.preco ?? ""}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="produtos-field">
                <label htmlFor="categoriaId">Categoria</label>
                <select
                  id="categoriaId"
                  name="categoriaId"
                  defaultValue={
                    produtoEditando?.categoriaId == null
                      ? ""
                      : String(produtoEditando.categoriaId)
                  }
                >
                  <option value="">Sem categoria</option>
                  {categorias.map(([id, nome]) => (
                    <option key={id} value={id}>
                      {nome}
                    </option>
                  ))}
                </select>
                <small className="produtos-ajuda">
                  As categorias disponíveis vêm dos produtos cadastrados.
                </small>
              </div>

              <div className="produtos-field">
                <span className="produtos-label">Disponibilidade</span>
                <label className="produtos-checkbox">
                  <input
                    type="checkbox"
                    name="ativo"
                    defaultChecked={produtoEditando?.ativo ?? true}
                  />
                  <span
                    className="produtos-checkbox-trilho"
                    aria-hidden="true"
                  />
                  <span>Produto ativo e disponível para venda</span>
                </label>
              </div>

              <div className="produtos-field is-full">
                <label htmlFor="descricao">Descrição</label>
                <textarea
                  id="descricao"
                  name="descricao"
                  rows={3}
                  defaultValue={produtoEditando?.descricao ?? ""}
                  placeholder="Detalhes do produto, tecido, tamanhos… (opcional)"
                />
              </div>
            </div>

            <div className="produtos-form-actions">
              <button
                type="button"
                className="produtos-btn produtos-btn-secondary"
                onClick={fecharFormulario}
                disabled={salvando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="produtos-btn produtos-btn-primary"
                disabled={salvando}
                aria-busy={salvando}
              >
                {salvando && (
                  <span className="produtos-spinner" aria-hidden="true" />
                )}
                {salvando
                  ? "Salvando..."
                  : produtoEditando
                    ? "Salvar alterações"
                    : "Cadastrar produto"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="produtos-card">
        <div className="produtos-list-header">
          <div>
            <h2>Catálogo de produtos</h2>
            <p aria-live="polite">
              {carregando
                ? "Carregando..."
                : `${produtosFiltrados.length} de ${produtos.length} produto(s)`}
            </p>
          </div>
          {filtrosAtivos && (
            <button
              type="button"
              className="produtos-btn produtos-btn-ghost"
              onClick={limparFiltros}
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="produtos-toolbar">
          <div className="produtos-search">
            <span className="produtos-search-icone" aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              aria-label="Pesquisar produtos"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome ou código..."
            />
          </div>

          <select
            aria-label="Filtrar por estoque"
            value={filtroEstoque}
            onChange={(event) =>
              setFiltroEstoque(event.target.value as FiltroEstoque)
            }
          >
            <option value="todos">Todos os status</option>
            <option value="disponiveis">Disponíveis</option>
            <option value="baixo">Estoque baixo</option>
            <option value="esgotados">Esgotados</option>
            <option value="inativos">Inativos</option>
          </select>

          <select
            aria-label="Filtrar por categoria"
            value={filtroCategoria}
            onChange={(event) => setFiltroCategoria(event.target.value)}
          >
            <option value="todas">Todas as categorias</option>
            {categorias.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </div>

        {carregando ? (
          <div
            className="produtos-cards-grid"
            aria-busy="true"
            aria-label="Carregando produtos"
          >
            {Array.from({ length: 4 }, (_, i) => (
              <div className="produto-card-item is-loading" key={i}>
                <div className="produto-card-imagem produtos-skeleton" />
                <div className="produto-card-conteudo">
                  <span className="produtos-skeleton is-linha-curta" />
                  <span className="produtos-skeleton is-linha" />
                  <span className="produtos-skeleton is-linha-media" />
                </div>
              </div>
            ))}
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="produtos-empty">
            <span className="produtos-empty-icone" aria-hidden="true">
              {produtos.length === 0 ? "▦" : "⌕"}
            </span>
            <strong>
              {produtos.length === 0
                ? "Seu catálogo está vazio"
                : "Nenhum produto encontrado"}
            </strong>
            <p>
              {produtos.length === 0
                ? "Cadastre seu primeiro produto para começar a controlar o estoque."
                : "Tente mudar a pesquisa ou os filtros selecionados."}
            </p>
            {produtos.length === 0 ? (
              <button
                type="button"
                className="produtos-btn produtos-btn-primary"
                onClick={abrirCadastro}
              >
                + Cadastrar primeiro produto
              </button>
            ) : (
              <button
                type="button"
                className="produtos-btn produtos-btn-secondary"
                onClick={limparFiltros}
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="produtos-cards-grid">
            {produtosFiltrados.map((produto) => {
              const status = obterStatus(produto);
              const imagem = imagemDoProduto(produto);

              return (
                <article
                  className={`produto-card-item is-${status.classe}`}
                  key={produto.id}
                >
                  <div className="produto-card-imagem">
                    {imagem ? (
                      <img src={imagem} alt={produto.nome} loading="lazy" />
                    ) : (
                      <div className="produto-sem-imagem">
                        <span aria-hidden="true">◇</span>
                        <small>Sem imagem</small>
                      </div>
                    )}
                    <span
                      className={`produto-card-status status-${status.classe}`}
                    >
                      {status.texto}
                    </span>
                  </div>

                  <div className="produto-card-conteudo">
                    <div className="produto-card-meta">
                      <span className="produto-card-codigo">
                        {produto.codigo}
                      </span>
                      <span className="produto-card-categoria">
                        {nomeCategoria(produto)}
                      </span>
                    </div>

                    <h3 className="produto-card-nome" title={produto.nome}>
                      {produto.nome}
                    </h3>

                    <div className="produto-card-preco">
                      {formatarMoeda(Number(produto.preco))}
                    </div>

                    <div className="produto-card-estoque">
                      <span>Estoque</span>
                      <strong>{numero.format(produto.estoque)} un.</strong>
                    </div>

                    <div className="produto-card-acoes">
                      <button
                        type="button"
                        className="produtos-btn produtos-btn-secondary"
                        onClick={() => abrirEdicao(produto)}
                        aria-label={`Editar ${produto.nome}`}
                      >
                        Editar
                      </button>
                      {produto.ativo && (
                        <button
                          type="button"
                          className="produtos-btn produtos-btn-danger"
                          onClick={() => void desativarProduto(produto)}
                          aria-label={`Desativar ${produto.nome}`}
                        >
                          Desativar
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

export default Produtos;
