import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { ThemeContext, type Theme } from "./themeContextValue";

function temaInicial(): Theme {
    if (typeof window === "undefined") return "dark";

    try {
        const salvo = window.localStorage.getItem("ms2-tema");
        if (salvo === "light" || salvo === "dark") return salvo;
    } catch (error) {
        console.warn("Não foi possível ler o tema salvo; usando a preferência do sistema.", error);
    }

    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function aplicarTemaNoDom(tema: Theme) {
    const root = document.documentElement;
    root.setAttribute("data-theme", tema);
    root.style.colorScheme = tema;
    root.classList.toggle("dark", tema === "dark");
    root.classList.toggle("light", tema === "light");

    document.body.setAttribute("data-theme", tema);
    document.body.style.colorScheme = tema;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(temaInicial);

    useLayoutEffect(() => {
        aplicarTemaNoDom(theme);
        try {
            window.localStorage.setItem("ms2-tema", theme);
        } catch (error) {
            console.warn("O tema foi aplicado, mas não pôde ser salvo neste navegador.", error);
        }
    }, [theme]);

    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === "ms2-tema" && (e.newValue === "light" || e.newValue === "dark")) {
                setThemeState(e.newValue);
            }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    const alternarTema = () => {
        setThemeState((atual) => (atual === "dark" ? "light" : "dark"));
    };

    const setTheme = (t: Theme) => {
        setThemeState(t);
    };

    return (
        <ThemeContext.Provider value={{ theme, alternarTema, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
