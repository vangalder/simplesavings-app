export default function Footer() {
  return (
    <footer className="w-full border-t border-neutral-200 bg-white/80 backdrop-blur-sm py-6 mt-auto relative z-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4 text-sm text-neutral-600">
          <p>© {new Date().getFullYear()} vangalder.com. All rights reserved.</p>
          <div className="flex gap-4">
            <a
              href="/privacy"
              className="hover:text-primary-base transition-colors"
            >
              Privacy Policy.
            </a>
            <a
              href="/terms"
              className="hover:text-primary-base transition-colors"
            >
              Terms of Service.
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
