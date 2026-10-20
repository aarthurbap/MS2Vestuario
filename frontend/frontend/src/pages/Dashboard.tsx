import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import "./Dashboard.css";

/* =========================================================
   MS² VESTUÁRIO — DASHBOARD
   Tela inicial do sistema de gestão e PDV.

   API esperada (ajuste abaixo se suas rotas forem diferentes):
   GET http://localhost:3000/produtos
   GET http://localhost:3000/clientes
   GET http://localhost:3000/vendas
   Categorias fica indisponível até existir uma rota correspondente no backend.
   ========================================================= */

const API_BASE_URL = "http://localhost:3000";

const API_ENDPOINTS = {
  produtos: "/produtos",
  clientes: "/clientes",
  vendas: "/vendas",
} as const;

type EndpointKey = keyof typeof API_ENDPOINTS;
type MetricKey = EndpointKey | "categorias";
type MetricValues = Record<MetricKey, number | null>;
type ApiRecord = Record<string, unknown>;
type ApiStatus = "loading" | "connected" | "partial" | "offline";

type ApiResult = {
  key: EndpointKey;
  count: number | null;
  rows: ApiRecord[];
  ok: boolean;
  unauthorized: boolean;
};

type DashboardUser = {
  nome?: string;
  name?: string;
  login?: string;
  usuario?: string;
  perfil?: string;
  role?: string;
};

type IconName =
  | "grid"
  | "package"
  | "users"
  | "shopping-bag"
  | "chart"
  | "layers"
  | "settings"
  | "logout"
  | "arrow-up-right"
  | "arrow-right"
  | "sparkles"
  | "clock"
  | "plus"
  | "refresh"
  | "calendar"
  | "search"
  | "shirt"
  | "receipt"
  | "check-circle"
  | "activity"
  | "menu"
  | "sun"
  | "moon";

type IconProps = {
  name: IconName;
  size?: number;
};

const ICONS: Record<IconName, ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </>
  ),
  moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  package: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4.3 7.7 7.7 4.4 7.7-4.4M12 12.1V21M8 5.2l8 4.6" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  "shopping-bag": (
    <>
      <path d="M5 8h14l1 13H4L5 8Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V5M4 19h17" />
      <path d="m7 15 4-4 3 2 6-7" />
      <path d="M16 6h4v4" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path
        d="m19.4 15 .1.1 1.2.9-1.2 2.1-1.5-.5a8 8 0 0 1-1.6.9l-.3 1.5h-2.4l-.3-1.5a8 8 0 0 1-1.6-.9l-1.5.5-1.2-2.1 1.2-.9a7 7 0 0 1 0-1.9l-1.2-.9 1.2-2.1 1.5.5a8 8 0 0 1 1.6-.9l.3-1.5h2.4l.3 1.5a8 8 0 0 1 1.6.9l1.5-.5 1.2 2.1-1.2.9a7 7 0 0 1-.1 1.8Z"
        transform="translate(-1 -1) scale(1.08)"
      />
    </>
  ),
  logout: (
    <>
      <path d="M10 17l5-5-5-5M15 12H3" />
      <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
    </>
  ),
  "arrow-up-right": (
    <>
      <path d="M7 17 17 7M8 7h9v9" />
    </>
  ),
  "arrow-right": <path d="M5 12h14m-6-6 6 6-6 6" />,
  sparkles: (
    <>
      <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />
      <path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14ZM5 2l.8 2.2L8 5l-2.2.8L5 8l-.8-2.2L2 5l2.2-.8L5 2Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 5 5" />
    </>
  ),
  shirt: (
    <>
      <path d="m8 4 4 2 4-2 5 3-3 5-2-1v9H8v-9l-2 1-3-5 5-3Z" />
      <path d="M9 4a3 3 0 0 0 6 0" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </>
  ),
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  activity: (
    <>
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
};

function Icon({ name, size = 18 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}

const INITIAL_METRICS: MetricValues = {
  produtos: null,
  clientes: null,
  vendas: null,
  categorias: null,
};

const NAV_ITEMS: Array<{
  label: string;
  path: string;
  icon: IconName;
  id: string;
  disabled?: boolean;
}> = [
  { label: "Visão geral", path: "/dashboard", icon: "grid", id: "overview" },
  { label: "Produtos", path: "/produtos", icon: "package", id: "products" },
  { label: "Clientes", path: "/clientes", icon: "users", id: "customers" },
  { label: "PDV / Caixa", path: "/pdv", icon: "shopping-bag", id: "pdv" },
  // Ainda não existem páginas de histórico de vendas e relatórios no AppRoutes.
  // Mantemos os itens visíveis, mas desabilitados para não redirecionar ao login.
  {
    label: "Vendas",
    path: "/vendas",
    icon: "receipt",
    id: "sales",
    disabled: true,
  },
  {
    label: "Relatórios",
    path: "/relatorios",
    icon: "chart",
    id: "reports",
    disabled: true,
  },
];

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUser(value: string | null): DashboardUser | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return null;

    const nestedUser = parsed.usuario ?? parsed.user ?? parsed.dados;
    const userRecord = isRecord(nestedUser) ? nestedUser : parsed;

    return {
      nome: typeof userRecord.nome === "string" ? userRecord.nome : undefined,
      name: typeof userRecord.name === "string" ? userRecord.name : undefined,
      login:
        typeof userRecord.login === "string" ? userRecord.login : undefined,
      usuario:
        typeof userRecord.usuario === "string" ? userRecord.usuario : undefined,
      perfil:
        typeof userRecord.perfil === "string" ? userRecord.perfil : undefined,
      role: typeof userRecord.role === "string" ? userRecord.role : undefined,
    };
  } catch {
    return null;
  }
}

function extractCollection(payload: unknown): {
  count: number | null;
  rows: ApiRecord[];
} {
  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      rows: payload.filter(isRecord),
    };
  }

  if (!isRecord(payload)) {
    return { count: null, rows: [] };
  }

  const collectionKeys = [
    "dados",
    "data",
    "items",
    "itens",
    "rows",
    "resultados",
    "produtos",
    "clientes",
    "vendas",
    "categorias",
  ];

  let collection: unknown[] | null = null;

  for (const key of collectionKeys) {
    if (Array.isArray(payload[key])) {
      collection = payload[key] as unknown[];
      break;
    }
  }

  const totalKeys = [
    "total_registros",
    "total",
    "count",
    "quantidade",
    "totalRegistros",
  ];
  let explicitCount: number | null = null;

  for (const key of totalKeys) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      explicitCount = value;
      break;
    }
    if (
      typeof value === "string" &&
      value.trim() !== "" &&
      Number.isFinite(Number(value))
    ) {
      explicitCount = Number(value);
      break;
    }
  }

  return {
    count: explicitCount ?? (collection ? collection.length : null),
    rows: collection ? collection.filter(isRecord) : [],
  };
}

async function consultarColecao(
  key: EndpointKey,
  token: string,
): Promise<ApiResult> {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS[key]}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      return { key, count: null, rows: [], ok: false, unauthorized: true };
    }

    if (!response.ok) {
      return { key, count: null, rows: [], ok: false, unauthorized: false };
    }

    const payload: unknown = await response.json().catch(() => null);
    const collection = extractCollection(payload);

    return {
      key,
      count: collection.count,
      rows: collection.rows,
      ok: true,
      unauthorized: false,
    };
  } catch {
    return { key, count: null, rows: [], ok: false, unauthorized: false };
  }
}

function getToken(): string | null {
  return (
    sessionStorage.getItem("token") ??
    sessionStorage.getItem("kamikase_token") ??
    localStorage.getItem("kamikase_token") ??
    localStorage.getItem("token")
  );
}

function getUserName(user: DashboardUser | null): string {
  const name = user?.nome || user?.name || user?.login || user?.usuario;
  if (typeof name === "string" && name.trim()) {
    return name.trim().split(/\s+/)[0];
  }
  return "Equipe MS²";
}

function getUserInitials(user: DashboardUser | null): string {
  const name = user?.nome || user?.name || user?.login || user?.usuario || "MS";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getField(record: ApiRecord, candidates: string[]): unknown {
  for (const key of candidates) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function getText(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (isRecord(value)) {
    const nested = value.nome ?? value.name ?? value.descricao ?? value.login;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  }
  return fallback;
}

function formatSaleDate(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number")
    return "Data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: unknown): string {
  if (typeof value !== "number" && typeof value !== "string") return "—";

  let numberValue: number;
  if (typeof value === "number") {
    numberValue = value;
  } else {
    const normalized = value
      .trim()
      .replace(/R\$\s?/gi, "")
      .replace(/\s/g, "")
      .replace(/\.(?=\d{3}(?:[,.]|$))/g, "")
      .replace(",", ".");
    numberValue = Number(normalized);
  }

  if (!Number.isFinite(numberValue)) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue);
}

function getSaleStatus(value: unknown): string {
  const status = getText(value, "Registrada");
  const normalized = status.toLocaleLowerCase("pt-BR");
  if (normalized.includes("cancel")) return "Cancelada";
  if (normalized.includes("pend")) return "Pendente";
  if (normalized.includes("conclu") || normalized.includes("final"))
    return "Concluída";
  return status;
}

function getStatusClass(status: string): string {
  const normalized = status.toLocaleLowerCase("pt-BR");
  if (normalized.includes("cancel")) return "is-cancelled";
  if (normalized.includes("pend")) return "is-pending";
  return "is-complete";
}

function IconButtonLabel({ children }: { children: ReactNode }) {
  return <span className="ms2-dashboard__button-label">{children}</span>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const isOverviewPage = location.pathname === "/dashboard";
  const currentPageLabel =
    NAV_ITEMS.find((item) => item.path === location.pathname)?.label ??
    "Visão geral";

  const [usuario, setUsuario] = useState<DashboardUser | null>(null);
  const [metricas, setMetricas] = useState<MetricValues>(INITIAL_METRICS);
  const [vendasRecentes, setVendasRecentes] = useState<ApiRecord[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("loading");
  const [erroGeral, setErroGeral] = useState("");
  const [buscaVendas, setBuscaVendas] = useState("");
  const [tema, setTema] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const salvo = window.localStorage.getItem("ms2-tema");
    return salvo === "light" || salvo === "dark" ? salvo : "dark";
  });

  useEffect(() => {
    window.localStorage.setItem("ms2-tema", tema);
    document.documentElement.setAttribute("data-theme", tema);
  }, [tema]);

  const alternarTema = () =>
    setTema((atual) => (atual === "dark" ? "light" : "dark"));

  const nomeUsuario = useMemo(() => getUserName(usuario), [usuario]);
  const iniciaisUsuario = useMemo(() => getUserInitials(usuario), [usuario]);
  const dataAtual = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    let ativo = true;
    const token = getToken();

    if (!token) {
      navigate("/login", { replace: true });
      return () => {
        ativo = false;
      };
    }

    const dadosUsuario =
      localStorage.getItem("kamikase_usuario") ??
      localStorage.getItem("usuario") ??
      localStorage.getItem("user");

    setUsuario(parseUser(dadosUsuario));
    setCarregando(true);
    setApiStatus("loading");
    setErroGeral("");

    const carregarDados = async () => {
      const results = await Promise.all(
        (Object.keys(API_ENDPOINTS) as EndpointKey[]).map((key) =>
          consultarColecao(key, token),
        ),
      );

      if (!ativo) return;

      // Uma falha 401 em um módulo isolado não deve apagar a sessão.
      // O Dashboard continua aberto e mostra o estado de conexão abaixo.

      const metricasAtualizadas: MetricValues = {
        produtos:
          results.find((item) => item.key === "produtos")?.count ?? null,
        clientes:
          results.find((item) => item.key === "clientes")?.count ?? null,
        vendas: results.find((item) => item.key === "vendas")?.count ?? null,
        categorias: null,
      };

      const resultadosComSucesso = results.filter((result) => result.ok).length;
      setMetricas(metricasAtualizadas);
      setVendasRecentes(
        results.find((item) => item.key === "vendas")?.rows ?? [],
      );
      setApiStatus(
        resultadosComSucesso === results.length
          ? "connected"
          : resultadosComSucesso > 0
            ? "partial"
            : "offline",
      );

      if (results.some((result) => result.unauthorized)) {
        setErroGeral(
          "A API recusou o acesso a um ou mais módulos. A sessão foi mantida; confira a autorização e a rota do módulo no backend.",
        );
      } else if (resultadosComSucesso === 0) {
        setErroGeral(
          "Não foi possível carregar os indicadores. Confira se a API está ligada e se os endpoints estão corretos.",
        );
      } else if (resultadosComSucesso < results.length) {
        setErroGeral(
          "Alguns módulos ainda não responderam à API. Os indicadores disponíveis continuam sendo exibidos.",
        );
      }

      setCarregando(false);
    };

    void carregarDados().catch(() => {
      if (!ativo) return;
      setApiStatus("offline");
      setErroGeral(
        "Ocorreu um problema ao consultar a API. Tente atualizar os dados.",
      );
      setCarregando(false);
    });

    return () => {
      ativo = false;
    };
  }, [navigate]);

  const atualizarDados = async () => {
    const token = getToken();
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setCarregando(true);
    setErroGeral("");

    const results = await Promise.all(
      (Object.keys(API_ENDPOINTS) as EndpointKey[]).map((key) =>
        consultarColecao(key, token),
      ),
    );

    // Não encerrar a sessão por falha de um endpoint específico.
    // A proteção de rota continua validando a presença do token.

    setMetricas({
      produtos: results.find((item) => item.key === "produtos")?.count ?? null,
      clientes: results.find((item) => item.key === "clientes")?.count ?? null,
      vendas: results.find((item) => item.key === "vendas")?.count ?? null,
      categorias: null,
    });
    setVendasRecentes(
      results.find((item) => item.key === "vendas")?.rows ?? [],
    );

    const okCount = results.filter((result) => result.ok).length;
    setApiStatus(
      okCount === results.length
        ? "connected"
        : okCount > 0
          ? "partial"
          : "offline",
    );
    if (results.some((result) => result.unauthorized)) {
      setErroGeral(
        "A API recusou o acesso a um ou mais módulos. A sessão foi mantida; confira a autorização e a rota do módulo no backend.",
      );
    } else if (okCount < results.length) {
      setErroGeral(
        okCount === 0
          ? "Não foi possível carregar os indicadores. Confira a conexão da API."
          : "Alguns módulos não responderam à API. Os indicadores disponíveis foram atualizados.",
      );
    }
    setCarregando(false);
  };

  const vendasFiltradas = useMemo(() => {
    const termo = buscaVendas.trim().toLocaleLowerCase("pt-BR");
    const sorted = [...vendasRecentes].sort((a, b) => {
      const dateA = getField(a, [
        "data_venda",
        "dataVenda",
        "data",
        "criado_em",
        "created_at",
      ]);
      const dateB = getField(b, [
        "data_venda",
        "dataVenda",
        "data",
        "criado_em",
        "created_at",
      ]);
      const timeA = dateA ? new Date(String(dateA)).getTime() : 0;
      const timeB = dateB ? new Date(String(dateB)).getTime() : 0;
      return (
        (Number.isFinite(timeB) ? timeB : 0) -
        (Number.isFinite(timeA) ? timeA : 0)
      );
    });

    if (!termo) return sorted.slice(0, 5);

    return sorted
      .filter((sale) => {
        const id = getText(
          getField(sale, ["id", "id_venda", "codigo", "numero"]),
          "",
        );
        const client = getText(
          getField(sale, [
            "cliente_nome",
            "nome_cliente",
            "cliente",
            "nomeCliente",
          ]),
          "",
        );
        const status = getText(
          getField(sale, ["status", "situacao", "estado"]),
          "",
        );
        return `${id} ${client} ${status}`
          .toLocaleLowerCase("pt-BR")
          .includes(termo);
      })
      .slice(0, 5);
  }, [buscaVendas, vendasRecentes]);

  const sair = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("kamikase_token");
    localStorage.removeItem("kamikase_token");
    localStorage.removeItem("kamikase_usuario");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const metricCards: Array<{
    key: MetricKey;
    title: string;
    subtitle: string;
    icon: IconName;
    tone: string;
  }> = [
    {
      key: "produtos",
      title: "Produtos cadastrados",
      subtitle: "Itens no catálogo",
      icon: "package",
      tone: "violet",
    },
    {
      key: "clientes",
      title: "Clientes cadastrados",
      subtitle: "Base de clientes",
      icon: "users",
      tone: "cyan",
    },
    {
      key: "vendas",
      title: "Vendas registradas",
      subtitle: "Movimentações de venda",
      icon: "receipt",
      tone: "blue",
    },
    {
      key: "categorias",
      title: "Categorias",
      subtitle: "Grupos de produtos",
      icon: "layers",
      tone: "pink",
    },
  ];

  const statusLabel: Record<ApiStatus, string> = {
    loading: "Sincronizando dados",
    connected: "API conectada",
    partial: "Conexão parcial",
    offline: "API indisponível",
  };

  return (
    <div
      className={`ms2-dashboard ${tema === "light" ? "ms2-dashboard--light" : ""}`}
      data-theme={tema}
    >
      <aside className="ms2-dashboard__sidebar">
        <div className="ms2-dashboard__brand">
          <div className="ms2-dashboard__brand-mark" aria-hidden="true">
            <span>MS</span>
            <sup>2</sup>
          </div>
          <div className="ms2-dashboard__brand-copy">
            <strong>MS² Vestuário</strong>
            <span>Gestão &amp; PDV</span>
          </div>
        </div>

        <div className="ms2-dashboard__nav-label">MENU PRINCIPAL</div>
        <nav className="ms2-dashboard__nav" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => (
            <button
              className={`ms2-dashboard__nav-item ${location.pathname === item.path ? "is-active" : ""} ${item.disabled ? "is-disabled" : ""}`}
              type="button"
              key={item.id}
              onClick={() => {
                if (!item.disabled) navigate(item.path);
              }}
              disabled={item.disabled}
              aria-current={
                location.pathname === item.path ? "page" : undefined
              }
              aria-disabled={item.disabled || undefined}
              title={
                item.disabled
                  ? "Este módulo ainda não foi disponibilizado."
                  : undefined
              }
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.id === "pdv" && (
                <span className="ms2-dashboard__nav-pill">PDV</span>
              )}
              {item.disabled && (
                <span className="ms2-dashboard__nav-pill">Em breve</span>
              )}
            </button>
          ))}
        </nav>

        <div className="ms2-dashboard__sidebar-spacer" />

        <div className="ms2-dashboard__sidebar-note">
          <div className="ms2-dashboard__sidebar-note-icon">
            <Icon name="sparkles" size={18} />
          </div>
          <strong>Uma loja mais conectada.</strong>
          <p>Gerencie o catálogo e acompanhe a operação em um só lugar.</p>
        </div>

        <button className="ms2-dashboard__logout" type="button" onClick={sair}>
          <Icon name="logout" size={18} />
          <span>Sair do sistema</span>
        </button>

        <div className="ms2-dashboard__sidebar-footer">
          MS² VESTUÁRIO <span>•</span> v1.0
        </div>
      </aside>

      <div className="ms2-dashboard__workspace">
        <header className="ms2-dashboard__topbar">
          <div className="ms2-dashboard__breadcrumbs">
            <span>MS² Vestuário</span>
            <span className="ms2-dashboard__breadcrumb-separator">/</span>
            <strong>{currentPageLabel}</strong>
          </div>

          <div className="ms2-dashboard__topbar-right">
            <button
              type="button"
              className="ms2-dashboard__theme-toggle"
              onClick={alternarTema}
              aria-label={
                tema === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
              }
              title={tema === "dark" ? "Tema claro" : "Tema escuro"}
            >
              <Icon name={tema === "dark" ? "sun" : "moon"} size={17} />
              <span>{tema === "dark" ? "Claro" : "Escuro"}</span>
            </button>
            <div className="ms2-dashboard__date">
              <Icon name="calendar" size={16} />
              <span>{dataAtual}</span>
            </div>
            <div className="ms2-dashboard__topbar-divider" />
            <div className="ms2-dashboard__profile">
              <div className="ms2-dashboard__avatar">{iniciaisUsuario}</div>
              <div className="ms2-dashboard__profile-copy">
                <strong>{nomeUsuario}</strong>
                <span>
                  {usuario?.perfil || usuario?.role || "Acesso ao sistema"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="ms2-dashboard__main">
          {isOverviewPage ? (
            <>
              <section className="ms2-dashboard__page-heading">
                <div>
                  <div className="ms2-dashboard__eyebrow">
                    <span className="ms2-dashboard__eyebrow-line" />
                    PAINEL DE CONTROLE
                  </div>
                  <h1>
                    Visão geral<span>.</span>
                  </h1>
                  <p>
                    Olá, {nomeUsuario}. Aqui está o resumo da operação da sua
                    loja.
                  </p>
                </div>

                <button
                  className="ms2-dashboard__primary-button"
                  type="button"
                  onClick={() => navigate("/pdv")}
                >
                  <Icon name="plus" size={18} />
                  <IconButtonLabel>Nova venda</IconButtonLabel>
                </button>
              </section>

              <section className="ms2-dashboard__welcome-card">
                <div className="ms2-dashboard__welcome-orb ms2-dashboard__welcome-orb--one" />
                <div className="ms2-dashboard__welcome-orb ms2-dashboard__welcome-orb--two" />
                <div className="ms2-dashboard__welcome-content">
                  <div className="ms2-dashboard__welcome-label">
                    <Icon name="sparkles" size={15} />
                    SEU CENTRO DE OPERAÇÕES
                  </div>
                  <h2>
                    Organização que acompanha
                    <br className="ms2-dashboard__desktop-break" /> o ritmo da
                    sua loja.
                  </h2>
                  <p>
                    Consulte seus módulos, mantenha o catálogo em ordem e
                    agilize o atendimento no caixa.
                  </p>
                  <button
                    className="ms2-dashboard__welcome-link"
                    type="button"
                    onClick={() => navigate("/produtos")}
                  >
                    Acessar catálogo <Icon name="arrow-right" size={16} />
                  </button>
                </div>
                <div className="ms2-dashboard__welcome-art" aria-hidden="true">
                  <div className="ms2-dashboard__art-ring ms2-dashboard__art-ring--outer" />
                  <div className="ms2-dashboard__art-ring ms2-dashboard__art-ring--inner" />
                  <div className="ms2-dashboard__art-card">
                    <div className="ms2-dashboard__art-card-top">
                      <span /> <span /> <span />
                    </div>
                    <div className="ms2-dashboard__art-shirt">
                      <Icon name="shirt" size={64} />
                    </div>
                    <div className="ms2-dashboard__art-lines">
                      <span />
                      <span />
                    </div>
                    <div className="ms2-dashboard__art-tag">
                      <Icon name="check-circle" size={15} /> Catálogo
                    </div>
                  </div>
                </div>
              </section>

              <section className="ms2-dashboard__section">
                <div className="ms2-dashboard__section-heading">
                  <div>
                    <h2>Resumo do sistema</h2>
                    <p>Indicadores carregados dos módulos disponíveis.</p>
                  </div>
                  <div
                    className={`ms2-dashboard__api-status is-${apiStatus}`}
                    role="status"
                  >
                    <span className="ms2-dashboard__status-dot" />
                    {statusLabel[apiStatus]}
                  </div>
                </div>

                {erroGeral && (
                  <div className="ms2-dashboard__notice" role="status">
                    <Icon name="activity" size={17} />
                    <span>{erroGeral}</span>
                  </div>
                )}

                <div className="ms2-dashboard__metrics-grid">
                  {metricCards.map((metric) => (
                    <article
                      className="ms2-dashboard__metric-card"
                      key={metric.key}
                    >
                      <div
                        className={`ms2-dashboard__metric-icon is-${metric.tone}`}
                      >
                        <Icon name={metric.icon} size={20} />
                      </div>
                      <div className="ms2-dashboard__metric-copy">
                        <span>{metric.title}</span>
                        <strong>
                          {carregando
                            ? "…"
                            : metricas[metric.key] === null
                              ? "—"
                              : metricas[metric.key]?.toLocaleString("pt-BR")}
                        </strong>
                        <small>{metric.subtitle}</small>
                      </div>
                      <span className="ms2-dashboard__metric-glow" />
                    </article>
                  ))}
                </div>
              </section>

              <section className="ms2-dashboard__content-grid">
                <article className="ms2-dashboard__panel ms2-dashboard__sales-panel">
                  <div className="ms2-dashboard__panel-heading">
                    <div>
                      <div className="ms2-dashboard__panel-title-row">
                        <h2>Vendas recentes</h2>
                        <span className="ms2-dashboard__live-indicator">
                          <span /> API
                        </span>
                      </div>
                      <p>Últimos registros retornados pelo módulo de vendas.</p>
                    </div>
                    <button
                      className="ms2-dashboard__icon-button"
                      type="button"
                      onClick={atualizarDados}
                      disabled={carregando}
                      title="Atualizar dados"
                      aria-label="Atualizar dados"
                    >
                      <Icon name="refresh" size={17} />
                    </button>
                  </div>

                  <div className="ms2-dashboard__table-search">
                    <Icon name="search" size={16} />
                    <input
                      type="search"
                      aria-label="Buscar venda por código, cliente ou status"
                      placeholder="Buscar nas vendas recentes..."
                      value={buscaVendas}
                      onChange={(event) => setBuscaVendas(event.target.value)}
                    />
                  </div>

                  {vendasFiltradas.length > 0 ? (
                    <div className="ms2-dashboard__table-wrap">
                      <table className="ms2-dashboard__table">
                        <thead>
                          <tr>
                            <th>Venda</th>
                            <th>Cliente</th>
                            <th>Data</th>
                            <th>Valor</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendasFiltradas.map((sale, index) => {
                            const id = getText(
                              getField(sale, [
                                "id",
                                "id_venda",
                                "codigo",
                                "numero",
                              ]),
                              String(index + 1),
                            );
                            const client = getText(
                              getField(sale, [
                                "cliente_nome",
                                "nome_cliente",
                                "cliente",
                                "nomeCliente",
                              ]),
                              "Cliente não informado",
                            );
                            const date = formatSaleDate(
                              getField(sale, [
                                "data_venda",
                                "dataVenda",
                                "data",
                                "criado_em",
                                "created_at",
                              ]),
                            );
                            const amount = formatCurrency(
                              getField(sale, [
                                "valor_total",
                                "total_venda",
                                "total",
                                "valor",
                                "valorFinal",
                              ]),
                            );
                            const status = getSaleStatus(
                              getField(sale, ["status", "situacao", "estado"]),
                            );

                            return (
                              <tr key={`${id}-${index}`}>
                                <td>
                                  <span className="ms2-dashboard__sale-code">
                                    #{id}
                                  </span>
                                </td>
                                <td>
                                  <span className="ms2-dashboard__sale-client">
                                    {client}
                                  </span>
                                </td>
                                <td>
                                  <span className="ms2-dashboard__sale-date">
                                    {date}
                                  </span>
                                </td>
                                <td>
                                  <strong className="ms2-dashboard__sale-amount">
                                    {amount}
                                  </strong>
                                </td>
                                <td>
                                  <span
                                    className={`ms2-dashboard__sale-status ${getStatusClass(status)}`}
                                  >
                                    {status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="ms2-dashboard__empty-state">
                      <div className="ms2-dashboard__empty-icon">
                        <Icon name="receipt" size={23} />
                      </div>
                      <strong>
                        {buscaVendas
                          ? "Nenhuma venda encontrada"
                          : "Suas vendas aparecerão aqui"}
                      </strong>
                      <p>
                        {buscaVendas
                          ? "Tente buscar por outro código, cliente ou status."
                          : "Quando a API de vendas retornar registros, você poderá acompanhá-los neste painel."}
                      </p>
                      {!buscaVendas && (
                        <button type="button" onClick={() => navigate("/pdv")}>
                          Abrir PDV <Icon name="arrow-right" size={15} />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="ms2-dashboard__panel-footer">
                    <span>
                      <Icon name="clock" size={15} /> Exibindo até 5 registros
                    </span>
                    <button type="button" onClick={() => navigate("/pdv")}>
                      Abrir PDV <Icon name="arrow-up-right" size={15} />
                    </button>
                  </div>
                </article>

                <aside className="ms2-dashboard__panel ms2-dashboard__shortcuts-panel">
                  <div className="ms2-dashboard__panel-heading">
                    <div>
                      <h2>Acesso rápido</h2>
                      <p>Atalhos para as tarefas do dia.</p>
                    </div>
                  </div>

                  <div className="ms2-dashboard__shortcut-list">
                    <button
                      className="ms2-dashboard__shortcut"
                      type="button"
                      onClick={() => navigate("/pdv")}
                    >
                      <span className="ms2-dashboard__shortcut-icon is-violet">
                        <Icon name="shopping-bag" size={19} />
                      </span>
                      <span className="ms2-dashboard__shortcut-copy">
                        <strong>Abrir o PDV</strong>
                        <small>Iniciar atendimento no caixa</small>
                      </span>
                      <Icon name="arrow-up-right" size={17} />
                    </button>
                    <button
                      className="ms2-dashboard__shortcut"
                      type="button"
                      onClick={() => navigate("/produtos")}
                    >
                      <span className="ms2-dashboard__shortcut-icon is-cyan">
                        <Icon name="package" size={19} />
                      </span>
                      <span className="ms2-dashboard__shortcut-copy">
                        <strong>Gerenciar produtos</strong>
                        <small>Consultar e atualizar o catálogo</small>
                      </span>
                      <Icon name="arrow-up-right" size={17} />
                    </button>
                    <button
                      className="ms2-dashboard__shortcut"
                      type="button"
                      onClick={() => navigate("/clientes")}
                    >
                      <span className="ms2-dashboard__shortcut-icon is-blue">
                        <Icon name="users" size={19} />
                      </span>
                      <span className="ms2-dashboard__shortcut-copy">
                        <strong>Consultar clientes</strong>
                        <small>Acessar a base de clientes</small>
                      </span>
                      <Icon name="arrow-up-right" size={17} />
                    </button>
                    <button
                      className="ms2-dashboard__shortcut"
                      type="button"
                      disabled
                      title="O módulo de relatórios ainda não foi implementado."
                    >
                      <span className="ms2-dashboard__shortcut-icon is-pink">
                        <Icon name="chart" size={19} />
                      </span>
                      <span className="ms2-dashboard__shortcut-copy">
                        <strong>Relatórios em breve</strong>
                        <small>O módulo será disponibilizado futuramente</small>
                      </span>
                      <Icon name="clock" size={17} />
                    </button>
                  </div>

                  <div className="ms2-dashboard__help-card">
                    <div className="ms2-dashboard__help-icon">
                      <Icon name="sparkles" size={17} />
                    </div>
                    <div>
                      <strong>Precisa de uma mão?</strong>
                      <p>
                        Use o menu lateral para navegar pelos módulos do
                        sistema.
                      </p>
                    </div>
                  </div>
                </aside>
              </section>
            </>
          ) : (
            <div className="ms2-dashboard__module-page" key={location.pathname}>
              <Outlet />
            </div>
          )}

          <footer className="ms2-dashboard__footer">
            <span>© {new Date().getFullYear()} MS² Vestuário</span>
            <span>Gestão feita para acompanhar o seu negócio.</span>
            <span className={`ms2-dashboard__footer-status is-${apiStatus}`}>
              <span /> {statusLabel[apiStatus]}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
