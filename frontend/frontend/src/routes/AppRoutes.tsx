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
import Vendas from "../pages/Vendas";
import Produtos from "../pages/Produtos";
import Clientes from "../pages/Clientes";
import Relatorios from "../pages/Relatorios";

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

                        <Route
                            path="/vendas"
                            element={<Vendas />}
                        />

                        <Route
                            path="/relatorios"
                            element={<Relatorios />}
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
