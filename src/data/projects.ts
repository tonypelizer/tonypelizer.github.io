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
  /** Optional alternative image to use on mobile viewports. */
  mobileImage?: string;
  /** Optional small image to overlay on top of the main image. */
  overlayImage?: string;
  /** When true, the overlay is only shown on mobile viewports. */
  mobileOverlayOnly?: boolean;
  imageAlt?: string;
  /** Internal route to a dedicated case study page, e.g. '/work/ourvio' */
  caseStudyUrl?: string;
  /** When true, renders the primary button as a disabled "Coming soon" indicator. */
  comingSoon?: boolean;
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
    image: 'ourvio.png',
    mobileImage: 'ourvio-dashboard-2.png',
    overlayImage: 'ourvio.png',
    mobileOverlayOnly: true,
    imageAlt:
      'Screenshot of the Ourvio application showing group accountability dashboard',
  },
  // {
  //   slug: 'earlyledge',
  //   title: 'EarlyLedge',
  //   role: 'Independent Developer',
  //   period: '2026 – Now',
  //   description: 'Making early learning visible.',
  //   url: 'https://earlyledge.com',
  //   urlLabel: 'Go to site',
  //   image: 'earlyledge.png',
  //   imageAlt:
  //     'Screenshot of the EarlyLedge application showing early-learning tracking tools',
  // },
  {
    slug: 'emulos',
    title: 'Emulos',
    role: 'Independent Developer',
    period: '2026 – Now',
    description: 'A clinical decision simulator for medical education.',
    url: 'https://emulos.com',
    urlLabel: 'Go to site',
    image: 'emulos.png',
    mobileImage: 'emulos-2.png',
    overlayImage: 'emulos.png',
    mobileOverlayOnly: true,
    imageAlt:
      'Screenshot of the Emulos application showing the clinical decision simulation interface',
  },
  // {
  //   slug: 'microtale',
  //   title: 'MicroTale',
  //   role: 'Independent Developer',
  //   period: '2026 – Now',
  //   description:
  //     'A daily micro-writing app designed for repeat, short-form use.',
  //   url: '#',
  //   urlLabel: 'Get app',
  // },
  // {
  //   slug: 'wordrover',
  //   title: 'WordRover',
  //   role: 'Independent Developer',
  //   period: '2025 – Now',
  //   description: 'A location-based word collection game.',
  //   url: 'https://wordrover.com',
  //   urlLabel: 'Go to site',
  // },
  {
    slug: 'clawbin',
    title: 'Clawbin',
    role: 'Independent Developer',
    period: '2026 – Now',
    description: 'A community platform for discovering and sharing AI prompts.',
    url: 'https://clawbin.com',
    urlLabel: 'Go to site',
    comingSoon: true,
    image: 'clawbin-mobile.png',
    mobileImage: 'clawbin-desktop.png',
    overlayImage: 'clawbin-mobile.png',
    mobileOverlayOnly: true,
    imageAlt:
      'Screenshot of the Clawbin platform for discovering and sharing AI prompts',
  },
];

export default projects;
