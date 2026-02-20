type EmptyTabProps = {
  title: string;
  description: string;
};

export function EmptyTab({ title, description }: EmptyTabProps) {
  return (
    <section className="mt-4">
      <div className="rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
    </section>
  );
}
