// Per-route <title> and <meta>. React 19 hoists these into <head>, both when
// rendering in the browser and when the page is prerendered, so every route
// gets its own tags without a helmet library.
export function Seo({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
    </>
  );
}

export default Seo;
