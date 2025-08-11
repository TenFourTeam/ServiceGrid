export function Footer() {
  return (
    <footer role="contentinfo" className="border-t">
      <div className="container py-10 text-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-muted-foreground">© {new Date().getFullYear()} TenFour Lawn</p>
        <nav aria-label="Footer">
          <ul className="flex items-center gap-5">
            <li><a className="hover:underline underline-offset-4" href="/legal">Legal</a></li>
            <li><a className="hover:underline underline-offset-4" href="#faq">FAQ</a></li>
            <li><a className="hover:underline underline-offset-4" href="mailto:hello@tenfourlawn.com">Contact</a></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
