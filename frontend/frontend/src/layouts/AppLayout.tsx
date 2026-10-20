import { Outlet } from "react-router-dom";

import Header from "../../src/components/Header";
import Sidebar from "../../src/components/Sidebar";

import "./AppLayout.css";

function AppLayout() {
    return (
        <div className="app-layout">
            <Header />

            <div className="app-layout-body">
                <Sidebar />

                <main className="app-layout-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AppLayout;