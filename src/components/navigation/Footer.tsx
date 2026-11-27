import React from 'react';
import Footer22, { Footer22Props, OfferColumn, LinkItem } from '../ui/footer-22';
import { BrandLogo } from '../common/BrandLogo';

const defaultOfferColumns: OfferColumn[] = [
  {
    title: 'Platform',
    links: [
      { label: 'IoT Dashboard', href: '/dashboard' },
      { label: 'Water Usage Analytics', href: '/analytics' },
      { label: 'Water Conservation Insights', href: '/dashboard' },
      { label: 'Device Monitoring', href: '/dashboard' },
      { label: 'Multi-Device Support', href: '/business-analytics' },
    ],
  },
  {
    title: 'Hardware',
    links: [
      { label: 'ESP32 IoT Node', href: '/dashboard' },
      { label: 'FS-S401 Water Flow Sensor', href: '/dashboard' },
      { label: 'INA219 Power Sensor', href: '/contact' },
      { label: '16×2 LCD Display', href: '/' },
      { label: 'Sensor Integration', href: '/contact' },
    ],
  },
  {
    title: 'Sustainability',
    links: [
      { label: 'Water Conservation', href: '/analytics' },
      { label: 'Usage Insights', href: '/analytics' },
      { label: 'Sustainability Reports', href: '/analytics' },
      { label: 'Conservation Challenges', href: '/community' },
      { label: 'Sustainability Metrics', href: '/business-analytics' },
    ],
  },
  {
    title: 'Technical',
    links: [
      { label: 'Platform Architecture', href: '/' },
      { label: 'Subscription Plans', href: '/subscription' },
      { label: 'Documentation & FAQs', href: '/contact' },
      { label: 'Data & Privacy', href: '/subscription' },
      { label: 'Integration Guides', href: '/contact' },
    ],
  },
];

const defaultBottomLinks: LinkItem[] = [
  { label: 'About AquaWatt', href: '/' },
  { label: 'ESP32 Architecture', href: '/' },
  { label: 'Supabase Cloud Sync', href: '/dashboard' },
  { label: 'Community Leaderboard', href: '/community' },
  { label: 'Support & FAQs', href: '/contact' },
];

export const Footer: React.FC<Partial<Footer22Props>> = ({
  brandName = 'AQUAWATT',
  brandLogo = <BrandLogo size="md" />,
  offerColumns = defaultOfferColumns,
  newsletterHeadline = 'Subscribe for AquaWatt Updates',
  newsletterDescription = 'Get product updates, water conservation insights, IoT improvements, and new feature announcements.',
  contactHeading = 'Need a Custom IoT Integration?',
  contactDescription = '',
  emailContact = 'aquawatt.sol@gmail.com',
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
