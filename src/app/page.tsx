import Link from "next/link";
import CheckoutButton from "@/components/CheckoutButton";

export default function LandingPage() {
  return (
    <div className="screen active" style={{ background: "var(--cream)", display: "flex" }}>
      <nav className="nav">
        <div className="logo">
          <div className="logo-icon">
            <div className="logo-cross"></div>
          </div>
          <div className="logo-name">
            Steward<span>.</span>
          </div>
        </div>
        <div className="nav-links">
          <Link href="#">Features</Link>
          <Link href="#">Denominations</Link>
          <Link href="#">Pricing</Link>
          <Link href="#">vs Legacy Systems</Link>
          <Link href="/auth" className="btn btn-outline btn-sm">
            Sign in
          </Link>
          <Link href="/auth" className="btn btn-forest btn-sm">
            Get started free
          </Link>
        </div>
      </nav>

      <div className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">✦ Church Finance Software</div>
          <h1>
            Church finance,<br />
            <em>faithfully</em> managed.
          </h1>
          <p className="hero-sub">
            Steward gives every church treasurer the tools they deserve —
            AI-powered bookkeeping, fund accounting, membership, payroll, and
            reporting. Built for all Christian denominations.
          </p>
          <div className="hero-cta">
            <Link href="/auth" className="btn btn-forest btn-lg">
              Start free trial
            </Link>
            <Link href="/dashboard" className="btn btn-outline btn-lg">
              View live demo
            </Link>
          </div>
          <p className="hero-note">✓ 14-day free trial &nbsp;·&nbsp; ✓ No credit card &nbsp;·&nbsp; ✓ Cancel any time</p>
          <div className="hero-denom">
            <div className="denom-pill">Anglican</div>
            <div className="denom-pill">Baptist</div>
            <div className="denom-pill">Methodist</div>
            <div className="denom-pill">Pentecostal</div>
            <div className="denom-pill">Catholic</div>
            <div className="denom-pill">Presbyterian</div>
            <div className="denom-pill">Adventist</div>
            <div className="denom-pill">+ many more</div>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-card">
            <div className="hero-card-title">
              📊 <span className="serif">Grace Baptist Church — April 2026</span>
            </div>
            <div className="mini-kpi-row">
              <div className="mini-kpi">
                <div className="mini-kpi-val">£14,280</div>
                <div className="mini-kpi-lbl">Income</div>
              </div>
              <div className="mini-kpi">
                <div className="mini-kpi-val">£8,940</div>
                <div className="mini-kpi-lbl">Expenditure</div>
              </div>
              <div className="mini-kpi">
                <div className="mini-kpi-val">£5,340</div>
                <div className="mini-kpi-lbl">Surplus</div>
              </div>
            </div>
            <div className="tx-list">
              <div className="mini-tx">
                <div className="mini-tx-ico" style={{ background: "var(--sage-bg)" }}>🎁</div>
                <div className="mini-tx-body">
                  <div className="mini-tx-name">Sunday Offering</div>
                  <div className="mini-tx-cat">General Fund · 30 Apr</div>
                </div>
                <div className="mini-tx-amt" style={{ color: "var(--sage)" }}>+£3,840</div>
              </div>
              <div className="mini-tx">
                <div className="mini-tx-ico" style={{ background: "var(--gold-bg)" }}>💰</div>
                <div className="mini-tx-body">
                  <div className="mini-tx-name">Lottery Grant</div>
                  <div className="mini-tx-cat">Restricted · Community</div>
                </div>
                <div className="mini-tx-amt" style={{ color: "var(--sage)" }}>+£5,000</div>
              </div>
              <div className="mini-tx">
                <div className="mini-tx-ico" style={{ background: "var(--rust-bg)" }}>🏢</div>
                <div className="mini-tx-body">
                  <div className="mini-tx-name">Building maintenance</div>
                  <div className="mini-tx-cat">Facilities</div>
                </div>
                <div className="mini-tx-amt" style={{ color: "var(--rust)" }}>-£1,200</div>
              </div>
            </div>
            <div className="hero-ai-bar">
              <div className="hero-ai-dot"></div>
              <div className="hero-ai-text">
                AI insight: Giving is <strong>↑ 11% ahead</strong> of last April. On track to exceed annual target by £8,400.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="trust-bar">
        <div className="trust-item">⛪ 11,400+ churches</div>
        <div className="trust-item">💷 £480M+ funds managed</div>
        <div className="trust-item">🏷️ 40+ denominations</div>
        <div className="trust-item">🤖 AI-powered</div>
        <div className="trust-item">📱 Works offline</div>
        <div className="trust-item">🔒 GDPR compliant</div>
      </div>

      <section className="section" style={{ background: "var(--parchment)" }}>
        <div className="section-max">
          <div className="eyebrow">Full feature suite</div>
          <h2 className="section-title">Everything your treasurer needs</h2>
          <p className="section-sub">
            One system for every aspect of church financial management — designed for real treasurers, not accountants.
          </p>
          <div className="features-grid">
            <div className="feat-card">
              <div className="feat-icon" style={{ background: "var(--sage-bg)" }}>💰</div>
              <h3>Fund accounting</h3>
              <p>Restricted, unrestricted, and designated fund accounting — exactly how churches actually manage money.</p>
              <div className="feat-badge" style={{ background: "var(--sage-bg)", color: "var(--sage)" }}>Core</div>
            </div>
            <div className="feat-card">
              <div className="feat-icon" style={{ background: "var(--gold-bg)" }}>🧠</div>
              <h3>AI assistant</h3>
              <p>Upload bank statements for instant categorisation. Ask your books in plain English.</p>
              <div className="feat-badge" style={{ background: "var(--gold-bg)", color: "var(--gold)" }}>AI powered</div>
            </div>
            <div className="feat-card">
              <div className="feat-icon" style={{ background: "var(--sage-bg)" }}>👥</div>
              <h3>Membership</h3>
              <p>Full member records, transfers, baptisms, attendance and giving history.</p>
              <div className="feat-badge" style={{ background: "var(--sage-bg)", color: "var(--sage)" }}>Core</div>
            </div>
            <div className="feat-card">
              <div className="feat-icon" style={{ background: "var(--gold-bg)" }}>📄</div>
              <h3>AI report writer</h3>
              <p>Treasurer reports, board summaries, annual accounts, HMRC Gift Aid returns.</p>
              <div className="feat-badge" style={{ background: "var(--gold-bg)", color: "var(--gold)" }}>AI powered</div>
            </div>
            <div className="feat-card">
              <div className="feat-icon" style={{ background: "var(--sage-bg)" }}>🏛️</div>
              <h3>Multi-tier oversight</h3>
              <p>Diocese, circuit, conference, or district-level consolidated reporting.</p>
              <div className="feat-badge" style={{ background: "var(--sage-bg)", color: "var(--sage)" }}>Multi-tier</div>
            </div>
            <div className="feat-card">
              <div className="feat-icon" style={{ background: "var(--rust-bg)" }}>📱</div>
              <h3>Mobile & offline</h3>
              <p>Full PWA — record offerings, add transactions, and manage accounts even without wifi.</p>
              <div className="feat-badge" style={{ background: "var(--rust-bg)", color: "var(--rust)" }}>Offline-first</div>
            </div>
          </div>
        </div>
      </section>

      <section className="denom-section">
        <div className="eyebrow" style={{ color: "var(--gold2)" }}>Built for every tradition</div>
        <h2 className="section-title" style={{ color: "var(--cream)" }}>Your denomination, your language</h2>
        <p className="section-sub" style={{ color: "rgba(255,255,255,.55)" }}>
          Steward adapts its terminology to match your tradition — no awkward language, no one-size-fits-all compromise.
        </p>
        <div className="denom-grid">
          {[
            { icon: "✝️", name: "Anglican / Church of England", desc: "PCC reporting, planned giving, diocesan returns, quota payments" },
            { icon: "🕊️", name: "Baptist", desc: "Association giving, covenanted giving, deacon management" },
            { icon: "⚡", name: "Pentecostal / Charismatic", desc: "Tithe tracking, first fruits, mission giving, network remittance" },
            { icon: "🔔", name: "Methodist", desc: "Circuit assessments, stewardship campaigns, connexional giving" },
            { icon: "⛪", name: "Catholic", desc: "Parish finance, diocesan levy, second collections, fabric fund" },
            { icon: "📖", name: "Presbyterian / Reformed", desc: "Session records, presbytery giving, FWO envelopes" },
            { icon: "🌿", name: "Seventh-day Adventist", desc: "Tithe, conference remittance, systematic benevolence, offerings" },
            { icon: "➕", name: "Independent / New Church", desc: "Fully customisable terminology for any church structure" }
          ].map((denom, i) => (
            <div key={i} className="denom-card">
              <div className="denom-icon">{denom.icon}</div>
              <div className="denom-name">{denom.name}</div>
              <div className="denom-desc">{denom.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ background: "var(--cream)" }}>
        <div className="section-max">
          <div className="eyebrow">Pricing</div>
          <h2 className="section-title">Simple, honest pricing</h2>
          <p className="section-sub">No per-user fees. No hidden charges. One price for your whole church team.</p>
          <div className="pricing-grid">
            <div className="price-card">
              <div className="price-name">Seed</div>
              <div className="price-sub">Small congregations · up to 150 members</div>
              <div className="price-amt">£29<span>/mo</span></div>
              <ul className="price-feats">
                <li>Full treasury module</li>
                <li>Membership (up to 150)</li>
                <li>AI categorisation</li>
                <li>Standard reports</li>
              </ul>
              <CheckoutButton plan="Seed" amount={29} className="btn btn-outline">Get started</CheckoutButton>
            </div>
            <div className="price-card featured">
              <div className="price-name">Church</div>
              <div className="price-sub">Growing churches · unlimited members</div>
              <div className="price-amt">£69<span>/mo</span></div>
              <ul className="price-feats">
                <li>All treasury features</li>
                <li>Unlimited membership</li>
                <li>AI assistant + chat</li>
                <li>AI report writer</li>
              </ul>
              <CheckoutButton plan="Church" amount={69} className="btn btn-gold">Get started</CheckoutButton>
            </div>
            <div className="price-card">
              <div className="price-name">Network</div>
              <div className="price-sub">Diocese · circuit · conference</div>
              <div className="price-amt">£199<span>/mo</span></div>
              <ul className="price-feats">
                <li>Everything in Church</li>
                <li>Multi-church oversight</li>
                <li>Consolidated reporting</li>
                <li>Remittance tracking</li>
              </ul>
              <CheckoutButton plan="Network" amount={199} className="btn btn-outline">Get started</CheckoutButton>
            </div>
          </div>
        </div>
      </section>

      <div className="footer-cta">
        <h2>Your church deserves great stewardship tools</h2>
        <p>Join thousands of churches managing their finances with clarity, confidence and care.</p>
        <Link href="/auth" className="btn btn-gold btn-lg">Start Your Free 14-Day Trial</Link>
      </div>
    </div>
  );
}
