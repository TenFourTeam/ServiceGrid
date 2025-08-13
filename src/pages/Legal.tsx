import { useEffect } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, Shield, Cookie, BadgeDollarSign } from 'lucide-react';
import { useStore } from '@/store/useAppStore';

export default function LegalPage() {
  const { business } = useStore();

  useEffect(() => {
    const title = `${business.name ? business.name + ' — ' : ''}Terms & Services`;
    document.title = title;

    const desc = 'Read our Terms of Service, Cookie Policy, Service Credit Terms, and Data Processing Addendum.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);
  }, [business.name]);

  return (
    <AppLayout title="Legal">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Terms & Services</h1>
        <p className="text-sm text-muted-foreground mt-1">Review the policies that govern your use of our services.</p>
      </header>

      <main>
        <section aria-labelledby="legal-overview" className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle id="legal-overview">Legal overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <a href="#tos" className="flex items-center gap-2 underline-offset-4 hover:underline">
                <FileText className="h-4 w-4" />
                <span>ServiceGrid Terms of Service</span>
              </a>
              <Separator />
              <a href="#cookies" className="flex items-center gap-2 underline-offset-4 hover:underline">
                <Cookie className="h-4 w-4" />
                <span>Cookie Policy</span>
              </a>
              <Separator />
              <a href="#credits" className="flex items-center gap-2 underline-offset-4 hover:underline">
                <BadgeDollarSign className="h-4 w-4" />
                <span>Service Credit Terms</span>
              </a>
              <Separator />
              <a href="#dpa" className="flex items-center gap-2 underline-offset-4 hover:underline">
                <Shield className="h-4 w-4" />
                <span>Data Processing Addendum</span>
              </a>
            </CardContent>
          </Card>
        </section>

        <section id="tos" aria-labelledby="tos-heading" className="mb-10">
          <h2 id="tos-heading" className="text-xl font-medium">ServiceGrid Terms of Service</h2>
          <p className="mt-1 text-xs text-muted-foreground">Last Updated: August 11, 2025</p>
          <p className="mt-2 text-sm text-muted-foreground">Establishing rules governing use of ServiceGrid.</p>
          <div className="mt-4 space-y-4">
            <article>
              <h3 className="font-medium">1. Acceptance</h3>
              <p className="mt-1 text-sm text-muted-foreground">Agreeing to terms accessing our services.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>By signing up, you accept these terms.</li>
                <li>Minors (under 18) require parental consent.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">2. Services</h3>
              <p className="mt-1 text-sm text-muted-foreground">Describing offerings provided.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Job scheduling, invoicing, and lead generation tools.</li>
                <li>Free tier with premium subscriptions ($49/month). Payouts to contractors via Stripe Connect.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">3. Payment Terms</h3>
              <p className="mt-1 text-sm text-muted-foreground">Detailing financial obligations.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Subscriptions billed monthly via Stripe.</li>
                <li>Invoices processed with 2.9% + $0.30 fee (cards) or 0.8% capped at $5 (ACH). Cancellations effective at end of billing cycle.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">4. User Conduct</h3>
              <p className="mt-1 text-sm text-muted-foreground">Guiding appropriate use.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>No illegal activities or fraud.</li>
                <li>Respect intellectual property of others.</li>
                <li>Violations may result in account termination.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">5. Limitation of Liability</h3>
              <p className="mt-1 text-sm text-muted-foreground">Clarifying our responsibility.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>ServiceGrid not liable for indirect damages (e.g., lost profits).</li>
                <li>Maximum liability limited to fees paid in last 12 months.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">6. Termination</h3>
              <p className="mt-1 text-sm text-muted-foreground">Outlining account closure.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>You may cancel anytime via settings.</li>
                <li>We may terminate for breaches with 30 days’ notice.</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="cookies" aria-labelledby="cookies-heading" className="mb-10">
          <h2 id="cookies-heading" className="text-xl font-medium">Cookie Policy</h2>
          <p className="mt-1 text-xs text-muted-foreground">Last Updated: August 11, 2025</p>
          <p className="mt-2 text-sm text-muted-foreground">Explaining use of cookies on our platform.</p>
          <div className="mt-4 space-y-4">
            <article>
              <h3 className="font-medium">1. What Are Cookies?</h3>
              <p className="mt-1 text-sm text-muted-foreground">Defining tracking technologies.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Small files stored on your device.</li>
                <li>Used for functionality and analytics.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">2. Types of Cookies</h3>
              <p className="mt-1 text-sm text-muted-foreground">Identifying categories employed.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Essential: Enable login, scheduling (e.g., session cookies).</li>
                <li>Analytics: Track usage (e.g., Google Analytics, anonymized).</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">3. How We Use Cookies</h3>
              <p className="mt-1 text-sm text-muted-foreground">Describing purposes served.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Enhance user experience (e.g., remember preferences).</li>
                <li>Analyze traffic to improve services.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">4. Managing Cookies</h3>
              <p className="mt-1 text-sm text-muted-foreground">Offering control options.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Adjust settings in your browser to disable non-essential cookies.</li>
                <li>Opt-out via privacy@tenfour.com.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">5. Changes to This Policy</h3>
              <p className="mt-1 text-sm text-muted-foreground">Updating as needed.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Revisions posted here with date update.</li>
                <li>Check regularly for changes.</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="credits" aria-labelledby="credits-heading" className="mb-10">
          <h2 id="credits-heading" className="text-xl font-medium">Service Credit Terms</h2>
          <p className="mt-1 text-xs text-muted-foreground">Last Updated: August 11, 2025</p>
          <p className="mt-2 text-sm text-muted-foreground">Defining credits for service interruptions.</p>
          <div className="mt-4 space-y-4">
            <article>
              <h3 className="font-medium">1. Eligibility</h3>
              <p className="mt-1 text-sm text-muted-foreground">Determining when credits apply.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Credits issued for service downtime exceeding 2 hours.</li>
                <li>Reported via support@tenfourproject.com within 7 days.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">2. Credit Calculation</h3>
              <p className="mt-1 text-sm text-muted-foreground">Specifying credit amounts.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>5% of monthly fee per hour of downtime, up to 100%.</li>
                <li>Minimum downtime for credit: 2 consecutive hours.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">3. Application</h3>
              <p className="mt-1 text-sm text-muted-foreground">Describing credit usage.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Applied to next billing cycle.</li>
                <li>Non-transferable and non-refundable.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">4. Exclusions</h3>
              <p className="mt-1 text-sm text-muted-foreground">Limiting credit applicability.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Downtime due to user error or third-party issues (e.g., Stripe).</li>
                <li>Scheduled maintenance notified 48 hours in advance.</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="dpa" aria-labelledby="dpa-heading" className="mb-10">
          <h2 id="dpa-heading" className="text-xl font-medium">Data Processing Addendum</h2>
          <p className="mt-1 text-xs text-muted-foreground">Last Updated: August 11, 2025</p>
          <p className="mt-2 text-sm text-muted-foreground">Supplementing the Services Agreement for data handling.</p>
          <div className="mt-4 space-y-4">
            <article>
              <h3 className="font-medium">1. Definitions</h3>
              <p className="mt-1 text-sm text-muted-foreground">Establishing key terms.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Personal Data: Name, email, bank details processed via ServiceGrid.</li>
                <li>Controller: You, determining data use.</li>
                <li>Processor: ServiceGrid, processing on your behalf.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">2. Processing Scope</h3>
              <p className="mt-1 text-sm text-muted-foreground">Outlining data activities.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Purpose: Enable scheduling, invoicing, and lead services.</li>
                <li>Duration: While you use ServiceGrid or as required by law.</li>
                <li>Types: Personal and payment data.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">3. Processor Obligations</h3>
              <p className="mt-1 text-sm text-muted-foreground">Detailing TenFour’s responsibilities.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Process data only per your instructions.</li>
                <li>Implement encryption and security measures.</li>
                <li>Notify of data breaches within 72 hours.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">4. Subprocessors</h3>
              <p className="mt-1 text-sm text-muted-foreground">Managing third-party involvement.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Stripe for payment processing.</li>
                <li>Cloud providers under NDA.</li>
                <li>List updated at tenfour.com/subprocessors.</li>
              </ul>
            </article>
            <article>
              <h3 className="font-medium">5. Data Subject Rights</h3>
              <p className="mt-1 text-sm text-muted-foreground">Supporting user control.</p>
              <ul className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
                <li>Assist with access, correction, or deletion requests.</li>
                <li>Contact privacy@tenfour.com for support.</li>
              </ul>
            </article>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}
