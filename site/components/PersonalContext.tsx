import { personal } from "../copy/homepage";

export default function PersonalContext() {
  return (
    <section>
      <h2>{personal.title}</h2>
      <p>{personal.note}</p>
    </section>
  );
}
