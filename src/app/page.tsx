import PluginContainer from "./PluginContainer";

export default async function Home() {
  return (
    <div className="min-h-screen font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col w-full">
        <PluginContainer />
      </main>
    </div>
  );
}
