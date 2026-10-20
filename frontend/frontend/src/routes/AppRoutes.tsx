import {
    BrowserRouter,
    Navigate,
    Outlet,
    Route,
    Routes
} from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import PDV from "../pages/PDV";
import Produtos from "../pages/Produtos";
import Clientes from "../pages/Clientes";

// ======================================================
// PROTEÇÃO DE ROTAS
// ======================================================

function RotaProtegida() {
    const token = sessionStorage.getItem("token");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}

// ======================================================
// ROTAS DO FRONTEND
// Dashboard é o layout compartilhado das áreas internas.
// Não adicionar AppLayout aqui, pois isso duplicaria o menu
// antigo (cabeçalho branco e sidebar legada).
// ======================================================

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={<Navigate to="/login" replace />}
                />

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route element={<RotaProtegida />}>
                    <Route element={<Dashboard />}>
                        {/* O próprio Dashboard exibe a Visão geral em /dashboard. */}
                        <Route path="/dashboard" />

                        <Route
                            path="/produtos"
                            element={<Produtos />}
                        />

                        <Route
                            path="/clientes"
                            element={<Clientes />}
                        />

                        <Route
                            path="/pdv"
                            element={<PDV />}
                        />
                    </Route>
                </Route>

                <Route
                    path="*"
                    element={<Navigate to="/login" replace />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;
