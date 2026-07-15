import StudioShell from "../studio-shell";

export const dynamic = "force-dynamic";

export default async function CreateStudioPage() {
  return <StudioShell createMode />;
}
