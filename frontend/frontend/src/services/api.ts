const BASE_URL = "http://localhost:3000";

// ======================================================
// API FETCH - Comunicação com o backend
// ======================================================

export async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    // Recupera o token do usuário autenticado.
    const token = sessionStorage.getItem("token");

    const headers = new Headers(options.headers);

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    // Login e cadastro inicial são públicos. Não anexamos um token antigo.
    const rotaPublica =
        endpoint === "/usuarios/login" ||
        endpoint === "/usuarios/cadastro";

    if (token && !rotaPublica) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.erro || data?.mensagem || "Erro ao realizar requisição."
        );
    }

    return data as T;
}
