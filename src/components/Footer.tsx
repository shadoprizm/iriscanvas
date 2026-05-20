export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <div className="text-xl font-bold gradient-text mb-1">IrisCanvas</div>
            <p className="text-gray-500 text-sm">AI-Powered Iris Art Generator</p>
          </div>
          <div className="flex gap-6 text-gray-400 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/5 text-center text-gray-600 text-sm">
          © {new Date().getFullYear()} IrisCanvas — A product of{' '}
          <a
            href="https://astrawebdev.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-iris-400 transition-colors"
          >
            North Star Holdings
          </a>
        </div>
      </div>
    </footer>
  );
}
