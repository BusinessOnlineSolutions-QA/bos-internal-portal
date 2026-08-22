import React, { useState, useEffect, useCallback } from "react";
import {
  QrCode, Smartphone, FileBarChart2, Users, ShieldCheck,
  PlusCircle, LayoutGrid, LogOut, Search, Eye, X,
  Lock, RefreshCw, Copy, Check, Settings2, AlertTriangle, Landmark
} from "lucide-react";
import { supabase } from "./supabaseClient";
import {
  signIn, signOut,
  fetchRoles, createRole, deleteRole, fetchPermissions, setPermission,
  fetchProfile, fetchAllProfiles, updateProfileStatus, updateProfileRole,
  fetchServices, addService,
  fetchLockitConfigs, addLockitConfig,
  fetchAopayConfigs, addAopayConfig,
  fetchOtpRequests, addOtpRequest,
  fetchServiceLogs, addServiceLog,
} from "./db";

// ---------- design tokens (light theme) ----------
const C = {
  base: "#F5F6F8",
  panel: "#FFFFFF",
  panelAlt: "#F1F3F6",
  border: "#E3E6EB",
  text: "#161B22",
  muted: "#69707D",
  amber: "#B45309",
  amberBright: "#F59E0B",
  green: "#1A7F37",
  red: "#CF222E",
  blue: "#0969DA",
};

const mono = { fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" };

// A role's access is expressed purely as module access — no per-service
// checkbox, since that stops scaling once the Services directory grows.
const MODULES = ["LocKit", "Aopay", "OTP", "Reports", "Users", "Services"];

// ---------- small primitives ----------
function Eyebrow({ children }) {
  return (
    <div style={{ ...mono, color: C.amber, letterSpacing: "0.14em", fontSize: 11 }} className="uppercase mb-2">
      {children}
    </div>
  );
}

function StatusDot({ ok }) {
  return <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: ok ? C.green : C.red }} />;
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
    <span style={{ color: t.color, background: t.bg, border: `1px solid ${t.border}`, ...mono, fontSize: 11, letterSpacing: "0.04em" }}
      className="px-2 py-0.5 rounded uppercase">
      {children}
    </span>
  );
}

function Panel({ children, style, className = "" }) {
  return (
    <div className={`rounded-lg ${className}`}
      style={{ background: C.panel, border: `1px solid ${C.border}`, boxShadow: "0 1px 2px rgba(22,27,34,0.04)", ...style }}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <div style={{ ...mono, color: C.muted, fontSize: 11, letterSpacing: "0.08em" }} className="uppercase mb-1.5">{label}</div>
      {children}
    </label>
  );
}

const inputStyle = { background: C.panelAlt, border: `1px solid ${C.border}`, color: C.text, fontSize: 14 };

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-md px-3 py-2 mb-4 text-sm"
      style={{ background: "rgba(207,34,46,0.08)", border: `1px solid rgba(207,34,46,0.3)`, color: C.red }}>
      <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
      <div className="flex-1">{message}</div>
      {onDismiss && <button onClick={onDismiss} className="flex-shrink-0"><X size={14} /></button>}
    </div>
  );
}

// ---------- Login (real Supabase auth) ----------
function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await signIn(email, pw);
      // onAuthStateChange in the parent component picks up the new session.
    } catch (e2) {
      setErr(e2.message || "Sign-in failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden" style={{ background: C.base }}>
      <div className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
          backgroundSize: "34px 34px",
        }} />
      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src="/Company_logo.png" alt="BOS logo" className="w-9 h-9 rounded-md object-contain" style={{ background: C.panel, border: `1px solid ${C.border}` }} />
          <div style={{ ...mono, color: C.text, letterSpacing: "0.1em" }} className="text-sm uppercase">BOS Internal</div>
        </div>

        <Panel className="p-7">
          <Eyebrow>Console Access</Eyebrow>
          <h1 style={{ color: C.text }} className="text-xl font-semibold mb-1">Sign in</h1>
          <p style={{ color: C.muted }} className="text-sm mb-6">Use your BOS credentials to continue.</p>

          <form onSubmit={submit}>
            <Field label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@bos.internal"
                className="w-full rounded-md px-3 py-2 outline-none focus:ring-2" style={{ ...inputStyle }} />
            </Field>
            <Field label="Password">
              <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••"
                className="w-full rounded-md px-3 py-2 outline-none focus:ring-2" style={{ ...inputStyle }} />
            </Field>

            {err && <div style={{ color: C.red }} className="text-xs mb-4">{err}</div>}

            <button type="submit" disabled={loading}
              className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: C.amberBright, color: "#1A1400" }}>
              {loading ? <RefreshCw size={15} className="animate-spin" /> : <Lock size={15} />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="text-xs mt-5" style={{ color: C.muted }}>
            Accounts are created by an admin, or self sign-up if enabled in Supabase Auth. New accounts default to the Viewer role.
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ---------- LocKit module ----------
function LocKitModule({ canManage, currentUserId, configs, setConfigs }) {
  const [name, setName] = useState("");
  const [payload, setPayload] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const generate = async () => {
    if (!name.trim() || !payload.trim()) return;
    setSaving(true); setErr("");
    try {
      const created = await addLockitConfig(name.trim(), payload.trim(), currentUserId);
      setConfigs([created, ...configs]);
      setName(""); setPayload("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const qrUrl = (data) => `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&bgcolor=FFFFFF&color=161B22&data=${encodeURIComponent(data)}`;
  const fmt = (ts) => (ts ? new Date(ts).toISOString().slice(0, 16).replace("T", " ") : "");

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
            {err && <div style={{ color: C.red }} className="text-xs mb-3">{err}</div>}
            <button onClick={generate} disabled={saving} className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: C.amberBright, color: "#1A1400" }}>
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <QrCode size={15} />}
              {saving ? "Generating…" : "Generate QR"}
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
                  <span style={{ color: C.muted, ...mono }} className="text-[11px]">{fmt(c.created_at)}</span>
                  <button onClick={() => { navigator.clipboard?.writeText(c.payload); setCopiedId(c.id); setTimeout(() => setCopiedId(null), 1200); }}
                    style={{ color: C.blue }} className="text-xs flex items-center gap-1">
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

// ---------- Aopay Finance module ----------
function AopayModule({ canManage, currentUserId, aopayConfigs, setAopayConfigs}) {
  const [name, setName] = useState("");
  const [payload, setPayload] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const generate = async () => {
    if (!name.trim() || !payload.trim()) return;
    setSaving(true); setErr("");
    try {
      const created = await addAopayConfig(name.trim(), payload.trim(), currentUserId);
      setAopayConfigs([created, ...aopayConfigs]);
      setName(""); setPayload("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const qrUrl = (data) => `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&bgcolor=FFFFFF&color=161B22&data=${encodeURIComponent(data)}`;
  const fmt = (ts) => (ts ? new Date(ts).toISOString().slice(0, 16).replace("T", " ") : "");

  return (
    <div>
      <Eyebrow>Module 02</Eyebrow>
      <h1 style={{ color: C.text }} className="text-2xl font-semibold mb-1">Aopay Finance Application</h1>
      <p style={{ color: C.muted }} className="text-sm mb-6">
        {canManage ? "Generate and manage the QR codes LocKit devices scan to authorize an application." : "QR codes issued for Aopay Finance devices. Ask an admin if you need a new one generated."}
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
              <textarea value={payload} onChange={(e) => setPayload(e.target.value)} placeholder="Aopay://auth/xxxx or a target URL" rows={3}
                className="w-full rounded-md px-3 py-2 outline-none resize-none" style={inputStyle} />
            </Field>
            {err && <div style={{ color: C.red }} className="text-xs mb-3">{err}</div>}
            <button onClick={generate} disabled={saving} className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: C.amberBright, color: "#1A1400" }}>
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <QrCode size={15} />}
              {saving ? "Generating…" : "Generate QR"}
            </button>
          </Panel>
        )}

        <div>
          <div style={{ color: C.muted, ...mono }} className="text-xs uppercase mb-3 tracking-wide">{aopayConfigs.length} active codes</div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {aopayConfigs.map((c) => (
              <Panel key={c.id} className="p-4">
                <img src={qrUrl(c.payload)} alt={`QR for ${c.name}`} className="w-full rounded-md mb-3" style={{ background: C.panelAlt, border: `1px solid ${C.border}` }} />
                <div style={{ color: C.text }} className="text-sm font-medium truncate">{c.name}</div>
                <div style={{ color: C.muted, ...mono }} className="text-xs truncate mb-2">{c.payload}</div>
                <div className="flex items-center justify-between">
                  <span style={{ color: C.muted, ...mono }} className="text-[11px]">{fmt(c.created_at)}</span>
                  <button onClick={() => { navigator.clipboard?.writeText(c.payload); setCopiedId(c.id); setTimeout(() => setCopiedId(null), 1200); }}
                    style={{ color: C.blue }} className="text-xs flex items-center gap-1">
                    {copiedId === c.id ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === c.id ? "Copied" : "Copy payload"}
                  </button>
                </div>
              </Panel>
            ))}
            {aopayConfigs.length === 0 && (
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
function OtpModule({ profile, otpLog, setOtpLog, services, reports, setReports }) {
  const [mobile, setMobile] = useState("");
  const [lastOtp, setLastOtp] = useState(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!/^\d{10}$/.test(mobile)) return;
    setSending(true); setErr("");
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      const created = await addOtpRequest(mobile, data.otp, profile.id);
      setOtpLog([created, ...otpLog].slice(0, 10));
      setLastOtp(created);

      // Log this against the OTP Gateway service so it shows up in Reports.
      const otpService = services.find((s) => s.name === "OTP Gateway");
      if (otpService) {
        const log = await addServiceLog({
          userId: profile.id,
          serviceId: otpService.id,
          ip: "0.0.0.0",
          statusCode: 200,
          responseSummary: "OK — OTP generated",
          responseBody: { mobile, otp_requested_at: created.requested_at },
        });
        setReports([log, ...reports]);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  };

  const fmt = (ts) => (ts ? new Date(ts).toISOString().slice(0, 16).replace("T", " ") : "");

  return (
    <div>
      <Eyebrow>Module 03</Eyebrow>
      <h1 style={{ color: C.text }} className="text-2xl font-semibold mb-1">API — OTP gateway</h1>
      <p style={{ color: C.muted }} className="text-sm mb-6">Enter a mobile number to trigger the OTP API. The generated code is shown here directly for testing.</p>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        <Panel className="p-5 h-fit">
          <Field label="Mobile number">
            <input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit number" className="w-full rounded-md px-3 py-2 outline-none" style={inputStyle} />
          </Field>
          {err && <div style={{ color: C.red }} className="text-xs mb-3">{err}</div>}
          <button onClick={send} disabled={sending || mobile.length !== 10}
            className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: C.amberBright, color: "#1A1400" }}>
            {sending ? <RefreshCw size={15} className="animate-spin" /> : <Smartphone size={15} />}
            {sending ? "Requesting…" : "Request OTP"}
          </button>

          {lastOtp && (
            <div className="mt-5 rounded-md p-4" style={{ background: "rgba(26,127,55,0.06)", border: `1px solid rgba(26,127,55,0.3)` }}>
              <div style={{ color: C.muted, ...mono }} className="text-[11px] uppercase mb-1">OTP for {lastOtp.mobile}</div>
              <div style={{ color: C.green, ...mono }} className="text-3xl tracking-[0.3em]">{lastOtp.otp_code}</div>
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
                    <td className="px-4 py-2.5" style={{ color: C.muted, ...mono, fontSize: 12 }}>{fmt(o.requested_at)}</td>
                    <td className="px-4 py-2.5" style={{ color: C.text, ...mono }}>{o.mobile}</td>
                    <td className="px-4 py-2.5" style={{ color: C.amber, ...mono }}>{o.otp_code}</td>
                    <td className="px-4 py-2.5" style={{ color: C.muted }}>{o.profiles?.name || "—"}</td>
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

// ---------- Reports (shared table) ----------
function AttachmentModal({ row, onClose }) {
  if (!row) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(22,27,34,0.45)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <Panel className="p-5 w-[440px]">
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: C.text }} className="text-sm font-medium">log_{String(row.id).slice(0, 8)}.json</div>
            <button onClick={onClose} style={{ color: C.muted }}><X size={16} /></button>
          </div>
          <pre style={{ background: C.panelAlt, color: C.text, ...mono, fontSize: 12, border: `1px solid ${C.border}` }} className="rounded-md p-3 overflow-auto max-h-64">
{JSON.stringify({
  service: row.services?.name,
  ip: row.ip_address,
  status: row.status_code,
  timestamp: row.created_at,
  message: row.response_summary,
  ...(row.response_body || {}),
}, null, 2)}
          </pre>
        </Panel>
      </div>
    </div>
  );
}

function ReportsTable({ rows, showUser }) {
  const [openRow, setOpenRow] = useState(null);
  const fmt = (ts) => (ts ? new Date(ts).toISOString().slice(0, 16).replace("T", " ") : "");
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
              {showUser && <td className="px-4 py-2.5" style={{ color: C.text }}>{r.profiles?.name || "—"}</td>}
              <td className="px-4 py-2.5" style={{ color: C.muted, ...mono, fontSize: 12 }}>{fmt(r.created_at)}</td>
              <td className="px-4 py-2.5" style={{ color: C.text }}>{r.services?.name || "—"}</td>
              <td className="px-4 py-2.5" style={{ color: C.text, ...mono }}>{r.ip_address}</td>
              <td className="px-4 py-2.5">
                <div className="flex items-center">
                  <StatusDot ok={r.status_code === 200} />
                  <span style={{ color: r.status_code === 200 ? C.green : C.red, ...mono, fontSize: 12 }}>{r.status_code}</span>
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

function ReportsModule({ reports, services }) {
  const [service, setService] = useState("All services");
  const [date, setDate] = useState("");

  const filtered = reports.filter((r) =>
    (service === "All services" || r.services?.name === service) &&
    (!date || (r.created_at || "").startsWith(date))
  );

  return (
    <div>
      <Eyebrow>Module 03</Eyebrow>
      <h1 style={{ color: C.text }} className="text-2xl font-semibold mb-1">Reports</h1>
      <p style={{ color: C.muted }} className="text-sm mb-6">Your own API activity — service used, source IP, and the response received.</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={service} onChange={(e) => setService(e.target.value)} className="rounded-md px-3 py-2 text-sm outline-none" style={inputStyle}>
          <option>All services</option>
          {services.map((s) => <option key={s.id}>{s.name}</option>)}
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
  const [err, setErr] = useState("");
  const filtered = users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()));

  const toggleStatus = async (u) => {
    const next = u.status === "Active" ? "Suspended" : "Active";
    try {
      await updateProfileStatus(u.id, next);
      setUsers(users.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
    } catch (e) { setErr(e.message); }
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

      <ErrorBanner message={err} onDismiss={() => setErr("")} />

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
                <td className="px-4 py-2.5"><Badge tone="blue">{u.roles?.name || "—"}</Badge></td>
                <td className="px-4 py-2.5"><Badge tone={u.status === "Active" ? "green" : "red"}>{u.status}</Badge></td>
                <td className="px-4 py-2.5" style={{ color: C.muted, ...mono, fontSize: 12 }}>{(u.added_on || "").slice(0, 10)}</td>
                <td className="px-4 py-2.5">
                  <button onClick={() => toggleStatus(u)} className="text-xs" style={{ color: C.blue }}>
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
function AdminReports({ reports, users, services }) {
  const [service, setService] = useState("All services");
  const [person, setPerson] = useState("All users");
  const [date, setDate] = useState("");

  const filtered = reports.filter((r) =>
    (service === "All services" || r.services?.name === service) &&
    (person === "All users" || r.profiles?.name === person) &&
    (!date || (r.created_at || "").startsWith(date))
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
          {services.map((s) => <option key={s.id}>{s.name}</option>)}
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
function AdminServices({ services, setServices, currentUserId }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true); setErr("");
    try {
      const created = await addService(name.trim(), desc.trim(), currentUserId);
      setServices([created, ...services]);
      setName(""); setDesc("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
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
          {err && <div style={{ color: C.red }} className="text-xs mb-3">{err}</div>}
          <button onClick={add} disabled={saving} className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: C.amberBright, color: "#1A1400" }}>
            {saving ? <RefreshCw size={15} className="animate-spin" /> : <PlusCircle size={15} />}
            {saving ? "Adding…" : "Add service"}
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
                    <td className="px-4 py-2.5" style={{ color: C.muted }}>{s.description || "—"}</td>
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
function CheckboxTile({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer select-none"
      style={{ background: checked ? "rgba(180,83,9,0.08)" : C.panelAlt, border: `1px solid ${checked ? C.amber : C.border}` }}>
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
          <div style={{ color: C.muted, ...mono }} className="text-[11px] mt-0.5">{userCount} user{userCount === 1 ? "" : "s"}</div>
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

function AdminRBAC({ users, setUsers, roles, setRoles, rolePerms, setRolePerms }) {
  const roleNames = roles.map((r) => r.name);
  const [editing, setEditing] = useState(null); // null | "__new__" | roleName
  const [draftName, setDraftName] = useState("");
  const [draftPerms, setDraftPerms] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const emptyPerms = () => Object.fromEntries(MODULES.map((m) => [m, false]));

  const startCreate = () => { setEditing("__new__"); setDraftName(""); setDraftPerms(emptyPerms()); setError(""); };
  const startEdit = (role) => {
    setEditing(role); setDraftName(role);
    setDraftPerms({ ...emptyPerms(), ...rolePerms[role] });
    setError("");
  };
  const cancelEdit = () => { setEditing(null); setError(""); };

  const saveRole = async () => {
    setSaving(true); setError("");
    try {
      let roleRow;
      if (editing === "__new__") {
        const name = draftName.trim();
        if (!name) { setError("Give the role a name."); setSaving(false); return; }
        if (roleNames.includes(name)) { setError("A role with that name already exists."); setSaving(false); return; }
        roleRow = await createRole(name);
        setRoles([...roles, roleRow]);
      } else {
        roleRow = roles.find((r) => r.name === editing);
      }
      // Upsert every module for this role.
      await Promise.all(MODULES.map((m) => setPermission(roleRow.id, m, !!draftPerms[m])));
      setRolePerms({ ...rolePerms, [roleRow.name]: draftPerms });
      setEditing(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleName) => {
    if (roleName === "Admin") return;
    const count = users.filter((u) => u.roles?.name === roleName).length;
    if (count > 0) { setError(`Reassign the ${count} user(s) on "${roleName}" before deleting it.`); return; }
    setError("");
    try {
      const roleRow = roles.find((r) => r.name === roleName);
      await deleteRole(roleRow.id);
      setRoles(roles.filter((r) => r.id !== roleRow.id));
      const nextPerms = { ...rolePerms }; delete nextPerms[roleName]; setRolePerms(nextPerms);
    } catch (e) {
      setError(e.message);
    }
  };

  const changeUserRole = async (u, roleName) => {
    const roleRow = roles.find((r) => r.name === roleName);
    if (!roleRow) return;
    try {
      await updateProfileRole(u.id, roleRow.id);
      setUsers(users.map((x) => (x.id === u.id ? { ...x, role_id: roleRow.id, roles: { name: roleName } } : x)));
    } catch (e) {
      setError(e.message);
    }
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
              disabled={editing !== "__new__"} className="w-full rounded-md px-3 py-2 outline-none disabled:opacity-50" style={inputStyle} />
          </Field>

          <div style={{ color: C.muted, ...mono }} className="text-xs uppercase mb-2 tracking-wide">Modules</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
            {MODULES.map((m) => (
              <CheckboxTile key={m} label={m} checked={!!draftPerms[m]} onChange={() => setDraftPerms({ ...draftPerms, [m]: !draftPerms[m] })} />
            ))}
          </div>

          {error && <div style={{ color: C.red }} className="text-xs mb-3">{error}</div>}

          <div className="flex gap-3">
            <button onClick={saveRole} disabled={saving} className="rounded-md py-2 px-4 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              style={{ background: C.amberBright, color: "#1A1400" }}>
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
              {saving ? "Saving…" : "Save role"}
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
        {roleNames.map((r) => (
          <RoleCard key={r} role={r} perms={rolePerms[r] || {}} userCount={users.filter((u) => u.roles?.name === r).length}
            onEdit={() => startEdit(r)} onDelete={() => handleDeleteRole(r)} />
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
                <td className="px-4 py-2.5"><Badge tone="blue">{u.roles?.name || "—"}</Badge></td>
                <td className="px-4 py-2.5">
                  <select value={u.roles?.name || ""} onChange={(e) => changeUserRole(u, e.target.value)}
                    className="rounded-md px-2 py-1.5 text-xs outline-none" style={inputStyle}>
                    {roleNames.map((r) => <option key={r}>{r}</option>)}
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
  { key: "lockit", label: "LocKit application", icon: QrCode, module: "LocKit" },
  { key: "aopay", label: "Aopay Finance", icon: Landmark, module: "Aopay" },
  { key: "otp", label: "API — OTP", icon: Smartphone, module: "OTP" },
  { key: "reports", label: "Reports", icon: FileBarChart2, module: "Reports" },
  { key: "admin-users", label: "Users", icon: Users, module: "Users", section: "admin" },
  { key: "admin-reports", label: "All reports", icon: LayoutGrid, adminOnly: true, section: "admin" },
  { key: "admin-services", label: "Services", icon: Settings2, module: "Services", section: "admin" },
  { key: "admin-rbac", label: "Roles & RBAC", icon: ShieldCheck, adminOnly: true, section: "admin" },
];

export default function BosPortal() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [rolePerms, setRolePerms] = useState({});
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [aopayConfigs, setAopayConfigs] = useState([]); 
  const [otpLog, setOtpLog] = useState([]);
  const [reports, setReports] = useState([]);
  const [view, setView] = useState(null);
  const [err, setErr] = useState("");
  const [dataReady, setDataReady] = useState(false);

  // 1. Track the Supabase auth session.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (!sess) {
        setProfile(null); setUsers([]); setServices([]); setConfigs([]); setAopayConfigs([]);
        setOtpLog([]); setReports([]); setRolePerms({}); setRoles([]);
        setView(null); setDataReady(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // 2. Once signed in, load this user's profile (name, email, role).
  useEffect(() => {
    if (!session) return;
    fetchProfile(session.user.id).then(setProfile).catch((e) => setErr(e.message));
  }, [session]);

  const roleName = profile?.roles?.name || "Viewer";
  const isAdmin = roleName === "Admin";
  const can = useCallback((module) => isAdmin || !!rolePerms[roleName]?.[module], [isAdmin, rolePerms, roleName]);

  // 3. Once we know the profile, load roles + permissions (needed for nav gating).
  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const [roleRows, permRows] = await Promise.all([fetchRoles(), fetchPermissions()]);
        setRoles(roleRows);
        const assembled = {};
        roleRows.forEach((r) => { assembled[r.name] = Object.fromEntries(MODULES.map((m) => [m, false])); });
        permRows.forEach((p) => {
          const rn = roleRows.find((r) => r.id === p.role_id)?.name;
          if (rn) assembled[rn][p.module] = p.allowed;
        });
        setRolePerms(assembled);
      } catch (e) { setErr(e.message); }
    })();
  }, [profile]);

  // 4. Once permissions are known, load whatever data this role can see.
  useEffect(() => {
    if (!profile || Object.keys(rolePerms).length === 0) return;
    (async () => {
      try {
        const tasks = [];
        if (isAdmin || can("Services")) tasks.push(fetchServices().then(setServices));
        if (isAdmin || can("LocKit")) tasks.push(fetchLockitConfigs().then(setConfigs));
        if (isAdmin || can("Aopay")) tasks.push(fetchAopayConfigs().then(setAopayConfigs));
        if (isAdmin || can("OTP")) tasks.push(fetchOtpRequests({ own: !isAdmin, userId: profile.id }).then(setOtpLog));
        if (isAdmin || can("Reports")) tasks.push(fetchServiceLogs({ own: !isAdmin, userId: profile.id }).then(setReports));
        if (isAdmin) tasks.push(fetchAllProfiles().then(setUsers));
        await Promise.all(tasks);
      } catch (e) {
        setErr(e.message);
      } finally {
        setDataReady(true);
      }
    })();
  }, [profile, rolePerms]); // eslint-disable-line react-hooks/exhaustive-deps

  // 5. Pick a default view once we know what's visible.
  const canSeeNav = (n) => {
    if (n.adminOnly) return isAdmin;
    if (n.module) return isAdmin || can(n.module);
    return false;
  };
  useEffect(() => {
    if (view || !dataReady) return;
    const first = NAV.find(canSeeNav);
    if (first) setView(first.key);
  }, [dataReady]); // eslint-disable-line react-hooks/exhaustive-deps

  if (session === undefined) {
    return <div className="min-h-screen w-full flex items-center justify-center" style={{ background: C.base, color: C.muted }}>Loading…</div>;
  }
  if (!session) return <Login />;
  if (!profile || !dataReady) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: C.base, color: C.muted }}>
        <RefreshCw size={16} className="animate-spin mr-2" /> Loading your console…
      </div>
    );
  }

  const modulesNav = NAV.filter((n) => !n.section && canSeeNav(n));
  const adminNav = NAV.filter((n) => n.section === "admin" && canSeeNav(n));

  return (
    <div className="min-h-screen w-full flex" style={{ background: C.base }}>
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
            const Icon = n.icon; const active = view === n.key;
            return (
              <button key={n.key} onClick={() => setView(n.key)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-0.5 text-sm transition-colors"
                style={{ background: active ? "rgba(180,83,9,0.08)" : "transparent", color: active ? C.amber : C.muted }}>
                <Icon size={15} />{n.label}
              </button>
            );
          })}
          {modulesNav.length === 0 && <div className="px-2 text-xs" style={{ color: C.muted }}>No modules assigned yet.</div>}

          {adminNav.length > 0 && (
            <>
              <div style={{ color: C.muted, ...mono }} className="text-[10px] uppercase px-2 mb-2 mt-6 tracking-wider">Admin</div>
              {adminNav.map((n) => {
                const Icon = n.icon; const active = view === n.key;
                return (
                  <button key={n.key} onClick={() => setView(n.key)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-0.5 text-sm transition-colors"
                    style={{ background: active ? "rgba(180,83,9,0.08)" : "transparent", color: active ? C.amber : C.muted }}>
                    <Icon size={15} />{n.label}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="px-3 py-4" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 px-2 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: C.panelAlt, color: C.text }}>
              {(profile.name || profile.email).split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div style={{ color: C.text }} className="text-xs font-medium truncate">{profile.name}</div>
              <div style={{ color: C.muted }} className="text-[11px] truncate">{roleName}</div>
            </div>
          </div>
          <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs" style={{ color: C.muted }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <ErrorBanner message={err} onDismiss={() => setErr("")} />
          {view === "lockit" && <LocKitModule canManage={isAdmin} currentUserId={profile.id} configs={configs} setConfigs={setConfigs} />}
          {view === "aopay" && <AopayModule canManage={isAdmin} currentUserId={profile.id} aopayConfigs={aopayConfigs} setAopayConfigs={setAopayConfigs} />}
          {view === "otp" && <OtpModule profile={profile} otpLog={otpLog} setOtpLog={setOtpLog} services={services} reports={reports} setReports={setReports} />}
          {view === "reports" && <ReportsModule reports={reports} services={services} />}
          {view === "admin-users" && isAdmin && <AdminUsers users={users} setUsers={setUsers} />}
          {view === "admin-reports" && isAdmin && <AdminReports reports={reports} users={users} services={services} />}
          {view === "admin-services" && <AdminServices services={services} setServices={setServices} currentUserId={profile.id} />}
          {view === "admin-rbac" && isAdmin && <AdminRBAC users={users} setUsers={setUsers} roles={roles} setRoles={setRoles} rolePerms={rolePerms} setRolePerms={setRolePerms} />}
        </div>
      </div>
    </div>
  );
}
