import CinematicStudio from "@/components/CinematicStudio";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-fade opacity-60" />

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16 lg:px-10">
        <header className="flex flex-col gap-4 text-center lg:text-left">
          <span className="text-sm uppercase tracking-[0.4em] text-slate-400">
            Studio expérimental
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Générateur de vidéos cinématographiques en temps réel
          </h1>
          <p className="text-lg text-slate-300 md:text-xl">
            Composez des séquences spectaculaires, paramétrez la caméra virtuelle et exportez un
            rendu WebM prêt à être monté. Aucun plugin requis — tout se déroule dans votre
            navigateur.
          </p>
        </header>

        <CinematicStudio />
      </section>
    </main>
  );
}
