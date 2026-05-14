import dynamic from "next/dynamic";

const GameShell = dynamic(() => import("@/components/GameShell"), {
  ssr: false,
  loading: () => (
    <main className="page">
      <section className="game-card">
        <div className="loading">
          <span className="loading__text">Loading neon grid</span>
          <span className="loading__bar" aria-hidden="true" />
        </div>
      </section>
    </main>
  )
});

export default function HomePage() {
  return <GameShell />;
}
