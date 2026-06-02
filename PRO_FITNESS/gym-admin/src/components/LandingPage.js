import React, { useEffect, useRef, useState } from 'react';
import { getMembershipPlansPublic } from '../api';
import LandingChatbot from './LandingChatbot';
import '../LandingPage.css';
import logo from '../assets/haachikologo.png';
import gymImage from '../assets/gymimage.png';

/* ─── Data ──────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: 'Smart Scheduling',
    desc: 'Drag-and-drop calendar with real-time trainer availability and instant booking.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'AI Chatbot Assistant',
    desc: 'Natural language queries for clients, sessions, and gym analytics — powered by AI.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
    title: 'Membership Tracking',
    desc: 'Automated plans, renewals, session limits, and expiry alerts in one dashboard.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Trainer Management',
    desc: 'Profiles, specialties, schedules, and performance tracking for your entire team.',
  },
];

const STATS = [
  { value: '500+', label: 'Active Members' },
  { value: '30+',  label: 'Expert Trainers' },
  { value: '1.2k', label: 'Sessions / Month' },
  { value: '98%',  label: 'Satisfaction' },
];

const PLAN_PERKS = [
  'Quality sessions guaranteed',
  'Lifetime account access',
  'Progress tracking',
  'AI chatbot assistant',
  'Flexible scheduling',
  'Dedicated trainer',
];

/* ─── Pricing ───────────────────────────────────────────────── */

function PricingSection({ plans, loading, onSelectPlan }) {
  if (loading) {
    return (
      <div className="lp-pricing-loading">
        <div className="lp-spinner" /> Loading plans...
      </div>
    );
  }

  return (
    <div className="lp-pricing-grid">
      {plans.map((plan, i) => {
        const featured = i === Math.floor(plans.length / 2);
        const perkCount = Math.min(3 + i, PLAN_PERKS.length);
        const perks = PLAN_PERKS.slice(0, perkCount);

        return (
          <div key={plan.id} className={`lp-pricing-card${featured ? ' lp-pricing-featured' : ''}`}>
            {featured && <div className="lp-pricing-badge">Most Popular</div>}

            <div className="lp-pricing-header">
              <h3 className="lp-pricing-name">{plan.name}</h3>
              <p className="lp-pricing-desc">
                {plan.session_limit
                  ? `Up to ${plan.session_limit} sessions over ${plan.duration_days} days.`
                  : `Unlimited sessions for ${plan.duration_days} days.`}
              </p>
            </div>

            <div className="lp-pricing-price">
              <span className="lp-pricing-currency">$</span>
              <span className="lp-pricing-amount">{plan.price}</span>
              <span className="lp-pricing-period">/ Month</span>
            </div>

            <button
              className={`lp-pricing-cta${featured ? ' lp-pricing-cta-featured' : ''}`}
              onClick={() => onSelectPlan(plan)}
            >
              {featured ? 'Start Free Trial' : 'Get Started'}
            </button>

            <div className="lp-pricing-divider" />

            <p className="lp-pricing-included">What's Included</p>
            <ul className="lp-pricing-perks">
              {perks.map((perk, j) => (
                <li key={j} className="lp-pricing-perk">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {perk}
                </li>
              ))}
              {plan.session_limit && (
                <li className="lp-pricing-perk">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {plan.session_limit} sessions included
                </li>
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────── */

export default function LandingPage({ onLogin, onSelectPlan, scrollToPricing = false }) {
  const [plans, setPlans]             = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [navScrolled, setNavScrolled] = useState(false);
  const pricingRef = useRef(null);

  useEffect(() => {
    getMembershipPlansPublic()
      .then(res => setPlans(res.data?.Data || []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  useEffect(() => {
    if (!scrollToPricing) return;
    const id = setTimeout(() => {
      pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
    return () => clearTimeout(id);
  }, [scrollToPricing]);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="lp">

      {/* ── Navbar ────────────────────────────────────────────── */}
      <nav className={`lp-nav${navScrolled ? ' lp-nav-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <div className="lp-nav-brand">
            <img src={logo} alt="Haachiko Fitness" className="lp-nav-logo-img" />
            <span className="lp-nav-brand-text">HAACHIKO FITNESS</span>
          </div>

          <div className="lp-nav-links">
            <a href="#about"    className="lp-nav-link" onClick={e => { e.preventDefault(); scrollTo('about'); }}>About</a>
            <a href="#features" className="lp-nav-link" onClick={e => { e.preventDefault(); scrollTo('features'); }}>Features</a>
            <a href="#pricing"  className="lp-nav-link" onClick={e => { e.preventDefault(); scrollTo('pricing'); }}>Pricing</a>
          </div>

          <div className="lp-nav-actions">
            <button className="lp-btn-ghost" onClick={onLogin}>Sign In</button>
            <button className="lp-btn-filled" onClick={() => scrollTo('pricing')}>Join Now</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-hero-left">
            <div className="lp-hero-tag">Where Fitness Meets Passion</div>
            <h1 className="lp-hero-title">
              <span className="lp-hero-line1">Where Fitness</span>
              <span className="lp-hero-line2">Meets Passion.</span>
            </h1>
            <p className="lp-hero-sub">
              Train smarter. Book easier. Track everything. The all-in-one platform for modern gyms and fitness professionals.
            </p>
            <div className="lp-hero-actions">
              <button className="lp-btn-filled lp-btn-lg" onClick={() => scrollTo('pricing')}>
                Get Started
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
              <button className="lp-btn-outline lp-btn-lg" onClick={() => scrollTo('pricing')}>
                View Plans
              </button>
            </div>
          </div>
          <div className="lp-hero-right">
            <div className="lp-hero-image-wrap">
              <img
                src={gymImage}
                alt="Gym workout"
                className="lp-hero-image"
              />
              <div className="lp-hero-image-overlay" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────── */}
      <section className="lp-stats">
        {STATS.map((s, i) => (
          <div key={i} className="lp-stat">
            <div className="lp-stat-value">{s.value}</div>
            <div className="lp-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── About ────────────────────────────────────────────── */}
      <section className="lp-about" id="about">
        <div className="lp-about-inner">
          <div className="lp-about-left">
            <div className="lp-section-tag">About Us</div>
            <h2 className="lp-about-title">
              Built for gyms<br />that mean business.
            </h2>
          </div>
          <div className="lp-about-right">
            <p className="lp-about-text">
              HAACHIKO FITNESS was built from the ground up for fitness professionals who want
              total visibility into their operation. From booking and billing to trainer performance
              and client retention — everything you need, nothing you don't.
            </p>
            <div className="lp-about-pills">
              {['Performance-first', 'Data-driven insights', 'AI-powered assistance'].map((p, i) => (
                <div key={i} className="lp-about-pill">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {p}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="lp-features" id="features">
        <div className="lp-features-inner">
          <div className="lp-section-tag lp-text-center">Features</div>
          <h2 className="lp-features-title">Everything in one place.</h2>
          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="lp-feature-card">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section className="lp-pricing" id="pricing" ref={pricingRef}>
        <div className="lp-pricing-inner">
          <div className="lp-section-tag lp-text-center">Pricing Plan</div>
          <h2 className="lp-pricing-title">
            Choose the Perfect Plan<br />for Your Fitness Goals
          </h2>
          <p className="lp-pricing-sub">
            Pick a membership and create your account in seconds.
          </p>
          <PricingSection plans={plans} loading={plansLoading} onSelectPlan={onSelectPlan} />
        </div>
      </section>

      {/* ── Quote ────────────────────────────────────────────── */}
      <section className="lp-quote">
        <div className="lp-quote-overlay" />
        <div className="lp-quote-content">
          <blockquote className="lp-quote-text">
            "The only bad workout is the one that didn't happen."
          </blockquote>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-nav-brand">
              <img src={logo} alt="Haachiko Fitness" className="lp-nav-logo-img lp-footer-logo" />
              <span className="lp-nav-brand-text">HAACHIKO FITNESS</span>
            </div>
            <div className="lp-footer-socials">
              <a href="#" className="lp-footer-social" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" className="lp-footer-social" aria-label="Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
            </div>
          </div>

          <div className="lp-footer-info">
            <div className="lp-footer-hours-title">Open Daily</div>
            <p className="lp-footer-hours">7am - 8pm Monday thru Friday</p>
            <p className="lp-footer-hours">9am - 3pm Weekends</p>
            <p className="lp-footer-address">123 Fitness Street</p>
            <p className="lp-footer-address">Your City, ST 00000</p>
          </div>

          <div className="lp-footer-cta">
            <button className="lp-btn-filled" onClick={() => scrollTo('pricing')}>Join Today</button>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <p>© 2026 HAACHIKO FITNESS. All rights reserved.</p>
        </div>
      </footer>

      <LandingChatbot />
    </div>
  );
}
