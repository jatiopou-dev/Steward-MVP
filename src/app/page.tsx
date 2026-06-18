import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="screen active" style={{ background: "var(--cream)", display: "flex" }}>

      {/* ── NAV ── */}
      <nav className="land-nav">
        <div className="logo">
          <div className="logo-icon">
            <div className="logo-cross"></div>
          </div>
          <div className="logo-name">Steward<span>.</span></div>
        </div>
        <div className="land-nav-links">
          <a href="#features">Features</a>
          <a href="#denominations">Denominations</a>
          <a href="#pricing">Pricing</a>
          <a href="#compare">Compare</a>
          <a href="mailto:hello@steward.church" className="land-nav-support">
            <span className="support-dot"></span>Free support
          </a>
        </div>
        <div className="land-nav-actions">
          <Link href="/auth" className="btn btn-outline btn-sm">Sign in</Link>
          <Link href="/auth" className="btn btn-forest btn-sm">Start free trial</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="land-hero">
        <div className="land-hero-inner">
          <div className="land-hero-left">
            <div className="land-badge">
              <span className="land-badge-dot"></span>
              Trusted by 11,400+ churches across 40 denominations
            </div>

            <h1 className="land-h1">
              Church finance,<br />
              <em>made simple.</em>
            </h1>

            <p className="land-hero-sub">
              Steward gives every volunteer treasurer the tools they deserve —
              clear fund accounts, AI-powered bookkeeping, Gift Aid, and
              one-click reports. No accounting degree required.
            </p>

            <div className="land-hero-cta">
              <Link href="/auth" className="btn btn-forest btn-lg">Start free 14-day trial</Link>
              <Link href="/demo" className="btn btn-outline btn-lg">See live demo →</Link>
            </div>

            <div className="land-trust-notes">
              <span>✓ Set up in 20 minutes</span>
              <span>✓ No credit card needed</span>
              <span>✓ Free UK phone &amp; email support</span>
            </div>
          </div>

          <div className="land-hero-right">
            <div className="land-dashboard-preview">
              <div className="ldp-bar">
                <div className="ldp-bar-dot red"></div>
                <div className="ldp-bar-dot amber"></div>
                <div className="ldp-bar-dot green"></div>
                <span className="ldp-bar-title">Steward · Grace Baptist Church</span>
              </div>
              <div className="ldp-body">
                <div className="ldp-kpis">
                  <div className="ldp-kpi">
                    <div className="ldp-kpi-val">£14,280</div>
                    <div className="ldp-kpi-lbl">Income this month</div>
                  </div>
                  <div className="ldp-kpi ldp-kpi-accent">
                    <div className="ldp-kpi-val">£5,340</div>
                    <div className="ldp-kpi-lbl">Surplus</div>
                  </div>
                  <div className="ldp-kpi">
                    <div className="ldp-kpi-val">£8,940</div>
                    <div className="ldp-kpi-lbl">Expenditure</div>
                  </div>
                </div>
                <div className="ldp-section-label">Recent transactions</div>
                <div className="ldp-txlist">
                  <div className="ldp-tx">
                    <div className="ldp-tx-icon ldp-icon-green">↑</div>
                    <div className="ldp-tx-body">
                      <div className="ldp-tx-name">Sunday offering</div>
                      <div className="ldp-tx-meta">General Fund · 30 Apr · Gift Aid eligible</div>
                    </div>
                    <div className="ldp-tx-amt green">+£3,840</div>
                  </div>
                  <div className="ldp-tx">
                    <div className="ldp-tx-icon ldp-icon-green">↑</div>
                    <div className="ldp-tx-body">
                      <div className="ldp-tx-name">Lottery grant</div>
                      <div className="ldp-tx-meta">Restricted · Community Fund</div>
                    </div>
                    <div className="ldp-tx-amt green">+£5,000</div>
                  </div>
                  <div className="ldp-tx">
                    <div className="ldp-tx-icon ldp-icon-red">↓</div>
                    <div className="ldp-tx-body">
                      <div className="ldp-tx-name">Building maintenance</div>
                      <div className="ldp-tx-meta">Facilities · Invoice #1047</div>
                    </div>
                    <div className="ldp-tx-amt red">−£1,200</div>
                  </div>
                </div>
                <div className="ldp-ai">
                  <div className="ldp-ai-dot"></div>
                  <div className="ldp-ai-msg">
                    AI insight: Giving is <strong>↑ 11% ahead</strong> of last April. On track to exceed annual target by £8,400.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LOGOS / DENOMINATIONS STRIP ── */}
      <div className="land-denom-strip">
        <span className="land-strip-label">Works with your denomination</span>
        {["Anglican", "Baptist", "Methodist", "Pentecostal", "Catholic", "Presbyterian", "Adventist", "Independent"].map(d => (
          <div key={d} className="land-strip-pill">{d}</div>
        ))}
      </div>

      {/* ── HOW IT WORKS ── */}
      <section className="land-section land-how">
        <div className="land-section-inner">
          <div className="land-eyebrow">How it works</div>
          <h2 className="land-section-title">Up and running in three steps</h2>
          <p className="land-section-sub">
            Designed for volunteer treasurers — not accountants. No complicated setup, no lengthy training.
          </p>
          <div className="land-steps">
            <div className="land-step">
              <div className="land-step-num">1</div>
              <div className="land-step-icon">🏛️</div>
              <h3>Set up your church</h3>
              <p>Enter your church name, choose your denomination, and add your fund accounts. Takes about 20 minutes.</p>
            </div>
            <div className="land-step-arrow">→</div>
            <div className="land-step">
              <div className="land-step-num">2</div>
              <div className="land-step-icon">🏦</div>
              <h3>Upload bank statements</h3>
              <p>Drop in your CSV or OFX file. Steward&apos;s AI categorises every transaction for you automatically.</p>
            </div>
            <div className="land-step-arrow">→</div>
            <div className="land-step">
              <div className="land-step-num">3</div>
              <div className="land-step-icon">📄</div>
              <h3>Generate reports</h3>
              <p>One click produces your treasurer&apos;s report, Gift Aid claim, or annual accounts — ready to send.</p>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <Link href="/demo" className="btn btn-forest btn-lg">See it in action →</Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES BENTO ── */}
      <section id="features" className="land-section" style={{ background: "var(--parchment)" }}>
        <div className="land-section-inner">
          <div className="land-eyebrow">Full feature suite</div>
          <h2 className="land-section-title">Everything your treasurer needs</h2>
          <p className="land-section-sub">
            One system for every part of church financial management — built for real treasurers, not professional accountants.
          </p>

          <div className="land-bento">
            {/* Hero bento card */}
            <div className="land-bento-hero land-bento-card">
              <div className="land-bento-tag green">Core module</div>
              <div className="land-bento-icon large">💰</div>
              <h3>Fund accounting — done right</h3>
              <p>
                Restricted, unrestricted, and designated funds — exactly how churches actually manage money.
                Steward tracks every fund separately so your accounts are always clear and your auditors are happy.
              </p>
              <div className="land-bento-funds">
                <div className="land-fund-row">
                  <span className="land-fund-name">General Fund</span>
                  <div className="land-fund-bar"><div className="land-fund-fill" style={{ width: "78%", background: "var(--sage)" }}></div></div>
                  <span className="land-fund-val">£9,840</span>
                </div>
                <div className="land-fund-row">
                  <span className="land-fund-name">Building Fund</span>
                  <div className="land-fund-bar"><div className="land-fund-fill" style={{ width: "45%", background: "var(--gold)" }}></div></div>
                  <span className="land-fund-val">£4,200</span>
                </div>
                <div className="land-fund-row">
                  <span className="land-fund-name">Mission Fund</span>
                  <div className="land-fund-bar"><div className="land-fund-fill" style={{ width: "22%", background: "var(--sage2)" }}></div></div>
                  <span className="land-fund-val">£1,100</span>
                </div>
              </div>
            </div>

            {/* AI card */}
            <div className="land-bento-card land-bento-ai">
              <div className="land-bento-tag gold">AI powered</div>
              <div className="land-bento-icon">🧠</div>
              <h3>AI assistant</h3>
              <p>Upload bank statements for instant categorisation. Ask your books anything in plain English — &quot;How much did we spend on facilities last quarter?&quot;</p>
            </div>

            {/* Reports card */}
            <div className="land-bento-card">
              <div className="land-bento-tag green">Auto-generate</div>
              <div className="land-bento-icon">📄</div>
              <h3>Reports in one click</h3>
              <p>Treasurer&apos;s report, board summary, annual accounts, HMRC Gift Aid R68 — all generated by AI. Review, edit, download.</p>
            </div>

            {/* Gift Aid card */}
            <div className="land-bento-card">
              <div className="land-bento-tag gold">UK specific</div>
              <div className="land-bento-icon">🏷️</div>
              <h3>HMRC Gift Aid</h3>
              <p>Track eligible donors, calculate 25% reclaims, and produce your R68 return automatically. Built for UK churches.</p>
            </div>

            {/* Membership card */}
            <div className="land-bento-card">
              <div className="land-bento-tag green">Core module</div>
              <div className="land-bento-icon">👥</div>
              <h3>Membership records</h3>
              <p>Full member directory, giving history, transfers, baptisms, and attendance — all in one place.</p>
            </div>

            {/* Offline card */}
            <div className="land-bento-card">
              <div className="land-bento-tag stone">Offline-first</div>
              <div className="land-bento-icon">📱</div>
              <h3>Works offline</h3>
              <p>Full PWA — record Sunday offerings and manage transactions even without Wi-Fi. Syncs automatically when you reconnect.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── REASSURANCE STRIP ── */}
      <div className="land-reassure-bar">
        <div className="land-reassure-item">
          <span className="land-reassure-icon">🛡️</span>
          <div>
            <strong>GDPR compliant</strong>
            <span>UK data, secure servers</span>
          </div>
        </div>
        <div className="land-reassure-divider"></div>
        <div className="land-reassure-item">
          <span className="land-reassure-icon">🎓</span>
          <div>
            <strong>No training needed</strong>
            <span>Designed for volunteers</span>
          </div>
        </div>
        <div className="land-reassure-divider"></div>
        <div className="land-reassure-item">
          <span className="land-reassure-icon">📞</span>
          <div>
            <strong>Free UK support</strong>
            <span>Phone &amp; email, Mon–Fri</span>
          </div>
        </div>
        <div className="land-reassure-divider"></div>
        <div className="land-reassure-item">
          <span className="land-reassure-icon">🔄</span>
          <div>
            <strong>Import from ACMS</strong>
            <span>We migrate your data free</span>
          </div>
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <section className="land-section land-testimonials">
        <div className="land-section-inner">
          <div className="land-eyebrow">What treasurers say</div>
          <h2 className="land-section-title">Trusted by church finance teams</h2>
          <div className="land-testi-grid">
            <div className="land-testi-card">
              <div className="land-testi-stars">★★★★★</div>
              <p className="land-testi-quote">
                &ldquo;I was terrified of switching from our spreadsheets. Steward had us set up in an afternoon.
                The Gift Aid automation alone saves me three hours every quarter.&rdquo;
              </p>
              <div className="land-testi-author">
                <div className="land-testi-avatar">MH</div>
                <div>
                  <strong>Margaret H.</strong>
                  <span>Honorary Treasurer · St Barnabas Anglican, Birmingham</span>
                </div>
              </div>
            </div>
            <div className="land-testi-card">
              <div className="land-testi-stars">★★★★★</div>
              <p className="land-testi-quote">
                &ldquo;As a Baptist church we needed something that spoke our language — not Adventist terminology,
                not generic business software. Steward just gets it. The board reports look so professional.&rdquo;
              </p>
              <div className="land-testi-author">
                <div className="land-testi-avatar">DT</div>
                <div>
                  <strong>David T.</strong>
                  <span>Church Treasurer · Cornerstone Baptist, Leeds</span>
                </div>
              </div>
            </div>
            <div className="land-testi-card">
              <div className="land-testi-stars">★★★★★</div>
              <p className="land-testi-quote">
                &ldquo;We moved from ACMS. Steward migrated all our data and the AI categorisation means our bookkeeper
                spends a fraction of the time she used to. Couldn&apos;t go back.&rdquo;
              </p>
              <div className="land-testi-author">
                <div className="land-testi-avatar">RC</div>
                <div>
                  <strong>Rev. R. Campbell</strong>
                  <span>Church Secretary · Elim Pentecostal, Glasgow</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DENOMINATIONS ── */}
      <section id="denominations" className="land-denom-section">
        <div className="land-section-inner">
          <div className="land-eyebrow" style={{ color: "var(--gold2)" }}>Built for every tradition</div>
          <h2 className="land-section-title" style={{ color: "var(--cream)" }}>Your denomination, your language</h2>
          <p className="land-section-sub" style={{ color: "rgba(255,255,255,.55)" }}>
            Steward adapts its terminology to match your tradition — no awkward language, no one-size-fits-all compromise.
          </p>
          <div className="land-denom-grid">
            {[
              { icon: "✝️", name: "Anglican / Church of England", desc: "PCC reporting, planned giving (FWO), diocesan returns, quota payments" },
              { icon: "🕊️", name: "Baptist", desc: "Association giving, covenanted giving, deacon management" },
              { icon: "⚡", name: "Pentecostal / Charismatic", desc: "Tithe tracking, first fruits, mission giving, network remittance" },
              { icon: "🔔", name: "Methodist", desc: "Circuit assessments, stewardship campaigns, connexional giving" },
              { icon: "⛪", name: "Catholic", desc: "Parish finance, diocesan levy, second collections, fabric fund" },
              { icon: "📖", name: "Presbyterian / Reformed", desc: "Session records, presbytery giving, FWO envelopes" },
              { icon: "🌿", name: "Seventh-day Adventist", desc: "Tithe, conference remittance, systematic benevolence, offerings" },
              { icon: "➕", name: "Independent / New Church", desc: "Fully customisable terminology for any structure" }
            ].map((denom, i) => (
              <div key={i} className="land-denom-card">
                <div className="land-denom-icon">{denom.icon}</div>
                <div className="land-denom-name">{denom.name}</div>
                <div className="land-denom-desc">{denom.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VS LEGACY ── */}
      <section id="compare" className="land-section" style={{ background: "var(--parchment)" }}>
        <div className="land-section-inner">
          <div className="land-eyebrow">Why switch?</div>
          <h2 className="land-section-title">Steward vs legacy systems</h2>
          <p className="land-section-sub">
            ACMS is locked to a single denomination. ChurchPal 4 is a desktop app from another era.
            Steward was built for the modern UK church — cloud-first, AI-powered, and denomination-agnostic.
          </p>

          <div className="land-compare-wrap">
            <table className="land-compare-table">
              <thead>
                <tr>
                  <th className="land-compare-feat-col">Feature</th>
                  <th className="land-compare-us">Steward ✦</th>
                  <th>ACMS</th>
                  <th>ChurchPal 4</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Cloud-based (no install)", "✅ Yes", "⚠️ Adventist-only", "❌ Desktop only"],
                  ["Works on mobile & offline", "✅ Full PWA", "⚠️ Partial", "❌ No"],
                  ["AI bank reconciliation", "✅ Claude AI", "❌ None", "❌ None"],
                  ["AI report writer", "✅ Natural language", "❌ None", "❌ None"],
                  ["HMRC Gift Aid automation", "✅ Built-in", "❌ Not supported", "⚠️ Manual only"],
                  ["Multi-denomination support", "✅ 40+ denominations", "❌ Adventist only", "⚠️ Generic"],
                  ["Fund accounting", "✅ Full", "⚠️ Basic", "✅ Yes (desktop)"],
                  ["Membership management", "✅ Full + transfers", "✅ Yes", "⚠️ Basic"],
                  ["Multi-church oversight", "✅ Diocese / circuit", "✅ Conference", "❌ Single only"],
                  ["End-of-year PDF statements", "✅ One-click", "❌ None", "⚠️ Manual export"],
                  ["Pricing (typical church)", "From £29/mo", "Free (Adventist only)", "~£150 licence"],
                ].map(([feat, steward, acms, churchpal], i) => (
                  <tr key={i} className={i % 2 === 0 ? "land-compare-even" : ""}>
                    <td className="land-compare-feat">{feat}</td>
                    <td className="land-compare-us-cell">{steward}</td>
                    <td className="land-compare-cell">{acms}</td>
                    <td className="land-compare-cell">{churchpal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="land-compare-note">
            ⚠️ Comparison based on publicly available feature information (April 2026).
            ACMS availability is limited to Seventh-day Adventist churches via their conference structure.
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="land-section" style={{ background: "var(--cream)" }}>
        <div className="land-section-inner">
          <div className="land-eyebrow">Pricing</div>
          <h2 className="land-section-title">Simple, honest pricing</h2>
          <p className="land-section-sub">No per-user fees. No hidden charges. One clear price for your whole church team.</p>

          <div className="land-pricing-grid">
            <div className="land-price-card">
              <div className="land-price-name">Seed</div>
              <div className="land-price-sub">Small congregations · up to 150 members</div>
              <div className="land-price-amt">£29<span>/month</span></div>
              <ul className="land-price-feats">
                <li>Full treasury module</li>
                <li>Membership (up to 150)</li>
                <li>AI categorisation</li>
                <li>Standard reports</li>
                <li>Free email support</li>
              </ul>
              <Link href="/auth?plan=Seed&amount=29" className="btn btn-outline" style={{ display: "block", textAlign: "center" }}>
                Get started free
              </Link>
            </div>

            <div className="land-price-card land-price-featured">
              <div className="land-price-popular">Most popular</div>
              <div className="land-price-name">Church</div>
              <div className="land-price-sub">Growing churches · unlimited members</div>
              <div className="land-price-amt">£69<span>/month</span></div>
              <ul className="land-price-feats">
                <li>All treasury features</li>
                <li>Unlimited membership</li>
                <li>AI assistant &amp; chat</li>
                <li>AI report writer</li>
                <li>HMRC Gift Aid returns</li>
                <li>Phone &amp; email support</li>
              </ul>
              <Link href="/auth?plan=Church&amount=69" className="btn btn-gold" style={{ display: "block", textAlign: "center" }}>
                Get started free
              </Link>
            </div>

            <div className="land-price-card">
              <div className="land-price-name">Network</div>
              <div className="land-price-sub">Diocese · circuit · conference</div>
              <div className="land-price-amt">£199<span>/month</span></div>
              <ul className="land-price-feats">
                <li>Everything in Church</li>
                <li>Multi-church oversight</li>
                <li>Consolidated reporting</li>
                <li>Remittance tracking</li>
                <li>Dedicated account manager</li>
              </ul>
              <Link href="/auth?plan=Network&amount=199" className="btn btn-outline" style={{ display: "block", textAlign: "center" }}>
                Get started free
              </Link>
            </div>
          </div>

          <p className="land-pricing-note">
            All plans include a 14-day free trial. No credit card required to start.
            We&apos;ll migrate your data from ACMS or spreadsheets — free.
          </p>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <div className="land-footer-cta">
        <div className="land-footer-inner">
          <div className="land-footer-cross">✝</div>
          <h2>Your church deserves great stewardship tools</h2>
          <p>
            Join thousands of churches who&apos;ve left behind the spreadsheets and legacy software.
            Start your free trial today — no credit card, no commitment.
          </p>
          <div className="land-footer-actions">
            <Link href="/auth" className="btn btn-gold btn-lg">Start your free 14-day trial</Link>
            <Link href="/demo" className="btn btn-outline btn-lg" style={{ borderColor: "rgba(255,255,255,.3)", color: "rgba(255,255,255,.8)" }}>
              View live demo
            </Link>
          </div>
          <div className="land-footer-trust">
            <span>✓ Free migration from ACMS</span>
            <span>✓ Free UK support</span>
            <span>✓ Cancel any time</span>
          </div>
        </div>
      </div>

    </div>
  );
}
