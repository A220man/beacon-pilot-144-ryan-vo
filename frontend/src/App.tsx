import { Layout } from "./components/Layout";
import { useAuth } from "./hooks/useAuth";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { SkillsPage } from "./pages/Skills";
import { EvaluationsPage } from "./pages/Evaluations";
import { CapsulesPage } from "./pages/Capsules";
import { DriftPage } from "./pages/Drift";

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--color-border)", borderTopColor: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {!user && window.location.pathname !== "/login" ? (
        <Login />
      ) : (
        <>
          {window.location.pathname === "/login" && user && <Dashboard />}
          {window.location.pathname === "/dashboard" && <Dashboard />}
          {window.location.pathname === "/skills" && <SkillsPage />}
          {window.location.pathname === "/evaluations" && <EvaluationsPage />}
          {window.location.pathname.startsWith("/evaluations/") && <EvaluationsPage />}
          {window.location.pathname === "/capsules" && <CapsulesPage />}
          {window.location.pathname === "/drift" && <DriftPage />}
          {window.location.pathname === "/settings" && <div>Settings - TODO</div>}
        </>
      )}
    </Layout>
  );
}