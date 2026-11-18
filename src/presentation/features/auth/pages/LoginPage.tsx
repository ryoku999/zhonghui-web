import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/presentation/components/ui/button";
import { login } from "../auth.api";

const schema = z.object({
  username: z.string().trim().min(1, "Ingresa tu usuario.").max(64),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

type Credentials = z.infer<typeof schema>;

export default function LoginPage() {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Credentials>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  async function submit(values: Credentials) {
    try {
      await login(values.username, values.password);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      let message = "No se pudo iniciar sesión. Inténtalo de nuevo.";
      if (status === 401) message = "El usuario o la contraseña son incorrectos.";
      if (status === 429) message = "Demasiados intentos. Espera un minuto y vuelve a intentar.";
      setError("root", { message });
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-muted/40 p-6">
      <section className="w-full max-w-sm rounded-xl border bg-card p-7 text-card-foreground shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">zhonghui</h1>
        <p className="mt-1 text-sm text-muted-foreground">Registro de transportistas</p>
        <form className="mt-7 space-y-4" onSubmit={handleSubmit(submit)} noValidate>
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-sm font-medium">Usuario</label>
            <input id="username" autoComplete="username" aria-invalid={!!errors.username}
              className="h-10 w-full rounded-lg border bg-background px-3" {...register("username")} />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium">Contraseña</label>
            <input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password}
              className="h-10 w-full rounded-lg border bg-background px-3" {...register("password")} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
          </Button>
        </form>
      </section>
    </main>
  );
}
