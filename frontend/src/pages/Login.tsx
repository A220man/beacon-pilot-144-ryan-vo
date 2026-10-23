import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export function Login() {
  const { login } = useAuth();

  useEffect(() => {
    login();
  }, [login]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="card" style={{ maxWidth: "400px", width: "100%", textAlign: "center" }}>
        <svg width="64" height="64" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: "1.5rem" }}>
          <rect width="32" height="32" rx="6" fill="var(--color-primary)"/>
          <path d="M16 4 L26 16 L16 28 L6 16 Z" stroke="white" strokeWidth="2"/>
          <circle cx="16" cy="16" r="4" fill="white"/>
        </svg>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>Beacon Pilot</h1>
        <p style={{ color: "var(--color-text-muted)", marginBottom: "2rem" }}>
          Production-grade skill evaluation and drift detection for AI coding agents
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ padding: "1rem", backgroundColor: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", textAlign: "left" }}>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
              Redirecting to Keycloak for authentication...
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-primary)" }}>
                PKCE + State + Nonce
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-success)" }}>
                HttpOnly Cookies
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-info)" }}>
                CSRF Protected
              </span>
            </div>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            Demo credentials: demo / demo (viewer) or operator / operator (operator)
          </p>
        </div>
      </div>
    </div>
  );
}