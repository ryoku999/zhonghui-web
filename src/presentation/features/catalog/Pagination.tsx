import { Button } from "@/presentation/components/ui/button";

type Props = {
  page: number;
  onChange: (page: number) => void;
  hasNext: boolean;
  loading: boolean;
};

export default function Pagination({ page, onChange, hasNext, loading }: Props) {
  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => onChange(page - 1)}>Anterior</Button>
      <span className="text-sm text-muted-foreground">Página {page + 1}</span>
      <Button variant="outline" size="sm" disabled={!hasNext || loading} onClick={() => onChange(page + 1)}>Siguiente</Button>
    </nav>
  );
}
