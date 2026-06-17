import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL, login } from "../lib/api";
import { readError } from "../lib/format";

const loginSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.string().email(),
  ),
  password: z.string().min(1),
});

type LoginFormInput = z.input<typeof loginSchema>;
type LoginForm = z.output<typeof loginSchema>;

export function LoginPage() {
  const { session, setSession } = useAuth();
  const form = useForm<LoginFormInput, unknown, LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (session) return <Navigate to="/" replace />;

  async function submit(values: LoginForm) {
    try {
      const nextSession = await login(values.email, values.password);
      if (!nextSession) throw new Error("Login failed");
      if (nextSession.user.role !== "ADMIN")
        throw new Error("Akun ini bukan admin");
      setSession(nextSession);
      toast.success(`Welcome back, ${nextSession.user.name}`);
    } catch (error) {
      toast.error(readError(error));
    }
  }

  return (
    <main className="login-scene">
      <section className="login-layout">
        <div className="login-poster">
          <span className="eyebrow">single-store admin</span>
          <h1>Manage orders, catalog, and campaigns in one focused console.</h1>
          <p>
            A calm operations workspace for fulfillment, promos, banners,
            uploads, and revenue telemetry, tuned for fast decisions.
          </p>
          <div className="poster-lines" aria-hidden="true" />
        </div>
        <form className="login-card" onSubmit={form.handleSubmit(submit)}>
          <div>
            <span className="eyebrow">api target</span>
            <code>{API_BASE_URL}</code>
          </div>
          <label htmlFor="login-email">
            Email
            <input id="login-email" {...form.register("email")} />
            {form.formState.errors.email && (
              <span className="field-error">
                {form.formState.errors.email.message}
              </span>
            )}
          </label>
          <label htmlFor="login-password">
            Password
            <input id="login-password" type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <span className="field-error">
                {form.formState.errors.password.message}
              </span>
            )}
          </label>
          <button
            className="primary-button"
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}