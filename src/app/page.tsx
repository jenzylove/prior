import Link from "next/link";
import { Masthead, Footer } from "@/components/ui/Chrome";
import { Seal, RedStamp } from "@/components/ui/Stamp";

const SOURCES = {
  mappr: "https://www.mappr.co/?p=72448",
  africanews: "https://www.africanews.com/2025/05/26/visa-denied-african-travellers-hit-hard-by-soaring-schengen-rejections/",
  lawyer: "https://thenigerialawyer.com/1-34m-nigerian-visa-applications-rejected-uk-refusals-hit-21-year-high-as-nigeria-ranks-second-globally/",
  guardian: "https://krdo.com/news/2025/05/21/africans-lost-nearly-70m-to-denied-visas-applications-to-europe-in-2024/",
};

function Src({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="link-u mono text-[11px] tracking-[0.06em] text-[var(--ink-3)]">
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
}: {
  n: string;
  id?: string;
  kicker: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-[1180px] px-4 sm:px-8 pt-24 sm:pt-32 scroll-mt-8">
      <div className="rule-strong mb-6" />
      <div className="grid gap-6 md:grid-cols-[180px_1fr]">
        <div className="flex md:flex-col items-baseline md:items-start gap-4">
          <div className="display text-[72px] md:text-[112px] leading-[0.8] text-[var(--ink-3)]">{n}</div>
          <div className="label">{kicker}</div>
        </div>
        <div>
          <h2 className="display text-[44px] sm:text-[64px] max-w-[18ch]">{title}</h2>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </section>
  );
}

const FAQ: { q: string; a: React.ReactNode }[] = [
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
      <Masthead here="home" />

      {/* ── Hero: the dossier cover ─────────────────────────────── */}
      <section className="mx-auto max-w-[1180px] px-4 sm:px-8 pt-10 sm:pt-16 overflow-x-clip">
        <div className="flex flex-wrap items-center justify-between gap-3 label mb-10">
          <span>Case file · Repeat applicants</span>
          <span className="hidden sm:inline">Form P 1 · Memory of record</span>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr] items-start">
          <div className="rise">
            <h1 className="display text-[56px] sm:text-[92px] lg:text-[112px]">
              The officer remembers your last application.{" "}
              <em className="text-[var(--red)]">Do you?</em>
            </h1>
            <p className="mt-8 text-[20px] sm:text-[23px] leading-snug text-[var(--ink-2)] max-w-[34ch]">
              Prior is a visa agent that remembers every application you have filed, and writes your next one to match
              your history and answer what got you refused.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link href="/app" className="btn">
                Start your file <span aria-hidden>→</span>
              </Link>
              <span className="display italic text-[22px] text-[var(--ink-2)]">
                The officer remembers your priors. Now you do too.
              </span>
            </div>
          </div>

          {/* specimen sheet */}
          <div className="relative rise" style={{ animationDelay: ".15s" }} aria-hidden>
            <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-[2.2deg] bg-[var(--paper-3)]" />
            <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-[1deg] bg-[var(--paper-2)] border border-[var(--rule)]" />
            <div className="relative bg-[var(--paper)] border border-[var(--rule-strong)] p-6 sm:p-8 -rotate-[0.6deg]">
              <div className="flex justify-between label">
                <span>Visitor application</span>
                <span>Specimen</span>
              </div>
              <div className="rule-double my-4" />
              {[
                ["Employer", "Lagos Freight Ltd"],
                ["Employed since", "March 2018"],
                ["Previous refusals", "None"],
                ["Funds available", "Statement attached"],
              ].map(([k, v], i) => (
                <div key={k} className="py-2.5 border-b border-[var(--rule)] grid grid-cols-[1fr_1.1fr] gap-3">
                  <span className="label !normal-case !tracking-normal !text-[13px]">{k}</span>
                  <span className={`mono text-[14px] ${i === 2 ? "strike-red" : ""}`}>{v}</span>
                </div>
              ))}
              <div className="mt-4 margin-note">Refused 2023. You did not say so.</div>
              <div className="absolute -top-6 -right-3 sm:-right-8">
                <RedStamp rot={9}>Refused</RedStamp>
              </div>
              <div className="absolute -bottom-10 right-4 sm:right-10">
                <Seal size={104} sub="ON FILE" rot={-16} />
              </div>
            </div>
          </div>
        </div>

        {/* facts on file */}
        <div className="mt-24 sm:mt-28">
          <div className="flex items-baseline justify-between gap-4 mb-2">
            <span className="label">Exhibit A · The numbers</span>
            <span className="label hidden sm:inline">Sources under each line</span>
          </div>
          <div className="rule-strong" />
          <div className="grid md:grid-cols-3">
            <div className="py-7 md:pr-8 border-b md:border-b-0 md:border-r border-[var(--rule)]">
              <div className="display text-[76px] leading-none text-[var(--red)]">47.9%</div>
              <p className="mt-3 text-[17px]">
                of Nigerian applicants were refused a Schengen visa in 2025, against 14.6% of applicants worldwide.
              </p>
              <div className="mt-3 flex gap-3 flex-wrap">
                <Src href={SOURCES.mappr}>Mappr, from European Commission data</Src>
              </div>
            </div>
            <div className="py-7 md:px-8 border-b md:border-b-0 md:border-r border-[var(--rule)]">
              <div className="display text-[76px] leading-none">66,143</div>
              <p className="mt-3 text-[17px]">
                Nigerian visitor visas refused by the UK in 2025. A refusal rate of 38.6%.
              </p>
              <div className="mt-3">
                <Src href={SOURCES.lawyer}>The Nigeria Lawyer</Src>
              </div>
            </div>
            <div className="py-7 md:pl-8">
              <div className="display text-[76px] leading-none">$70M</div>
              <p className="mt-3 text-[17px]">
                Close to that much was lost by African applicants on Schengen fees for refused visas in 2024. The fee is not
                refunded.
              </p>
              <div className="mt-3">
                <Src href={SOURCES.guardian}>CNN, LAGO Collective data</Src>
              </div>
            </div>
          </div>
          <div className="rule-strong" />
        </div>
      </section>

      {/* ── 01 The problem ─────────────────────────────────────── */}
      <Section
        n="01"
        kicker="The problem"
        title={
          <>
            Refusals are not a documents problem. They are a <em>memory</em> problem.
          </>
        }
      >
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-5 text-[19px] text-[var(--ink-2)] max-w-[52ch]">
            <p>
              The officer has every form you ever filed. When a new application lands, it is checked against your prior
              applications, your travel history and the employment dates you gave last time.
            </p>
            <p>
              You do not have those forms. So the start date drifts by a few months, a trip is forgotten, and an old
              refusal is left off the disclosure question. To an officer, inconsistency reads as a credibility problem,
              and failing to mention a past UK refusal can be treated as deception.
            </p>
            <p className="text-[var(--ink)]">
              A generic AI draft cannot fix this. It does not know what you wrote in 2021 or why you were refused in
              2023. Prior does.
            </p>
          </div>

          {/* two filings, one contradiction */}
          <div className="relative" aria-label="Example of two filings that disagree">
            <div className="label mb-3">Example · two filings, one contradiction</div>
            <div className="grid grid-cols-2 gap-0 border-y border-[var(--rule-strong)]">
              {[
                { y: "Filed 2021", rows: [["Employer", "Lagos Freight"], ["Since", "03 / 2018"], ["Refused before", "No"]] },
                { y: "Drafted 2026", rows: [["Employer", "Lagos Freight"], ["Since", "06 / 2018"], ["Refused before", "No"]] },
              ].map((f, col) => (
                <div key={f.y} className={`p-4 sm:p-5 ${col === 0 ? "border-r border-[var(--rule)]" : ""}`}>
                  <div className="label mb-3">{f.y}</div>
                  {f.rows.map(([k, v], i) => (
                    <div key={k} className="py-2 border-b border-[var(--rule)] last:border-0">
                      <div className="fine">{k}</div>
                      <div
                        className={`mono text-[15px] inline-block ${
                          i === 1 && col === 1 ? "px-1 -mx-1 outline outline-2 outline-[var(--red)] rounded-[50%]" : ""
                        }`}
                      >
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="margin-note mt-5 max-w-[34ch]">
              Three months apart. The officer will see it. Prior catches it first and tells you the fix.
            </p>
          </div>
        </div>
      </Section>

      {/* ── 02 How it works ────────────────────────────────────── */}
      <Section n="02" id="how" kicker="How it works" title="One file. Every application after it agrees with it.">
        <ol className="border-t border-[var(--rule-strong)]">
          {[
            {
              t: "Tell it your history",
              d: "Paste your travel, jobs, addresses and past applications in plain words, or drop in a text file. A refusal letter works too.",
            },
            {
              t: "It becomes sealed facts on Walrus",
              d: "Prior breaks your history into dated facts, one sentence each. Every fact is sealed with Seal and stored on Walrus Memory on Sui mainnet. You see the blob ID for each.",
              seal: true,
            },
            {
              t: "Pick a trip, get a cited pack",
              d: "UK Visitor, Schengen or the US DS 160. Every answer is drafted from your record and cites the fact it came from. Contradictions with what you filed before are flagged in red, with the fix.",
            },
            {
              t: "A refusal becomes a lesson",
              d: "Paste the refusal letter. Each reason becomes a lesson in your file, and the next pack changes because of it: new documents, a new paragraph, the refusal disclosed.",
              red: true,
            },
            {
              t: "Share with a consultant, for minutes",
              d: "Give a consultant a link that works for as long as you choose. Access ends on the Sui clock without you doing anything, or earlier if you revoke.",
            },
          ].map((s, i) => (
            <li key={s.t} className="grid grid-cols-[48px_1fr] sm:grid-cols-[80px_1fr_120px] gap-4 py-7 border-b border-[var(--rule)] items-start">
              <span className="mono text-[13px] text-[var(--ink-3)] pt-2">{["i", "ii", "iii", "iv", "v"][i]}.</span>
              <div>
                <h3 className="display text-[30px] sm:text-[36px] leading-tight">{s.t}</h3>
                <p className="mt-2 text-[17px] text-[var(--ink-2)] max-w-[58ch]">{s.d}</p>
              </div>
              <div className="hidden sm:flex justify-end">
                {s.seal && <Seal size={84} animate={false} rot={-10} />}
                {s.red && <RedStamp animate={false} rot={-8}>Lesson</RedStamp>}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap items-center gap-5">
          <Link href="/app" className="btn">
            Try it with your own history <span aria-hidden>→</span>
          </Link>
          <span className="fine max-w-[40ch]">About a minute from paste to a cited pack. Sealing each fact on mainnet takes around twenty seconds.</span>
        </div>
      </Section>

      {/* ── 03 Privacy ─────────────────────────────────────────── */}
      <Section n="03" kicker="Privacy" title="What is stored, who sees what, and what we cannot promise.">
        <dl className="grid md:grid-cols-2 gap-x-12 border-t border-[var(--rule-strong)]">
          {[
            ["Stored", "Your facts are stored on Walrus as Seal ciphertext. Only a key registered on the Walrus Memory account can decrypt them. For demo files that key is Prior's own, so keep your file id private."],
            ["Seen briefly", "The memory relayer sees the text for a moment to make a search vector. The drafting model sees your history to write answers. Neither stores it."],
            ["Where files live", "Demo files sit under Prior's Walrus Memory account on Sui mainnet. Each file is its own namespace, so yours never mixes with anyone else's."],
            ["Consultant access", "Ends on the Sui clock for new reads. Anything a consultant already opened stays opened. That is how encryption works everywhere, and we say it plainly."],
            ["Not legal advice", "Prior drafts, cites and flags. You review and submit. It never files anything for you."],
            ["Not guessed", "If your record does not say it, the answer is marked as needing your input. Prior does not invent dates."],
          ].map(([k, v]) => (
            <div key={k} className="py-6 border-b border-[var(--rule)] grid grid-cols-[130px_1fr] gap-4">
              <dt className="label pt-1.5">{k}</dt>
              <dd className="text-[17px] text-[var(--ink-2)]">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* ── 04 For agents ──────────────────────────────────────── */}
      <Section n="04" kicker="For agents" title="Any agent can buy a pack. It pays in USDC on Sui.">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] items-start">
          <div className="space-y-5 text-[18px] text-[var(--ink-2)] max-w-[48ch]">
            <p>
              Travel agents, assistants and booking bots can ask Prior for a pack built from a user&apos;s file. The endpoint
              answers with a payment request over MPP. The agent pays 0.05 USDC on Sui mainnet, the payment is checked
              onchain through Tatum, and the pack comes back.
            </p>
            <p>
              No accounts, no API keys to hand out. The receipt is a Sui transaction anyone can look up.
            </p>
            <Link href="/proof" className="link-u text-[var(--ink)]">See the payments on the proof page</Link>
          </div>
          <pre className="mono text-[13px] leading-[1.75] overflow-x-auto bg-[var(--paper-2)] border-l-2 border-[var(--seal)] p-5 sm:p-6 max-w-full">
{`GET /api/agent/pack
← 402 Payment Required
  method   mpp · sui mainnet
  amount   0.05 USDC

pay  → Sui transaction
       verified through Tatum

GET /api/agent/pack   (with receipt)
← 200  { pack }`}
          </pre>
        </div>
      </Section>

      {/* ── 05 Proof ───────────────────────────────────────────── */}
      <Section n="05" kicker="Proof" title="Every claim about the product has a record on Sui mainnet.">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] items-end">
          <p className="text-[18px] text-[var(--ink-2)] max-w-[56ch]">
            The proof page reads live from Sui mainnet through Tatum: the Walrus Memory account and its delegate keys,
            consultant grants and when they expire, agent payments, and how many memories are on file. Nothing on it is
            typed in by hand.
          </p>
          <Link href="/proof" className="btn btn-ghost">
            Open the live record <span aria-hidden>→</span>
          </Link>
        </div>
      </Section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-[1180px] px-4 sm:px-8 pt-24 sm:pt-32 scroll-mt-8">
        <div className="rule-strong mb-6" />
        <div className="grid gap-6 md:grid-cols-[180px_1fr]">
          <div className="label">Questions</div>
          <div>
            <h2 className="display text-[44px] sm:text-[64px]">Asked at the window</h2>
            <div className="mt-8 border-t border-[var(--rule-strong)]">
              {FAQ.map((f) => (
                <details key={f.q} className="group border-b border-[var(--rule)] py-5">
                  <summary className="cursor-pointer list-none flex items-start justify-between gap-6">
                    <span className="display text-[26px] sm:text-[30px] leading-tight">{f.q}</span>
                    <span className="mono text-[20px] text-[var(--ink-3)] transition-transform group-open:rotate-45 mt-1" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[17px] text-[var(--ink-2)] max-w-[64ch]">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* closing call */}
      <section className="mx-auto max-w-[1180px] px-4 sm:px-8 pt-28 text-center">
        <Seal size={120} animate={false} rot={-8} className="mx-auto" sub="YOUR FILE" />
        <h2 className="display text-[48px] sm:text-[80px] mt-8 max-w-[16ch] mx-auto">
          Next time, walk in with the same story you told last time.
        </h2>
        <Link href="/app" className="btn mt-10">
          Start your file <span aria-hidden>→</span>
        </Link>
      </section>

      <Footer />
    </>
  );
}
