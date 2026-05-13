import dynamic from "next/dynamic";

const GameShell = dynamic(() => import("@/components/GameShell"), {
  ssr: false,
  loading: () => (
    <main className="page">
      <section className="game-card">
        <div className="loading">Loading neon grid...</div>
      </section>
    </main>
  )
});

export default function HomePage() {
  return <GameShell />;
}
