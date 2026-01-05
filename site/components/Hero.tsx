import { hero } from "../copy/homepage";

export default function Hero() {
  return (
    <section>
      <h1>{hero.headline}</h1>
      <p>{hero.subheadline}</p>
      <div>
        <a href="/how-it-works">{hero.primaryCTA}</a>
        <a href="/demo">{hero.secondaryCTA}</a>
      </div>
    </section>
  );
}
