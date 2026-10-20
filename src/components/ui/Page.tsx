export function Page({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" tabIndex={-1}>
      {children}
    </main>
  );
}
