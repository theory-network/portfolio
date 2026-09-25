// Exposed by the federation plugin as 'portfolio-firefly/FireflyPage'.
// Consumers render it lazily via `lazyProvider('portfolio-firefly', 'FireflyPage')`.
export function FireflyPage() {
  return (
    <section data-testid="portfolio-firefly">
      <h1>Hello from portfolio-firefly</h1>
    </section>
  );
}

export default FireflyPage;
