export function Footer() {
  return (
    <footer className="border-t border-line mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row justify-between gap-6 text-sm text-ink/60">
        <div>
          <div className="font-display text-lg text-ink mb-1">Fernweh</div>
          <p>Considered goods, built to last.</p>
        </div>
        <div className="flex gap-8">
          <div>
            <div className="font-medium text-ink mb-2">Shop</div>
            <ul className="space-y-1">
              <li><a href="/products" className="hover:text-cobalt">All products</a></li>
              <li><a href="/products?category=outdoors" className="hover:text-cobalt">Outdoors</a></li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-ink mb-2">Account</div>
            <ul className="space-y-1">
              <li><a href="/orders" className="hover:text-cobalt">Order history</a></li>
              <li><a href="/account" className="hover:text-cobalt">Manage account</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
