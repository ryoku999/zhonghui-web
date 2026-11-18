import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/presentation/components/ui/button";
import { useAuthStore, type Role, type User } from "@/presentation/features/auth/auth.store";
import { api } from "@/shared/api/http";

const roles: Record<Role, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  DOCUMENTATION: "Documentación",
};
const pageSize = 50;
const field = "h-9 rounded-md border bg-background px-2";

export default function UsersPage() {
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const client = useQueryClient();
  const currentUserId = useAuthStore((state) => state.session?.user.id);
  const users = useQuery({
    queryKey: ["users", page],
    queryFn: async () => (await api.get<User[]>("/users", {
      params: { limit: pageSize, offset: page * pageSize },
    })).data,
    retry: false,
  });

  async function save(change: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await change();
      await client.invalidateQueries({ queryKey: ["users"] });
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }

  function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    void save(async () => {
      await api.post("/users", Object.fromEntries(new FormData(form)));
      form.reset();
    });
  }

  return (
    <section className="space-y-5">
      <h1 className="text-xl font-semibold">Usuarios</h1>
      <form onSubmit={addUser} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
        <label className="grid gap-1 text-sm">Usuario
          <input className={field} name="username" autoComplete="off" required minLength={3} maxLength={64} />
        </label>
        <label className="grid gap-1 text-sm">Nombre visible
          <input className={field} name="displayName" required maxLength={120} />
        </label>
        <label className="grid gap-1 text-sm">Contraseña
          <input className={field} name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={256} />
        </label>
        <label className="grid gap-1 text-sm">Rol
          <select className={field} name="role" defaultValue="OPERATOR">
            {Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <Button type="submit" disabled={busy}>Crear usuario</Button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {users.isPending && <p role="status">Cargando usuarios…</p>}
      {users.isError && <p role="alert">{message(users.error)}</p>}
      {users.data && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted">
              <tr>{["Usuario", "Nombre", "Rol", "Estado", "Acción"].map((label) => <th key={label} scope="col" className="p-3">{label}</th>)}</tr>
            </thead>
            <tbody>
              {users.data.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="p-3">{user.username}</td>
                  <td className="p-3">{user.displayName}</td>
                  <td className="p-3">
                    <select aria-label={`Rol de ${user.username}`} className={field} value={user.role}
                      disabled={busy || currentUserId === user.id}
                      onChange={(event) => {
                        const role = event.target.value;
                        void save(() => api.patch(`/users/${user.id}`, { role }));
                      }}>
                      {Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </td>
                  <td className="p-3">{user.isActive ? "Activo" : "Inactivo"}</td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" disabled={busy || currentUserId === user.id}
                      onClick={() => void save(() => api.patch(`/users/${user.id}`, { isActive: !user.isActive }))}>
                      {user.isActive ? "Desactivar" : "Activar"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="outline" disabled={page === 0 || users.isFetching} onClick={() => setPage(page - 1)}>Anterior</Button>
        <Button variant="outline" disabled={users.isFetching || users.data?.length !== pageSize} onClick={() => setPage(page + 1)}>Siguiente</Button>
      </div>
    </section>
  );
}

function message(error: unknown) {
  return axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : "No se pudo completar la solicitud.";
}
