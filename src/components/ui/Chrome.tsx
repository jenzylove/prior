import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`display text-[30px] leading-none tracking-tight no-underline flex items-baseline gap-1.5 ${className}`}>
      Prior
      <span className="mono text-[10px] tracking-[0.2em] text-[var(--red)] -translate-y-0.5">FILE</span>
    </Link>
  );
}

export function Masthead({ here }: { here?: "home" | "app" | "proof" | "consultant" }) {
  const item = (href: string, label: string, key: string) => (
    <Link
      href={href}
      className={`label hover:text-[var(--ink)] transition-colors ${here === key ? "text-[var(--ink)]" : ""}`}
      aria-current={here === key ? "page" : undefined}
    >
      {label}
    </Link>
  );
  return (
    <header className="mx-auto max-w-[1180px] px-4 sm:px-8 pt-5">
      <div className="flex items-center justify-between gap-4 pb-3">
        <Wordmark />
        <nav className="flex items-center gap-4 sm:gap-7">
          <span className="hidden sm:inline">{item("/#how", "How it works", "how")}</span>
          {item("/proof", "Proof", "proof")}
          {item("/app", "Your file", "app")}
          <ThemeToggle />
        </nav>
      </div>
      <div className="rule-double" />
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1180px] px-4 sm:px-8 pb-12 pt-24">
      <div className="rule-double mb-10" />
      <div className="grid gap-10 sm:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <div className="display text-[52px] leading-none">Prior</div>
          <p className="mt-3 text-[16px] text-[var(--ink-2)] max-w-[30ch] italic">
            The officer remembers your priors. Now you do too.
          </p>
        </div>
        <div>
          <div className="label mb-3">Product</div>
          <ul className="space-y-1.5 text-[15px]">
            <li><Link className="link-u" href="/app">Start your file</Link></li>
            <li><Link className="link-u" href="/proof">Live proof</Link></li>
            <li><Link className="link-u" href="/#faq">Questions</Link></li>
          </ul>
        </div>
        <div>
          <div className="label mb-3">Built on</div>
          <ul className="space-y-1.5 text-[15px]">
            <li><a className="link-u" href="https://www.walrus.xyz" target="_blank" rel="noreferrer">Walrus Memory</a></li>
            <li><a className="link-u" href="https://seal.mystenlabs.com" target="_blank" rel="noreferrer">Seal</a></li>
            <li><a className="link-u" href="https://tatum.io" target="_blank" rel="noreferrer">Tatum</a></li>
            <li><a className="link-u" href="https://sui.io" target="_blank" rel="noreferrer">Sui mainnet</a></li>
          </ul>
        </div>
        <div>
          <div className="label mb-3">Source</div>
          <ul className="space-y-1.5 text-[15px]">
            <li><a className="link-u" href="https://github.com/jenzylove/prior" target="_blank" rel="noreferrer">GitHub</a></li>
            <li><Link className="link-u" href="/proof">Onchain record</Link></li>
          </ul>
        </div>
      </div>
      <div className="perforation mt-12 mb-4" />
      <div className="flex flex-wrap justify-between gap-3 fine">
        <span>Guidance, not legal advice. Prior never submits anything to a government portal.</span>
        <span className="mono text-[11px] tracking-[0.12em]">TATUM × WALRUS · TOTAL RECALL · 2026</span>
      </div>
    </footer>
  );
}
