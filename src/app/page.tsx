import Link from "next/link";
import { Masthead, Footer } from "@/components/ui/Chrome";
import { Reveal } from "@/components/ui/Reveal";
import Hero from "@/components/landing/Hero";
import { Steps } from "@/components/landing/Steps";
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

      {/* 01 the problem */}
      <Section n="01" kicker="The problem" title={<>Refusals are not a documents problem. They are a <span className="text-[var(--red)]">memory</span> problem.</>}>
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
          <Reveal className="space-y-6 text-[19px] sm:text-[21px] leading-[1.45] text-[var(--fg-2)] max-w-[50ch]">
            <p>
              The officer has every form you ever filed. When a new application lands, it is checked against your prior
              applications, your travel history and the employment dates you gave last time.
            </p>
            <p>
              You do not have those forms. So a start date drifts by a few months, a trip is forgotten, and an old refusal
              is left off the disclosure question. To an officer, inconsistency reads as a credibility problem, and leaving
              out a past UK refusal can be treated as deception.
            </p>
            <p className="text-[var(--fg)]">
              A generic AI draft cannot fix this. It does not know what you wrote in 2021 or why you were refused in 2023.
              Prior does, because it kept it.
            </p>
          </Reveal>

          {/* one contradiction, as the app shows it */}
          <Reveal delay={120}>
            <div className="label mb-5">What a contradiction looks like in Prior</div>
            <div className="rule-strong">
              {[
                ["You said, Schengen form, 2024", "No previous visa refusals"],
                ["Your history says", "UK Standard Visitor visa refused on 2 April 2023"],
              ].map(([k, v]) => (
                <div key={k as string} className="py-4 border-b border-[var(--rule)] grid gap-1 sm:grid-cols-[200px_1fr]">
                  <span className="label pt-1">{k}</span>
                  <span className="text-[17px]">{v}</span>
                </div>
              ))}
              <div className="py-4 border-b border-[var(--rule)] grid gap-1 sm:grid-cols-[200px_1fr]">
                <span className="label pt-1 !text-[var(--red)]">Flagged</span>
                <span className="text-[17px]">
                  <span className="text-[var(--red)] font-medium">A form you filed on 2024-02-10 said no previous refusals, but you were refused on 2023-04-02.</span>{" "}
                  <span className="text-[var(--fg-2)]">The disclosure question in the new pack is answered Yes, with the date, and the refusal is cited.</span>
                </span>
              </div>
            </div>
            <p className="fine mt-4 max-w-[44ch]">This is a real flag from our test history, word for word. The officer would have seen it. Prior shows it to you first.</p>
          </Reveal>
        </div>
      </Section>

      {/* 02 what you will do */}
      <Section n="02" id="how" kicker="What you will do" title="Six things. About a minute, then your file outlives the app." wide>
        <Steps />
      </Section>

      {/* 03 it learns */}
      <Section n="03" kicker="It learns" title="Paste the letter that refused you. Watch the next pack change.">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
          <Reveal className="space-y-6 text-[19px] sm:text-[21px] leading-[1.45] text-[var(--fg-2)] max-w-[50ch]">
            <p>
              A refusal letter lists reasons: funds not shown to be yours, ties to home not shown, purpose unclear. Prior reads
              each reason and writes it into your file as a lesson, sealed like every other fact.
            </p>
            <p>
              Then it redrafts. The pack you see afterwards is built to answer those reasons, and the app shows you exactly what
              moved: documents added, paragraphs added, answers that changed, each pointing at the lesson that caused it.
            </p>
          </Reveal>
          <Reveal delay={120} className="rule-strong">
            {[
              ["Reason in the letter", "Not satisfied the funds are genuinely available to you"],
              ["Lesson on file", "Lesson from United Kingdom refusal on 2023-04-02: prove funds clearly."],
              ["Change in the pack", "Added to documents: a short note explaining any large deposit in the last three months"],
            ].map(([k, v], i) => (
              <div key={k} className="py-5 border-b border-[var(--rule)] grid gap-1 sm:grid-cols-[200px_1fr]">
                <span className="label pt-1" style={i === 2 ? { color: "var(--ice)" } : undefined}>{k}</span>
                <span className="text-[17px]">{v}</span>
              </div>
            ))}
            <p className="fine mt-4 max-w-[44ch]">From our test refusal letter, word for word. Your own letter produces your own lessons.</p>
          </Reveal>
        </div>
      </Section>

      {/* 04 share */}
      <Section n="04" kicker="Share for minutes" title="A consultant gets a link that stops working by itself.">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
          <Reveal className="space-y-6 text-[19px] sm:text-[21px] leading-[1.45] text-[var(--fg-2)] max-w-[50ch]">
            <p>
              You choose the minutes. The pack is sealed to a policy on Sui, and the Seal key servers check the Sui clock before
              every read. When the time passes, they refuse. You can also revoke early.
            </p>
            <p>
              What a consultant already opened stays opened. No system can make someone unsee a page, and Prior says so in the
              app instead of pretending otherwise.
            </p>
          </Reveal>
          <Reveal delay={120} className="rule-strong">
            {[
              ["You pick", "5, 10, 30 or 60 minutes"],
              ["Sui enforces", "Expiry on the Sui clock, checked on every read"],
              ["Consultant sees", "The pack, a live countdown, then Access ended"],
              ["You can", "Revoke early, in one transaction"],
            ].map(([k, v]) => (
              <div key={k} className="py-5 border-b border-[var(--rule)] grid gap-1 sm:grid-cols-[200px_1fr]">
                <span className="label pt-1">{k}</span>
                <span className="text-[17px]">{v}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </Section>

      {/* 05 survives and agents */}
      <Section n="05" kicker="It survives us" title="Your file lives on Walrus, not in our database.">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
          <Reveal className="space-y-6 text-[19px] sm:text-[21px] leading-[1.45] text-[var(--fg-2)] max-w-[50ch]">
            <p>
              The app proves it on purpose. Wipe the copy on your device, press Restore, and every fact comes back from Walrus,
              decrypted in front of you. If Prior disappeared tomorrow, your history would not.
            </p>
            <p>
              Agents can use it too. A travel agent or booking bot asks Prior for a pack, gets a payment request over MPP, pays
              0.05 USDC on Sui mainnet, and the pack comes back. The payment is checked onchain through Tatum. No accounts, no
              keys to hand out.
            </p>
            <Link href="/proof" className="link-u text-[var(--fg)] inline-block">See the live record on the proof page</Link>
          </Reveal>
          <Reveal delay={120}>
            <div className="label mb-5">What an agent sees</div>
            <pre className="mono text-[13px] leading-[1.8] overflow-x-auto border-l-2 border-[var(--ice)] pl-5 text-[var(--fg-2)]">
{`GET /api/agent/pack
← 402 Payment Required
  method   mpp, sui mainnet
  amount   0.05 USDC

pay → Sui transaction, verified through Tatum

GET /api/agent/pack  (with receipt)
← 200  { pack }`}
            </pre>
          </Reveal>
        </div>
      </Section>

      {/* FAQ */}
      <Section n="06" id="faq" kicker="Questions" title="Asked at the window.">
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
