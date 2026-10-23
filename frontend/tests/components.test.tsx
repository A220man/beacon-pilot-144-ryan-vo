import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Button } from "../src/components";
import { Input } from "../src/components";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});
function renderWithProviders(ui: React.ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe("Button", () => {
  it("renders with children", () => {
    renderWithProviders(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    renderWithProviders(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies variant classes", () => {
    renderWithProviders(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("btn-danger");
  });

  it("shows loading state", () => {
    renderWithProviders(<Button loading>Loading</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});

describe("Input", () => {
  it("renders with label", () => {
    renderWithProviders(<Input label="Email" placeholder="you@example.com" />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("shows error message", () => {
    renderWithProviders(<Input label="Email" error="Invalid email" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/invalid email/i);
  });

  it("handles input changes", () => {
    renderWithProviders(<Input label="Name" />);
    const input = screen.getByLabelText(/name/i);
    fireEvent.change(input, { target: { value: "Test" } });
    expect(input).toHaveValue("Test");
  });
});