import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
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
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader>
          <h1 className="text-2xl font-semibold tracking-tight">zhonghui</h1>
          <p className="text-sm text-muted-foreground">Registro de transportistas</p>
        </CardHeader>
        <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-sm font-medium">Usuario</label>
            <Input id="username" autoComplete="username" aria-invalid={!!errors.username}
              className="h-10" {...register("username")} />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium">Contraseña</label>
            <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password}
              className="h-10" {...register("password")} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
          </Button>
        </form>
        </CardContent>
      </Card>
    </main>
  );
}
