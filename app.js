// SOPMaster Self-Serve (Static SPA for GitHub Pages)
// Notes:
// - This is a front-end-only implementation suitable for GitHub Pages.
// - Email verification can be client-sent via EmailJS (optional). If not configured, we show the code on-screen.
// - "Google" sign-in in static hosting requires an OAuth provider (e.g., Firebase Auth). This build includes a simple placeholder flow.
// - All user data is stored in localStorage for demo/POC. Replace with your backend when ready.

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const CONTACT = {
  emails: ["info@sopmaster.co.uk", "jamie@sopmaster.co.uk", "support@sopmaster.co.uk"],
  whatsappE164: "447549835872", // converted from 07549 835872 (UK) -> 447549835872
};

const STORAGE_KEYS = {
  user: "sopmaster:user",
  stats: "sopmaster:stats",
  auth: "sopmaster:auth",
  sops: "sopmaster:sops"
};

const DEFAULT_STATS = { monthKey: monthKey(), sopsThisMonth: 0, hoursSavedThisMonth: 0 };
const HOURS_PER_SOP = { "13": 2, "26": 5 }; // conservative & simple for dashboard

function monthKey(d = new Date()){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

function getStats(){
  const raw = localStorage.getItem(STORAGE_KEYS.stats);
  let s = raw ? JSON.parse(raw) : DEFAULT_STATS;
  if (s.monthKey !== monthKey()){
    s = { ...DEFAULT_STATS, monthKey: monthKey() };
    localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(s));
  }
  return s;
}
function setStats(s){ localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(s)); }
function getUser(){ const raw = localStorage.getItem(STORAGE_KEYS.user); return raw ? JSON.parse(raw) : null; }
function setUser(u){ localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(u)); }
function clearUser(){ localStorage.removeItem(STORAGE_KEYS.user); }
function toast(msg){
  const t = document.querySelector(".toast");
  t.textContent = msg;
  t.classList.add("on");
  setTimeout(()=>t.classList.remove("on"), 2400);
}

function qs(sel, el=document){ return el.querySelector(sel); }
function qsa(sel, el=document){ return [...el.querySelectorAll(sel)]; }

const routes = {
  "/": Home,
  "/app/dashboard": AppShell.bind(null, Dashboard),
  "/app/builder": AppShell.bind(null, Builder),
  "/app/pricing": AppShell.bind(null, Pricing),
  "/app/support": AppShell.bind(null, Support),
  "/privacy": Privacy,
  "/terms": Terms,
};

function navigate(path){
  history.pushState({}, "", path);
  render();
}
window.addEventListener("popstate", render);

function requireAuth(){
  const user = getUser();
  if (!user){
    openAuthModal();
    return false;
  }
  return true;
}

function App(){
  return `
    <div class="noise"></div>
    <div class="shell">
      ${Nav()}
      <main id="view"></main>
      <div class="toast"></div>
    </div>
  `;
}

function Nav(){
  const user = getUser();
  const isApp = location.pathname.startsWith("/app/");
  const right = user
    ? `<a class="ghost" href="#" id="logoutBtn">Log out</a>`
    : `<a class="cta" href="#" id="openAuth">Sign up / Log in</a>`;

  return `
    <header class="nav">
      <div class="container nav-inner">
        <a class="brand" href="/" data-link>
          <span class="brand-badge"></span>
          <span>SOPMaster</span>
        </a>
        <nav class="nav-links">
          <a class="pill ${location.pathname==="/"?"active":""}" href="/" data-link>Home</a>
          <a class="pill ${isApp?"active":""}" href="/app/dashboard" data-link>Dashboard</a>
          <a class="pill" href="/app/builder" data-link>SOP Builder</a>
          <a class="pill" href="/app/pricing" data-link>Pricing</a>
          <a class="pill" href="/app/support" data-link>Support</a>
        </nav>
        <div class="row">
          ${right}
        </div>
      </div>
    </header>
  `;
}

function Home(){
  const user = getUser();
  return `
    <section class="hero">
      <div class="container">
        <div class="hero-grid">
          <div>
            <div class="kicker"><span class="spark"></span> Self‑serve SOPs in minutes. Enterprise standard. Zero training.</div>
            <h1 class="h-title">Build bulletproof SOPs in minutes — then roll them out across every site, team, and client.</h1>
            <p class="h-sub">
              SOPMaster turns a few words or a short brief into a complete operating procedure with governance, QA, and execution steps.
              Generate concise 13‑step SOPs fast, or full enterprise 26‑step SOPs when you need depth.
            </p>
            <div class="hero-actions">
              <a class="cta" href="${user?"/app/dashboard":"#"}" id="homePrimary">${user?"Go to dashboard":"Sign up (Google or email)"}</a>
              <a class="ghost" href="/app/builder" data-link>See the SOP Builder</a>
            </div>

            <div class="section">
              <div class="grid3">
                <div class="card">
                  <h3>1) Input</h3>
                  <p>Enter name, company, SOP category and title — then add a short brief (even two words).</p>
                </div>
                <div class="card">
                  <h3>2) Generate</h3>
                  <p>Choose a 13‑step SOP (fast) or a 26‑step SOP (enterprise). SOPMaster drafts structure, steps, controls, and outputs.</p>
                </div>
                <div class="card">
                  <h3>3) Deploy</h3>
                  <p>Use the SOP in your team immediately. Track throughput and hours saved from your dashboard.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="hero-card" id="tiltCard">
            <div class="hero-canvas" id="heroCanvas"></div>
            <div class="hero-overlay">
              <div class="badge">Interactive 3D — subtle, premium, and fast</div>
              <div class="mini-stat">
                <div>
                  <div class="label">SOPs built this month</div>
                  <div class="value" id="homeSops">0</div>
                </div>
                <div style="text-align:right">
                  <div class="label">Hours saved</div>
                  <div class="value" id="homeHours">0</div>
                  <div class="note">Tracked in dashboard</div>
                </div>
              </div>
              <div class="mini-stat">
                <div>
                  <div class="label">Two‑word prompt example</div>
                  <div class="value" style="font-size:16px">“Digital Marketing”</div>
                  <div class="note">Generates a complete SOP structure</div>
                </div>
                <div style="text-align:right">
                  <span class="tag">No templates</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div class="section">
          <div class="card">
            <h3>Why agencies choose SOPMaster</h3>
            <p>
              Consistency beats heroics. SOPMaster standardises delivery, reduces dependency on senior staff, and creates a repeatable operating layer
              across locations or client accounts.
            </p>
          </div>
        </div>

      </div>
    </section>
  `;
}

function AppShell(ViewFn){
  if (!requireAuth()) return Home(); // show home behind auth modal
  return `
    <div class="app-shell">
      <div class="container">
        <div class="app-grid">
          <aside class="side">
            <p class="side-title">Workspace</p>
            ${SideLink("/app/dashboard","Dashboard")}
            ${SideLink("/app/builder","SOP Builder")}
            ${SideLink("/app/pricing","Pricing")}
            ${SideLink("/app/support","Support")}
            <div class="hr"></div>
            <div class="small">Signed in as<br><strong>${escapeHtml(getUser().email)}</strong></div>
          </aside>
          <section>${ViewFn()}</section>
        </div>
      </div>
    </div>
  `;
}

function SideLink(path, label){
  const active = location.pathname === path ? "active" : "";
  return `<a class="${active}" href="${path}" data-link>${label}<span style="opacity:.55">→</span></a>`;
}

function Dashboard(){
  const s = getStats();
  return `
    <div class="panel">
      <div class="row" style="justify-content:space-between">
        <div>
          <h2 class="h2">Dashboard</h2>
          <p class="p">A simple operational view of your throughput and time saved this month.</p>
        </div>
        <div class="row">
          <span class="badge">Month: ${s.monthKey}</span>
          <button class="btn danger" id="resetStats">Reset month</button>
        </div>
      </div>
      <div class="hr"></div>

      <div class="kpi-grid">
        <div class="kpi"><div class="k">
          <div class="label">SOPs created this month</div>
          <div class="value" id="kpiSops">${s.sopsThisMonth}</div>
          <div class="hint">Counts all successful generations.</div>
        </div></div>
        <div class="kpi"><div class="k">
          <div class="label">Hours saved this month</div>
          <div class="value" id="kpiHours">${s.hoursSavedThisMonth}</div>
          <div class="hint">Calculated conservatively from SOP length.</div>
        </div></div>
      </div>

      <div class="hr"></div>
      <div class="row" style="justify-content:space-between; align-items:flex-end">
        <div>
          <h3 style="margin:0 0 6px">Recent SOPs</h3>
          <p class="p" style="margin:0">Stored locally in this demo. In production, this would be your account library.</p>
        </div>
        <a class="cta" href="/app/builder" data-link>Create an SOP</a>
      </div>

      <div style="margin-top:12px">
        ${renderRecentSopsTable()}
      </div>
    </div>
  `;
}

function renderRecentSopsTable(){
  const raw = localStorage.getItem(STORAGE_KEYS.sops);
  const sops = raw ? JSON.parse(raw) : [];
  if (!sops.length){
    return `<div class="card"><p class="p">No SOPs yet. Create your first SOP in the Builder.</p></div>`;
  }
  const rows = sops.slice(-8).reverse().map(s=>`
    <tr>
      <td>${escapeHtml(s.title)}</td>
      <td><span class="tag">${escapeHtml(s.category)}</span></td>
      <td>${escapeHtml(s.length)} steps</td>
      <td>${new Date(s.createdAt).toLocaleString()}</td>
    </tr>
  `).join("");
  return `
    <table class="table">
      <thead><tr>
        <th>Title</th><th>Category</th><th>Length</th><th>Created</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function Pricing(){
  return `
    <div class="panel">
      <h2 class="h2">Pricing</h2>
      <p class="p">Set your pricing content here. This build includes the page and navigation, ready for your final commercial positioning.</p>
      <div class="hr"></div>
      <div class="grid3">
        <div class="card"><h3>Starter</h3><p>Good for single-location operators and teams starting SOP standardisation.</p></div>
        <div class="card"><h3>Growth</h3><p>Best for multi-location or multi-account teams requiring consistent rollout and adoption.</p></div>
        <div class="card"><h3>Enterprise</h3><p>Governance-led deployments with compliance, approvals, and reporting.</p></div>
      </div>
      <div class="hr"></div>
      <p class="p">If you want this page to reflect your current offers precisely (including Stripe links), tell me and I will refit it.</p>
    </div>
  `;
}

function Support(){
  const whatsapp = `https://wa.me/${CONTACT.whatsappE164}`;
  return `
    <div class="panel">
      <h2 class="h2">Support</h2>
      <p class="p">Answers to common questions, plus direct contact routes.</p>
      <div class="hr"></div>

      <div class="grid3">
        <div class="card">
          <h3>FAQ</h3>
          <p><strong>How fast can I generate SOPs?</strong><br>
          13-step SOPs are designed for rapid drafting; 26-step SOPs add governance, controls, and enterprise layers.</p>
        </div>
        <div class="card">
          <h3>Contact</h3>
          <p>
            ${CONTACT.emails.map(e=>`<div><a href="mailto:${e}">${e}</a></div>`).join("")}
            <div style="margin-top:10px"><a class="pill" href="${whatsapp}" target="_blank" rel="noopener">WhatsApp Business</a></div>
          </p>
        </div>
        <div class="card">
          <h3>Security & privacy</h3>
          <p>This demo stores data in your browser only. For production, connect authentication and persistence to your backend.</p>
        </div>
      </div>

      <div class="hr"></div>
      <details class="card">
        <summary style="cursor:pointer; font-weight:850">More FAQ</summary>
        <div style="margin-top:10px">
          <p class="p"><strong>Do I need templates?</strong> No — the builder generates structure and steps from your input.</p>
          <p class="p"><strong>Can I export SOPs?</strong> In this static build, you can copy the SOP output. Add export modules (PDF/Word) when you connect the full SOPDownloader component.</p>
          <p class="p"><strong>Can we restrict access by company?</strong> Yes — that requires real authentication (Firebase/Auth0/your backend).</p>
        </div>
      </details>
    </div>
  `;
}

function Builder(){
  return `
    <div class="panel">
      <div class="row" style="justify-content:space-between">
        <div>
          <h2 class="h2">SOP Builder</h2>
          <p class="p">Enter the core details, then add a brief (even two words). Choose 13-step (fast) or 26-step (enterprise).</p>
        </div>
        <div class="badge">Designed for speed</div>
      </div>

      <div class="hr"></div>

      <div class="stepper">
        <div class="dot on" id="dot1"></div>
        <div class="dot" id="dot2"></div>
        <div class="dot" id="dot3"></div>
      </div>

      <div id="builderStage"></div>
    </div>
  `;
}

function stage1(){
  return `
    <div class="form">
      <div class="field">
        <div class="label">First name</div>
        <input class="input" id="firstName" placeholder="Jamie" autocomplete="given-name"/>
      </div>
      <div class="field">
        <div class="label">Last name</div>
        <input class="input" id="lastName" placeholder="Smith" autocomplete="family-name"/>
      </div>
      <div class="field">
        <div class="label">Company name</div>
        <input class="input" id="company" placeholder="SOPMaster Ltd"/>
      </div>
      <div class="field">
        <div class="label">SOP Category</div>
        <select class="select" id="category">
          ${["Operations","Marketing","Ecommerce","Customer Support","Finance","HR","Compliance","Sales","Fulfilment","Analytics"].map(v=>`<option>${v}</option>`).join("")}
        </select>
      </div>
      <div class="field" style="grid-column:1/-1">
        <div class="label">SOP Title</div>
        <input class="input" id="title" placeholder="Inventory Exposure Across Channels"/>
        <div class="hint">Example two-word prompt: <span class="tag">Digital Marketing</span></div>
      </div>
    </div>
    <div class="actions">
      <button class="btn primary" id="toStage2">Next</button>
    </div>
  `;
}

function stage2(){
  return `
    <div class="row" style="justify-content:space-between; align-items:flex-start">
      <div>
        <h3 style="margin:0 0 6px">Input method</h3>
        <p class="p">Choose text input (fast) or upload a video brief (placeholder in this static build).</p>
      </div>
      <span class="badge">Step 2 of 3</span>
    </div>
    <div class="hr"></div>

    <div class="split">
      <div class="auth-card">
        <h3 style="margin:0 0 8px">Text brief</h3>
        <p class="small">Type a short brief. Two words is enough.</p>
        <div class="field" style="margin-top:10px">
          <div class="label">Brief</div>
          <textarea class="textarea" id="brief" placeholder="Digital Marketing"></textarea>
          <div class="hint">Short inputs generate strong structure; longer inputs add specificity.</div>
        </div>
      </div>

      <div class="auth-card">
        <h3 style="margin:0 0 8px">Video upload (optional)</h3>
        <p class="small">GitHub Pages cannot process video server-side. In production, this uploads to your backend for transcription.</p>
        <div class="field" style="margin-top:10px">
          <div class="label">Video file</div>
          <input class="input" type="file" id="videoFile" accept="video/*"/>
          <div class="hint">For now, please use text input.</div>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="btn" id="backTo1">Back</button>
      <button class="btn primary" id="toStage3">Next</button>
    </div>
  `;
}

function stage3(){
  return `
    <div class="row" style="justify-content:space-between; align-items:flex-start">
      <div>
        <h3 style="margin:0 0 6px">Choose SOP depth</h3>
        <p class="p">13-step SOPs prioritise speed. 26-step SOPs add governance, controls, and enterprise layers.</p>
      </div>
      <span class="badge">Step 3 of 3</span>
    </div>
    <div class="hr"></div>

    <div class="grid3">
      <div class="card">
        <h3>13-step SOP</h3>
        <p>Designed to draft within a short working window. Clear steps, controls, and outputs.</p>
        <div class="hr"></div>
        <div class="row">
          <span class="tag">Fast</span>
          <span class="small">Target: under 5 minutes</span>
        </div>
        <div class="actions">
          <button class="btn primary" data-generate="13">Generate 13-step</button>
        </div>
      </div>

      <div class="card">
        <h3>26-step SOP</h3>
        <p>Enterprise build including governance, risk, QA, compliance mapping, SLAs and financial impact analysis.</p>
        <div class="hr"></div>
        <div class="row">
          <span class="tag">Enterprise</span>
          <span class="small">Target: 10–12 minutes</span>
        </div>
        <div class="actions">
          <button class="btn primary" data-generate="26">Generate 26-step</button>
        </div>
      </div>

      <div class="card">
        <h3>Output</h3>
        <p>After generation you can copy the SOP. Export modules can be added once your backend / SOPDownloader component is wired in.</p>
        <div class="hr"></div>
        <div class="actions">
          <button class="btn" id="backTo2">Back</button>
        </div>
      </div>
    </div>

    <div id="outputArea" style="margin-top:14px"></div>
  `;
}

function loadingScreen(){
  return `
    <div class="loading-stage">
      <div style="text-align:center; position:relative; z-index:1">
        <div class="cup" aria-hidden="true">
          <div class="steam"></div>
          <div class="coffee"></div>
          <div class="mug"></div>
          <div class="handle"></div>
        </div>
        <div class="loading-text">
          <h3>Quick pause — grab a coffee.</h3>
          <p>We’re drafting your SOP with structure, controls, and step-by-step execution.</p>
        </div>
      </div>
      <div style="position:absolute; inset:0; background: radial-gradient(closest-side at 30% 20%, rgba(34,211,238,.18), transparent 55%), radial-gradient(closest-side at 70% 70%, rgba(124,58,237,.16), transparent 55%);"></div>
    </div>
  `;
}

function SOPView(sop){
  return `
    <div class="panel" style="margin-top:14px">
      <div class="row" style="justify-content:space-between; align-items:flex-start">
        <div>
          <h2 class="h2" style="margin-bottom:6px">${escapeHtml(sop.title)}</h2>
          <div class="row">
            <span class="tag">${escapeHtml(sop.category)}</span>
            <span class="badge">${escapeHtml(sop.length)} steps</span>
            <span class="badge">Document Type: SOP</span>
          </div>
          <p class="p" style="margin-top:10px">Generated for <strong>${escapeHtml(sop.company)}</strong> · Owner: ${escapeHtml(sop.firstName)} ${escapeHtml(sop.lastName)}</p>
        </div>
        <div class="actions">
          <button class="btn" id="copySop">Copy</button>
          <button class="btn primary" id="saveSop">Save</button>
        </div>
      </div>
      <div class="hr"></div>
      <div class="code" id="sopText">${escapeHtml(sop.content)}</div>
    </div>
  `;
}

function buildSOP({firstName,lastName,company,category,title,brief,length}){
  const today = new Date();
  const id = "SOP-" + String(Math.floor(Math.random()*900000)+100000);
  const region = "United Kingdom, Europe, North America";
  const briefClean = (brief || "").trim() || "Digital Marketing";
  const theme = `${category}: ${title}`;
  const strategicValue = length === "26"
    ? `£2 million annual impact, 25% efficiency gain, 10 FTE optimisation.`
    : `Measured impact through reduced variance, faster onboarding, and consistent execution.`;

  const exec = `0.0 EXECUTIVE SUMMARY
This SOP establishes a repeatable operating method for "${title}" within ${company}. It converts intent into controlled execution, reduces delivery variance, and improves outcomes through defined roles, controls, and measurable outputs. The process is designed to be deployable across ${region}.
Strategic Value: ${strategicValue}
Input Signal: ${briefClean}

1.0 PURPOSE & SCOPE
Purpose: Provide a consistent, auditable method to execute ${theme}.
Scope: Applies to all relevant teams and workflows associated with ${theme}. Exclusions: activities outside approved platforms and tools.

2.0 STRATEGIC CONTEXT & BUSINESS CASE
Market Context: Increasing competition rewards operational speed with quality control.
Business Problem: Inconsistent execution creates rework, missed targets, and performance volatility.
Strategic Imperative: Standardised delivery improves profitability, predictability, and stakeholder confidence.

3.0 ROLES & RESPONSIBILITIES
Owner: ${firstName} ${lastName} (Process Owner)
Accountable: Department Lead (Category: ${category})
Responsible: Delivery Team Members executing steps
Consulted: IT / Data / Compliance (as applicable)
Informed: Leadership stakeholders via reporting cadence

4.0 PREREQUISITES
Tools & Systems: Core work tools for ${category}, documentation repository, analytics / tracking where relevant.
Skills & Access: Role-based access to required systems and competency to execute steps reliably.
`;

  const tech = `5.0 TECHNOLOGY ARCHITECTURE & SYSTEMS
Primary Systems: Systems used to execute ${theme}.
Integration Points: Data flows and handoffs between tools (APIs / exports / dashboards).
Security Protocols: Least-privilege access, audit logs where available, and documented approvals for change.
`;

  const procedure13 = [
    ["Intake & objective definition", "Confirm goal, constraints, and success criteria."],
    ["Inputs collection", "Gather required access, assets, data, and historical context."],
    ["Baseline check", "Validate current state performance and identify constraints."],
    ["Plan & sequencing", "Define the step order, dependencies, and timeline."],
    ["Execution step 1", "Run the first operational action with controls."],
    ["Execution step 2", "Run the second operational action with controls."],
    ["Quality check", "Validate against acceptance criteria; fix obvious defects."],
    ["Exception handling", "Define escalation triggers and response owners."],
    ["Documentation", "Record outputs, decisions, and rationale for auditability."],
    ["Handoff", "Transfer outputs to next role/team with clear acceptance criteria."],
    ["Measurement", "Capture KPIs, logs, and evidence of completion."],
    ["Review cadence", "Weekly or monthly review of results and issues."],
    ["Continuous improvement", "Submit change request and update SOP when needed."]
  ];

  const procedure26 = [
    ["Initial audit & baseline", "Audit current state across systems, channels, or teams; identify discrepancies."],
    ["Define objectives & KPIs", "Set measurable targets, tolerances, and reporting definitions."],
    ["Stakeholder alignment", "Confirm owners, decision rights, and escalation pathway."],
    ["Access validation", "Verify permissions, integrations, and data availability."],
    ["Risk pre-assessment", "Identify operational, financial, and compliance risks."],
    ["Architecture overview", "Document systems, integrations, and data flows."],
    ["Control design", "Define controls, checklists, and acceptance criteria."],
    ["Step 1 — setup", "Configure required settings, templates, and guardrails."],
    ["Step 2 — data validation", "Validate inputs and data integrity before execution."],
    ["Step 3 — execution", "Execute the primary workflow action with logging."],
    ["Step 4 — secondary execution", "Execute downstream actions with dependency checks."],
    ["Step 5 — monitoring", "Monitor logs, errors, and early signals of variance."],
    ["Step 6 — QA gate", "Run QA checks against tolerances and standards."],
    ["Step 7 — exception workflow", "Handle exceptions; escalate if thresholds exceeded."],
    ["Step 8 — reconciliation", "Reconcile outputs with source-of-truth systems."],
    ["Step 9 — reporting", "Generate and distribute performance report."],
    ["Step 10 — financial impact", "Estimate cost drivers, savings opportunities, and payback."],
    ["Step 11 — compliance mapping", "Map relevant obligations (e.g., GDPR) and record controls."],
    ["Step 12 — audit trail", "Store evidence, approvals, and changes in repository."],
    ["Step 13 — SLA targets", "Define response times, accuracy targets, and penalties/escalations."],
    ["Step 14 — governance cadence", "Quarterly/bi-annual governance reviews and audits."],
    ["Step 15 — training plan", "Role-based training, refresh cycle, and competency checks."],
    ["Step 16 — change request", "Submit change request with impact assessment."],
    ["Step 17 — approval workflow", "Obtain approvals (Owner, IT, Compliance as needed)."],
    ["Step 18 — implementation", "Roll out change with communication plan."],
    ["Step 19 — post-implementation review", "Validate results against baseline; log learnings."],
    ["Step 20 — automation layer", "Identify AI/automation opportunities to reduce manual work."],
    ["Step 21 — maturity model", "Assess current maturity and target state."],
    ["Step 22 — business continuity", "Define RTO/RPO and fallback manual process."],
    ["Step 23 — supplier/partner dependencies", "Document dependencies and mitigations."],
    ["Step 24 — stakeholder engagement", "Engage leadership with review cadence and outcomes."],
    ["Step 25 — continuous improvement", "Backlog improvements; prioritise by impact."],
    ["Step 26 — appendices", "Cross references, templates, and related SOPs."]
  ];

  const steps = (length === "26" ? procedure26 : procedure13).map((s, i)=>{
    const n = String(i+1).padStart(2,"0");
    return `${n}. ${s[0]}\n   - Action: ${s[1]}\n   - Control: Document evidence and confirm acceptance criteria.\n   - Outcome: Clear deliverable produced for next step.\n`;
  }).join("\n");

  const governance = length === "26"
    ? `8.0 QUALITY ASSURANCE & GOVERNANCE
- Audit cadence: Quarterly process audit; bi-annual compliance review.
- Tolerances: KPI deviation thresholds defined by the Process Owner.
- Escalation: L1 Team Lead (2h), L2 Manager (4h), L3 Director (12h).

9.0 POLICY & COMPLIANCE REFERENCE MATRIX
Applicable: GDPR (data protection), relevant ISO-aligned quality practices, internal change control.
Obligations: Maintain accurate records, keep approvals, and retain evidence.

10.0 RISK & CONTROL MATRIX
Risk: Execution variance (High) → Mitigation: QA gates + reporting.
Risk: Data integrity issues (High) → Mitigation: validation + reconciliation.
Risk: Knowledge dependency (Medium) → Mitigation: training + SOP standardisation.

11.0 FINANCIAL IMPACT ANALYSIS
Cost drivers: time, rework, operational variance.
Savings opportunity: reduced cycle time and fewer defects.
Payback: faster onboarding and more consistent delivery.

12.0 CHANGE MANAGEMENT
Changes require a formal request, impact assessment, approval, and documented rollout.
`
    : `8.0 QUALITY ASSURANCE & CONTROLS
- Acceptance criteria defined at intake.
- QA gate before handoff.
- Exceptions escalated to the Process Owner.

9.0 CHANGE CONTROL
Update this SOP via a documented change request and brief compiler review.
`;

  const footer = `\nDocument Metadata
Generated: ${today.toLocaleDateString()} · Document ID: ${id}\n`;

  const body = [
    exec,
    tech,
    `6.0 DETAILED PROCEDURE\n${steps}`,
    governance,
    footer
  ].join("\n");

  return body.trim();
}

function BuilderController(){
  const stageEl = qs("#builderStage");
  const state = { stage: 1, payload: {} };

  const setStage = (n)=>{
    state.stage = n;
    qs("#dot1").classList.toggle("on", n>=1);
    qs("#dot2").classList.toggle("on", n>=2);
    qs("#dot3").classList.toggle("on", n>=3);
    if (n===1) stageEl.innerHTML = stage1();
    if (n===2) stageEl.innerHTML = stage2();
    if (n===3) stageEl.innerHTML = stage3();
    wireStage();
  };

  const wireStage = ()=>{
    if (state.stage===1){
      qs("#toStage2").onclick = ()=>{
        const firstName = qs("#firstName").value.trim();
        const lastName = qs("#lastName").value.trim();
        const company = qs("#company").value.trim();
        const category = qs("#category").value.trim();
        const title = qs("#title").value.trim();
        if (!firstName || !lastName || !company || !category || !title){
          toast("Please complete all fields.");
          return;
        }
        state.payload = { ...state.payload, firstName,lastName,company,category,title };
        setStage(2);
      };
    }
    if (state.stage===2){
      qs("#backTo1").onclick = ()=> setStage(1);
      qs("#toStage3").onclick = ()=>{
        const brief = qs("#brief").value.trim();
        const video = qs("#videoFile").files?.[0];
        if (!brief && !video){
          toast("Add a short text brief (two words is enough).");
          return;
        }
        state.payload = { ...state.payload, brief: brief || "(Video brief attached in production)" };
        setStage(3);
      };
    }
    if (state.stage===3){
      qs("#backTo2").onclick = ()=> setStage(2);
      qsa("[data-generate]").forEach(btn=>{
        btn.onclick = async ()=>{
          const length = btn.getAttribute("data-generate");
          const outputArea = qs("#outputArea");
          outputArea.innerHTML = loadingScreen();
          // Short, tasteful "coffee break" pause — not minutes. We are generating instantly client-side.
          await sleep(1800);

          const content = buildSOP({ ...state.payload, length });
          const sop = {
            ...state.payload,
            length,
            content,
            createdAt: new Date().toISOString(),
          };
          outputArea.innerHTML = SOPView(sop);

          qs("#copySop").onclick = async ()=>{
            await navigator.clipboard.writeText(sop.content);
            toast("SOP copied.");
          };
          qs("#saveSop").onclick = ()=>{
            const raw = localStorage.getItem(STORAGE_KEYS.sops);
            const sops = raw ? JSON.parse(raw) : [];
            sops.push({ title: sop.title, category: sop.category, length: sop.length, createdAt: sop.createdAt, content: sop.content });
            localStorage.setItem(STORAGE_KEYS.sops, JSON.stringify(sops));

            const stats = getStats();
            stats.sopsThisMonth += 1;
            stats.hoursSavedThisMonth += HOURS_PER_SOP[length];
            setStats(stats);
            toast("Saved. Dashboard updated.");
          };
        };
      });
    }
  };

  setStage(1);
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

function Privacy(){
  return `
    <div class="container section">
      <div class="panel">
        <h2 class="h2">Privacy</h2>
        <p class="p">This is a static demo build. In this version, your data is stored locally in your browser only.</p>
      </div>
    </div>
  `;
}
function Terms(){
  return `
    <div class="container section">
      <div class="panel">
        <h2 class="h2">Terms</h2>
        <p class="p">Add your terms here. This page is provided so the site can be production-ready when you are.</p>
      </div>
    </div>
  `;
}

function render(){
  const root = qs("#app");
  root.innerHTML = App();

  // Wire internal links
  qsa("[data-link]").forEach(a=>{
    a.addEventListener("click", (e)=>{
      e.preventDefault();
      navigate(a.getAttribute("href"));
    });
  });

  // Wire nav auth buttons
  const openAuth = qs("#openAuth");
  if (openAuth) openAuth.onclick = (e)=>{ e.preventDefault(); openAuthModal(); };

  const logoutBtn = qs("#logoutBtn");
  if (logoutBtn) logoutBtn.onclick = (e)=>{
    e.preventDefault();
    clearUser();
    toast("Logged out.");
    navigate("/");
  };

  const view = qs("#view");
  const path = location.pathname;
  const fn = routes[path] || NotFound;
  view.innerHTML = fn();

  // Home hero stats + interactions
  if (path === "/"){
    const stats = getStats();
    const hs = qs("#homeSops");
    const hh = qs("#homeHours");
    if (hs) hs.textContent = stats.sopsThisMonth;
    if (hh) hh.textContent = stats.hoursSavedThisMonth;

    const btn = qs("#homePrimary");
    if (btn && btn.getAttribute("href")==="#"){
      btn.onclick = (e)=>{ e.preventDefault(); openAuthModal(); };
    }

    mountHero3D();
    mountTilt();
  }

  // Builder controller
  if (path === "/app/builder"){
    BuilderController();
  }

  // Dashboard reset
  if (path === "/app/dashboard"){
    const reset = qs("#resetStats");
    if (reset) reset.onclick = ()=>{
      const s = { ...DEFAULT_STATS, monthKey: monthKey() };
      setStats(s);
      toast("Month reset.");
      render();
    };
  }

  // Protect app routes
  if (path.startsWith("/app/")){
    if (!getUser()){
      // The modal will open from requireAuth in AppShell.
      // Ensure redirect to dashboard after login.
    }
  }
}

function NotFound(){
  return `
    <div class="container section">
      <div class="panel">
        <h2 class="h2">Not found</h2>
        <p class="p">That page does not exist.</p>
      </div>
    </div>
  `;
}

/* ------------------------- AUTH MODAL (STATIC) ------------------------- */

function openAuthModal(){
  if (qs("#authBackdrop")) return;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "authBackdrop";
  backdrop.innerHTML = `
    <div class="modal">
      <header>
        <div class="row" style="justify-content:space-between; align-items:flex-start">
          <div>
            <h2>Sign up / Log in</h2>
            <p>Continue with Google (requires OAuth provider) or use email verification.</p>
          </div>
          <button class="btn" id="closeAuth">Close</button>
        </div>
      </header>
      <div class="content">
        <div class="split">
          <div class="auth-card">
            <h3 style="margin:0 0 8px">Continue with Google</h3>
            <p class="small">For a production build, connect Firebase Auth or your identity provider. For now, this simulates a Google login.</p>
            <div class="actions" style="margin-top:10px">
              <button class="btn primary" id="googleSim">Continue</button>
            </div>
            <div class="small" style="margin-top:10px">This demo will ask for your email and sign you in immediately.</div>
          </div>

          <div class="auth-card">
            <h3 style="margin:0 0 8px">Continue with email</h3>
            <p class="small">We’ll send a verification code. If email sending is not configured, the code will be shown on-screen.</p>

            <div class="field" style="margin-top:10px">
              <div class="label">Email</div>
              <input class="input" id="authEmail" placeholder="you@company.com" autocomplete="email"/>
            </div>

            <div class="actions">
              <button class="btn primary" id="sendCode">Send verification code</button>
            </div>

            <div id="codeStage" style="display:none; margin-top:10px">
              <div class="field">
                <div class="label">Verification code</div>
                <input class="input" id="authCode" placeholder="123456" inputmode="numeric"/>
                <div class="hint" id="codeHint"></div>
              </div>
              <div class="actions">
                <button class="btn primary" id="verifyCode">Verify & continue</button>
              </div>
            </div>
          </div>
        </div>

        <div class="hr"></div>
        <p class="small">By continuing you agree to the <a href="/terms" data-link>Terms</a> and <a href="/privacy" data-link>Privacy</a>.</p>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  backdrop.addEventListener("click", (e)=>{
    if (e.target === backdrop) closeAuthModal();
  });

  qs("#closeAuth").onclick = closeAuthModal;

  // internal links in modal
  qsa("[data-link]", backdrop).forEach(a=>{
    a.addEventListener("click",(e)=>{
      e.preventDefault();
      closeAuthModal();
      navigate(a.getAttribute("href"));
    });
  });

  qs("#googleSim").onclick = ()=>{
    const email = prompt("Enter your email to continue:");
    if (!email || !/^\S+@\S+\.\S+$/.test(email)){
      toast("Please enter a valid email.");
      return;
    }
    completeLogin(email);
  };

  qs("#sendCode").onclick = ()=>{
    const email = qs("#authEmail").value.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)){
      toast("Enter a valid email.");
      return;
    }
    const code = String(Math.floor(100000 + Math.random()*900000));
    localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify({ email, code, createdAt: Date.now() }));

    qs("#codeStage").style.display = "block";
    qs("#codeHint").textContent = "Code sent. Enter it above.";

    // Optional EmailJS support: if you configure window.__EMAILJS__ the code will be emailed.
    // Otherwise we display it on-screen for this static demo.
    if (window.__EMAILJS__?.enabled){
      sendEmailCodeEmailJS(email, code).then(()=>{
        toast("Verification code sent.");
      }).catch(()=>{
        qs("#codeHint").textContent = `Email sending not configured. Demo code: ${code}`;
        toast("Email sending not configured; showing code here.");
      });
    } else {
      qs("#codeHint").textContent = `Demo code: ${code}`;
      toast("Code generated.");
    }
  };

  qs("#verifyCode").onclick = ()=>{
    const raw = localStorage.getItem(STORAGE_KEYS.auth);
    if (!raw){ toast("Please send a code first."); return; }
    const { email, code } = JSON.parse(raw);
    const entered = qs("#authCode").value.trim();
    if (entered !== code){
      toast("Incorrect code.");
      return;
    }
    completeLogin(email);
  };
}

function closeAuthModal(){
  const b = qs("#authBackdrop");
  if (b) b.remove();
}

function completeLogin(email){
  const existing = getUser();
  const user = existing || { email, createdAt: new Date().toISOString(), id: cryptoRandomId() };
  user.email = email;
  setUser(user);
  if (!localStorage.getItem(STORAGE_KEYS.stats)){
    setStats(DEFAULT_STATS);
  }
  closeAuthModal();
  toast("Signed in.");
  navigate("/app/dashboard");
}

function cryptoRandomId(){
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return [...arr].map(b=>b.toString(16).padStart(2,"0")).join("");
}

async function sendEmailCodeEmailJS(email, code){
  // You can wire EmailJS to send verification codes without a backend.
  // Configure in window.__EMAILJS__ (see below).
  // Example:
  // window.__EMAILJS__ = {
  //   enabled: true,
  //   publicKey: "YOUR_PUBLIC_KEY",
  //   serviceId: "YOUR_SERVICE_ID",
  //   templateId: "YOUR_TEMPLATE_ID"
  // }
  const cfg = window.__EMAILJS__;
  const url = "https://api.emailjs.com/api/v1.0/email/send";
  const payload = {
    service_id: cfg.serviceId,
    template_id: cfg.templateId,
    user_id: cfg.publicKey,
    template_params: { to_email: email, verification_code: code }
  };
  const res = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error("EmailJS send failed");
  return true;
}

/* ----------------------------- 3D HERO ----------------------------- */

let heroCleanup = null;

function mountHero3D(){
  const mount = qs("#heroCanvas");
  if (!mount) return;

  // clear previous
  if (heroCleanup) heroCleanup();

  const w = mount.clientWidth;
  const h = mount.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 100);
  camera.position.set(0, 0.3, 4.2);

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  // Lights
  const a = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(a);
  const p1 = new THREE.PointLight(0x22d3ee, 1.2, 30);
  p1.position.set(2.2, 1.2, 3);
  scene.add(p1);
  const p2 = new THREE.PointLight(0x7c3aed, 1.1, 30);
  p2.position.set(-2.2, -0.2, 2.8);
  scene.add(p2);

  // Glowing "orbs"
  const group = new THREE.Group();
  scene.add(group);

  const geo = new THREE.IcosahedronGeometry(0.55, 2);
  const mat1 = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x22d3ee,
    emissiveIntensity: 0.35,
    metalness: 0.55,
    roughness: 0.25,
  });
  const mat2 = new THREE.MeshStandardMaterial({
    color: 0x7c3aed,
    emissive: 0x7c3aed,
    emissiveIntensity: 0.32,
    metalness: 0.60,
    roughness: 0.28,
  });
  const mat3 = new THREE.MeshStandardMaterial({
    color: 0xa3ff12,
    emissive: 0xa3ff12,
    emissiveIntensity: 0.18,
    metalness: 0.45,
    roughness: 0.35,
  });

  const m1 = new THREE.Mesh(geo, mat1); m1.position.set(-0.9, 0.15, 0.0);
  const m2 = new THREE.Mesh(geo, mat2); m2.position.set( 0.9,-0.05, 0.15);
  const m3 = new THREE.Mesh(new THREE.SphereGeometry(0.35, 42, 42), mat3); m3.position.set(0.0, 0.65, -0.25);
  group.add(m1,m2,m3);

  // A subtle "ribbon" torus knot
  const ribbon = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.85, 0.13, 150, 16),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.08,
      metalness: 0.6,
      roughness: 0.25,
      transparent: true,
      opacity: 0.45
    })
  );
  ribbon.position.set(0, -0.05, -0.35);
  group.add(ribbon);

  // Background particles (cheap + premium)
  const particles = new THREE.BufferGeometry();
  const count = 420;
  const positions = new Float32Array(count*3);
  for (let i=0;i<count;i++){
    positions[i*3+0] = (Math.random()-0.5)*7;
    positions[i*3+1] = (Math.random()-0.5)*4;
    positions[i*3+2] = (Math.random()-0.5)*6;
  }
  particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.015, transparent:true, opacity:0.55 });
  const points = new THREE.Points(particles, pMat);
  scene.add(points);

  let mx = 0, my = 0;
  const onMove = (e)=>{
    const r = mount.getBoundingClientRect();
    mx = ((e.clientX - r.left)/r.width - 0.5) * 1.0;
    my = ((e.clientY - r.top)/r.height - 0.5) * 1.0;
  };
  mount.addEventListener("mousemove", onMove);

  const clock = new THREE.Clock();

  function tick(){
    const t = clock.getElapsedTime();
    group.rotation.y = t*0.35 + mx*0.6;
    group.rotation.x = t*0.18 - my*0.4;
    m1.rotation.z = t*0.25;
    m2.rotation.z = -t*0.22;
    ribbon.rotation.y = -t*0.2;
    points.rotation.y = t*0.02;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  let raf = requestAnimationFrame(tick);

  const onResize = ()=>{
    const w2 = mount.clientWidth;
    const h2 = mount.clientHeight;
    camera.aspect = w2/h2;
    camera.updateProjectionMatrix();
    renderer.setSize(w2,h2);
  };
  window.addEventListener("resize", onResize);

  heroCleanup = ()=>{
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    mount.removeEventListener("mousemove", onMove);
    renderer.dispose();
    mount.innerHTML = "";
  };
}

function mountTilt(){
  const card = qs("#tiltCard");
  if (!card) return;
  let raf = null;
  let tx=0, ty=0, cx=0, cy=0;
  const onMove = (e)=>{
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tx = x * 10;
    ty = y * -10;
  };
  const onLeave = ()=>{ tx=0; ty=0; };
  card.addEventListener("mousemove", onMove);
  card.addEventListener("mouseleave", onLeave);

  const loop = ()=>{
    cx += (tx-cx)*0.08;
    cy += (ty-cy)*0.08;
    card.style.transform = `perspective(900px) rotateX(${cy}deg) rotateY(${cx}deg) translateY(-1px)`;
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  heroCleanup = (prev=>()=>{
    prev?.();
    cancelAnimationFrame(raf);
    card.removeEventListener("mousemove", onMove);
    card.removeEventListener("mouseleave", onLeave);
    card.style.transform = "";
  })(heroCleanup);
}

function escapeHtml(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

render();
