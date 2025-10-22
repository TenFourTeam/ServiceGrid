import { useLanguage } from "@/contexts/LanguageContext";

interface Term {
  term: string;
  definition: string;
}

interface BestPractice {
  title: string;
  description: string;
}

interface IndustryDeepDiveProps {
  title: string;
  subtitle: string;
  terms: Term[];
  bestPractices: BestPractice[];
}

export function IndustryDeepDive({ title, subtitle, terms, bestPractices }: IndustryDeepDiveProps) {
  return (
    <section className="py-16 md:py-24">
      <div className="container max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-semibold mb-6">Industry Terminology</h3>
            <dl className="space-y-4">
              {terms.map((item, index) => (
                <div key={index} className="pb-4 border-b border-border last:border-0">
                  <dt className="font-semibold text-brand-700 dark:text-brand-400 mb-1">
                    {item.term}
                  </dt>
                  <dd className="text-muted-foreground">{item.definition}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h3 className="text-2xl font-semibold mb-6">Best Practices</h3>
            <div className="space-y-6">
              {bestPractices.map((practice, index) => (
                <div key={index} className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-2">{practice.title}</h4>
                  <p className="text-muted-foreground">{practice.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
