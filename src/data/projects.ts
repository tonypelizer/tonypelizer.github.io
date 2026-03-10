export interface Project {
  slug: string;
  title: string;
  role: string;
  period: string;
  description: string;
  url: string;
  urlLabel: string;
  /** Path is relative to src/assets/. Leave empty if no image yet. */
  image?: string;
  imageAlt?: string;
  /** Internal route to a dedicated case study page, e.g. '/work/ourvio' */
  caseStudyUrl?: string;
}

const projects: Project[] = [
  {
    slug: 'ourvio',
    title: 'Ourvio',
    role: 'Independent Developer',
    period: '2025 – Now',
    description:
      'A lightweight platform for shared accountability and task management within groups.',
    url: 'https://ourvio.com',
    urlLabel: 'Go to site',
    caseStudyUrl: '/work/ourvio',
    image: 'ourvio-3.png',
    imageAlt:
      'Screenshot of the Ourvio application showing group accountability dashboard',
  },
  {
    slug: 'earlyledge',
    title: 'EarlyLedge',
    role: 'Independent Developer',
    period: '2026 – Now',
    description: 'Making early learning visible.',
    url: 'https://earlyledge.com',
    urlLabel: 'Go to site',
    image: 'earlyledge.png',
    imageAlt:
      'Screenshot of the EarlyLedge application showing early-learning tracking tools',
  },
  {
    slug: 'microtale',
    title: 'MicroTale',
    role: 'Independent Developer',
    period: '2026 – Now',
    description:
      'A daily micro-writing app designed for repeat, short-form use.',
    url: '#',
    urlLabel: 'Get app',
  },
  {
    slug: 'wordrover',
    title: 'WordRover',
    role: 'Independent Developer',
    period: '2025 – Now',
    description: 'A location-based word collection game.',
    url: 'https://wordrover.com',
    urlLabel: 'Go to site',
  },
];

export default projects;
