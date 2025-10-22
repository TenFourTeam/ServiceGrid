import { 
  Sprout, 
  Sparkles, 
  Droplets, 
  Waves, 
  SwatchBook, 
  Hammer, 
  Home, 
  Trash2, 
  Wind 
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Challenge {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface Feature {
  title: string;
  description: string;
  benefit: string;
}

export interface Industry {
  icon: LucideIcon;
  label: string;
  slug: string;
  description: string;
  hero: {
    title: string;
    subtitle: string;
  };
  challenges: Challenge[];
  features: Feature[];
  cta: {
    title: string;
    subtitle: string;
  };
}

export const industries: Industry[] = [
  {
    icon: Sprout,
    label: "Lawn Care",
    slug: "lawn-care",
    description: "Complete business management software for lawn care professionals",
    hero: {
      title: "Lawn Care Software That Grows Your Business",
      subtitle: "Schedule jobs, send professional quotes, manage routes, and get paid faster—all in one platform built for lawn care professionals."
    },
    challenges: [
      {
        title: "Seasonal Scheduling Chaos",
        description: "Managing peak season demand while coordinating weather delays and recurring services creates scheduling nightmares.",
        icon: Sprout
      },
      {
        title: "Inefficient Routing",
        description: "Wasting time and fuel driving back and forth across town reduces profitability and crew morale.",
        icon: Home
      },
      {
        title: "Inconsistent Pricing",
        description: "Estimating property sizes and services without a system leads to underpricing and lost revenue.",
        icon: SwatchBook
      },
      {
        title: "Payment Delays",
        description: "Chasing down payments and managing paper invoices slows cash flow and wastes valuable time.",
        icon: Waves
      }
    ],
    features: [
      {
        title: "Smart Scheduling & Routing",
        description: "Drag-and-drop calendar with automatic route optimization. Weather alerts keep you informed, and recurring services are set once and automated forever.",
        benefit: "Save 20% on fuel costs and fit more jobs into each day"
      },
      {
        title: "Professional Quotes in Minutes",
        description: "Create branded proposals with service templates, property measurements, and seasonal pricing. Send instantly via email or text.",
        benefit: "Win more jobs with fast, professional quotes"
      },
      {
        title: "Automated Invoicing & Payments",
        description: "Generate invoices automatically after job completion. Accept credit cards, ACH, and online payments with automatic reminders.",
        benefit: "Get paid 3x faster with less follow-up"
      },
      {
        title: "Customer Communication Hub",
        description: "Send appointment reminders, job updates, and seasonal promotions via text and email. Keep customers informed automatically.",
        benefit: "Reduce no-shows by 60% and increase repeat bookings"
      }
    ],
    cta: {
      title: "Ready to streamline your lawn care business?",
      subtitle: "Join thousands of lawn care professionals using ServiceGrid to save time and grow revenue."
    }
  },
  {
    icon: Sparkles,
    label: "House Cleaning",
    slug: "house-cleaning",
    description: "Scheduling and management software designed for cleaning businesses",
    hero: {
      title: "House Cleaning Software That Keeps You Organized",
      subtitle: "Manage recurring cleanings, coordinate teams, track supplies, and deliver consistent quality with software built for cleaning professionals."
    },
    challenges: [
      {
        title: "Recurring Schedule Management",
        description: "Tracking weekly, bi-weekly, and monthly cleanings across dozens of clients is overwhelming without automation.",
        icon: Sparkles
      },
      {
        title: "Team Coordination",
        description: "Assigning teams to jobs, managing keys and access codes, and ensuring quality standards is complex.",
        icon: Home
      },
      {
        title: "Supply Tracking",
        description: "Running out of cleaning supplies mid-job or overspending on inventory hurts profitability.",
        icon: SwatchBook
      },
      {
        title: "Quality Control",
        description: "Maintaining consistent cleaning standards across multiple teams without proper documentation is challenging.",
        icon: Waves
      }
    ],
    features: [
      {
        title: "Automated Recurring Services",
        description: "Set up weekly, bi-weekly, or monthly cleanings once and they automatically appear on your calendar. Never miss a recurring appointment.",
        benefit: "Eliminate scheduling errors and increase recurring revenue"
      },
      {
        title: "Team Management & Assignments",
        description: "Assign teams to jobs, track hours, manage availability, and store client access information securely in one place.",
        benefit: "Coordinate multiple teams efficiently and securely"
      },
      {
        title: "Digital Checklists & Photos",
        description: "Create custom cleaning checklists for each service type. Teams can upload before/after photos for quality assurance.",
        benefit: "Ensure consistent quality and reduce client complaints"
      },
      {
        title: "Instant Online Booking",
        description: "Let clients book cleanings, request changes, and pay online through your branded customer portal.",
        benefit: "Reduce admin time and improve customer satisfaction"
      }
    ],
    cta: {
      title: "Ready to grow your cleaning business?",
      subtitle: "Join cleaning professionals who've automated their operations and increased revenue with ServiceGrid."
    }
  },
  {
    icon: Droplets,
    label: "Pressure Washing",
    slug: "pressure-washing",
    description: "Business management tools for pressure washing professionals",
    hero: {
      title: "Pressure Washing Software That Handles the Business",
      subtitle: "Estimate jobs accurately, schedule efficiently, manage equipment, and get paid fast with software designed for pressure washing pros."
    },
    challenges: [
      {
        title: "Accurate Project Estimation",
        description: "Calculating surface areas and pricing different materials without a system leads to underpricing or lost bids.",
        icon: Droplets
      },
      {
        title: "Equipment Management",
        description: "Tracking which equipment is on which job and scheduling maintenance is difficult with pen and paper.",
        icon: Hammer
      },
      {
        title: "Seasonal Demand Spikes",
        description: "Managing high-volume spring and summer seasons while maximizing revenue during peak times is challenging.",
        icon: Sprout
      },
      {
        title: "Before/After Documentation",
        description: "Showing clients the value of your work requires organized photo documentation and professional presentation.",
        icon: SwatchBook
      }
    ],
    features: [
      {
        title: "Photo-Based Estimates",
        description: "Create accurate quotes using photos and built-in surface area calculators. Price by square footage, material type, or flat rate.",
        benefit: "Win more bids with accurate, professional estimates in minutes"
      },
      {
        title: "Equipment Tracking & Scheduling",
        description: "Assign equipment to jobs, track maintenance schedules, and ensure you have the right tools for each project.",
        benefit: "Reduce downtime and extend equipment lifespan"
      },
      {
        title: "Before/After Photo Gallery",
        description: "Capture and organize before/after photos for each job. Automatically include them in customer communications and marketing.",
        benefit: "Showcase your quality and win more referrals"
      },
      {
        title: "Seasonal Pricing & Campaigns",
        description: "Set surge pricing during peak season and send automated promotional campaigns to past customers.",
        benefit: "Maximize revenue during high-demand periods"
      }
    ],
    cta: {
      title: "Ready to power up your pressure washing business?",
      subtitle: "Join pressure washing professionals using ServiceGrid to work smarter and increase profits."
    }
  },
  {
    icon: Waves,
    label: "Irrigation",
    slug: "irrigation",
    description: "Specialized software for irrigation and sprinkler system professionals",
    hero: {
      title: "Irrigation Software for Smarter System Management",
      subtitle: "Manage seasonal services, track zones and equipment, automate maintenance schedules, and respond to emergencies faster."
    },
    challenges: [
      {
        title: "Seasonal Service Tracking",
        description: "Coordinating spring startups, summer maintenance, and fall winterization across hundreds of systems is overwhelming.",
        icon: Waves
      },
      {
        title: "Zone Documentation",
        description: "Remembering zone layouts, valve locations, and system specifications for each property without proper records.",
        icon: Home
      },
      {
        title: "Emergency Response Time",
        description: "Finding system information and dispatching technicians quickly during pipe bursts and emergencies.",
        icon: Droplets
      },
      {
        title: "Maintenance Reminders",
        description: "Missing seasonal deadlines like winterization can lead to liability issues and unhappy customers.",
        icon: Sprout
      }
    ],
    features: [
      {
        title: "Seasonal Service Automation",
        description: "Set up spring, summer, and fall service templates once. ServiceGrid automatically schedules and reminds customers.",
        benefit: "Never miss a winterization deadline or seasonal revenue opportunity"
      },
      {
        title: "Zone & System Documentation",
        description: "Store zone maps, valve locations, controller settings, and system notes with photos for every property.",
        benefit: "Service systems faster with complete property information"
      },
      {
        title: "Emergency Dispatch",
        description: "Access property information instantly on mobile. Dispatch available technicians with one tap during emergency calls.",
        benefit: "Respond to emergencies 50% faster and improve customer satisfaction"
      },
      {
        title: "Maintenance Tracking",
        description: "Schedule and track backflow testing, controller battery changes, and seasonal inspections automatically.",
        benefit: "Reduce liability and provide proactive maintenance"
      }
    ],
    cta: {
      title: "Ready to streamline your irrigation business?",
      subtitle: "Join irrigation professionals managing more systems with less stress using ServiceGrid."
    }
  },
  {
    icon: SwatchBook,
    label: "Pool Service",
    slug: "pool-service",
    description: "Complete pool service management and route optimization software",
    hero: {
      title: "Pool Service Software That Keeps You Swimming",
      subtitle: "Optimize routes, track chemicals, manage equipment, and automate seasonal services with software built for pool professionals."
    },
    challenges: [
      {
        title: "Weekly Route Efficiency",
        description: "Planning optimal routes across dozens of pools while managing time windows and customer preferences.",
        icon: SwatchBook
      },
      {
        title: "Chemical Inventory",
        description: "Tracking chemical usage per pool and maintaining proper inventory levels without overstocking.",
        icon: Droplets
      },
      {
        title: "Equipment Maintenance",
        description: "Remembering filter cleanings, pump servicing, and equipment history for each pool customer.",
        icon: Hammer
      },
      {
        title: "Seasonal Services",
        description: "Coordinating pool openings, closings, and mid-season repairs while keeping customers informed.",
        icon: Sprout
      }
    ],
    features: [
      {
        title: "Intelligent Route Optimization",
        description: "Create efficient weekly routes automatically. Mobile app guides technicians pool-to-pool with customer notes and chemical history.",
        benefit: "Service 20% more pools with the same team"
      },
      {
        title: "Chemical Tracking & Inventory",
        description: "Log chemical readings and usage per pool. Track inventory levels and get low-stock alerts automatically.",
        benefit: "Maintain perfect water chemistry and reduce chemical waste"
      },
      {
        title: "Equipment Service History",
        description: "Record filter cleanings, equipment repairs, and part replacements with photos and dates for every pool.",
        benefit: "Provide better service and identify upsell opportunities"
      },
      {
        title: "Automated Seasonal Workflows",
        description: "Set up pool opening and closing checklists. Schedule and invoice seasonal services automatically.",
        benefit: "Never miss an opening or closing and capture all seasonal revenue"
      }
    ],
    cta: {
      title: "Ready to make waves in your pool business?",
      subtitle: "Join pool service professionals using ServiceGrid to optimize routes and grow revenue."
    }
  },
  {
    icon: Hammer,
    label: "Handyman",
    slug: "handyman",
    description: "Versatile business management software for handyman services",
    hero: {
      title: "Handyman Software That Handles Every Job",
      subtitle: "Manage diverse services, prevent scope creep, track parts, and schedule efficiently with software built for multi-trade professionals."
    },
    challenges: [
      {
        title: "Service Pricing Consistency",
        description: "Pricing dozens of different services without a system leads to inconsistent quotes and underpricing.",
        icon: Hammer
      },
      {
        title: "Scope Creep",
        description: "Small jobs growing into big projects without proper change orders eats into profitability.",
        icon: Home
      },
      {
        title: "Parts & Materials",
        description: "Tracking which parts are needed, marking them up consistently, and getting reimbursed slows cash flow.",
        icon: SwatchBook
      },
      {
        title: "Skill-Based Scheduling",
        description: "Matching the right technician to each job type while keeping everyone busy is complex.",
        icon: Sprout
      }
    ],
    features: [
      {
        title: "Service Catalog & Pricing",
        description: "Create a library of common services with standard pricing. Build quotes quickly by selecting services and adjusting as needed.",
        benefit: "Quote faster and maintain consistent, profitable pricing"
      },
      {
        title: "Change Order Management",
        description: "Document scope changes with photos and customer approval before starting additional work. Keep projects profitable.",
        benefit: "Prevent scope creep and get paid for all work performed"
      },
      {
        title: "Parts Tracking & Markup",
        description: "Add parts to quotes and invoices with automatic markup. Track receipts and reimbursement in one place.",
        benefit: "Recover all parts costs and increase parts revenue"
      },
      {
        title: "Skill-Based Scheduling",
        description: "Tag services by skill type and assign jobs to technicians based on their expertise and availability.",
        benefit: "Send the right person to every job and improve quality"
      }
    ],
    cta: {
      title: "Ready to build a better handyman business?",
      subtitle: "Join handyman professionals using ServiceGrid to manage more jobs and increase profits."
    }
  },
  {
    icon: Home,
    label: "Gutter Cleaning",
    slug: "gutter-cleaning",
    description: "Seasonal business management for gutter cleaning professionals",
    hero: {
      title: "Gutter Cleaning Software That Captures Every Season",
      subtitle: "Manage seasonal demand, automate rebooking, track safety compliance, and maximize fall revenue with specialized software."
    },
    challenges: [
      {
        title: "Seasonal Demand Spikes",
        description: "Managing overwhelming fall demand while filling the rest of the year is the biggest challenge.",
        icon: Home
      },
      {
        title: "Safety Documentation",
        description: "Tracking ladder safety, roof access, and insurance compliance without proper documentation is risky.",
        icon: Hammer
      },
      {
        title: "Debris Disposal",
        description: "Tracking debris removal and disposal costs to maintain profitability on each job.",
        icon: Trash2
      },
      {
        title: "Annual Rebooking",
        description: "Remembering to contact customers year after year for repeat business without automation.",
        icon: Sprout
      }
    ],
    features: [
      {
        title: "Seasonal Campaign Automation",
        description: "Send automated reminders to past customers before fall season. Create email and text campaigns to fill your schedule.",
        benefit: "Book out fall season weeks in advance"
      },
      {
        title: "Safety Checklists & Documentation",
        description: "Digital safety checklists with photo documentation for insurance compliance. Store property access notes securely.",
        benefit: "Reduce liability and meet insurance requirements"
      },
      {
        title: "Before/After Photos & Disposal Tracking",
        description: "Document gutter condition with photos. Track debris removal and disposal costs per job.",
        benefit: "Show value to customers and maintain profitability"
      },
      {
        title: "Automatic Annual Reminders",
        description: "ServiceGrid automatically reminds customers 12 months after their last cleaning to rebook for next season.",
        benefit: "Maximize repeat business without manual follow-up"
      }
    ],
    cta: {
      title: "Ready to clean up your gutter business?",
      subtitle: "Join gutter cleaning professionals using ServiceGrid to automate seasonality and grow revenue."
    }
  },
  {
    icon: Trash2,
    label: "Junk Removal",
    slug: "junk-removal",
    description: "On-demand scheduling and pricing software for junk removal businesses",
    hero: {
      title: "Junk Removal Software That Hauls More Jobs",
      subtitle: "Price by volume instantly, coordinate teams, optimize disposal routes, and handle same-day bookings with ease."
    },
    challenges: [
      {
        title: "Accurate Volume Pricing",
        description: "Estimating load size and pricing without physical inspection leads to disputes and lost revenue.",
        icon: Trash2
      },
      {
        title: "Team Coordination",
        description: "Most jobs require 2+ people. Coordinating team availability and assigning multi-person jobs is complex.",
        icon: Home
      },
      {
        title: "Disposal Routing",
        description: "Finding the closest appropriate disposal facility for each load type while minimizing dump fees.",
        icon: Waves
      },
      {
        title: "Same-Day Booking",
        description: "Customers expect fast service. Managing same-day bookings while routing efficiently is challenging.",
        icon: Sprout
      }
    ],
    features: [
      {
        title: "Photo-Based Volume Estimates",
        description: "Customers send photos, you estimate load size using visual guides. Provide instant quotes by volume tier (1/4 truck, 1/2 truck, full truck).",
        benefit: "Quote accurately without site visits and win more jobs"
      },
      {
        title: "Multi-Person Job Coordination",
        description: "Assign 2+ team members to each job automatically. Track availability and ensure proper staffing for every haul.",
        benefit: "Never send one person to a two-person job"
      },
      {
        title: "Disposal Facility Database",
        description: "Store facility locations, accepted materials, and fee structures. Route to the optimal facility for each load type.",
        benefit: "Minimize disposal costs and maximize profitability"
      },
      {
        title: "Real-Time Booking & Dispatch",
        description: "Accept online bookings 24/7. Dispatch available teams instantly with job details and customer location.",
        benefit: "Capture same-day jobs and fill schedule gaps"
      }
    ],
    cta: {
      title: "Ready to haul your business to the next level?",
      subtitle: "Join junk removal professionals using ServiceGrid to book more jobs and increase efficiency."
    }
  },
  {
    icon: Wind,
    label: "Carpet Cleaning",
    slug: "carpet-cleaning",
    description: "Professional carpet cleaning management and scheduling software",
    hero: {
      title: "Carpet Cleaning Software That Extracts More Revenue",
      subtitle: "Calculate square footage precisely, document stains, schedule drying time, and maximize equipment utilization."
    },
    challenges: [
      {
        title: "Square Footage Pricing",
        description: "Manually measuring rooms and calculating square footage leads to pricing errors and disputes.",
        icon: Wind
      },
      {
        title: "Stain Documentation",
        description: "Recording pre-existing stains and setting proper expectations without photo evidence causes conflicts.",
        icon: Sparkles
      },
      {
        title: "Drying Time Scheduling",
        description: "Blocking enough time between jobs for equipment setup, cleaning, and drying without losing bookings.",
        icon: Waves
      },
      {
        title: "Equipment Utilization",
        description: "Tracking which machines are available and scheduling maintenance without double-booking equipment.",
        icon: Hammer
      }
    ],
    features: [
      {
        title: "Room Measurement Tools",
        description: "Digital room measurement with automatic square footage calculation. Price by room, area, or stain treatment.",
        benefit: "Create precise quotes in minutes and eliminate pricing disputes"
      },
      {
        title: "Before/After Photo Documentation",
        description: "Capture and timestamp before/after photos with stain markers. Automatically include in customer communications.",
        benefit: "Set proper expectations and showcase your quality"
      },
      {
        title: "Smart Time Blocking",
        description: "Set job duration based on square footage and service type. Automatically block time for drying and equipment setup.",
        benefit: "Prevent overbooking and maximize jobs per day"
      },
      {
        title: "Equipment Calendars",
        description: "Assign equipment to jobs and track maintenance schedules. Prevent double-booking and extend equipment life.",
        benefit: "Maximize equipment ROI and reduce downtime"
      }
    ],
    cta: {
      title: "Ready to clean up your carpet business?",
      subtitle: "Join carpet cleaning professionals using ServiceGrid to streamline operations and increase bookings."
    }
  }
];
