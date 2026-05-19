type EmptyTabProps = {
  title: string;
  description: string;
};

export function EmptyTab({ title, description }: EmptyTabProps) {
  return (
    <section className="mt-4">
      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}
