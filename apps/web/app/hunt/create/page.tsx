import { RequireLevel } from "@/components/feature-gate";
import { CreateHuntWizard } from "@/components/hunt/create-hunt-wizard";

export default async function CreateHuntPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string | string[] }>;
}) {
  const rawCampaign = (await searchParams).campaign;
  const parsedCampaign = typeof rawCampaign === "string" ? Number(rawCampaign) : Number.NaN;
  const campaignId = Number.isInteger(parsedCampaign) && parsedCampaign > 0 ? parsedCampaign : undefined;

  return (
    <RequireLevel level={2}>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <CreateHuntWizard campaignId={campaignId} />
      </div>
    </RequireLevel>
  );
}
