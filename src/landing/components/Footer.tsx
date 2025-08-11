export function Footer() {
  return (
    <footer role="contentinfo" className="border-t">
      <div className="container py-10 text-sm flex items-center justify-between gap-4">
        <p className="text-muted-foreground">© {new Date().getFullYear()} TenFour Lawn</p>
      </div>
    </footer>
  );
}
