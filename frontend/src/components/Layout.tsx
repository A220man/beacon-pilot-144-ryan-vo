import { ReactNode, useState } from "react";
import { Link, useLocation, NavLink } from "react-router-dom";
import { Menu, X, LogOut, User, Settings, Home, Brain, GitBranch, FileText } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./Button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/skills", label: "Skills", icon: Brain },
    { path: "/evaluations", label: "Evaluations", icon: GitBranch },
    { path: "/capsules", label: "Memory Capsules", icon: FileText },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        className="sidebar"
        style={{
          width: "260px",
          backgroundColor: "var(--color-bg-elevated)",
          borderRight: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          height: "100vh",
          left: mobileMenuOpen ? 0 : "-260px",
          top: 0,
          zIndex: 50,
          transition: "left var(--transition)",
        }}
      >
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)" }}>
          <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--color-primary)", textDecoration: "none" }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="6" fill="var(--color-primary)"/>
              <path d="M16 4 L26 16 L16 28 L6 16 Z" stroke="white" strokeWidth="2"/>
              <circle cx="16" cy="16" r="4" fill="white"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: "1.125rem" }}>Beacon Pilot</span>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: "1rem", overflow: "auto" }}>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.625rem 0.875rem",
                      borderRadius: "var(--radius-md)",
                      color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                      backgroundColor: isActive ? "var(--color-primary-light)" : "transparent",
                      textDecoration: "none",
                      fontWeight: isActive ? 600 : 500,
                      transition: "all var(--transition)",
                    })}
                  >
                    <Icon size={18} style={{ flexShrink: 0 }} />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div style={{ padding: "1rem", borderTop: "1px solid var(--color-border)" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem", color: "var(--color-text-muted)" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--color-border)", borderTopColor: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
              <span>Loading...</span>
            </div>
          ) : user ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem" }}>
                <User size={20} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.username}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "capitalize" }}>
                    {user.role}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/settings"><Settings size={16} /></Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut size={16} />
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="primary" className="w-full" onClick={() => { window.location.href = "/login"; }}>
              Sign In
            </Button>
          )}
        </div>
      </aside>

      <div style={{ flex: 1, marginLeft: mobileMenuOpen ? 0 : "260px", minHeight: "100vh", transition: "margin-left var(--transition)" }}>
        <header
          style={{
            height: "64px",
            backgroundColor: "var(--color-bg)",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1.5rem",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn-ghost"
              style={{ display: "none" }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
              {navItems.find((n) => location.pathname.startsWith(n.path))?.label || "Beacon Pilot"}
            </h1>
          </div>
        </header>

        <main style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
          {children}
        </main>
      </div>

      {mobileMenuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 40,
          }}
        />
      )}
    </div>
  );
}