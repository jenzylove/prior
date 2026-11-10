import type { Metadata } from "next";
import { Masthead } from "@/components/ui/Chrome";
import Consultant from "@/components/consultant/Consultant";

export const metadata: Metadata = {
  title: "Shared pack · Prior",
  description: "A visa application pack shared for a limited time. Access ends on the Sui clock.",
  robots: { index: false, follow: false },
};

export default async function ConsultantPage({ params }: { params: Promise<{ grantId: string }> }) {
  const { grantId } = await params;
  return (
    <>
      <Masthead here="consultant" />
      <Consultant grantId={decodeURIComponent(grantId)} />
    </>
  );
}
