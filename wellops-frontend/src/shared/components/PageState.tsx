import type React from "react";
type Props = {
  title: string;
  message?: string;
  action?: React.ReactNode;
};

export function LoadingState({ title, message }: Props) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      {message && <p style={{ opacity: 0.75 }}>{message}</p>}
      <div style={{ marginTop: 16, opacity: 0.6 }}>Loading…</div>
    </div>
  );
}

export function EmptyState({ title, message, action }: Props) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      {message && <p style={{ opacity: 0.75 }}>{message}</p>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

export function ErrorState({ title, message, action }: Props) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: 0, color: "darkred" }}>{title}</h2>
      {message && <p style={{ opacity: 0.85 }}>{message}</p>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

type PageStateProps = {
  loading: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
};

export function PageState({ loading, error, empty, emptyText }: PageStateProps) {
  if (loading) return <LoadingState title="Loading…" />;
  if (error) return <ErrorState title="Error" message={error} />;
  if (empty) return <EmptyState title="Nothing here" message={emptyText} />;
  return null;
}