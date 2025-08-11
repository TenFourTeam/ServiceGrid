export const content = {
  hero: {
    A: {
      eyebrow: "For growing field service teams",
      title: "Schedule, quote, and invoice without the back-and-forth",
      subtitle:
        "TenFour Lawn keeps your day moving: drag-and-drop scheduling, one-click quotes, and instant payments in a single lightweight app.",
      primaryCta: { label: "Join waitlist — 2 min", href: "mailto:hello@tenfourlawn.com?subject=Join%20Waitlist" },
      secondaryCta: { label: "Book 15‑min demo", href: "mailto:hello@tenfourlawn.com?subject=Book%20Demo" },
    },
    B: {
      eyebrow: "Less admin. More jobs.",
      title: "Your lawn routes, quotes, and cashflow—on autopilot",
      subtitle:
        "Stop juggling tools. See today’s work, send prices clients accept, and get paid faster—without extra clicks.",
      primaryCta: { label: "Book 15‑min demo", href: "mailto:hello@tenfourlawn.com?subject=Book%20Demo" },
      secondaryCta: { label: "Join waitlist", href: "mailto:hello@tenfourlawn.com?subject=Join%20Waitlist" },
    },
  },
  proof: {
    heading: "Trusted by busy operators",
    logos: [
      { name: "GreenRoute" },
      { name: "TrimPro" },
      { name: "YardFlow" },
      { name: "BladeWorks" },
      { name: "Lawnly" },
    ],
  },
  benefits: [
    {
      title: "Drag-and-drop calendar",
      desc: "Reassign, reschedule, and batch jobs in seconds—no phone tag.",
    },
    {
      title: "Quotes clients accept",
      desc: "Simple, mobile‑friendly quotes that convert with one tap.",
    },
    {
      title: "Invoices that get paid",
      desc: "Track status and collect online payments without chasing.",
    },
    {
      title: "Zero setup",
      desc: "Start in minutes. Import customers later if you want.",
    },
  ],
  highlights: {
    heading: "How it works",
    steps: [
      {
        key: "schedule",
        title: "Plan your day fast",
        desc: "Drag jobs onto the calendar. We handle conflicts and travel time.",
      },
      {
        key: "quote",
        title: "Send a quote that sells",
        desc: "Itemized options, clear totals, and one‑tap approval.",
      },
      {
        key: "work",
        title: "Do the work, capture photos",
        desc: "Attach job photos and notes from your phone in a couple taps.",
      },
      {
        key: "invoice",
        title: "Invoice and get paid",
        desc: "Send instantly. Clients pay online. You see it in your dashboard.",
      },
    ],
  },
  faq: [
    {
      q: "Is there a free trial?",
      a: "Yes. Join the waitlist—everyone gets an early access trial with no credit card.",
    },
    {
      q: "Can I bring my customer list?",
      a: "You can start fresh now and import customers later—CSV supported.",
    },
    {
      q: "Does it work on mobile?",
      a: "Yes. The web app runs beautifully on phones and tablets.",
    },
    {
      q: "Do you support teams?",
      a: "Yes. Assign jobs to routes and crew members easily.",
    },
  ],
  cta: {
    heading: "Ready to run on autopilot?",
    primaryA: { label: "Join waitlist — free early access", href: "mailto:hello@tenfourlawn.com?subject=Join%20Waitlist" },
    primaryB: { label: "Book a 15‑min demo", href: "mailto:hello@tenfourlawn.com?subject=Book%20Demo" },
    subcopy: "No credit card required",
  },
} as const;

export type HighlightKey = typeof content.highlights.steps[number]["key"];