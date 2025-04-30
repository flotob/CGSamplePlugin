import PluginContainer from "./PluginContainer";

export default async function Home() {
  return (
    <div className="min-h-screen p-4 sm:p-6 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 w-full">
        <PluginContainer />
      </main>
    </div>
  );
}
