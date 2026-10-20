import {
    useEffect,
    useState,
    type FormEvent
} from "react";

import { useNavigate } from "react-router-dom";

import Button from "../components/Button";
import Input from "../components/Input";
import { apiFetch } from "../services/api";

import type { LoginResponse } from "../types/usuario";

import "./Login.css";

type CadastroResponse = {
    mensagem: string;
    id: number;
};

// ======================================================
// PÁGINA - Login e cadastro de usuário
// ======================================================

function Login() {
    const navigate = useNavigate();

    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");
    const [mensagemLogin, setMensagemLogin] = useState("");

    const [cadastroAberto, setCadastroAberto] = useState(false);
    const [cadastrando, setCadastrando] = useState(false);
    const [erroCadastro, setErroCadastro] = useState("");

    // Fecha o modal com Escape, exceto durante o envio.
    useEffect(() => {
        if (!cadastroAberto) return;

        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape" && !cadastrando) {
                setCadastroAberto(false);
                setErroCadastro("");
            }
        }

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [cadastroAberto, cadastrando]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (carregando) return;

        setErro("");
        setMensagemLogin("");

        const formData = new FormData(event.currentTarget);
        const login = String(formData.get("login") ?? "").trim();
        const senha = String(formData.get("senha") ?? "");

        if (!login || !senha) {
            setErro("Informe o login e a senha.");
            return;
        }

        try {
            setCarregando(true);

            const response = await apiFetch<LoginResponse>(
                "/usuarios/login",
                {
                    method: "POST",
                    body: JSON.stringify({ login, senha })
                }
            );

            sessionStorage.setItem("token", response.token);
            sessionStorage.setItem("usuario", JSON.stringify(response.usuario));

            navigate("/pdv", { replace: true });
        } catch (error) {
            setErro(
                error instanceof Error
                    ? error.message
                    : "Não foi possível realizar o login."
            );
        } finally {
            setCarregando(false);
        }
    }

    function abrirCadastro() {
        setErroCadastro("");
        setErro("");
        setMensagemLogin("");
        setCadastroAberto(true);
    }

    async function handleCadastro(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (cadastrando) return;

        setErroCadastro("");

        const formData = new FormData(event.currentTarget);
        const nome = String(formData.get("nome") ?? "").trim();
        const login = String(formData.get("loginCadastro") ?? "").trim();
        const senha = String(formData.get("senhaCadastro") ?? "");
        const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

        if (!nome || !login || !senha || !confirmarSenha) {
            setErroCadastro("Preencha todos os campos.");
            return;
        }

        if (senha.length < 6) {
            setErroCadastro("A senha deve conter no mínimo 6 caracteres.");
            return;
        }

        if (senha !== confirmarSenha) {
            setErroCadastro("As senhas não coincidem.");
            return;
        }

        try {
            setCadastrando(true);

            const response = await apiFetch<CadastroResponse>(
                "/usuarios/cadastro",
                {
                    method: "POST",
                    body: JSON.stringify({ nome, login, senha })
                }
            );

            // O cadastro público sempre cria perfil de caixa no backend.
            setCadastroAberto(false);
            setErroCadastro("");
            setErro("");
            setMensagemLogin(
                response.mensagem || "Conta criada com sucesso. Entre com seu login e senha."
            );
        } catch (error) {
            setErroCadastro(
                error instanceof Error
                    ? error.message
                    : "Não foi possível criar a conta. Tente novamente."
            );
        } finally {
            setCadastrando(false);
        }
    }

    return (
        <main className="login-page">
            <section className="login-card" aria-labelledby="login-title">
                <div className="login-header">
                    <div className="login-brand-mark" aria-hidden="true">
                        <span>MS</span><sup>2</sup>
                    </div>

                    <h1 id="login-title">MS² Vestuário</h1>
                    <p>Sistema de Gestão e PDV</p>
                </div>

                <div className="login-welcome">
                    <span className="login-eyebrow">ACESSO AO SISTEMA</span>
                    <h2>Bem-vindo de volta</h2>
                    <p>Entre com suas credenciais para continuar.</p>
                </div>

                {mensagemLogin && (
                    <p className="login-success" role="status">
                        <span aria-hidden="true">✓</span>
                        {mensagemLogin}
                    </p>
                )}

                <form className="login-form" onSubmit={handleSubmit}>
                    <Input
                        id="login"
                        name="login"
                        label="Login"
                        type="text"
                        placeholder="Digite seu login"
                        autoComplete="username"
                        required
                    />

                    <Input
                        id="senha"
                        name="senha"
                        label="Senha"
                        type="password"
                        placeholder="Digite sua senha"
                        autoComplete="current-password"
                        required
                    />

                    {erro && (
                        <p className="login-error" role="alert">{erro}</p>
                    )}

                    <Button
                        type="submit"
                        className="login-button"
                        disabled={carregando}
                    >
                        {carregando ? "Entrando..." : "Entrar"}
                    </Button>
                </form>

                <div className="login-divider">
                    <span />
                    <span>OU</span>
                    <span />
                </div>

                <div className="login-register-prompt">
                    <span>Primeiro acesso à MS²?</span>
                    <button
                        type="button"
                        className="login-create-account"
                        onClick={abrirCadastro}
                    >
                        Criar conta
                        <span aria-hidden="true">↗</span>
                    </button>
                </div>

                <p className="login-legal-note">
                    O cadastro pela tela cria uma conta de operador de caixa.
                </p>
            </section>

            {cadastroAberto && (
                <div
                    className="login-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !cadastrando) {
                            setCadastroAberto(false);
                            setErroCadastro("");
                        }
                    }}
                >
                    <section
                        className="login-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="register-modal-title"
                    >
                        <div className="login-modal-topline" />

                        <header className="login-modal-header">
                            <div className="login-modal-icon" aria-hidden="true">
                                <span>+</span>
                            </div>
                            <button
                                type="button"
                                className="login-modal-close"
                                aria-label="Fechar cadastro"
                                disabled={cadastrando}
                                onClick={() => {
                                    setCadastroAberto(false);
                                    setErroCadastro("");
                                }}
                            >
                                ×
                            </button>

                            <span className="login-eyebrow">NOVO ACESSO</span>
                            <h2 id="register-modal-title">Criar sua conta</h2>
                            <p>Preencha os dados abaixo para cadastrar seu acesso à loja.</p>
                        </header>

                        <form className="login-modal-form" onSubmit={handleCadastro}>
                            <label className="login-modal-field" htmlFor="cadastro-nome">
                                <span>Nome completo</span>
                                <input
                                    id="cadastro-nome"
                                    name="nome"
                                    type="text"
                                    autoComplete="name"
                                    placeholder="Ex.: João da Silva"
                                    maxLength={100}
                                    required
                                    disabled={cadastrando}
                                />
                            </label>

                            <label className="login-modal-field" htmlFor="cadastro-login">
                                <span>Login</span>
                                <input
                                    id="cadastro-login"
                                    name="loginCadastro"
                                    type="text"
                                    autoComplete="username"
                                    placeholder="Escolha seu login"
                                    maxLength={100}
                                    required
                                    disabled={cadastrando}
                                />
                            </label>

                            <div className="login-modal-fields-row">
                                <label className="login-modal-field" htmlFor="cadastro-senha">
                                    <span>Senha</span>
                                    <input
                                        id="cadastro-senha"
                                        name="senhaCadastro"
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder="Mínimo 6 caracteres"
                                        minLength={6}
                                        required
                                        disabled={cadastrando}
                                    />
                                </label>

                                <label className="login-modal-field" htmlFor="cadastro-confirmar-senha">
                                    <span>Confirmar senha</span>
                                    <input
                                        id="cadastro-confirmar-senha"
                                        name="confirmarSenha"
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder="Repita a senha"
                                        minLength={6}
                                        required
                                        disabled={cadastrando}
                                    />
                                </label>
                            </div>

                            <div className="login-modal-security-note">
                                <span aria-hidden="true">◇</span>
                                <p>Por segurança, contas criadas aqui recebem acesso de caixa. O perfil gerente permanece restrito.</p>
                            </div>

                            {erroCadastro && (
                                <p className="login-error" role="alert">{erroCadastro}</p>
                            )}

                            <button
                                className="login-modal-submit"
                                type="submit"
                                disabled={cadastrando}
                            >
                                {cadastrando ? "Criando conta..." : "Criar conta"}
                                {!cadastrando && <span aria-hidden="true">→</span>}
                            </button>

                            <button
                                className="login-modal-back"
                                type="button"
                                disabled={cadastrando}
                                onClick={() => {
                                    setCadastroAberto(false);
                                    setErroCadastro("");
                                }}
                            >
                                Já tenho uma conta <span>· Voltar para o login</span>
                            </button>
                        </form>
                    </section>
                </div>
            )}
        </main>
    );
}

export default Login;
