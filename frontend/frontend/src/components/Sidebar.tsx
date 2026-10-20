
import { NavLink } from "react-router-dom";

import "./Sidebar.css";

function Sidebar() {
    return (
        <aside className="sidebar">
            <nav
                className="sidebar-nav"
                aria-label="Navegação principal"
            >
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        isActive
                            ? "sidebar-link active"
                            : "sidebar-link"
                    }
                >
                    Dashboard
                </NavLink>

                <NavLink
                    to="/pdv"
                    className={({ isActive }) =>
                        isActive
                            ? "sidebar-link active"
                            : "sidebar-link"
                    }
                >
                    PDV
                </NavLink>

                <NavLink
                    to="/produtos"
                    className={({ isActive }) =>
                        isActive
                            ? "sidebar-link active"
                            : "sidebar-link"
                    }
                >
                    Produtos
                </NavLink>

                <NavLink
                    to="/clientes"
                    className={({ isActive }) =>
                        isActive
                            ? "sidebar-link active"
                            : "sidebar-link"
                    }
                >
                    Clientes
                </NavLink>
            </nav>
        </aside>
    );
}

export default Sidebar;