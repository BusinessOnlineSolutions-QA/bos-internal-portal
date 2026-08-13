import React, { useState, useMemo } from "react";
import {
  QrCode, Smartphone, FileBarChart2, Users, ShieldCheck,
  PlusCircle, LayoutGrid, LogOut, Search, Eye, X,
  Clock, Lock, RefreshCw, Copy, Check,
  Settings2
} from "lucide-react";

// ---------- design tokens (light theme) ----------
const C = {
  base: "#F5F6F8",       // page background
  panel: "#FFFFFF",      // cards / tables
  panelAlt: "#F1F3F6",   // inputs, subtle fills
  border: "#E3E6EB",
  text: "#161B22",
  muted: "#69707D",
  amber: "#B45309",      // accent text / icons / badges
  amberBright: "#F59E0B",// solid accent for primary buttons
  green: "#1A7F37",
  red: "#CF222E",
  blue: "#0969DA",
};

const mono = { fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" };

// ---------- mock seed data ----------
const SERVICES = ["LocKit QR", "OTP Gateway", "KYC Verification", "Document Signing", "Payment Gateway"];

const SERVICE_SEED = SERVICES.map((s, i) => ({ id: `s_${i}`, name: s, desc: "", status: "Active" }));

const SEED_USERS = [
  { id: "u1", name: "Aditi Rao", email: "aditi.rao@bos.internal", role: "Admin", status: "Active", addedOn: "2026-02-11" },
  { id: "u2", name: "Karan Mehta", email: "karan.mehta@bos.internal", role: "Operator", status: "Active", addedOn: "2026-03-04" },
  { id: "u3", name: "Sana Iqbal", email: "sana.iqbal@bos.internal", role: "Viewer", status: "Active", addedOn: "2026-04-18" },
  { id: "u4", name: "Rohit Bansal", email: "rohit.bansal@bos.internal", role: "Operator", status: "Suspended", addedOn: "2026-05-02" },
  { id: "u5", name: "Priya Nair", email: "priya.nair@bos.internal", role: "Viewer", status: "Active", addedOn: "2026-06-27" },
];

// A role's access is expressed purely as module access. "Services" (the
// business-facing offerings like OTP Gateway, KYC, etc.) are managed as a
// separate directory in Admin > Services, but access to them rides on the
// "Services" module grant below rather than a per-service checkbox — that
// keeps the role editor usable whether there are 5 services or 50.
const MODULES = ["LocKit", "OTP", "Reports", "Users", "Services"];

const DEFAULT_ROLE_PERMS = {
  Admin: { LocKit: true, OTP: true, Reports: true, Users: true, Services: true },
  Operator: { LocKit: true, OTP: true, Reports: true, Users: false, Services: false },
  Viewer: { LocKit: false, OTP: false, Reports: true, Users: false, Services: false },
};

function seedReports(currentUserName) {
  const ips = ["10.12.4.21", "10.12.4.55", "172.16.9.3", "192.168.1.44", "10.0.0.18"];
  const statuses = [200, 200, 200, 400, 500, 200];
  const rows = [];
  let id = 1;
  const names = ["Aditi Rao", "Karan Mehta", "Sana Iqbal", "Rohit Bansal", currentUserName];
  for (let i = 0; i < 26; i++) {
    const svc = SERVICES[i % SERVICES.length];
    const status = statuses[i % statuses.length];
    const day = 1 + (i % 27);
    rows.push({
      id: `r${id++}`,
      user: names[i % names.length],
      service: svc,
      ip: ips[i % ips.length],
      timestamp: `2026-08-${String(day).padStart(2, "0")} ${String(9 + (i % 10)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`,
      status,
      response: status === 200 ? "OK — request completed" : status === 400 ? "Bad Request — invalid payload" : "Internal Error — upstream timeout",
      attachment: `response_${id}.json`,
    });
  }
  return rows;
}

// ---------- small primitives ----------
function Eyebrow({ children }) {
  return (
    <div style={{ ...mono, color: C.amber, letterSpacing: "0.14em", fontSize: 11 }} className="uppercase mb-2">
      {children}
    </div>
  );
}

function StatusDot({ ok }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-2"
      style={{ background: ok ? C.green : C.red }}
    />
  );
}

function Badge({ tone = "muted", children }) {
  const tones = {
    green: { color: C.green, bg: "rgba(26,127,55,0.1)", border: "rgba(26,127,55,0.3)" },
    red: { color: C.red, bg: "rgba(207,34,46,0.1)", border: "rgba(207,34,46,0.3)" },
    amber: { color: C.amber, bg: "rgba(180,83,9,0.1)", border: "rgba(180,83,9,0.28)" },
    blue: { color: C.blue, bg: "rgba(9,105,218,0.1)", border: "rgba(9,105,218,0.28)" },
    muted: { color: C.muted, bg: "rgba(105,112,125,0.08)", border: "rgba(105,112,125,0.25)" },
  };
  const t = tones[tone];
  return (
    <span
      style={{ color: t.color, background: t.bg, border: `1px solid ${t.border}`, ...mono, fontSize: 11, letterSpacing: "0.04em" }}
      className="px-2 py-0.5 rounded uppercase"
    >
      {children}
    </span>
  );
}

function Panel({ children, style, className = "" }) {
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{ background: C.panel, border: `1px solid ${C.border}`, boxShadow: "0 1px 2px rgba(22,27,34,0.04)", ...style }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <div style={{ ...mono, color: C.muted, fontSize: 11, letterSpacing: "0.08em" }} className="uppercase mb-1.5">
        {label}
      </div>
      {children}
    </label>
  );
}

const inputStyle = {
  background: C.panelAlt,
  border: `1px solid ${C.border}`,
  color: C.text,
  fontSize: 14,
};

// ---------- Login ----------
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden" style={{ background: C.base }}>
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
          backgroundSize: "34px 34px",
        }}
      />
      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: "rgba(180,83,9,0.1)", border: `1px solid ${C.amber}` }}>
            <Lock size={16} color={C.amber} />
          </div>
          <div style={{ ...mono, color: C.text, letterSpacing: "0.1em" }} className="text-sm uppercase">BOS Internal</div>
        </div>

        <Panel className="p-7">
          <Eyebrow>Console Access</Eyebrow>
          <h1 style={{ color: C.text }} className="text-xl font-semibold mb-1">Sign in</h1>
          <p style={{ color: C.muted }} className="text-sm mb-6">Use your BOS credentials to continue.</p>

          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@bos.internal"
              className="w-full rounded-md px-3 py-2 outline-none focus:ring-2" style={{ ...inputStyle }} />
          </Field>
          <Field label="Password">
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••"
              className="w-full rounded-md px-3 py-2 outline-none focus:ring-2" style={{ ...inputStyle }} />
          </Field>

          <div className="text-xs mb-5" style={{ color: C.muted }}>
            This demo doesn't check the password — pick a role below to preview the console. Real sign-in will run through Supabase Auth.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onLogin({ id: "u2", name: "Karan Mehta", email: email || "karan.mehta@bos.internal", role: "Operator" })}
              className="rounded-md py-2.5 text-sm font-medium transition-colors"
              style={{ background: C.panelAlt, border: `1px solid ${C.border}`, color: C.text }}
            >
              Login as Team
            </button>
            <button
              onClick={() => onLogin({ id: "u1", name: "Aditi Rao", email: email || "aditi.rao@bos.internal", role: "Admin" })}
              className="rounded-md py-2.5 text-sm font-medium transition-colors"
              style={{ background: C.amberBright, color: "#1A1400" }}
            >
              Login as Admin
            </button>
          </div>
        </Panel>
        <div style={{ color: C.muted, ...mono }} className="text-center text-[11px] mt-5 tracking-wide">
          v1.0 · lockit · otp gateway · reports
        </div>
      </div>
    </div>
  );
}

// ---------- LocKit module ----------
function LocKitModule({ user, configs, setConfigs }) {
  const canManage = user.role === "Admin";
  const [name, setName] = useState("");
  const [payload, setPayload] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const generate = () => {
    if (!name.trim() || !payload.trim()) return;
    const id = `lk_${Math.random().toString(36).slice(2, 8)}`;
    setConfigs([{ id, name, payload, createdBy: user.name, createdAt: new Date().toISOString().slice(0, 16).replace("T", " ") }, ...configs]);
    setName(""); setPayload("");
  };

  const qrUrl = (data) => `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&bgcolor=FFFFFF&color=161B22&data=${encodeURIComponent(data)}`;

  return (
    <div>
      <Eyebrow>Module 01</Eyebrow>
      <h1 style={{ color: C.text }} className="text-2xl font-semibold mb-1">LocKit application</h1>
      <p style={{ color: C.muted }} className="text-sm mb-6">
        {canManage ? "Generate and manage the QR codes LocKit devices scan to authorize an application." : "QR codes issued for LocKit devices. Ask an admin if you need a new one generated."}
      </p>

      <div className={canManage ? "grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5" : ""}>
        {canManage && (
          <Panel className="p-5 h-fit">
            <div style={{ color: C.text }} className="text-sm font-medium mb-4">New QR code</div>
            <Field label="Application name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warehouse Gate 4"
                className="w-full rounded-md px-3 py-2 outline-none" style={inputStyle} />
            </Field>
            <Field label="Payload / access URL">
              <textarea value={payload} onChange={(e) => setPayload(e.target.value)} placeholder="lockit://auth/xxxx or a target URL" rows={3}
                className="w-full rounded-md px-3 py-2 outline-none resize-none" style={inputStyle} />
            </Field>
            <button onClick={generate} className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: C.amberBright, color: "#1A1400" }}>
              <QrCode size={15} /> Generate QR
            </button>
          </Panel>
        )}

        <div>
          <div style={{ color: C.muted, ...mono }} className="text-xs uppercase mb-3 tracking-wide">{configs.length} active codes</div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {configs.map((c) => (
              <Panel key={c.id} className="p-4">
                <img src={qrUrl(c.payload)} alt={`QR for ${c.name}`} className="w-full rounded-md mb-3" style={{ background: C.panelAlt, border: `1px solid ${C.border}` }} />
                <div style={{ color: C.text }} className="text-sm font-medium truncate">{c.name}</div>
                <div style={{ color: C.muted, ...mono }} className="text-xs truncate mb-2">{c.payload}</div>
                <div className="flex items-center justify-between">
                  <span style={{ color: C.muted, ...mono }} className="text-[11px]">{c.createdAt}</span>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(c.payload); setCopiedId(c.id); setTimeout(() => setCopiedId(null), 1200); }}
                    style={{ color: C.blue }} className="text-xs flex items-center gap-1"
                  >
                    {copiedId === c.id ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === c.id ? "Copied" : "Copy payload"}
                  </button>
                </div>
              </Panel>
            ))}
            {configs.length === 0 && (
              <Panel className="p-8 col-span-full text-center">
                <div style={{ color: C.muted }} className="text-sm">{canManage ? "No QR codes yet. Create one on the left." : "No QR codes have been issued yet."}</div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- OTP module ----------
function OtpModule({ user, otpLog, addOtp }) {
  const [mobile, setMobile] = useState("");
  const [lastOtp, setLastOtp] = useState(null);
  const [sending, setSending] = useState(false);

  const send = () => {
    if (!/^\d{10}$/.test(mobile)) return;
    setSending(true);
    setTimeout(() => {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const entry = { id: `o_${Date.now()}`, mobile, code, user: user.name, time: new Date().toISOString().slice(0, 16).replace("T", " ") };
      addOtp(entry);
      setLastOtp(entry);
      setSending(false);
    }, 500);
  };

  return (
    <div>
      <Eyebrow>Module 02</Eyebrow>
      <h1 style={{ color: C.text }} className="text-2xl font-semibold mb-1">API — OTP gateway</h1>
      <p style={{ color: C.muted }} className="text-sm mb-6">Enter a mobile number to trigger the OTP API. The generated code is shown here directly for testing.</p>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        <Panel className="p-5 h-fit">
          <Field label="Mobile number">
            <input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit number" className="w-full rounded-md px-3 py-2 outline-none" style={inputStyle} />
          </Field>
          <button onClick={send} disabled={sending || mobile.length !== 10}
            className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: C.amberBright, color: "#1A1400" }}>
            {sending ? <RefreshCw size={15} className="animate-spin" /> : <Smartphone size={15} />}
            {sending ? "Requesting…" : "Request OTP"}
          </button>

          {lastOtp && (
            <div className="mt-5 rounded-md p-4" style={{ background: "rgba(26,127,55,0.06)", border: `1px solid rgba(26,127,55,0.3)` }}>
              <div style={{ color: C.muted, ...mono }} className="text-[11px] uppercase mb-1">OTP for {lastOtp.mobile}</div>
              <div style={{ color: C.green, ...mono }} className="text-3xl tracking-[0.3em]">{lastOtp.code}</div>
            </div>
          )}
        </Panel>

        <div>
          <div style={{ color: C.muted, ...mono }} className="text-xs uppercase mb-3 tracking-wide">Recent requests</div>
          <Panel className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Time", "Mobile", "OTP", "Requested by"].map((h) => (
                    <th key={h} style={{ color: C.muted, ...mono }} className="text-left px-4 py-2.5 text-[11px] uppercase font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {otpLog.map((o) => (
                  <tr key={o.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td className="px-4 py-2.5" style={{ color: C.muted, ...mono, fontSize: 12 }}>{o.time}</td>
                    <td className="px-4 py-2.5" style={{ color: C.text, ...mono }}>{o.mobile}</td>
                    <td className="px-4 py-2.5" style={{ color: C.amber, ...mono }}>{o.code}</td>
                    <td className="px-4 py-2.5" style={{ color: C.muted }}>{o.user}</td>
                  </tr>
                ))}
                {otpLog.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: C.muted }}>No requests yet.</td></tr>
                )}
              </tbody>
            </table>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ---------- Reports module (shared, filterable by "own" or "all") ----------
function AttachmentModal({ row, onClose }) {
  if (!row) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(22,27,34,0.45)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <Panel className="p-5 w-[440px]">
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: C.text }} className="text-sm font-medium">{row.attachment}</div>
            <button onClick={onClose} style={{ color: C.muted }}><X size={16} /></button>
          </div>
          <pre style={{ background: C.panelAlt, color: C.text, ...mono, fontSize: 12, border: `1px solid ${C.border}` }} className="rounded-md p-3 overflow-auto max-h-64">
{`{
  "service": "${row.service}",
  "ip": "${row.ip}",
  "status": ${row.status},
  "timestamp": "${row.timestamp}",
  "message": "${row.response}"
}`}
          </pre>
        </Panel>
      </div>
    </div>
  );
}

function ReportsTable({ rows, showUser }) {
  const [openRow, setOpenRow] = useState(null);
  return (
    <Panel className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {[...(showUser ? ["User"] : []), "Timestamp", "Service", "IP address", "Response", "Attachment"].map((h) => (
              <th key={h} style={{ color: C.muted, ...mono }} className="text-left px-4 py-2.5 text-[11px] uppercase font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              {showUser && <td className="px-4 py-2.5" style={{ color: C.text }}>{r.user}</td>}
              <td className="px-4 py-2.5" style={{ color: C.muted, ...mono, fontSize: 12 }}>{r.timestamp}</td>
              <td className="px-4 py-2.5" style={{ color: C.text }}>{r.service}</td>
              <td className="px-4 py-2.5" style={{ color: C.text, ...mono }}>{r.ip}</td>
              <td className="px-4 py-2.5">
                <div className="flex items-center">
                  <StatusDot ok={r.status === 200} />
                  <span style={{ color: r.status === 200 ? C.green : C.red, ...mono, fontSize: 12 }}>{r.status}</span>
                </div>
              </td>
              <td className="px-4 py-2.5">
                <button onClick={() => setOpenRow(r)} className="flex items-center gap-1 text-xs" style={{ color: C.blue }}>
                  <Eye size={13} /> View
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={showUser ? 6 : 5} className="px-4 py-8 text-center" style={{ color: C.muted }}>No matching records.</td></tr>
          )}
        </tbody>
      </table>
      <AttachmentModal row={openRow} onClose={() => setOpenRow(null)} />
    </Panel>
  );
}

function ReportsModule({ user, reports }) {
  const [service, setService] = useState("All services");
  const [date, setDate] = useState("");

  const own = reports.filter((r) => r.user === user.name);
  const filtered = own.filter((r) => (service === "All services" || r.service === service) && (!date || r.timestamp.startsWith(date)));

  return (
    <div>
      <Eyebrow>Module 03</Eyebrow>
      <h1 style={{ color: C.text }} className="text-2xl font-semibold mb-1">Reports</h1>
      <p style={{ color: C.muted }} className="text-sm mb-6">Your own API activity — service used, source IP, and the response received.</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={service} onChange={(e) => setService(e.target.value)} className="rounded-md px-3 py-2 text-sm outline-none" style={inputStyle}>
          <option>All services</option>
          {SERVICES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md px-3 py-2 text-sm outline-none" style={inputStyle} />
        {(service !== "All services" || date) && (
          <button onClick={() => { setService("All services"); setDate(""); }} style={{ color: C.muted }} className="text-xs flex items-center gap-1 px-2">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      <ReportsTable rows={filtered} showUser={false} />
    </div>
  );
}

// ---------- Admin: Users ----------
function AdminUsers({ users, setUsers }) {
  const [q, setQ] = useState("");
  const filtered = users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()));

  const toggleStatus = (id) => {
    setUsers(users.map((u) => u.id === id ? { ...u, status: u.status === "Active" ? "Suspended" : "Active" } : u));
  };

  return (
    <div>
      <Eyebrow>Admin</Eyebrow>
      <h1 style={{ color: C.text }} className="text-2xl font-semibold mb-1">Users</h1>
      <p style={{ color: C.muted }} className="text-sm mb-6">Everyone who has been added to the BOS console.</p>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} style={{ color: C.muted }} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email"
            className="w-full rounded-md pl-8 pr-3 py-2 text-sm outline-none" style={inputStyle} />
        </div>
      </div>

      <Panel className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Name", "Email", "Role", "Status", "Added on", ""].map((h) => (
                <th key={h} style={{ color: C.muted, ...mono }} className="text-left px-4 py-2.5 text-[11px] uppercase font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td className="px-4 py-2.5" style={{ color: C.text }}>{u.name}</td>
                <td className="px-4 py-2.5" style={{ color: C.muted, ...mono, fontSize: 12 }}>{u.email}</td>
                <td className="px-4 py-2.5"><Badge tone="blue">{u.role}</Badge></td>
                <td className="px-4 py-2.5"><Badge tone={u.status === "Active" ? "green" : "red"}>{u.status}</Badge></td>
                <td className="px-4 py-2.5" style={{ color: C.muted, ...mono, fontSize: 12 }}>{u.addedOn}</td>
                <td className="px-4 py-2.5">
                  <button onClick={() => toggleStatus(u.id)} className="text-xs" style={{ color: C.blue }}>
                    {u.status === "Active" ? "Suspend" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

// ---------- Admin: All reports ----------
function AdminReports({ reports, users }) {
  const [service, setService] = useState("All services");
  const [person, setPerson] = useState("All users");
  const [date, setDate] = useState("");

  const filtered = reports.filter((r) =>
    (service === "All services" || r.service === service) &&
    (person === "All users" || r.user === person) &&
    (!date || r.timestamp.startsWith(date))
  );

  return (
    <div>
      <Eyebrow>Admin</Eyebrow>
      <h1 style={{ color: C.text }} className="text-2xl font-semibold mb-1">All reports</h1>
      <p style={{ color: C.muted }} className="text-sm mb-6">Activity across the whole team — filter by user, date, or service.</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={person} onChange={(e) => setPerson(e.target.value)} className="rounded-md px-3 py-2 text-sm outline-none" style={inputStyle}>
          <option>All users</option>
          {users.map((u) => <option key={u.id}>{u.name}</option>)}
        </select>
        <select value={service} onChange={(e) => setService(e.target.value)} className="rounded-md px-3 py-2 text-sm outline-none" style={inputStyle}>
          <option>All services</option>
          {SERVICES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md px-3 py-2 text-sm outline-none" style={inputStyle} />
        {(service !== "All services" || person !== "All users" || date) && (
          <button onClick={() => { setService("All services"); setPerson("All users"); setDate(""); }} style={{ color: C.muted }} className="text-xs flex items-center gap-1 px-2">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      <ReportsTable rows={filtered} showUser />
    </div>
  );
}

// ---------- Admin: Services ----------
// A flat directory of business services (OTP Gateway, KYC, etc). This is
// deliberately decoupled from role permissions — role access to the
// directory as a whole is controlled by the "Services" module in RBAC, so
// this page stays usable whether there are 5 services or 50.
function AdminServices({ services, setServices }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [q, setQ] = useState("");

  const add = () => {
    if (!name.trim()) return;
    setServices([{ id: `s_${Date.now()}`, name, desc, status: "Active" }, ...services]);
    setName(""); setDesc("");
  };

  const filtered = services.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <Eyebrow>Admin</Eyebrow>
      <h1 style={{ color: C.text }} className="text-2xl font-semibold mb-1">Services</h1>
      <p style={{ color: C.muted }} className="text-sm mb-6">Register a new service so it can be selected across LocKit, OTP, and Reports.</p>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        <Panel className="p-5 h-fit">
          <Field label="Service name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Address Verification"
              className="w-full rounded-md px-3 py-2 outline-none" style={inputStyle} />
          </Field>
          <Field label="Description">
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              className="w-full rounded-md px-3 py-2 outline-none resize-none" style={inputStyle} />
          </Field>
          <button onClick={add} className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-2"
            style={{ background: C.amberBright, color: "#1A1400" }}>
            <PlusCircle size={15} /> Add service
          </button>
        </Panel>

        <div>
          <div className="relative max-w-sm mb-3">
            <Search size={14} style={{ color: C.muted }} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services"
              className="w-full rounded-md pl-8 pr-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
          <Panel className="overflow-hidden h-fit">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Service", "Description", "Status"].map((h) => (
                    <th key={h} style={{ color: C.muted, ...mono }} className="text-left px-4 py-2.5 text-[11px] uppercase font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td className="px-4 py-2.5" style={{ color: C.text }}>{s.name}</td>
                    <td className="px-4 py-2.5" style={{ color: C.muted }}>{s.desc || "—"}</td>
                    <td className="px-4 py-2.5"><Badge tone="green">{s.status}</Badge></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center" style={{ color: C.muted }}>No matching services.</td></tr>
                )}
              </tbody>
            </table>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ---------- Admin: RBAC ----------
// Role-first view: each role is a card showing which modules it can reach.
// Editing a role only ever means checking/unchecking the 5 fixed modules —
// there's no per-service matrix here, since that doesn't scale once the
// Services directory grows past a handful of entries.
function CheckboxTile({ label, checked, onChange }) {
  return (
    <label
      className="flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer select-none"
      style={{ background: checked ? "rgba(180,83,9,0.08)" : C.panelAlt, border: `1px solid ${checked ? C.amber : C.border}` }}
    >
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: C.amberBright }} />
      <span style={{ color: checked ? C.amber : C.text }} className="text-sm">{label}</span>
    </label>
  );
}

function RoleCard({ role, perms, userCount, onEdit, onDelete }) {
  const activeModules = MODULES.filter((m) => perms[m]);
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div style={{ color: C.text }} className="text-sm font-semibold">{role}</div>
          <div style={{ color: C.muted, ...mono }} className="text-[11px] mt-0.5">
            {userCount} user{userCount === 1 ? "" : "s"}
          </div>
        </div>
        <ShieldCheck size={16} color={C.muted} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4 min-h-[22px]">
        {activeModules.length > 0
          ? activeModules.map((m) => <Badge key={m} tone="amber">{m}</Badge>)
          : <span style={{ color: C.muted }} className="text-xs">No module access</span>}
      </div>

      <div className="flex items-center gap-4" style={{ borderTop: `1px solid ${C.border}` }}>
        <button onClick={onEdit} className="text-xs pt-3" style={{ color: C.blue }}>Edit</button>
        {role !== "Admin" && <button onClick={onDelete} className="text-xs pt-3" style={{ color: C.red }}>Delete</button>}
      </div>
    </Panel>
  );
}

function AdminRBAC({ users, setUsers, rolePerms, setRolePerms }) {
  const roles = Object.keys(rolePerms);
  const [editing, setEditing] = useState(null); // null | "__new__" | roleName
  const [draftName, setDraftName] = useState("");
  const [draftPerms, setDraftPerms] = useState({});
  const [error, setError] = useState("");

  const emptyPerms = () => Object.fromEntries(MODULES.map((m) => [m, false]));

  const startCreate = () => {
    setEditing("__new__"); setDraftName(""); setDraftPerms(emptyPerms()); setError("");
  };
  const startEdit = (role) => {
    setEditing(role); setDraftName(role);
    setDraftPerms({ ...emptyPerms(), ...rolePerms[role] });
    setError("");
  };
  const cancelEdit = () => { setEditing(null); setError(""); };

  const saveRole = () => {
    if (editing === "__new__") {
      const name = draftName.trim();
      if (!name) { setError("Give the role a name."); return; }
      if (rolePerms[name]) { setError("A role with that name already exists."); return; }
      setRolePerms({ ...rolePerms, [name]: draftPerms });
    } else {
      setRolePerms({ ...rolePerms, [editing]: draftPerms });
    }
    setEditing(null); setError("");
  };

  const deleteRole = (role) => {
    if (role === "Admin") return;
    const count = users.filter((u) => u.role === role).length;
    if (count > 0) { setError(`Reassign the ${count} user(s) on "${role}" before deleting it.`); return; }
    const nextPerms = { ...rolePerms }; delete nextPerms[role]; setRolePerms(nextPerms);
    setError("");
  };

  const changeRole = (id, role) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  return (
    <div>
      <Eyebrow>Admin</Eyebrow>
      <h1 style={{ color: C.text }} className="text-2xl font-semibold mb-1">Roles & permissions</h1>
      <p style={{ color: C.muted }} className="text-sm mb-6">Select which modules a role can reach, then assign roles to individual users.</p>

      {editing === null ? (
        <button onClick={startCreate} className="rounded-md py-2 px-4 text-sm font-medium flex items-center gap-2 mb-6"
          style={{ background: C.amberBright, color: "#1A1400" }}>
          <PlusCircle size={15} /> Create role
        </button>
      ) : (
        <Panel className="p-5 mb-6">
          <div style={{ color: C.text }} className="text-sm font-medium mb-4">
            {editing === "__new__" ? "New role" : `Edit role — ${editing}`}
          </div>

          <Field label="Role name">
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="e.g. Auditor"
              disabled={editing !== "__new__"}
              className="w-full rounded-md px-3 py-2 outline-none disabled:opacity-50" style={inputStyle} />
          </Field>

          <div style={{ color: C.muted, ...mono }} className="text-xs uppercase mb-2 tracking-wide">Modules</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
            {MODULES.map((m) => (
              <CheckboxTile key={m} label={m} checked={!!draftPerms[m]} onChange={() => setDraftPerms({ ...draftPerms, [m]: !draftPerms[m] })} />
            ))}
          </div>

          {error && <div style={{ color: C.red }} className="text-xs mb-3">{error}</div>}

          <div className="flex gap-3">
            <button onClick={saveRole} className="rounded-md py-2 px-4 text-sm font-medium flex items-center gap-2"
              style={{ background: C.amberBright, color: "#1A1400" }}>
              <Check size={15} /> Save role
            </button>
            <button onClick={cancelEdit} className="rounded-md py-2 px-4 text-sm font-medium" style={{ background: C.panelAlt, border: `1px solid ${C.border}`, color: C.muted }}>
              Cancel
            </button>
          </div>
        </Panel>
      )}

      {editing === null && error && <div style={{ color: C.red }} className="text-xs mb-4">{error}</div>}

      <div style={{ color: C.muted, ...mono }} className="text-xs uppercase mb-3 tracking-wide">Roles</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {roles.map((r) => (
          <RoleCard
            key={r}
            role={r}
            perms={rolePerms[r]}
            userCount={users.filter((u) => u.role === r).length}
            onEdit={() => startEdit(r)}
            onDelete={() => deleteRole(r)}
          />
        ))}
      </div>

      <div style={{ color: C.muted, ...mono }} className="text-xs uppercase mb-3 tracking-wide">Assign roles to users</div>
      <Panel className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Name", "Email", "Current role", "Change to"].map((h) => (
                <th key={h} style={{ color: C.muted, ...mono }} className="text-left px-4 py-2.5 text-[11px] uppercase font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td className="px-4 py-2.5" style={{ color: C.text }}>{u.name}</td>
                <td className="px-4 py-2.5" style={{ color: C.muted, ...mono, fontSize: 12 }}>{u.email}</td>
                <td className="px-4 py-2.5"><Badge tone="blue">{u.role}</Badge></td>
                <td className="px-4 py-2.5">
                  <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                    className="rounded-md px-2 py-1.5 text-xs outline-none" style={inputStyle}>
                    {roles.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

// ---------- Shell ----------
const NAV = [
  { key: "lockit", label: "LocKit application", icon: QrCode, section: "modules" },
  { key: "otp", label: "API — OTP", icon: Smartphone, section: "modules" },
  { key: "reports", label: "Reports", icon: FileBarChart2, section: "modules" },
  { key: "admin-users", label: "Users", icon: Users, section: "admin" },
  { key: "admin-reports", label: "All reports", icon: LayoutGrid, section: "admin" },
  { key: "admin-services", label: "Services", icon: Settings2, section: "admin" },
  { key: "admin-rbac", label: "Roles & RBAC", icon: ShieldCheck, section: "admin" },
];

export default function BosPortal() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("lockit");

  const [configs, setConfigs] = useState([
    { id: "lk_a1b2c3", name: "Warehouse Gate 4", payload: "lockit://auth/wg4-9d21", createdBy: "Aditi Rao", createdAt: "2026-08-02 10:14" },
    { id: "lk_d4e5f6", name: "Server Room Access", payload: "lockit://auth/srv-7k02", createdBy: "Karan Mehta", createdAt: "2026-08-05 15:40" },
  ]);
  const [otpLog, setOtpLog] = useState([
    { id: "o_1", mobile: "9876543210", code: "483920", user: "Karan Mehta", time: "2026-08-11 09:22" },
  ]);
  const [users, setUsers] = useState(SEED_USERS);
  const [rolePerms, setRolePerms] = useState(DEFAULT_ROLE_PERMS);
  const [services, setServices] = useState(SERVICE_SEED);
  const reports = useMemo(() => (user ? seedReports(user.name) : []), [user]);
  const [allReports, setAllReports] = useState([]);

  React.useEffect(() => { if (user) setAllReports(seedReports(user.name)); }, [user]);

  if (!user) return <Login onLogin={(u) => { setUser(u); setView("lockit"); }} />;

  const isAdmin = user.role === "Admin";
  const modulesNav = NAV.filter((n) => n.section === "modules");
  const adminNav = NAV.filter((n) => n.section === "admin");

  const addOtp = (entry) => {
    setOtpLog([entry, ...otpLog]);
    setAllReports([{ id: `r_${Date.now()}`, user: user.name, service: "OTP Gateway", ip: "10.12.4.21", timestamp: entry.time, status: 200, response: "OK — OTP generated", attachment: `otp_${entry.id}.json` }, ...allReports]);
  };

  return (
    <div className="min-h-screen w-full flex" style={{ background: C.base }}>
      {/* Sidebar */}
      <div className="w-60 flex-shrink-0 flex flex-col" style={{ background: C.panel, borderRight: `1px solid ${C.border}` }}>
        <div className="px-5 py-5 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "rgba(180,83,9,0.1)", border: `1px solid ${C.amber}` }}>
            <Lock size={13} color={C.amber} />
          </div>
          <div style={{ ...mono, color: C.text, letterSpacing: "0.08em" }} className="text-xs uppercase">BOS Internal</div>
        </div>

        <div className="flex-1 py-4 px-3 overflow-y-auto">
          <div style={{ color: C.muted, ...mono }} className="text-[10px] uppercase px-2 mb-2 tracking-wider">Modules</div>
          {modulesNav.map((n) => {
            const Icon = n.icon;
            const active = view === n.key;
            return (
              <button key={n.key} onClick={() => setView(n.key)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-0.5 text-sm transition-colors"
                style={{ background: active ? "rgba(180,83,9,0.08)" : "transparent", color: active ? C.amber : C.muted }}>
                <Icon size={15} />
                {n.label}
              </button>
            );
          })}

          {isAdmin && (
            <>
              <div style={{ color: C.muted, ...mono }} className="text-[10px] uppercase px-2 mb-2 mt-6 tracking-wider">Admin</div>
              {adminNav.map((n) => {
                const Icon = n.icon;
                const active = view === n.key;
                return (
                  <button key={n.key} onClick={() => setView(n.key)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-0.5 text-sm transition-colors"
                    style={{ background: active ? "rgba(180,83,9,0.08)" : "transparent", color: active ? C.amber : C.muted }}>
                    <Icon size={15} />
                    {n.label}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="px-3 py-4" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 px-2 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: C.panelAlt, color: C.text }}>
              {user.name.split(" ").map((w) => w[0]).join("")}
            </div>
            <div className="min-w-0">
              <div style={{ color: C.text }} className="text-xs font-medium truncate">{user.name}</div>
              <div style={{ color: C.muted }} className="text-[11px] truncate">{user.role}</div>
            </div>
          </div>
          <button onClick={() => setUser(null)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs" style={{ color: C.muted }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {view === "lockit" && <LocKitModule user={user} configs={configs} setConfigs={setConfigs} />}
          {view === "otp" && <OtpModule user={user} otpLog={otpLog} addOtp={addOtp} />}
          {view === "reports" && <ReportsModule user={user} reports={reports} />}
          {view === "admin-users" && isAdmin && <AdminUsers users={users} setUsers={setUsers} />}
          {view === "admin-reports" && isAdmin && <AdminReports reports={allReports} users={users} />}
          {view === "admin-services" && isAdmin && <AdminServices services={services} setServices={setServices} />}
          {view === "admin-rbac" && isAdmin && <AdminRBAC users={users} setUsers={setUsers} rolePerms={rolePerms} setRolePerms={setRolePerms} />}
        </div>
      </div>
    </div>
  );
}
