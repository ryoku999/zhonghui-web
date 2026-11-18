import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/presentation/components/ui/button";
import { list, requestMessage, type CatalogName, type CatalogRow } from "@/presentation/features/catalog/catalog.api";

type Props = {
  catalog: CatalogName;
  term: string;
  filters?: Record<string, string>;
  label: string;
  describe: (row: CatalogRow) => string;
  select: (row: CatalogRow) => void;
};

export default function HistorySuggestions({ catalog, term, filters, label, describe, select }: Props) {
  const [requested, setRequested] = useState(false);
  const q = term.trim();
  const canSearch = q.length >= 2 || !!filters?.driverId;
  const open = requested && canSearch;
  const results = useQuery({
    queryKey: ["load-history", catalog, q, filters],
    queryFn: () => list<CatalogRow>(`/${catalog}`, 0, { q, ...filters }),
    enabled: open,
    retry: false,
  });

  return (
    <div className="space-y-2">
      <Button type="button" size="sm" variant="outline" disabled={!canSearch}
        onClick={() => setRequested(!requested)} aria-expanded={open}>
        {requested ? "Ocultar coincidencias" : label}
      </Button>
      {open && results.isPending && <p role="status" className="text-sm">Buscando…</p>}
      {open && results.isError && <p role="alert" className="text-sm text-destructive">{requestMessage(results.error)}</p>}
      {open && results.data?.length === 0 && <p className="text-sm text-muted-foreground">Sin coincidencias. Puedes continuar con los datos manuales.</p>}
      {open && !!results.data?.length && (
        <ul className="max-h-52 divide-y overflow-auto rounded-md border">
          {results.data.map((row) => <li key={row.id} className="flex items-center justify-between gap-2 p-2 text-sm">
            <span>{describe(row)}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => { select(row); setRequested(false); }}>Usar</Button>
          </li>)}
        </ul>
      )}
    </div>
  );
}
