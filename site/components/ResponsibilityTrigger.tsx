import { trigger } from "../copy/homepage";

export default function ResponsibilityTrigger() {
  return (
    <section>
      <h2>{trigger.title}</h2>
      <p>{trigger.line}</p>
    </section>
  );
}
