import React from 'react';
import Footer22, { Footer22Props, OfferColumn, LinkItem } from '../ui/footer-22';
import { BrandLogo } from '../common/BrandLogo';

const defaultOfferColumns: OfferColumn[] = [
  {
    title: 'Platform',
    links: [
      { label: 'IoT Dashboard', href: '/dashboard' },
      { label: 'Consumption Analytics', href: '/analytics' },
      { label: 'Leak & Surge AI', href: '/dashboard' },
      { label: 'Hardware & Submeters', href: '/subscription' },
      { label: 'Enterprise Integration', href: '/subscription' },
    ],
  },
  {
    title: 'Hardware',
    links: [
      { label: 'ESP32 Wi-Fi Gateway', href: '/dashboard' },
      { label: 'FS-S401 Turbine Flow', href: '/dashboard' },
      { label: 'INA219 Power Monitor', href: '/dashboard' },
      { label: '16×2 Character LCD', href: '/dashboard' },
      { label: 'MQTT Telemetry Broker', href: '/dashboard' },
    ],
  },
  {
    title: 'Sustainability',
    links: [
      { label: 'Global Leaderboard', href: '/community' },
      { label: 'Saving Challenges', href: '/community' },
      { label: 'Green Badges', href: '/community' },
      { label: 'Carbon Avoidance Index', href: '/analytics' },
      { label: 'Municipal Partnerships', href: '/contact' },
    ],
  },
  {
    title: 'Technical',
    links: [
      { label: '24/7 Operations Desk', href: '/contact' },
      { label: 'Subscription Plans', href: '/subscription' },
      { label: 'Sensor Guides & FAQ', href: '/contact' },
      { label: 'Supabase Cloud Sync', href: '/dashboard' },
      { label: 'Telemetry Security Specs', href: '/contact' },
    ],
  },
];

const defaultBottomLinks: LinkItem[] = [
  { label: 'About AquaWatt', href: '/' },
  { label: 'ESP32 Architecture', href: '/dashboard' },
  { label: 'Supabase Cloud Sync', href: '/dashboard' },
  { label: 'Community Leaderboard', href: '/community' },
  { label: 'Security & Telemetry Docs', href: '/contact' },
];

export const Footer: React.FC<Partial<Footer22Props>> = ({
  brandName = 'AQUAWATT',
  brandLogo = <BrandLogo size="md" />,
  offerColumns = defaultOfferColumns,
  newsletterHeadline = 'Subscribe for Telemetry Updates',
  newsletterDescription = 'Get the latest IoT firmware releases, energy conservation insights, and sensor integration guides.',
  contactHeading = 'Need Custom Sensor Work?',
  contactDescription = 'Our embedded systems engineers can help configure custom pulse flow meters, MQTT gateways, and facility submeters.',
  emailContact = 'telemetry@aquawatt.io',
  bottomLinks = defaultBottomLinks,
  ...rest
}) => {
  return (
    <Footer22
      brandName={brandName}
      brandLogo={brandLogo}
      offerColumns={offerColumns}
      newsletterHeadline={newsletterHeadline}
      newsletterDescription={newsletterDescription}
      contactHeading={contactHeading}
      contactDescription={contactDescription}
      emailContact={emailContact}
      bottomLinks={bottomLinks}
      {...rest}
    />
  );
};

export { Footer22 };
export default Footer;
