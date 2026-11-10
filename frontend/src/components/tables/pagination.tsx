import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  noun: string; // ex: "boutiques"
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, noun, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);

  return (
    <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-lowest px-6 py-4">
      <span className="text-sm text-on-surface-variant">
        Affichage {from}-{to} sur {total} {noun}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            disabled={page === 1}
            onClick={() => onChange(page - 1)}
            className="rounded p-1 text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          {pages.map((n) => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`h-8 w-8 rounded text-sm font-semibold ${
                n === page ? "bg-primary text-on-primary" : "text-on-surface hover:bg-surface-container-low"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            disabled={page === totalPages}
            onClick={() => onChange(page + 1)}
            className="rounded p-1 text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}