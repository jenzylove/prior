import Link from "next/link";
import { Masthead, Footer } from "@/components/ui/Chrome";
import { Reveal } from "@/components/ui/Reveal";
import Hero from "@/components/landing/Hero";
import { Demo, Agents } from "@/components/landing/Demo";
import { FAQ } from "@/components/landing/FAQ";

const SOURCES = {
  mappr: "https://www.mappr.co/?p=72448",
  dawn: "https://dawn.com/news/amp/1839140",
  nolo: "https://www.alllaw.com/articles/nolo/us-immigration/visa-green-card-denied-false-information-forms.html",
};

function Src({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="link-u mono text-[11px] tracking-[0.06em] text-[var(--fg-3)]">
      {children}
    </a>
  );
}

function Section({
  n,
  id,
  kicker,
  title,
  children,
  wide,
}: {
  n: string;
  id?: string;
  kicker: string;
  title: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section id={id} className="mx-auto max-w-[1200px] px-4 sm:px-8 pt-28 sm:pt-40 scroll-mt-10">
      <Reveal>
        <div className="flex items-baseline gap-4 mb-8">
          <span className="mono text-[13px] text-[var(--ice)]">{n}</span>
          <span className="label">{kicker}</span>
          <span className="flex-1 rule self-center" />
        </div>
        <h2 className={`display text-[38px] sm:text-[60px] lg:text-[72px] ${wide ? "max-w-[22ch]" : "max-w-[16ch]"}`}>{title}</h2>
      </Reveal>
      <div className="mt-12 sm:mt-16">{children}</div>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "Is this legal advice?",
    a: "No. Prior is guidance. It drafts answers from your own record and points out where they disagree. You read every answer, you decide, and you submit the form yourself. Prior never touches a government portal, the visa fee or your appointment.",
  },
  {
    q: "What happens if I paste something wrong?",
    a: "Each fact is shown back to you in one plain sentence before it is sealed. Anything Prior was not told is marked as needing your input instead of being guessed.",
  },
  {
    q: "Who can read my history?",
    a: "Your facts are stored on Walrus as Seal ciphertext. To build a search vector, the memory relayer sees the text briefly, and the drafting model sees your history to write answers. Neither is used to store it. Your file has a long random id that only your browser holds, and the public proof page shows counts, never file ids. Prior runs the account that holds demo files, so Prior can decrypt them; that is why the file id stays private.",
  },
  {
    q: "Why does a refusal letter matter so much?",
    a: "Because the officer reads your next application with the last refusal in mind. Prior turns each reason in the letter into a lesson, and the next pack is built to answer it: new documents on the checklist, a new paragraph in the cover letter, the refusal disclosed where the form asks.",
  },
  {
    q: "What does consultant access actually guarantee?",
    a: "You pick the minutes. A policy on Sui checks the Sui clock on every new read, so once time is up the key servers refuse to decrypt. You can also revoke early. What a consultant already opened stays opened; no system can make someone unsee a page.",
  },
  {
    q: "What if Prior shuts down?",
    a: "Your file lives on Walrus, not in our database. The app shows this on purpose: wipe your local copy, press Restore, and the facts come back from Walrus.",
  },
  {
    q: "Can I keep a file for my parents?",
    a: "Yes. Each file is its own namespace, so a parent's history stays separate from yours.",
  },
  {
    q: "Which forms are supported?",
    a: "The UK Standard Visitor application, the Schengen harmonised form and the US DS 160.",
  },
];

export default function Home() {
  return (
    <>
      <Masthead here="home" onDark />
      <Hero />

      {/* the numbers, sourced */}
      <section className="mx-auto max-w-[1200px] px-4 sm:px-8 pt-24 sm:pt-32">
        <Reveal>
          <div className="label mb-6">The numbers behind it</div>
        </Reveal>
        <div className="rule-strong">
          {[
            {
              n: "1.75M",
              red: true,
              t: "Schengen visa applications were refused in 2025, one in every seven of about 12 million filed.",
              s: <Src href={SOURCES.mappr}>Mappr, from European Commission data</Src>,
            },
            {
              n: "€130M",
              t: "in Schengen visa fees kept from refused applicants in a single year (2023). A refused fee is never refunded.",
              s: <Src href={SOURCES.dawn}>Dawn, LAGO Collective data</Src>,
            },
            {
              n: "For life",
              t: "A false \"No\" about a past refusal on a US visa form can be treated as misrepresentation, and that bar is permanent.",
              s: <Src href={SOURCES.nolo}>Nolo, on INA 212(a)(6)(C)(i)</Src>,
            },
          ].map((x, i) => (
            <Reveal key={x.n} delay={i * 80} className="grid gap-3 sm:grid-cols-[260px_1fr] items-baseline py-8 border-b border-[var(--rule)]">
              <div className="display display-tight text-[64px] sm:text-[84px]" style={x.red ? { color: "var(--red)" } : undefined}>{x.n}</div>
              <div>
                <p className="text-[18px] sm:text-[20px] max-w-[52ch]">{x.t}</p>
                <div className="mt-2">{x.s}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Demo />
      <Agents />

      {/* FAQ */}
      <Section n="03" id="faq" kicker="Questions" title="Asked at the window.">
        <Reveal>
          <FAQ items={FAQ_ITEMS} />
        </Reveal>
      </Section>

      {/* closing */}
      <section className="mx-auto max-w-[1200px] px-4 sm:px-8 pt-32 sm:pt-44">
        <Reveal className="text-center">
          <h2 className="display display-tight text-[44px] sm:text-[80px] lg:text-[96px] max-w-[14ch] mx-auto">
            Next time, walk in with the same story you told last time.
          </h2>
          <Link href="/app" className="btn mt-12 !px-8 !py-4 !text-[17px]">
            Start your file <span className="arrow" aria-hidden>→</span>
          </Link>
        </Reveal>
      </section>

      <Footer />
    </>
  );
}
