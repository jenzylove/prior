import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Mark } from "./Logo";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 no-underline ${className}`} aria-label="Prior, home">
      <Mark size={22} />
      <span className="display text-[22px] leading-none font-semibold tracking-[-0.03em]">Prior</span>
    </Link>
  );
}

export function Masthead({ here, onDark = false }: { here?: "home" | "app" | "proof" | "consultant"; onDark?: boolean }) {
  const item = (href: string, label: string, key: string) => (
    <Link
      href={href}
      className={`text-[14px] transition-colors hover:opacity-100 ${here === key ? "opacity-100" : "opacity-60"}`}
      aria-current={here === key ? "page" : undefined}
    >
      {label}
    </Link>
  );
  return (
    <header
      className={`${onDark ? "absolute inset-x-0 top-0 z-20 text-white" : ""}`}
      style={onDark ? ({ "--fg": "#f2f3f5", "--bg": "#050506", "--rule-strong": "#343842" } as React.CSSProperties) : undefined}
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-8 h-[64px] flex items-center justify-between gap-4">
        <Wordmark />
        <nav className="flex items-center gap-5 sm:gap-8">
          <span className="hidden sm:inline">{item("/#how", "How it works", "how")}</span>
          {item("/proof", "Proof", "proof")}
          {here === "app" ? (
            item("/app", "Your file", "app")
          ) : (
            <Link href="/app" className={`btn btn-sm ${onDark ? "!bg-white !text-black !border-white" : ""}`}>
              Start your file
            </Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1200px] px-4 sm:px-8 pb-12 pt-28">
      <div className="rule-strong" />
      <div className="pt-12 grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Mark size={34} />
            <span className="display text-[40px] leading-none font-semibold">Prior</span>
          </div>
          <p className="mt-5 text-[17px] text-[var(--fg-2)] max-w-[30ch]">
            The officer remembers your priors. Now you do too.
          </p>
        </div>
        <div>
          <div className="label mb-4">Product</div>
          <ul className="space-y-2 text-[15px]">
            <li><Link className="link-u" href="/app">Start your file</Link></li>
            <li><Link className="link-u" href="/proof">Live proof</Link></li>
            <li><Link className="link-u" href="/#faq">Questions</Link></li>
          </ul>
        </div>
        <div>
          <div className="label mb-4">Built on</div>
          <ul className="space-y-2 text-[15px]">
            <li><a className="link-u" href="https://www.walrus.xyz" target="_blank" rel="noreferrer">Walrus Memory</a></li>
            <li><a className="link-u" href="https://seal.mystenlabs.com" target="_blank" rel="noreferrer">Seal</a></li>
            <li><a className="link-u" href="https://tatum.io" target="_blank" rel="noreferrer">Tatum</a></li>
            <li><a className="link-u" href="https://sui.io" target="_blank" rel="noreferrer">Sui mainnet</a></li>
          </ul>
        </div>
        <div>
          <div className="label mb-4">Source</div>
          <ul className="space-y-2 text-[15px]">
            <li><a className="link-u" href="https://github.com/jenzylove/prior" target="_blank" rel="noreferrer">GitHub</a></li>
            <li><Link className="link-u" href="/proof">Onchain record</Link></li>
          </ul>
        </div>
      </div>
      <div className="rule mt-14 mb-5" />
      <div className="flex flex-wrap justify-between gap-3 fine">
        <span>Guidance, not legal advice. Prior never submits anything to a government portal.</span>
        <span className="mono text-[11px] tracking-[0.12em]">TATUM × WALRUS · TOTAL RECALL · 2026</span>
      </div>
    </footer>
  );
}
