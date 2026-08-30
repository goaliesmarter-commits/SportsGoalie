import React from "react";
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaYoutube, FaReddit } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

interface Footer7Props {
  logo?: {
    url: string;
    src?: string;
    alt: string;
    title: string;
  };
  sections?: Array<{
    title: string;
    links: Array<{ name: string; href: string }>;
  }>;
  description?: string;
  socialLinks?: Array<{
    icon: React.ReactElement;
    href: string;
    label: string;
  }>;
  copyright?: string;
  legalLinks?: Array<{
    name: string;
    href: string;
  }>;
}

const defaultSections = [
  {
    title: "Platform",
    links: [
      { name: "Goaltending: 7 Pillars", href: "#features" },
      { name: "Test Your Knowledge", href: "#features" },
      { name: "Performance Analytics", href: "#features" },
      { name: "Dashboard Command Center", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "#about" },
      { name: "Coaches", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Careers", href: "#" },
    ],
  },
  {
    title: "Connect",
    links: [
      { name: "info@smartergoalie.com", href: "mailto:info@smartergoalie.com" },
      { name: "+1 (416) 939-0555", href: "tel:+14169390555" },
      { name: "Help Center", href: "#" },
      { name: "Privacy", href: "/privacy" },
    ],
  },
];

const defaultSocialLinks = [
  { icon: <FaLinkedin className="size-5" />, href: "#", label: "LinkedIn" },
  { icon: <FaXTwitter className="size-5" />, href: "#", label: "X" },
  { icon: <FaTiktok className="size-5" />, href: "#", label: "TikTok" },
  { icon: <FaFacebook className="size-5" />, href: "#", label: "Facebook" },
  { icon: <FaInstagram className="size-5" />, href: "#", label: "Instagram" },
  { icon: <FaYoutube className="size-5" />, href: "#", label: "YouTube" },
  { icon: <FaReddit className="size-5" />, href: "#", label: "Reddit" },
];

// Both were href="#" until 27 August 2026 — the pages did not exist. Named
// "Terms of Service" rather than "Terms and Conditions" to match the sign-up
// tickbox and the document's own title; three names for one document is how
// people end up unsure whether they have read it.
const defaultLegalLinks = [
  { name: "Terms of Service", href: "/terms" },
  { name: "Privacy Policy", href: "/privacy" },
];

export const Footer7 = ({
  logo = {
    url: "#",
    src: "/logo.png",
    alt: "Smarter Goalie logo",
    title: "SMARTER-GOALIE",
  },
  sections = defaultSections,
  description =
    "Train the Mind. Understand the mechanics. Think Smart - Play Smarter. Build 7 Pillars of Intelligent Goaltending through cognitive awareness, technical precision, and proven positional systems.",
  socialLinks = defaultSocialLinks,
  copyright = "© 2026 Smarter Goalie. All rights reserved.",
  legalLinks = defaultLegalLinks,
}: Footer7Props) => {
  return (
    <section
      style={{
        background: 'linear-gradient(145deg, #000f28 0%, #062344 60%, #0a3159 100%)',
        borderTop: '1px solid rgba(55,181,255,0.15)',
        padding: '48px 24px',
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex w-full flex-col justify-between gap-10 lg:flex-row lg:items-start lg:text-left">

          {/* Brand column */}
          <div className="flex w-full flex-col justify-between gap-6 lg:items-start">
            {/* Logo */}
            <div className="flex items-center gap-3 lg:justify-start">
              <a href={logo.url}>
                {logo.src ? (
                  <img src={logo.src} alt={logo.alt} title={logo.title} className="h-9 w-auto" />
                ) : (
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #37b5ff 0%, #0ea5e9 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: '#fff',
                      fontSize: '14px',
                    }}
                  >
                    SG
                  </div>
                )}
              </a>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '2px',
                  color: '#fff',
                  textTransform: 'uppercase',
                }}
              >
                {logo.title}
              </span>
            </div>

            {/* Description */}
            <p
              style={{
                maxWidth: '320px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.75,
              }}
            >
              {description}
            </p>

            {/* Social icons */}
            <ul style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {socialLinks.map((social, idx) => (
                <li key={idx}>
                  <a
                    href={social.href}
                    aria-label={social.label}
                    style={{
                      color: 'rgba(255,255,255,0.35)',
                      transition: 'color 0.2s',
                      display: 'block',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#37b5ff')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.35)')}
                  >
                    {social.icon}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          <div className="grid w-full gap-6 md:grid-cols-3 lg:gap-20">
            {sections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h3
                  style={{
                    marginBottom: '16px',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '2.5px',
                    textTransform: 'uppercase',
                    color: '#37b5ff',
                  }}
                >
                  {section.title}
                </h3>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {section.links.map((link, linkIdx) => (
                    <li key={linkIdx}>
                      <a
                        href={link.href}
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'rgba(255,255,255,0.5)',
                          textDecoration: 'none',
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#fff')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.5)')}
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
            {copyright}
          </p>
          <ul style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {legalLinks.map((link, idx) => (
              <li key={idx}>
                <a
                  href={link.href}
                  style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.3)',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#37b5ff')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.3)')}
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
