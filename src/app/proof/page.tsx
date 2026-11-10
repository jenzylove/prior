import type { Metadata } from "next";
import { Masthead, Footer } from "@/components/ui/Chrome";
import Proof from "@/components/proof/Proof";

export const metadata: Metadata = {
  title: "Proof · Prior",
  description: "Live from Sui mainnet via Tatum: the Walrus Memory account, consultant grants, agent payments and memory counts.",
};

export default function ProofPage() {
  return (
    <>
      <Masthead here="proof" />
      <Proof />
      <Footer />
    </>
  );
}
