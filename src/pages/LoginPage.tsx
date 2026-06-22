import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { LanguageToggle } from "../components/LanguageToggle";
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
  const { t } = useI18n();
  const form = useForm<LoginFormInput, unknown, LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (session) return <Navigate to="/" replace />;

  async function submit(values: LoginForm) {
    try {
      const nextSession = await login(values.email, values.password);
      if (!nextSession) throw new Error(t.login.loginFailed);
      if (nextSession.user.role !== "ADMIN")
        throw new Error(t.login.adminOnly);
      setSession(nextSession);
      toast.success(t.login.welcome(nextSession.user.name));
    } catch (error) {
      toast.error(readError(error));
    }
  }

  return (
    <main className="login-scene">
      <section className="login-layout">
        <div className="login-poster">
          <span className="eyebrow">{t.login.eyebrow}</span>
          <h1>{t.login.title}</h1>
          <p>{t.login.body}</p>
          <div className="poster-lines" aria-hidden="true" />
        </div>
        <form className="login-card" onSubmit={form.handleSubmit(submit)}>
          <LanguageToggle />
          <div>
            <span className="eyebrow">{t.login.apiTarget}</span>
            <code>{API_BASE_URL}</code>
          </div>
          <label htmlFor="login-email">
            {t.login.email}
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              spellCheck={false}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <span className="field-error">
                {form.formState.errors.email.message}
              </span>
            )}
          </label>
          <label htmlFor="login-password">
            {t.login.password}
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
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
            {form.formState.isSubmitting ? t.login.signingIn : t.login.signIn}
          </button>
        </form>
      </section>
    </main>
  );
}
