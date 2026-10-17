export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <p className="text-sm font-medium tracking-widest text-indigo-400 uppercase">Corvus</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Remember the idea. Recover the source.
        </h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          A private, source-grounded memory for what you watch, search, and read. Ask in any
          language and jump back to the exact moment.
        </p>
        <p className="mt-10 rounded-lg border border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
          Prototype under construction. Corvus does not connect to your Google account. Corvus is a
          hackathon concept and is not a Google product.
        </p>
      </div>
    </main>
  );
}
