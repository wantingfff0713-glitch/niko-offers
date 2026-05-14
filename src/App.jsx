import { useState, useEffect } from "react";

// ── Storage keys ──────────────────────────────────────────────────────────────
const STORAGE_KEY = "niko_offers";

// ── Helpers ───────────────────────────────────────────────────────────────────
async function parseEmailWithAI(emailText) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a property data extractor. Extract information from this UK letting agent offer confirmation email and return ONLY valid JSON with no markdown, no explanation.

Return exactly this structure (use null for missing fields):
{
  "property": {
    "address": "",
    "postcode": "",
    "weeklyRent": null,
    "monthlyRent": null,
    "startDate": "",
    "tenancyType": "",
    "reservationFee": null
  },
  "tenant": {
    "name": "",
    "email": "",
    "phone": ""
  },
  "agent": {
    "name": "",
    "company": "",
    "email": "",
    "phone": ""
  },
  "notes": ""
}

Email:
${emailText}`
      }]
    })
  });
  const data = await response.json();
  const text = data.content?.find(b => b.type === "text")?.text || "{}";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  "Offer Accepted": { bg: "#d1fae5", color: "#065f46", dot: "#10b981" },
  "References": { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  "Contract Signed": { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
  "Live Tenancy": { bg: "#ede9fe", color: "#5b21b6", dot: "#8b5cf6" },
  "Ended": { bg: "#f3f4f6", color: "#6b7280", dot: "#9ca3af" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Offer Accepted"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: cfg.bg, color: cfg.color,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
      {status}
    </span>
  );
}

// ── Field Row ─────────────────────────────────────────────────────────────────
function Field({ label, value, mono }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#1f2937", fontFamily: mono ? "monospace" : "inherit" }}>{value}</div>
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function Section({ icon, title, children }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontWeight: 700, fontSize: 13, color: "#374151" }}>
        <span>{icon}</span>{title}
      </div>
      {children}
    </div>
  );
}

// ── Offer Detail Modal ────────────────────────────────────────────────────────
function OfferModal({ offer, onClose, onUpdateStatus, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const p = offer.property || {};
  const t = offer.tenant || {};
  const a = offer.agent || {};

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 540,
        maxHeight: "88vh", overflowY: "auto", padding: "28px 28px 24px",
        boxShadow: "0 25px 60px rgba(0,0,0,0.25)"
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", lineHeight: 1.3 }}>{p.address || "Unknown Address"}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>{p.postcode}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <StatusBadge status={offer.status} />
          <span style={{ fontSize: 12, color: "#9ca3af", alignSelf: "center" }}>Added {new Date(offer.createdAt).toLocaleDateString("en-GB")}</span>
        </div>

        {/* Rent summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Weekly Rent", value: p.weeklyRent ? `£${p.weeklyRent.toLocaleString()}` : null },
            { label: "Monthly Rent", value: p.monthlyRent ? `£${p.monthlyRent.toLocaleString()}` : null },
            { label: "Start Date", value: p.startDate },
          ].map(({ label, value }) => value ? (
            <div key={label} style={{ background: "#f0fdf4", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#065f46", marginTop: 4 }}>{value}</div>
            </div>
          ) : null)}
        </div>

        <Section icon="🏢" title="Property">
          <Field label="Tenancy Type" value={p.tenancyType} />
          <Field label="Reservation Fee" value={p.reservationFee ? `£${p.reservationFee.toLocaleString()}` : null} />
        </Section>

        <Section icon="👤" title="Tenant">
          <Field label="Name" value={t.name} />
          <Field label="Email" value={t.email} mono />
          <Field label="Phone" value={t.phone} />
        </Section>

        <Section icon="🏛" title="Agent / Landlord">
          <Field label="Agent Name" value={a.name} />
          <Field label="Company" value={a.company} />
          <Field label="Email" value={a.email} mono />
          <Field label="Phone" value={a.phone} />
        </Section>

        {offer.notes && (
          <Section icon="📝" title="Notes">
            <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{offer.notes}</div>
          </Section>
        )}

        {/* Attachments */}
        {offer.files && offer.files.length > 0 && (
          <Section icon="📎" title={`Attachments (${offer.files.length})`}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {offer.files.map((f, i) => (
                <div key={i} style={{ fontSize: 12, background: "#e5e7eb", padding: "4px 10px", borderRadius: 6, color: "#374151" }}>
                  {f.name}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Status update */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>Update Status</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Object.keys(STATUS_CONFIG).map(s => (
              <button key={s} onClick={() => onUpdateStatus(offer.id, s)} style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: offer.status === s ? "2px solid #111" : "2px solid #e5e7eb",
                background: offer.status === s ? "#111" : "#fff",
                color: offer.status === s ? "#fff" : "#374151",
                transition: "all 0.15s"
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Delete */}
        <div style={{ marginTop: 16, borderTop: "1px solid #f3f4f6", paddingTop: 14 }}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{ fontSize: 13, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
              Delete this record
            </button>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#374151" }}>Are you sure?</span>
              <button onClick={() => { onDelete(offer.id); onClose(); }} style={{ fontSize: 13, color: "#fff", background: "#ef4444", border: "none", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>Yes, delete</button>
              <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Offer Modal ───────────────────────────────────────────────────────────
function AddOfferModal({ onClose, onSave }) {
  const [step, setStep] = useState("input"); // input | parsing | review | manual
  const [emailText, setEmailText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState("");
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({
    property: { address: "", postcode: "", weeklyRent: "", monthlyRent: "", startDate: "", tenancyType: "Monthly Rolling", reservationFee: "" },
    tenant: { name: "", email: "", phone: "" },
    agent: { name: "", company: "", email: "", phone: "" },
    notes: ""
  });

  async function handleParse() {
    if (!emailText.trim()) { setError("Please paste the email content first."); return; }
    setError("");
    setStep("parsing");
    try {
      const result = await parseEmailWithAI(emailText);
      setParsed(result);
      // Merge into form
      setForm({
        property: {
          address: result.property?.address || "",
          postcode: result.property?.postcode || "",
          weeklyRent: result.property?.weeklyRent || "",
          monthlyRent: result.property?.monthlyRent || "",
          startDate: result.property?.startDate || "",
          tenancyType: result.property?.tenancyType || "Monthly Rolling",
          reservationFee: result.property?.reservationFee || "",
        },
        tenant: { name: result.tenant?.name || "", email: result.tenant?.email || "", phone: result.tenant?.phone || "" },
        agent: { name: result.agent?.name || "", company: result.agent?.company || "", email: result.agent?.email || "", phone: result.agent?.phone || "" },
        notes: result.notes || ""
      });
      setStep("review");
    } catch {
      setError("Failed to parse email. Please check the content and try again, or fill in manually.");
      setStep("input");
    }
  }

  function updateField(section, field, value) {
    setForm(f => ({ ...f, [section]: { ...f[section], [field]: value } }));
  }

  function handleSave() {
    if (!form.property.address) { setError("Address is required."); return; }
    const offer = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: "Offer Accepted",
      property: {
        ...form.property,
        weeklyRent: form.property.weeklyRent ? Number(form.property.weeklyRent) : null,
        monthlyRent: form.property.monthlyRent ? Number(form.property.monthlyRent) : null,
        reservationFee: form.property.reservationFee ? Number(form.property.reservationFee) : null,
      },
      tenant: form.tenant,
      agent: form.agent,
      notes: form.notes,
      emailText,
      files: files.map(f => ({ name: f.name, type: f.type }))
    };
    onSave(offer);
    onClose();
  }

  const InputStyle = {
    width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb",
    fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff"
  };
  const LabelStyle = { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 };
  const FieldWrap = ({ label, children }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={LabelStyle}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", padding: "28px", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>
              {step === "input" ? "Add New Offer" : step === "parsing" ? "Reading Email…" : "Review & Save"}
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
              {step === "input" ? "Paste the agent's confirmation email" : step === "parsing" ? "AI is extracting property details" : "Confirm extracted details before saving"}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>✕</button>
        </div>

        {/* Step: Input */}
        {step === "input" && (
          <div>
            <FieldWrap label="Agent Confirmation Email (paste full text)">
              <textarea value={emailText} onChange={e => setEmailText(e.target.value)}
                placeholder="Paste the email here — AI will extract address, rent, dates, tenant name, agent contacts automatically…"
                style={{ ...InputStyle, minHeight: 200, resize: "vertical", lineHeight: 1.6 }} />
            </FieldWrap>
            {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 10 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={handleParse} style={{ flex: 1, padding: "11px", background: "#111", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                ✨ Extract with AI
              </button>
              <button onClick={() => setStep("review")} style={{ padding: "11px 16px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Fill Manually
              </button>
            </div>
          </div>
        )}

        {/* Step: Parsing */}
        {step === "parsing" && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16, animation: "spin 1.5s linear infinite", display: "inline-block" }}>⚙️</div>
            <div style={{ fontSize: 15, color: "#6b7280" }}>Analysing email content…</div>
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* Step: Review / Manual */}
        {step === "review" && (
          <div>
            {parsed && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#065f46" }}>
                ✅ AI extracted details from the email. Please review and correct if needed.
              </div>
            )}

            {/* Property */}
            <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #f3f4f6" }}>🏢 Property</div>
            <FieldWrap label="Address *">
              <input style={InputStyle} value={form.property.address} onChange={e => updateField("property", "address", e.target.value)} placeholder="e.g. 805 Neroli House, 14 Piazza Walk" />
            </FieldWrap>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FieldWrap label="Postcode">
                <input style={InputStyle} value={form.property.postcode} onChange={e => updateField("property", "postcode", e.target.value)} placeholder="E1 8ZJ" />
              </FieldWrap>
              <FieldWrap label="Tenancy Type">
                <input style={InputStyle} value={form.property.tenancyType} onChange={e => updateField("property", "tenancyType", e.target.value)} placeholder="Monthly Rolling" />
              </FieldWrap>
              <FieldWrap label="Weekly Rent (£)">
                <input style={InputStyle} type="number" value={form.property.weeklyRent} onChange={e => updateField("property", "weeklyRent", e.target.value)} placeholder="595" />
              </FieldWrap>
              <FieldWrap label="Monthly Rent (£)">
                <input style={InputStyle} type="number" value={form.property.monthlyRent} onChange={e => updateField("property", "monthlyRent", e.target.value)} placeholder="2578" />
              </FieldWrap>
              <FieldWrap label="Start Date">
                <input style={InputStyle} value={form.property.startDate} onChange={e => updateField("property", "startDate", e.target.value)} placeholder="4th July 2026" />
              </FieldWrap>
              <FieldWrap label="Reservation Fee (£)">
                <input style={InputStyle} type="number" value={form.property.reservationFee} onChange={e => updateField("property", "reservationFee", e.target.value)} placeholder="595" />
              </FieldWrap>
            </div>

            {/* Tenant */}
            <div style={{ fontWeight: 700, fontSize: 13, color: "#111", margin: "16px 0 10px", paddingBottom: 6, borderBottom: "2px solid #f3f4f6" }}>👤 Tenant</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FieldWrap label="Name">
                <input style={InputStyle} value={form.tenant.name} onChange={e => updateField("tenant", "name", e.target.value)} placeholder="Full name" />
              </FieldWrap>
              <FieldWrap label="Phone">
                <input style={InputStyle} value={form.tenant.phone} onChange={e => updateField("tenant", "phone", e.target.value)} placeholder="+44…" />
              </FieldWrap>
            </div>
            <FieldWrap label="Email">
              <input style={InputStyle} value={form.tenant.email} onChange={e => updateField("tenant", "email", e.target.value)} placeholder="tenant@example.com" />
            </FieldWrap>

            {/* Agent */}
            <div style={{ fontWeight: 700, fontSize: 13, color: "#111", margin: "16px 0 10px", paddingBottom: 6, borderBottom: "2px solid #f3f4f6" }}>🏛 Agent</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FieldWrap label="Agent Name">
                <input style={InputStyle} value={form.agent.name} onChange={e => updateField("agent", "name", e.target.value)} placeholder="Agent name" />
              </FieldWrap>
              <FieldWrap label="Company">
                <input style={InputStyle} value={form.agent.company} onChange={e => updateField("agent", "company", e.target.value)} placeholder="Savills / Knight Frank…" />
              </FieldWrap>
              <FieldWrap label="Agent Email">
                <input style={InputStyle} value={form.agent.email} onChange={e => updateField("agent", "email", e.target.value)} placeholder="agent@savills.com" />
              </FieldWrap>
              <FieldWrap label="Agent Phone">
                <input style={InputStyle} value={form.agent.phone} onChange={e => updateField("agent", "phone", e.target.value)} placeholder="+44…" />
              </FieldWrap>
            </div>

            {/* Notes */}
            <div style={{ fontWeight: 700, fontSize: 13, color: "#111", margin: "16px 0 10px", paddingBottom: 6, borderBottom: "2px solid #f3f4f6" }}>📝 Notes</div>
            <FieldWrap label="Additional Notes">
              <textarea style={{ ...InputStyle, minHeight: 70, resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Guarantor needed, special conditions, parking, etc." />
            </FieldWrap>

            {/* File upload */}
            <div style={{ fontWeight: 700, fontSize: 13, color: "#111", margin: "16px 0 10px", paddingBottom: 6, borderBottom: "2px solid #f3f4f6" }}>📎 Attachments</div>
            <label style={{ display: "block", border: "2px dashed #e5e7eb", borderRadius: 10, padding: "16px", textAlign: "center", cursor: "pointer", color: "#9ca3af", fontSize: 13 }}>
              <input type="file" multiple accept="image/*,.pdf,.mp4,.mov" style={{ display: "none" }} onChange={e => setFiles(Array.from(e.target.files))} />
              {files.length > 0 ? `${files.length} file(s) selected` : "📁 Upload photos, floor plans, PDFs, or videos"}
            </label>

            {error && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 10 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setStep("input"); setError(""); }} style={{ padding: "11px 16px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                ← Back
              </button>
              <button onClick={handleSave} style={{ flex: 1, padding: "11px", background: "#111", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Save Offer Record
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Offer Card ────────────────────────────────────────────────────────────────
function OfferCard({ offer, onClick }) {
  const p = offer.property || {};
  const weekly = p.weeklyRent ? `£${p.weeklyRent.toLocaleString()}/wk` : p.monthlyRent ? `£${p.monthlyRent.toLocaleString()}/mo` : null;
  return (
    <div onClick={onClick} style={{
      background: "#fff", borderRadius: 14, padding: "18px 20px", cursor: "pointer",
      border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      transition: "all 0.15s", marginBottom: 12
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; e.currentTarget.style.transform = ""; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {p.address || "Unknown Property"}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
            {p.postcode}{p.postcode && offer.tenant?.name ? " · " : ""}{offer.tenant?.name}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <StatusBadge status={offer.status} />
            {weekly && <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>{weekly}</span>}
            {p.startDate && <span style={{ fontSize: 12, color: "#9ca3af" }}>From {p.startDate}</span>}
          </div>
        </div>
        {offer.agent?.company && (
          <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "right", flexShrink: 0 }}>{offer.agent.company}</div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [offers, setOffers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setOffers(JSON.parse(saved));
    } catch {}
  }, []);

  function saveOffers(updated) {
    setOffers(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }

  function handleSave(offer) { saveOffers([offer, ...offers]); }

  function handleUpdateStatus(id, status) {
    const updated = offers.map(o => o.id === id ? { ...o, status } : o);
    saveOffers(updated);
    setSelectedOffer(o => o?.id === id ? { ...o, status } : o);
  }

  function handleDelete(id) {
    saveOffers(offers.filter(o => o.id !== id));
  }

  const filtered = offers.filter(o => {
    const matchStatus = filterStatus === "All" || o.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || [
      o.property?.address, o.property?.postcode,
      o.tenant?.name, o.agent?.company, o.agent?.name
    ].some(v => v?.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  // Stats
  const stats = {
    total: offers.length,
    live: offers.filter(o => o.status === "Live Tenancy").length,
    totalWeekly: offers.filter(o => o.property?.weeklyRent && o.status === "Live Tenancy").reduce((s, o) => s + o.property.weeklyRent, 0),
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f6", fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      {/* Header */}
      <div style={{ background: "#111", color: "#fff", padding: "20px 24px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em" }}>Niko Relocation</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2, fontFamily: "monospace" }}>Offer Management System</div>
            </div>
            <button onClick={() => setShowAdd(true)} style={{
              background: "#fff", color: "#111", border: "none", borderRadius: 10,
              padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit"
            }}>+ New Offer</button>
          </div>

          {/* Stats bar */}
          <div style={{ display: "flex", gap: 24, paddingBottom: 16, borderBottom: "1px solid #333" }}>
            {[
              { label: "Total Offers", value: stats.total },
              { label: "Live Tenancies", value: stats.live },
              { label: "Live Weekly Revenue", value: stats.totalWeekly ? `£${stats.totalWeekly.toLocaleString()}` : "—" },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 2, paddingTop: 12, overflowX: "auto" }}>
            {["All", ...Object.keys(STATUS_CONFIG)].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                padding: "6px 14px", borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                background: filterStatus === s ? "#f8f8f6" : "transparent",
                color: filterStatus === s ? "#111" : "#9ca3af",
                transition: "all 0.15s"
              }}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 24px" }}>
        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by address, postcode, tenant or agent…"
          style={{ width: "100%", padding: "11px 16px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, fontFamily: "inherit", outline: "none", marginBottom: 16, background: "#fff" }} />

        {/* List */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No offers yet</div>
            <div style={{ fontSize: 14 }}>Click <strong>+ New Offer</strong> and paste a confirmation email to get started</div>
          </div>
        ) : (
          filtered.map(o => <OfferCard key={o.id} offer={o} onClick={() => setSelectedOffer(o)} />)
        )}
      </div>

      {/* Modals */}
      {showAdd && <AddOfferModal onClose={() => setShowAdd(false)} onSave={handleSave} />}
      {selectedOffer && (
        <OfferModal
          offer={selectedOffer}
          onClose={() => setSelectedOffer(null)}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
