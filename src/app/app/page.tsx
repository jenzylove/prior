import type { Metadata } from "next";
import { Masthead, Footer } from "@/components/ui/Chrome";
import Flow from "@/components/app/Flow";

export const metadata: Metadata = {
  title: "Your file · Prior",
  description: "Build your visa history once, sealed on Walrus. Draft every application from it.",
};

export default function AppPage() {
  return (
    <>
      <Masthead here="app" />
      <Flow />
      <Footer />
    </>
  );
}
