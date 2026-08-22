import { supabase } from "./supabaseClient";

// ---------------- Auth ----------------
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ---------------- Roles ----------------
export async function fetchRoles() {
  const { data, error } = await supabase.from("roles").select("id, name").order("id");
  if (error) throw error;
  return data;
}

export async function createRole(name) {
  const { data, error } = await supabase.from("roles").insert({ name }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRole(roleId) {
  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) throw error;
}

// ---------------- Permissions ----------------
export async function fetchPermissions() {
  const { data, error } = await supabase.from("permissions").select("role_id, module, allowed");
  if (error) throw error;
  return data;
}

// Upserts one (role, module) pair. Called once per module when a role is saved.
export async function setPermission(roleId, module, allowed) {
  const { error } = await supabase
    .from("permissions")
    .upsert({ role_id: roleId, module, allowed }, { onConflict: "role_id,module" });
  if (error) throw error;
}

// ---------------- Profiles (users) ----------------
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, status, added_on, role_id, roles ( name )")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, status, added_on, role_id, roles ( name )")
    .order("added_on");
  if (error) throw error;
  return data;
}

export async function updateProfileStatus(id, status) {
  const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function updateProfileRole(id, roleId) {
  const { error } = await supabase.from("profiles").update({ role_id: roleId }).eq("id", id);
  if (error) throw error;
}

// ---------------- Services ----------------
export async function fetchServices() {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addService(name, description, createdBy) {
  const { data, error } = await supabase
    .from("services")
    .insert({ name, description, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------- LocKit ----------------
export async function fetchLockitConfigs() {
  const { data, error } = await supabase
    .from("lockit_configs")
    .select("*, profiles ( name )")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addLockitConfig(name, payload, createdBy) {
  const { data, error } = await supabase
    .from("lockit_configs")
    .insert({ name, payload, created_by: createdBy })
    .select("*, profiles ( name )")
    .single();
  if (error) throw error;
  return data;
}

// ---------------- Aopay ----------------
export async function fetchAopayConfigs() {
  const { data, error } = await supabase
    .from("aopay_configs")
    .select("*, profiles ( name )")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addAopayConfig(name, payload, createdBy) {
  const { data, error } = await supabase
    .from("aopay_configs")
    .insert({ name, payload, created_by: createdBy })
    .select("*, profiles ( name )")
    .single();
  if (error) throw error;
  return data;
}

// ---------------- OTP ----------------
export async function fetchOtpRequests({ own = true, userId } = {}) {
  let query = supabase
    .from("otp_requests")
    .select("*, profiles ( name )")
    .order("requested_at", { ascending: false }).limit(10);
  if (own && userId) query = query.eq("requested_by", userId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function addOtpRequest(mobile, otpCode, requestedBy) {
  const { data, error } = await supabase
    .from("otp_requests")
    .insert({ mobile, otp_code: otpCode, requested_by: requestedBy })
    .select("*, profiles ( name )")
    .single();
  if (error) throw error;
  return data;
}

// ---------------- Service logs (reports) ----------------
export async function fetchServiceLogs({ own = true, userId } = {}) {
  let query = supabase
    .from("service_logs")
    .select("*, services ( name ), profiles ( name )")
    .order("created_at", { ascending: false });
  if (own && userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function addServiceLog({ userId, serviceId, ip, statusCode, responseSummary, responseBody }) {
  const { data, error } = await supabase
    .from("service_logs")
    .insert({
      user_id: userId,
      service_id: serviceId,
      ip_address: ip,
      status_code: statusCode,
      response_summary: responseSummary,
      response_body: responseBody,
    })
    .select("*, services ( name ), profiles ( name )")
    .single();
  if (error) throw error;
  return data;
}
