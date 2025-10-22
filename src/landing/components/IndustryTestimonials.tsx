import { useLanguage } from "@/contexts/LanguageContext";
import { Quote } from "lucide-react";

interface Metric {
  value: string;
  label: string;
}

interface Testimonial {
  quote: string;
  author: string;
  business: string;
  metrics: Metric[];
}

interface IndustryTestimonialsProps {
  title: string;
  testimonials: Testimonial[];
}

export function IndustryTestimonials({ title, testimonials }: IndustryTestimonialsProps) {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container max-w-6xl">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-12">
          {title}
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-background rounded-lg p-6 shadow-sm border"
            >
              <Quote className="h-8 w-8 text-brand-400 mb-4" />
              
              <p className="text-muted-foreground mb-6 italic">
                "{testimonial.quote}"
              </p>

              <div className="mb-4">
                <p className="font-semibold">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">{testimonial.business}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                {testimonial.metrics.map((metric, mIndex) => (
                  <div key={mIndex}>
                    <p className="text-2xl font-bold text-brand-600">{metric.value}</p>
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
