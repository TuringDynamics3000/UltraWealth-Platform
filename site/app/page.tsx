import Hero from "../components/Hero";
import PersonalContext from "../components/PersonalContext";
import ResponsibilityTrigger from "../components/ResponsibilityTrigger";
import GovernedReveal from "../components/GovernedReveal";
import AdvisorContext from "../components/AdvisorContext";

export default function Home() {
  return (
    <main>
      <Hero />
      <PersonalContext />
      <ResponsibilityTrigger />
      <GovernedReveal />
      <AdvisorContext />
    </main>
  );
}
