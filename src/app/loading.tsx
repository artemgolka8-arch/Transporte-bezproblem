// Индикатор загрузки страницы: лёгкий «скелет» вместо пустого экрана
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-5 py-8 sm:px-8" aria-busy="true">
      <div className="mb-6 flex items-center gap-3.5">
        <div className="h-12 w-12 rounded-lg bg-panel2" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-panel2" />
          <div className="h-3.5 w-72 max-w-full rounded bg-panel2" />
        </div>
      </div>
      <div className="panel overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line/60 px-5 py-4 last:border-0">
            <div className="h-9 w-9 rounded-full bg-panel2" />
            <div className="h-3.5 flex-1 rounded bg-panel2" />
            <div className="h-3.5 w-24 rounded bg-panel2" />
          </div>
        ))}
      </div>
    </div>
  );
}
