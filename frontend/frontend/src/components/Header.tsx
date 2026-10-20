
import { useNavigate } from "react-router-dom";

import Button from "../components/Button";

import "./Header.css";

function Header() {
    const navigate = useNavigate();

    // ======================================================
    // LOGOUT - Encerrar sessão
    // ======================================================

    function handleLogout() {
        // Remove os dados da sessão
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("usuario");

        // Retorna para a página de login
        navigate("/login", {
            replace: true
        });
    }

    // ======================================================
    // INTERFACE - Cabeçalho
    // ======================================================

    return (
        <header className="header">
            <div>
                <h1 className="header-title">
                    MS² Vestuário
                </h1>

                <span className="header-subtitle">
                    Sistema de Gestão e PDV
                </span>
            </div>

            <Button
                type="button"
                variant="danger"
                onClick={handleLogout}
            >
                Sair
            </Button>
        </header>
    );
}

export default Header;
