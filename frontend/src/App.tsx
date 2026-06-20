import { useEffect, useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import ListPage from "./pages/ListPage";
import DetailPage from "./pages/DetailPage";
import ComparePage from "./pages/ComparePage";

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      className="theme-toggle"
      onClick={() => setDark(d => !d)}
      aria-label="Toggle dark mode"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}

function Header() {
  const { pathname } = useLocation();
  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">Pokédex</Link>
      <nav style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link
          to="/compare"
          className={`app-header__nav-link${pathname === "/compare" ? " active" : ""}`}
        >
          ⚔ Comparar
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<ListPage />} />
        <Route path="/pokemon/:id" element={<DetailPage />} />
        <Route path="/compare" element={<ComparePage />} />
      </Routes>
    </>
  );
}
