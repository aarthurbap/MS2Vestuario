import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { apiFetch } from "../services/api";
import type { NovoCliente } from "../types/cliente";

import "./Clientes.css";

type Identificador = string | number;
type Registro = Record<string, unknown>;

type ClienteItem = {
  id: Identificador;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string | null;
};

type VendaItem = Registro;

type ClienteForm = {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
};

type ModoModal = "novo" | "editar" | "perfil" | "excluir" | null;

type EstatisticaCliente = {
  cliente: ClienteItem;
  compras: number;
  totalGasto: number;
  ultimaCompra: number | null;
  vendas: VendaItem[];
};

const FORM_VAZIO: ClienteForm = {
  nome: "",
  cpf: "",
  telefone: "",
  email: "",
};

function ehRegistro(valor: unknown): valor is Registro {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function primeiroCampo(registro: Registro, chaves: string[]): unknown {
  for (const chave of chaves) {
    const valor = registro[chave];
    if (valor !== undefined && valor !== null && valor !== "") {
      return valor;
    }
  }
  return null;
}

function texto(valor: unknown, padrao = ""): string {
  if (typeof valor === "string") return valor.trim() || padrao;
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
  if (ehRegistro(valor)) {
    return texto(
      primeiroCampo(valor, ["nome", "name", "descricao", "email"]),
      padrao,
    );
  }
  return padrao;
}

function extrairLista(payload: unknown): Registro[] {
  if (Array.isArray(payload)) return payload.filter(ehRegistro);
  if (!ehRegistro(payload)) return [];

  for (const chave of [
    "dados",
    "data",
    "clientes",
    "vendas",
    "items",
    "itens",
    "rows",
    "resultados",
  ]) {
    const valor = payload[chave];
    if (Array.isArray(valor)) return valor.filter(ehRegistro);
  }

  return [];
}

function normalizarCliente(registro: Registro): ClienteItem | null {
  const id = primeiroCampo(registro, [
    "id",
    "cliente_id",
    "id_cliente",
    "clienteId",
  ]);
  const nome = texto(primeiroCampo(registro, ["nome", "name", "nome_cliente"]));
  if ((typeof id !== "string" && typeof id !== "number") || !nome) return null;

  return {
    id,
    nome,
    cpf: texto(primeiroCampo(registro, ["cpf", "documento"])),
    telefone:
      texto(primeiroCampo(registro, ["telefone", "celular", "phone"]), "") ||
      null,
    email: texto(primeiroCampo(registro, ["email", "e_mail"]), "") || null,
  };
}

function obterIdClienteVenda(venda: VendaItem): string {
  const valor = primeiroCampo(venda, [
    "cliente_id",
    "clienteId",
    "id_cliente",
    "idCliente",
  ]);
  if (typeof valor === "string" || typeof valor === "number")
    return String(valor);

  const clienteAninhado = primeiroCampo(venda, ["cliente"]);
  if (
    typeof clienteAninhado === "string" ||
    typeof clienteAninhado === "number"
  ) {
    return String(clienteAninhado);
  }
  if (ehRegistro(clienteAninhado)) {
    const id = primeiroCampo(clienteAninhado, [
      "id",
      "cliente_id",
      "id_cliente",
    ]);
    if (typeof id === "string" || typeof id === "number") return String(id);
  }
  return "";
}

function obterNomeClienteVenda(venda: VendaItem): string {
  const direto = primeiroCampo(venda, [
    "cliente_nome",
    "nome_cliente",
    "nomeCliente",
    "cliente",
  ]);
  if (ehRegistro(direto)) return texto(primeiroCampo(direto, ["nome", "name"]));
  return texto(direto);
}

function pertenceAoCliente(venda: VendaItem, cliente: ClienteItem): boolean {
  const idVenda = obterIdClienteVenda(venda);
  if (idVenda && idVenda === String(cliente.id)) return true;

  const nomeVenda = obterNomeClienteVenda(venda).toLocaleLowerCase("pt-BR");
  return Boolean(
    nomeVenda && nomeVenda === cliente.nome.toLocaleLowerCase("pt-BR"),
  );
}

function vendaCancelada(venda: VendaItem): boolean {
  const status = texto(
    primeiroCampo(venda, ["status", "situacao", "estado"]),
  ).toLocaleLowerCase("pt-BR");
  return status.includes("cancel");
}

function valorNumerico(valor: unknown): number {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  if (typeof valor !== "string" || !valor.trim()) return 0;

  const normalizado = valor
    .replace(/R\$\s?/gi, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:[,]|$))/g, "")
    .replace(",", ".");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

function valorVenda(venda: VendaItem): number {
  return valorNumerico(
    primeiroCampo(venda, [
      "valor_total",
      "total_venda",
      "total",
      "valor",
      "valorFinal",
      "valor_final",
    ]),
  );
}

function dataVenda(venda: VendaItem): number | null {
  const valor = primeiroCampo(venda, [
    "data_venda",
    "dataVenda",
    "data",
    "criado_em",
    "created_at",
    "createdAt",
    "data_criacao",
  ]);
  if (typeof valor !== "string" && typeof valor !== "number") return null;
  const tempo = new Date(valor).getTime();
  return Number.isFinite(tempo) ? tempo : null;
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function formatarData(tempo: number | null): string {
  if (tempo === null) return "Sem compras registradas";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(tempo));
}

function iniciais(nome: string): string {
  return (
    nome
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toLocaleUpperCase("pt-BR") ?? "")
      .join("") || "CL"
  );
}

function Icone({
  nome,
  tamanho = 18,
}: {
  nome:
    | "plus"
    | "search"
    | "refresh"
    | "eye"
    | "edit"
    | "trash"
    | "x"
    | "users"
    | "shopping"
    | "calendar"
    | "trophy"
    | "mail"
    | "phone"
    | "user"
    | "check"
    | "arrow"
    | "chart"
    | "warning";
  tamanho?: number;
}) {
  const propriedades = {
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

  switch (nome) {
    case "plus":
      return (
        <svg {...propriedades}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "search":
      return (
        <svg {...propriedades}>
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 5 5" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...propriedades}>
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" />
        </svg>
      );
    case "eye":
      return (
        <svg {...propriedades}>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "edit":
      return (
        <svg {...propriedades}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      );
    case "trash":
      return (
        <svg {...propriedades}>
          <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
        </svg>
      );
    case "x":
      return (
        <svg {...propriedades}>
          <path d="m18 6-12 12M6 6l12 12" />
        </svg>
      );
    case "users":
      return (
        <svg {...propriedades}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "shopping":
      return (
        <svg {...propriedades}>
          <path d="M5 8h14l1 13H4L5 8Z" />
          <path d="M9 9V6a3 3 0 0 1 6 0v3" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...propriedades}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...propriedades}>
          <path d="M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
          <path d="M7 6H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4" />
        </svg>
      );
    case "mail":
      return (
        <svg {...propriedades}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case "phone":
      return (
        <svg {...propriedades}>
          <path d="M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "user":
      return (
        <svg {...propriedades}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case "check":
      return (
        <svg {...propriedades}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...propriedades}>
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
      );
    case "chart":
      return (
        <svg {...propriedades}>
          <path d="M4 19V5M4 19h17" />
          <path d="m7 15 4-4 3 2 6-7" />
        </svg>
      );
    case "warning":
      return (
        <svg {...propriedades}>
          <path d="M12 3.5 2.6 20h18.8L12 3.5Z" />
          <path d="M12 9v5" />
          <path d="M12 17.5h.01" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Clientes() {
  const [clientes, setClientes] = useState<ClienteItem[]>([]);
  const [vendas, setVendas] = useState<VendaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [clienteEmEdicao, setClienteEmEdicao] = useState<ClienteItem | null>(
    null,
  );
  const [clienteSelecionado, setClienteSelecionado] =
    useState<ClienteItem | null>(null);
  const [modoModal, setModoModal] = useState<ModoModal>(null);
  const [form, setForm] = useState<ClienteForm>(FORM_VAZIO);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const [resultadoClientes, resultadoVendas] = await Promise.allSettled([
      apiFetch<unknown>("/clientes"),
      apiFetch<unknown>("/vendas"),
    ]);

    if (resultadoClientes.status === "fulfilled") {
      const lista = extrairLista(resultadoClientes.value)
        .map(normalizarCliente)
        .filter((cliente): cliente is ClienteItem => cliente !== null)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      setClientes(lista);
    } else {
      setErro(
        resultadoClientes.reason instanceof Error
          ? resultadoClientes.reason.message
          : "Não foi possível carregar os clientes.",
      );
    }

    if (resultadoVendas.status === "fulfilled") {
      setVendas(extrairLista(resultadoVendas.value));
    } else {
      // A página continua funcionando sem o histórico de vendas.
      setVendas([]);
    }

    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (!modoModal) return;

    const aoPressionarEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !salvando && !excluindo) fecharModal();
    };

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", aoPressionarEsc);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", aoPressionarEsc);
    };
  }, [modoModal, salvando, excluindo]);

  const estatisticas = useMemo<EstatisticaCliente[]>(() => {
    return clientes.map((cliente) => {
      const comprasCliente = vendas
        .filter(
          (venda) =>
            !vendaCancelada(venda) && pertenceAoCliente(venda, cliente),
        )
        .sort((a, b) => (dataVenda(b) ?? 0) - (dataVenda(a) ?? 0));
      const datas = comprasCliente
        .map(dataVenda)
        .filter((data): data is number => data !== null);

      return {
        cliente,
        compras: comprasCliente.length,
        totalGasto: comprasCliente.reduce(
          (total, venda) => total + valorVenda(venda),
          0,
        ),
        ultimaCompra: datas.length ? Math.max(...datas) : null,
        vendas: comprasCliente,
      };
    });
  }, [clientes, vendas]);

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return estatisticas;

    return estatisticas.filter(({ cliente }) =>
      [
        cliente.nome,
        cliente.cpf,
        cliente.email ?? "",
        cliente.telefone ?? "",
      ].some((valor) => valor.toLocaleLowerCase("pt-BR").includes(termo)),
    );
  }, [estatisticas, busca]);

  const rankingCompras = useMemo(
    () =>
      [...estatisticas]
        .filter((item) => item.compras > 0)
        .sort((a, b) => b.compras - a.compras || b.totalGasto - a.totalGasto)
        .slice(0, 5),
    [estatisticas],
  );

  const clienteMaisCompra = rankingCompras[0] ?? null;
  const clienteMaisRecente = useMemo(
    () =>
      [...estatisticas]
        .filter((item) => item.ultimaCompra !== null)
        .sort((a, b) => (b.ultimaCompra ?? 0) - (a.ultimaCompra ?? 0))[0] ??
      null,
    [estatisticas],
  );

  const totalComCompras = estatisticas.filter(
    (item) => item.compras > 0,
  ).length;
  const totalDeVendas = estatisticas.reduce(
    (total, item) => total + item.compras,
    0,
  );
  const maiorNumeroCompras = Math.max(
    1,
    ...rankingCompras.map((item) => item.compras),
  );

  function abrirNovoCliente() {
    setClienteEmEdicao(null);
    setClienteSelecionado(null);
    setForm(FORM_VAZIO);
    setErro("");
    setModoModal("novo");
  }

  function abrirEdicao(cliente: ClienteItem) {
    setClienteEmEdicao(cliente);
    setClienteSelecionado(null);
    setForm({
      nome: cliente.nome,
      cpf: cliente.cpf,
      telefone: cliente.telefone ?? "",
      email: cliente.email ?? "",
    });
    setErro("");
    setModoModal("editar");
  }

  function abrirPerfil(cliente: ClienteItem) {
    setClienteSelecionado(cliente);
    setClienteEmEdicao(null);
    setErro("");
    setModoModal("perfil");
  }

  function abrirConfirmacaoExclusao(cliente: ClienteItem) {
    setClienteSelecionado(cliente);
    setClienteEmEdicao(null);
    setErro("");
    setSucesso("");
    setModoModal("excluir");
  }

  function fecharModal() {
    if (salvando || excluindo) return;
    setModoModal(null);
    setClienteEmEdicao(null);
    setClienteSelecionado(null);
    setErro("");
  }

  function atualizarCampo(campo: keyof ClienteForm, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nome = form.nome.trim();
    const cpf = form.cpf.replace(/\D/g, "");
    const telefone = form.telefone.trim();
    const email = form.email.trim();

    if (!nome || !cpf) {
      setErro("Nome e CPF são obrigatórios.");
      return;
    }
    if (!/^\d{11}$/.test(cpf)) {
      setErro("O CPF deve conter 11 dígitos numéricos.");
      return;
    }

    const dados: NovoCliente = {
      nome,
      cpf,
      telefone: telefone || null,
      email: email || null,
    };

    try {
      setSalvando(true);
      setErro("");

      if (modoModal === "editar" && clienteEmEdicao) {
        await apiFetch<unknown>(`/clientes/${clienteEmEdicao.id}`, {
          method: "PUT",
          body: JSON.stringify(dados),
        });
        setSucesso(`Os dados de ${nome} foram atualizados.`);
      } else {
        await apiFetch<unknown>("/clientes", {
          method: "POST",
          body: JSON.stringify(dados),
        });
        setSucesso(`Cliente ${nome} cadastrado com sucesso.`);
      }

      setModoModal(null);
      setClienteEmEdicao(null);
      setForm(FORM_VAZIO);
      await carregarDados();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o cliente. Verifique a API.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!clienteSelecionado || excluindo) return;

    const cliente = clienteSelecionado;
    setErro("");
    setSucesso("");
    setExcluindo(true);

    try {
      await apiFetch<unknown>(`/clientes/${cliente.id}`, { method: "DELETE" });
      setModoModal(null);
      setClienteSelecionado(null);
      setSucesso(`Cliente ${cliente.nome} excluído com sucesso.`);
      await carregarDados();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o cliente. Verifique a rota de exclusão da API.",
      );
    } finally {
      setExcluindo(false);
    }
  }

  const estatisticaPerfil = clienteSelecionado
    ? (estatisticas.find(
        (item) => String(item.cliente.id) === String(clienteSelecionado.id),
      ) ?? null)
    : null;

  return (
    <section className="clientes-manager">
      <div className="clientes-manager__heading">
        <div>
          <div className="clientes-manager__eyebrow">
            <span /> RELACIONAMENTO COM CLIENTES
          </div>
          <p>
            Gerencie sua base, acompanhe as compras e mantenha o relacionamento
            com seus clientes.
          </p>
        </div>
      </div>

      {sucesso && (
        <div className="clientes-alert clientes-alert--success" role="status">
          <Icone nome="check" tamanho={17} />
          <span>{sucesso}</span>
          <button
            type="button"
            aria-label="Fechar mensagem"
            onClick={() => setSucesso("")}
          >
            <Icone nome="x" tamanho={15} />
          </button>
        </div>
      )}
      {erro && !modoModal && (
        <div className="clientes-alert clientes-alert--error" role="alert">
          <span>{erro}</span>
          <button
            type="button"
            aria-label="Fechar mensagem"
            onClick={() => setErro("")}
          >
            <Icone nome="x" tamanho={15} />
          </button>
        </div>
      )}
      <div className="clientes-manager__stats">
        <article className="clientes-stat-card">
          <div className="clientes-stat-card__icon is-violet">
            <Icone nome="users" tamanho={20} />
          </div>
          <div>
            <span>Clientes cadastrados</span>
            <strong>
              {carregando ? "…" : clientes.length.toLocaleString("pt-BR")}
            </strong>
            <small>Base total da loja</small>
          </div>
        </article>
        <article className="clientes-stat-card">
          <div className="clientes-stat-card__icon is-cyan">
            <Icone nome="shopping" tamanho={20} />
          </div>
          <div>
            <span>Clientes compradores</span>
            <strong>
              {carregando ? "…" : totalComCompras.toLocaleString("pt-BR")}
            </strong>
            <small>Com vendas vinculadas</small>
          </div>
        </article>
        <article className="clientes-stat-card">
          <div className="clientes-stat-card__icon is-blue">
            <Icone nome="chart" tamanho={20} />
          </div>
          <div>
            <span>Vendas vinculadas</span>
            <strong>
              {carregando ? "…" : totalDeVendas.toLocaleString("pt-BR")}
            </strong>
            <small>Histórico disponível na API</small>
          </div>
        </article>
      </div>

      <div className="clientes-manager__layout">
        <section className="clientes-panel clientes-list-panel">
          <div className="clientes-panel__header">
            <div>
              <h2>Base de clientes</h2>
              <p>Consulte os cadastros e gerencie cada perfil.</p>
            </div>
            <div className="clientes-panel__header-actions">
              <span className="clientes-count-badge">
                {clientesFiltrados.length}{" "}
                {clientesFiltrados.length === 1 ? "cliente" : "clientes"}
              </span>
              <button
                className="clientes-button clientes-button--primary"
                type="button"
                onClick={abrirNovoCliente}
              >
                <Icone nome="plus" tamanho={16} /> Adicionar cliente
              </button>
            </div>
          </div>

          <label className="clientes-search">
            <Icone nome="search" tamanho={17} />
            <input
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome, CPF, telefone ou e-mail..."
              aria-label="Buscar clientes"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
              >
                <Icone nome="x" tamanho={15} />
              </button>
            )}
          </label>

          {carregando ? (
            <div className="clientes-state">
              <div className="clientes-spinner" />
              <strong>Carregando clientes...</strong>
              <p>Estamos consultando a base da loja.</p>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="clientes-state">
              <div className="clientes-state__icon">
                <Icone nome="users" tamanho={26} />
              </div>
              <strong>
                {busca ? "Nenhum cliente encontrado" : "Sua base começa aqui"}
              </strong>
              <p>
                {busca
                  ? "Tente buscar por outro nome, CPF, telefone ou e-mail."
                  : "Cadastre o primeiro cliente para iniciar o histórico de relacionamento da loja."}
              </p>
            </div>
          ) : (
            <div className="clientes-table-wrap">
              <table className="clientes-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contato</th>
                    <th>Compras</th>
                    <th>Valor acumulado</th>
                    <th className="clientes-table__actions-heading">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map(({ cliente, compras, totalGasto }) => (
                    <tr key={String(cliente.id)}>
                      <td>
                        <div className="clientes-person-cell">
                          <span className="clientes-avatar">
                            {iniciais(cliente.nome)}
                          </span>
                          <span className="clientes-person-copy">
                            <strong>{cliente.nome}</strong>
                            <small>CPF {cliente.cpf || "não informado"}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="clientes-contact-cell">
                          {cliente.email || "E-mail não informado"}
                        </span>
                        <small className="clientes-contact-sub">
                          {cliente.telefone || "Telefone não informado"}
                        </small>
                      </td>
                      <td>
                        <span className="clientes-purchase-count">
                          {compras}
                        </span>
                      </td>
                      <td>
                        <strong className="clientes-money">
                          {formatarMoeda(totalGasto)}
                        </strong>
                      </td>
                      <td>
                        <div className="clientes-row-actions">
                          <button
                            className="clientes-icon-button"
                            type="button"
                            title={`Visualizar perfil de ${cliente.nome}`}
                            aria-label={`Visualizar perfil de ${cliente.nome}`}
                            onClick={() => abrirPerfil(cliente)}
                          >
                            <Icone nome="eye" tamanho={16} />
                          </button>
                          <button
                            className="clientes-icon-button"
                            type="button"
                            title={`Editar ${cliente.nome}`}
                            aria-label={`Editar ${cliente.nome}`}
                            onClick={() => abrirEdicao(cliente)}
                          >
                            <Icone nome="edit" tamanho={16} />
                          </button>
                          <button
                            className="clientes-icon-button clientes-icon-button--danger"
                            type="button"
                            title={`Excluir ${cliente.nome}`}
                            aria-label={`Excluir ${cliente.nome}`}
                            onClick={() => abrirConfirmacaoExclusao(cliente)}
                          >
                            <Icone nome="trash" tamanho={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="clientes-panel__footer">
            <span>Dados obtidos da API da MS² Vestuário</span>
            <span>{clientes.length} cadastrados</span>
          </div>
        </section>

        <aside className="clientes-insights">
          <section className="clientes-panel clientes-highlight-panel">
            <div className="clientes-panel__header">
              <div>
                <h2>Visão do relacionamento</h2>
                <p>Resumo baseado nas vendas vinculadas.</p>
              </div>
            </div>
            <div className="clientes-highlight-card">
              <div className="clientes-highlight-card__icon">
                <Icone nome="trophy" tamanho={20} />
              </div>
              <div className="clientes-highlight-card__label">
                CLIENTE COM MAIS COMPRAS
              </div>
              {clienteMaisCompra ? (
                <>
                  <strong className="clientes-highlight-card__name">
                    {clienteMaisCompra.cliente.nome}
                  </strong>
                  <div className="clientes-highlight-card__meta">
                    {clienteMaisCompra.compras}{" "}
                    {clienteMaisCompra.compras === 1 ? "compra" : "compras"}{" "}
                    registradas
                  </div>
                  <div className="clientes-highlight-card__total">
                    {formatarMoeda(clienteMaisCompra.totalGasto)}
                  </div>
                </>
              ) : (
                <>
                  <strong className="clientes-highlight-card__name">
                    Sem histórico ainda
                  </strong>
                  <p>
                    Quando houver vendas vinculadas a clientes, o destaque
                    aparecerá aqui.
                  </p>
                </>
              )}
            </div>

            <div className="clientes-recent-box">
              <span className="clientes-recent-box__icon">
                <Icone nome="calendar" tamanho={17} />
              </span>
              <div>
                <small>COMPRA MAIS RECENTE</small>
                <strong>
                  {clienteMaisRecente?.cliente.nome ?? "Ainda não disponível"}
                </strong>
                <span>
                  {formatarData(clienteMaisRecente?.ultimaCompra ?? null)}
                </span>
              </div>
              {clienteMaisRecente && (
                <button
                  type="button"
                  title="Ver perfil do cliente"
                  aria-label="Ver perfil do cliente que comprou recentemente"
                  onClick={() => abrirPerfil(clienteMaisRecente.cliente)}
                >
                  <Icone nome="arrow" tamanho={16} />
                </button>
              )}
            </div>
          </section>

          <section className="clientes-panel clientes-ranking-panel">
            <div className="clientes-panel__header">
              <div>
                <h2>Clientes mais ativos</h2>
                <p>Ranking por quantidade de compras.</p>
              </div>
              <span className="clientes-ranking-icon">
                <Icone nome="chart" tamanho={17} />
              </span>
            </div>

            {rankingCompras.length ? (
              <div className="clientes-ranking-list">
                {rankingCompras.map((item, index) => (
                  <button
                    className="clientes-ranking-item"
                    type="button"
                    key={String(item.cliente.id)}
                    onClick={() => abrirPerfil(item.cliente)}
                  >
                    <span
                      className={`clientes-ranking-position rank-${index + 1}`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="clientes-ranking-main">
                      <span className="clientes-ranking-name">
                        {item.cliente.nome}
                      </span>
                      <span className="clientes-ranking-track">
                        <span
                          style={{
                            width: `${Math.max(8, (item.compras / maiorNumeroCompras) * 100)}%`,
                          }}
                        />
                      </span>
                    </span>
                    <span className="clientes-ranking-value">
                      {item.compras}
                    </span>
                  </button>
                ))}
                <div className="clientes-ranking-legend">
                  <span>0 compras</span>
                  <span>Mais compras</span>
                </div>
              </div>
            ) : (
              <div className="clientes-mini-empty">
                <Icone nome="chart" tamanho={22} />
                <p>
                  O gráfico será preenchido com o histórico real de vendas por
                  cliente.
                </p>
              </div>
            )}
          </section>

          <section className="clientes-panel clientes-insight-footer">
            <div className="clientes-insight-footer__icon">
              <Icone nome="users" tamanho={18} />
            </div>
            <div>
              <strong>Relacionamento em dia</strong>
              <p>
                Consulte o perfil de um cliente para conferir seus dados e as
                compras já vinculadas.
              </p>
            </div>
          </section>
        </aside>
      </div>

      {modoModal && (
        <div
          className="clientes-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) fecharModal();
          }}
        >
          <section
            className={`clientes-modal ${modoModal === "perfil" ? "clientes-modal--profile" : modoModal === "excluir" ? "clientes-modal--delete" : ""}`}
            role={modoModal === "excluir" ? "alertdialog" : "dialog"}
            aria-modal="true"
            aria-labelledby="clientes-modal-title"
            aria-describedby={modoModal === "excluir" ? "clientes-exclusao-descricao" : undefined}
          >
            <header className="clientes-modal__header">
              <div>
                <span className="clientes-modal__eyebrow">
                  {modoModal === "excluir" ? "CONFIRMAÇÃO DE EXCLUSÃO" : "MS² VESTUÁRIO · CLIENTES"}
                </span>
                <h2 id="clientes-modal-title">
                  {modoModal === "novo"
                    ? "Adicionar cliente"
                    : modoModal === "editar"
                      ? "Editar cadastro"
                      : modoModal === "excluir"
                        ? "Excluir cliente?"
                        : "Perfil do cliente"}
                </h2>
                <p>
                  {modoModal === "novo"
                    ? "Preencha os dados para incluir um cliente na base."
                    : modoModal === "editar"
                      ? "Atualize as informações cadastrais do cliente."
                      : modoModal === "excluir"
                        ? "Confirme a operação antes de continuar."
                        : "Informações cadastrais e resumo de relacionamento."}
                </p>
              </div>
              <button
                className="clientes-modal__close"
                type="button"
                onClick={fecharModal}
                disabled={salvando || excluindo}
                aria-label="Fechar modal"
              >
                <Icone nome="x" tamanho={19} />
              </button>
            </header>

            {modoModal === "excluir" && clienteSelecionado ? (
              <div className="clientes-delete-content">
                <div className="clientes-delete-symbol" aria-hidden="true">
                  <Icone nome="warning" tamanho={30} />
                </div>

                <p id="clientes-exclusao-descricao" className="clientes-delete-description">
                  Tem certeza de que deseja excluir este cliente da sua base de dados?
                </p>

                <div className="clientes-delete-target">
                  <span className="clientes-delete-avatar">{iniciais(clienteSelecionado.nome)}</span>
                  <div>
                    <strong>{clienteSelecionado.nome}</strong>
                    <span>CPF: {clienteSelecionado.cpf || "Não informado"}</span>
                  </div>
                </div>

                <div className="clientes-delete-warning">
                  <Icone nome="warning" tamanho={17} />
                  <span>Essa ação não pode ser desfeita. O cadastro será excluído permanentemente.</span>
                </div>

                {erro && (
                  <div className="clientes-alert clientes-alert--error" role="alert">
                    <span>{erro}</span>
                  </div>
                )}

                <footer className="clientes-modal__footer clientes-delete-footer">
                  <button
                    className="clientes-button clientes-button--secondary"
                    type="button"
                    onClick={fecharModal}
                    disabled={excluindo}
                    autoFocus
                  >
                    Cancelar
                  </button>
                  <button
                    className="clientes-button clientes-button--danger"
                    type="button"
                    onClick={() => void confirmarExclusao()}
                    disabled={excluindo}
                  >
                    {excluindo ? (
                      <> <span className="clientes-delete-loading" aria-hidden="true" /> Excluindo...</>
                    ) : (
                      <><Icone nome="trash" tamanho={16} /> Sim, excluir cliente</>
                    )}
                  </button>
                </footer>
              </div>
            ) : modoModal === "perfil" && clienteSelecionado ? (
              <div className="clientes-profile-content">
                <div className="clientes-profile-hero">
                  <span className="clientes-profile-avatar">
                    {iniciais(clienteSelecionado.nome)}
                  </span>
                  <div>
                    <h3>{clienteSelecionado.nome}</h3>
                    <span>
                      Cliente MS² Vestuário · #{clienteSelecionado.id}
                    </span>
                  </div>
                </div>
                <div className="clientes-profile-info-grid">
                  <div>
                    <span>CPF</span>
                    <strong>{clienteSelecionado.cpf || "Não informado"}</strong>
                  </div>
                  <div>
                    <span>Telefone</span>
                    <strong>
                      {clienteSelecionado.telefone || "Não informado"}
                    </strong>
                  </div>
                  <div className="clientes-profile-info-grid__wide">
                    <span>E-mail</span>
                    <strong>
                      {clienteSelecionado.email || "Não informado"}
                    </strong>
                  </div>
                </div>
                <div className="clientes-profile-metrics">
                  <div>
                    <span>Compras registradas</span>
                    <strong>{estatisticaPerfil?.compras ?? 0}</strong>
                  </div>
                  <div>
                    <span>Total comprado</span>
                    <strong>
                      {formatarMoeda(estatisticaPerfil?.totalGasto ?? 0)}
                    </strong>
                  </div>
                  <div>
                    <span>Última compra</span>
                    <strong>
                      {formatarData(estatisticaPerfil?.ultimaCompra ?? null)}
                    </strong>
                  </div>
                </div>
                <div className="clientes-profile-history">
                  <h3>Últimas compras</h3>
                  {estatisticaPerfil && estatisticaPerfil.vendas.length ? (
                    <div className="clientes-profile-history__list">
                      {estatisticaPerfil.vendas
                        .slice(0, 5)
                        .map((venda, index) => {
                          const idVenda = primeiroCampo(venda, [
                            "id",
                            "id_venda",
                            "codigo",
                            "numero",
                          ]);
                          return (
                            <div key={`${String(idVenda ?? index)}-${index}`}>
                              <span className="clientes-profile-history__icon">
                                <Icone nome="shopping" tamanho={16} />
                              </span>
                              <span>
                                <strong>Venda #{String(idVenda ?? "—")}</strong>
                                <small>{formatarData(dataVenda(venda))}</small>
                              </span>
                              <b>{formatarMoeda(valorVenda(venda))}</b>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="clientes-profile-history__empty">
                      Não há compras vinculadas a este cliente no histórico
                      disponível.
                    </p>
                  )}
                </div>
                <footer className="clientes-modal__footer">
                  <button
                    className="clientes-button clientes-button--secondary"
                    type="button"
                    onClick={fecharModal}
                  >
                    Fechar
                  </button>
                  <button
                    className="clientes-button clientes-button--primary"
                    type="button"
                    onClick={() => abrirEdicao(clienteSelecionado)}
                  >
                    <Icone nome="edit" tamanho={16} /> Editar cliente
                  </button>
                </footer>
              </div>
            ) : (
              <form className="clientes-modal__form" onSubmit={handleSubmit}>
                <div className="clientes-form-grid">
                  <label
                    className="clientes-field clientes-field--wide"
                    htmlFor="cliente-nome"
                  >
                    <span>
                      Nome completo <b>*</b>
                    </span>
                    <input
                      id="cliente-nome"
                      name="nome"
                      value={form.nome}
                      onChange={(event) =>
                        atualizarCampo("nome", event.target.value)
                      }
                      autoComplete="name"
                      placeholder="Ex.: João da Silva"
                      required
                      maxLength={140}
                    />
                  </label>
                  <label className="clientes-field" htmlFor="cliente-cpf">
                    <span>
                      CPF <b>*</b>
                    </span>
                    <input
                      id="cliente-cpf"
                      name="cpf"
                      value={form.cpf}
                      onChange={(event) =>
                        atualizarCampo("cpf", event.target.value)
                      }
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={14}
                      placeholder="000.000.000-00"
                      required
                    />
                    <small>Informe os 11 dígitos do CPF.</small>
                  </label>
                  <label className="clientes-field" htmlFor="cliente-telefone">
                    <span>Telefone</span>
                    <input
                      id="cliente-telefone"
                      name="telefone"
                      value={form.telefone}
                      onChange={(event) =>
                        atualizarCampo("telefone", event.target.value)
                      }
                      type="tel"
                      autoComplete="tel"
                      maxLength={25}
                      placeholder="(21) 99999-9999"
                    />
                  </label>
                  <label
                    className="clientes-field clientes-field--wide"
                    htmlFor="cliente-email"
                  >
                    <span>E-mail</span>
                    <input
                      id="cliente-email"
                      name="email"
                      value={form.email}
                      onChange={(event) =>
                        atualizarCampo("email", event.target.value)
                      }
                      type="email"
                      autoComplete="email"
                      maxLength={160}
                      placeholder="cliente@email.com"
                    />
                  </label>
                </div>

                {erro && (
                  <div
                    className="clientes-alert clientes-alert--error"
                    role="alert"
                  >
                    {erro}
                  </div>
                )}

                <div className="clientes-modal__privacy">
                  <Icone nome="check" tamanho={15} />
                  <span>
                    Os dados serão enviados para a base de clientes da loja.
                  </span>
                </div>
                <footer className="clientes-modal__footer">
                  <button
                    className="clientes-button clientes-button--secondary"
                    type="button"
                    onClick={fecharModal}
                    disabled={salvando}
                  >
                    Cancelar
                  </button>
                  <button
                    className="clientes-button clientes-button--primary"
                    type="submit"
                    disabled={salvando}
                  >
                    {salvando ? (
                      "Salvando..."
                    ) : (
                      <>
                        <Icone nome="check" tamanho={16} />{" "}
                        {modoModal === "editar"
                          ? "Salvar alterações"
                          : "Cadastrar cliente"}
                      </>
                    )}
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
