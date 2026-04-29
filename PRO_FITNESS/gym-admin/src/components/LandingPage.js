import React, { useEffect, useRef, useState } from 'react';
import { getMembershipPlansPublic } from '../api';

const FEATURES = [
  { icon: '◎', title: 'Client Management',  desc: 'Full CRUD — memberships, attendance, and progress in one view.' },
  { icon: '◷', title: 'Smart Scheduling',   desc: 'Weekly calendar with instant booking and trainer availability.' },
  { icon: '◉', title: 'Trainer Profiles',   desc: 'Manage your team, specialties, and schedules effortlessly.' },
  { icon: '✦', title: 'AI Assistant',       desc: 'Ask anything about clients or sessions — instant answers.' },
];

const STATS = [
  { value: '500+', label: 'Active Members' },
  { value: '30+',  label: 'Expert Trainers' },
  { value: '1.2k', label: 'Sessions / Month' },
  { value: '98%',  label: 'Satisfaction Rate' },
];

const PLAN_PERKS = [
  'Quality sessions guaranteed',
  'Lifetime account access',
  'Progress tracking',
  'AI chatbot assistant',
  'Flexible scheduling',
  'Dedicated trainer',
];

function PricingSection({ plans, loading, onSelectPlan }) {
  if (loading) {
    return (
      <div className="loading-state" style={{ padding: 60 }}>
        <div className="spinner" /> Loading plans…
      </div>
    );
  }

  return (
    <div className="pricing-grid">
      {plans.map((plan, i) => {
        const featured = i === Math.floor(plans.length / 2); // middle card featured
        // How many perks to show — scale with session_limit
        const perkCount = Math.min(3 + i, PLAN_PERKS.length);
        const perks = PLAN_PERKS.slice(0, perkCount);

        return (
          <div key={plan.id} className={`pricing-card ${featured ? 'pricing-card-featured' : ''}`}>
            {featured && <div className="pricing-badge">Most Popular</div>}

            <div className="pricing-card-header">
              <h3 className="pricing-plan-name">{plan.name}</h3>
              <p className="pricing-plan-desc">
                {plan.session_limit
                  ? `Up to ${plan.session_limit} sessions over ${plan.duration_days} days.`
                  : `Unlimited sessions for ${plan.duration_days} days.`}
              </p>
            </div>

            <div className="pricing-price">
              <span className="pricing-currency">$</span>
              <span className="pricing-amount">{plan.price}</span>
              <span className="pricing-period">/ Month</span>
            </div>

            <button
              className={`pricing-cta ${featured ? 'pricing-cta-featured' : ''}`}
              onClick={() => onSelectPlan(plan)}
            >
              {featured ? 'Start Free Trial' : 'Get Started'}
            </button>

            <div className="pricing-divider" />

            <p className="pricing-whats-included">What's Included</p>
            <ul className="pricing-perks">
              {perks.map((perk, j) => (
                <li key={j} className="pricing-perk">
                  <span className="pricing-perk-icon">◎</span>
                  {perk}
                </li>
              ))}
              {plan.session_limit && (
                <li className="pricing-perk">
                  <span className="pricing-perk-icon">◎</span>
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

export default function LandingPage({ onLogin, onSelectPlan, scrollToPricing = false }) {
  const heroRef  = useRef(null);
  const rafRef   = useRef(null);
  const currentY = useRef(0);
  const targetY  = useRef(0);

  const [plans, setPlans]     = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    getMembershipPlansPublic()
      .then(res => setPlans(res.data?.Data || []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  // Scroll to pricing section if directed from login page
  useEffect(() => {
    if (!scrollToPricing) return;
    // Wait a tick for the DOM to paint, then scroll
    const id = setTimeout(() => {
      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
    return () => clearTimeout(id);
  }, [scrollToPricing]);

  useEffect(() => {
    const onScroll = () => { targetY.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    const tick = () => {
      currentY.current += (targetY.current - currentY.current) * 0.07;
      if (heroRef.current) {
        heroRef.current.style.backgroundPositionY =
          `calc(50% + ${currentY.current * 0.28}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="landing-page">

      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="landing-logo-wordmark">HAACHIKO FITNESS</div>
        <div className="landing-nav-links">
          <a href="#about"    className="landing-nav-link">About</a>
          <a href="#features" className="landing-nav-link">Features</a>
          <a href="#pricing"  className="landing-nav-link">Pricing</a>
        </div>
        <button className="landing-btn-ghost" onClick={onLogin}>Sign In</button>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero" ref={heroRef}>
        <div className="landing-hero-overlay" />
        <div className="landing-hero-right-col">
          <h1 className="landing-hero-title">
            <span className="landing-rungym-block">
              <span className="landing-rungym-top">RUN YOUR</span>
              <span className="landing-rungym-gym">GYM</span>
            </span>
            <span className="landing-hero-title-accent">LIKE A PRO.</span>
          </h1>
          <div className="landing-hero-actions">
            <button className="landing-btn-filled landing-btn-hero"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
              View Plans
            </button>
            <button className="landing-btn-ghost landing-btn-hero" onClick={onLogin}>Sign In</button>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="landing-stats" id="about">
        {STATS.map((s, i) => (
          <div key={i} className="landing-stat">
            <div className="landing-stat-value">{s.value}</div>
            <div className="landing-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── About ── */}
      <section className="landing-about">
        <div className="landing-about-inner">
          <div className="landing-section-tag">About Us</div>
          <h2 className="landing-section-title">Built for gyms that<br />mean business.</h2>
          <p className="landing-about-text">
            HAACHIKO FITNESS Admin was built from the ground up for fitness professionals who want
            total visibility into their operation. From booking and billing to trainer performance
            and client retention — everything you need, nothing you don't.
          </p>
          <div className="landing-about-pillars">
            {['Performance-first', 'Data-driven insights', 'AI-powered assistance'].map((p, i) => (
              <div key={i} className="landing-pillar">
                <div className="landing-pillar-icon">⬡</div>
                <div className="landing-pillar-label">{p}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-features" id="features">
        <div className="landing-section-tag" style={{ textAlign: 'center' }}>Features</div>
        <h2 className="landing-section-title" style={{ textAlign: 'center', marginBottom: 64 }}>
          Everything in one place.
        </h2>
        <div className="landing-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="landing-feature-card">
              <div className="landing-feature-icon">{f.icon}</div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="landing-pricing" id="pricing">
        <div className="landing-section-tag" style={{ textAlign: 'center' }}>
          ✦ Pricing Plan
        </div>
        <h2 className="landing-section-title" style={{ textAlign: 'center' }}>
          Choose the Perfect Plan<br />for Your Fitness Goals
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 16, marginBottom: 56, marginTop: 8 }}>
          Pick a membership and create your account in seconds.
        </p>
        <PricingSection plans={plans} loading={plansLoading} onSelectPlan={onSelectPlan} />
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-logo-wordmark" style={{ fontSize: 18 }}>HAACHIKO FITNESS</div>
        <div className="landing-footer-copy">© 2026 HAACHIKO FITNESS. All rights reserved.</div>
      </footer>
    </div>
  );
}
