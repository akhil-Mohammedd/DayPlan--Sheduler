import type { ReactNode } from 'react';

/**
 * One quiet page for every "this is not the screen you asked for" case:
 * a status code in mono, a serif headline, one honest line, and real actions.
 * Used for 404 (unknown route) and 500 (render failure) so both read the same.
 */
export function StatusPage({
  code,
  title,
  description,
  detail,
  icon,
  actions,
}: {
  code: string;
  title: string;
  description: ReactNode;
  /** Technical line shown under the description, e.g. an error message. */
  detail?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start py-4 sm:py-8">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
            {icon}
          </span>
        )}
        <span className="meta text-muted-foreground">{code}</span>
      </div>

      <h1 className="page-title mt-6">{title}</h1>
      <p className="page-subtitle">{description}</p>

      {detail && (
        <div className="mt-4 max-w-full overflow-x-auto rounded-md border border-border bg-muted/40 px-3 py-2">
          <code className="meta whitespace-pre-wrap break-words text-muted-foreground">
            {detail}
          </code>
        </div>
      )}

      {actions && (
        <div className="mt-6 flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
