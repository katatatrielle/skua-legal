import { MatterHome } from "../components/matters/matter-home";
import { listMatters } from "../server/matters/matter.service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const matters = await listMatters();

    return <MatterHome initialMatters={matters} />;
  } catch (error) {
    return (
      <MatterHome
        initialMatters={[]}
        setupError={error instanceof Error ? error.message : "DATABASE_URL is required to load matters."}
      />
    );
  }
}
