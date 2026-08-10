import { supabase } from "./supabase";
import { getFreeTrialRegistrations, type FreeTrialRegistration } from "./free-trial";
import { getSimulatedPurchasesForAdmin, type UserPurchase } from "./purchases";

export type AdminUserRecord = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student" | "user";
  status: "active" | "pending";
  createdAt: string;
};

export type AdminUserSettingValue = string | boolean | null;

export type AdminUserDetail = {
  user: AdminUserRecord;
  profile: {
    address: string;
    postalCode: string;
    city: string;
    phone: string;
    danceRole: string;
    emailConfirmed: boolean | null;
    createdAt: string;
  };
  category: string | null;
  categorySource: "profile" | "membership" | "not-verified";
  memberships: Array<{
    id: string;
    type: string;
    active: boolean;
    classesRemaining: number | null;
    startsAt: string | null;
    endsAt: string | null;
  }>;
  purchases: Array<{
    id: string;
    product: string;
    amount: number | null;
    currency: string;
    status: string;
    purchasedAt: string;
    validUntil: string | null;
    paymentMethod: string | null;
    source: "supabase" | "construction";
    sessionsTotal: number | null;
    sessionsConsumed: number | null;
  }>;
  freeTrials: Array<{
    id: string;
    status: FreeTrialRegistration["status"];
    validUntil: string;
    createdAt: string;
    classes: string[];
  }>;
  settings: {
    language: AdminUserSettingValue;
    darkMode: AdminUserSettingValue;
    reducedMotion: AdminUserSettingValue;
    classReminders: AdminUserSettingValue;
    classReminderTiming: AdminUserSettingValue;
    newActivityNotifications: AdminUserSettingValue;
    emailUpdates: AdminUserSettingValue;
  };
  summary: {
    activeAccess: number;
    purchaseCount: number;
    pendingPurchases: number;
    sessionsRemaining: number;
    totalPaid: number;
  };
  source: "supabase" | "construction";
};

export type AdminMembershipRecord = {
  id: string;
  userId: string;
  name: string;
  email: string;
  type: string;
  classesRemaining: number;
  active: boolean;
};

export type AdminEventRecord = {
  id: string;
  title: string;
  type: string;
  date: string;
  startDate?: string;
  location: string;
  capacity: number;
  status: "published" | "draft";
};

export type AdminPriceType = "regular" | "student" | "erasmus" | "member" | "student_member";

export type AdminCoursePriceRecord = {
  id?: string;
  type: AdminPriceType;
  amount: number | null;
  currency: string;
  active: boolean;
};

export type AdminTeacherRecord = {
  id: string;
  displayName: string;
  active: boolean;
};

export type AdminClassRecord = {
  id: string;
  title: string;
  description: string;
  disciplineId: string;
  disciplineName: string;
  levelId: string;
  levelName: string;
  level: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  teacherId?: string;
  teacher: string;
  location: string;
  period: string;
  durationText: string;
  durationHours?: number;
  classesPerWeek: number;
  imageUrl: string;
  capacity: number;
  enrolled: number;
  active: boolean;
  visible: boolean;
  status: "active" | "draft";
  prices: AdminCoursePriceRecord[];
};

export type AdminLevelRecord = {
  id: string;
  courseId: string;
  name: string;
  code: string;
  description: string;
  sortOrder: number;
  active: boolean;
};

export type AdminCourseGroupRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  active: boolean;
};

export type AdminCourseRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
  catalogGroupId?: string;
  catalogGroupName?: string;
  levels: AdminLevelRecord[];
};

export type AdminOrderRecord = {
  id: string;
  customer: string;
  product: string;
  date: string;
  amount: string;
  status: "paid" | "pending" | "refunded";
};

export type AdminWorkspaceData = {
  users: AdminUserRecord[];
  memberships: AdminMembershipRecord[];
  groups: AdminCourseGroupRecord[];
  teachers: AdminTeacherRecord[];
  courses: AdminCourseRecord[];
  events: AdminEventRecord[];
  classes: AdminClassRecord[];
  orders: AdminOrderRecord[];
};

type ProfileRow = { user_id: string; first_name: string | null; last_name: string | null; email: string | null; email_confirmed: boolean | null; created_at: string };
type RoleRow = { user_id: string; role: "admin" | "teacher" | "student" | "user" };
type MembershipRow = { id: string; user_id: string; membership_type: string; classes_remaining: number | null; is_active: boolean | null };
type EventRow = { id: string; title: string; event_type: string | null; start_date: string; location: string | null; max_capacity: number | null; is_active: boolean | null };
type GroupRow = { id: string; name: string; slug: string; description: string | null; sort_order: number | null; is_active: boolean | null };
type TeacherRow = { id: string; display_name: string; is_active: boolean | null };
type ClassRow = { id: string; title: string; description: string | null; course_id: string; course_level_id: string; teacher_id: string | null; teacher_display_name: string | null; start_date: string; end_date: string | null; duration_text: string | null; duration_hours: number | null; classes_per_week: number | null; location: string | null; capacity: number | null; image_url: string | null; is_active: boolean | null; is_visible: boolean | null };
type CourseRow = { id: string; name: string; slug: string; description: string | null; image_url: string | null; is_active: boolean | null; course_group_id: string | null };
type LevelRow = { id: string; course_id: string; name: string; level_code: string; description: string | null; sort_order: number | null; is_active: boolean | null };
type PriceRow = { id: string; course_instance_id: string; price_type: AdminPriceType; amount: number | null; currency: string; is_active: boolean | null };
type PurchaseRow = { id: string; user_id: string; product_name: string | null; product_name_snapshot: string | null; amount: number | null; currency: string | null; status: string | null; created_at: string };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatName(firstName: string | null, lastName: string | null, email: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || email || "Unknown member";
}

function normalizeEventType(value: string | null) {
  const type = (value ?? "workshop").toLocaleLowerCase("en-US");
  if (type.includes("party") || type.includes("social") || type.includes("fiesta")) return "party";
  if (type.includes("festival")) return "festival";
  return "workshop";
}

function normalizeOrderStatus(value: string | null): AdminOrderRecord["status"] {
  if (value === "paid" || value === "refunded") return value;
  return "pending";
}

const emptyPrices = (): AdminCoursePriceRecord[] => ["regular", "student", "erasmus", "member", "student_member"].map((type) => ({ type: type as AdminPriceType, amount: null, currency: "EUR", active: true }));

export async function getAdminWorkspaceData(): Promise<AdminWorkspaceData | null> {
  if (!supabase) return null;
  const [profilesResult, rolesResult, membershipsResult, groupsResult, teachersResult, coursesResult, levelsResult, eventsResult, classesResult, pricesResult, purchasesResult] = await Promise.all([
    supabase.from("profiles").select("user_id, first_name, last_name, email, email_confirmed, created_at").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("memberships").select("id, user_id, membership_type, classes_remaining, is_active").order("created_at", { ascending: false }),
    supabase.from("course_groups").select("id, name, slug, description, sort_order, is_active").order("sort_order", { ascending: true }),
    supabase.from("teachers").select("id, display_name, is_active").order("display_name", { ascending: true }),
    supabase.from("courses").select("id, name, slug, description, image_url, is_active, course_group_id").order("name", { ascending: true }),
    supabase.from("course_levels").select("id, course_id, name, level_code, description, sort_order, is_active").order("sort_order", { ascending: true }),
    supabase.from("events").select("id, title, event_type, start_date, location, max_capacity, is_active").order("start_date", { ascending: true }),
    supabase.from("course_instances").select("id, title, description, course_id, course_level_id, teacher_id, teacher_display_name, start_date, end_date, duration_text, duration_hours, classes_per_week, location, capacity, image_url, is_active, is_visible").order("start_date", { ascending: true }),
    supabase.from("course_prices").select("id, course_instance_id, price_type, amount, currency, is_active"),
    supabase.from("purchases").select("id, user_id, product_name, product_name_snapshot, amount, currency, status, created_at").order("created_at", { ascending: false }),
  ]);

  const primaryResults = [profilesResult, membershipsResult, coursesResult, levelsResult, eventsResult, classesResult, purchasesResult];
  if (primaryResults.every((result) => result.error)) return null;

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const roles = new Map(((rolesResult.data ?? []) as RoleRow[]).map((row) => [row.user_id, row.role]));
  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const groups = ((groupsResult.data ?? []) as GroupRow[]).map((group) => ({ id: group.id, name: group.name, slug: group.slug, description: group.description ?? "", sortOrder: group.sort_order ?? 0, active: group.is_active ?? false }));
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const teachers = ((teachersResult.data ?? []) as TeacherRow[]).map((teacher) => ({ id: teacher.id, displayName: teacher.display_name, active: teacher.is_active ?? false }));
  const teacherMap = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const levelsByCourse = new Map<string, AdminLevelRecord[]>();
  for (const level of (levelsResult.data ?? []) as LevelRow[]) {
    const levels = levelsByCourse.get(level.course_id) ?? [];
    levels.push({ id: level.id, courseId: level.course_id, name: level.name, code: level.level_code, description: level.description ?? "", sortOrder: level.sort_order ?? 0, active: level.is_active ?? false });
    levelsByCourse.set(level.course_id, levels);
  }
  const courseRows = (coursesResult.data ?? []) as CourseRow[];
  const courseMap = new Map(courseRows.map((course) => [course.id, course]));
  const levelMap = new Map(((levelsResult.data ?? []) as LevelRow[]).map((level) => [level.id, level]));
  const pricesByInstance = new Map<string, AdminCoursePriceRecord[]>();
  for (const price of (pricesResult.data ?? []) as PriceRow[]) {
    const prices = pricesByInstance.get(price.course_instance_id) ?? [];
    prices.push({ id: price.id, type: price.price_type, amount: price.amount, currency: price.currency, active: price.is_active ?? false });
    pricesByInstance.set(price.course_instance_id, prices);
  }

  return {
    users: profiles.map((profile) => ({ id: profile.user_id, firstName: profile.first_name ?? "", lastName: profile.last_name ?? "", name: formatName(profile.first_name, profile.last_name, profile.email), email: profile.email ?? "", role: roles.get(profile.user_id) ?? "user", status: profile.email_confirmed ? "active" : "pending", createdAt: formatDate(profile.created_at) })),
    memberships: ((membershipsResult.data ?? []) as MembershipRow[]).map((membership) => { const profile = profileMap.get(membership.user_id); return { id: membership.id, userId: membership.user_id, name: formatName(profile?.first_name ?? null, profile?.last_name ?? null, profile?.email ?? null), email: profile?.email ?? "", type: membership.membership_type, classesRemaining: membership.classes_remaining ?? 0, active: membership.is_active ?? false }; }),
    groups,
    teachers,
    courses: courseRows.map((course) => ({ id: course.id, name: course.name, slug: course.slug, description: course.description ?? "", imageUrl: course.image_url ?? "", sortOrder: 0, active: course.is_active ?? false, catalogGroupId: course.course_group_id ?? undefined, catalogGroupName: course.course_group_id ? groupMap.get(course.course_group_id)?.name : undefined, levels: levelsByCourse.get(course.id) ?? [] })),
    events: ((eventsResult.data ?? []) as EventRow[]).map((event) => ({ id: event.id, title: event.title, type: normalizeEventType(event.event_type), date: formatDate(event.start_date), startDate: event.start_date, location: event.location ?? "—", capacity: event.max_capacity ?? 0, status: event.is_active ? "published" : "draft" })),
    classes: ((classesResult.data ?? []) as ClassRow[]).map((item) => {
      const course = courseMap.get(item.course_id);
      const level = levelMap.get(item.course_level_id);
      const period = [formatDate(item.start_date), item.end_date ? formatDate(item.end_date) : ""].filter(Boolean).join(" – ");
      return { id: item.id, title: item.title, description: item.description ?? "", disciplineId: item.course_id, disciplineName: course?.name ?? "Unknown discipline", levelId: item.course_level_id, levelName: level?.name ?? "Unknown level", level: level?.name ?? "Unknown level", date: item.start_date, startDate: item.start_date, endDate: item.end_date ?? undefined, teacherId: item.teacher_id ?? undefined, teacher: item.teacher_display_name ?? (item.teacher_id ? teacherMap.get(item.teacher_id)?.displayName ?? "" : ""), location: item.location ?? "", period, durationText: item.duration_text ?? "", durationHours: item.duration_hours ?? undefined, classesPerWeek: item.classes_per_week ?? 1, imageUrl: item.image_url ?? "", capacity: item.capacity ?? 0, enrolled: 0, active: item.is_active ?? false, visible: item.is_visible ?? false, status: item.is_active && item.is_visible ? "active" : "draft", prices: pricesByInstance.get(item.id) ?? emptyPrices() };
    }),
    orders: ((purchasesResult.data ?? []) as PurchaseRow[]).map((order) => { const profile = profileMap.get(order.user_id); return { id: order.id, customer: formatName(profile?.first_name ?? null, profile?.last_name ?? null, profile?.email ?? null), product: order.product_name_snapshot ?? order.product_name ?? "Purchase", date: formatDate(order.created_at), amount: `${order.currency ?? "EUR"} ${order.amount ?? 0}`, status: normalizeOrderStatus(order.status) }; }),
  };
}

type UnknownRow = Record<string, unknown>;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function rowValue(row: UnknownRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
  }
  return null;
}

function rowString(row: UnknownRow, keys: string[]) {
  const value = rowValue(row, keys);
  return value === null ? "" : String(value);
}

function rowNumber(row: UnknownRow, keys: string[]) {
  const value = rowValue(row, keys);
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowBoolean(row: UnknownRow, keys: string[]) {
  const value = rowValue(row, keys);
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1" || value === "active";
  if (typeof value === "number") return value === 1;
  return null;
}

function rowDate(row: UnknownRow, keys: string[]) {
  const value = rowValue(row, keys);
  return value === null || value === "" ? null : String(value);
}

function settingValue(profile: UnknownRow, keys: string[]) {
  const settings = profile.settings && typeof profile.settings === "object" ? profile.settings as UnknownRow : null;
  const preferences = profile.preferences && typeof profile.preferences === "object" ? profile.preferences as UnknownRow : null;
  const sources = [profile, settings, preferences].filter((source): source is UnknownRow => Boolean(source));
  for (const source of sources) {
    const value = rowValue(source, keys);
    if (value !== null) return typeof value === "number" ? String(value) : value;
  }
  return null;
}

function isActivePurchase(status: string, validUntil: string | null) {
  if (status === "refunded" || status === "cancelled" || status === "expired") return false;
  return !validUntil || new Date(validUntil).getTime() >= Date.now();
}

function mapConstructionPurchase(purchase: UserPurchase): AdminUserDetail["purchases"][number] {
  const sessions = purchase.sessions ?? [];
  return {
    id: purchase.id,
    product: purchase.productName,
    amount: purchase.amount,
    currency: purchase.currency || "EUR",
    status: purchase.status,
    purchasedAt: purchase.purchasedAt,
    validUntil: purchase.validUntil,
    paymentMethod: purchase.paymentMethod,
    source: "construction",
    sessionsTotal: purchase.classesIncluded ?? (sessions.length > 0 ? sessions.length : null),
    sessionsConsumed: sessions.length > 0 ? sessions.filter((session) => session.status === "consumed").length : null,
  };
}

function mapRemotePurchase(row: UnknownRow): AdminUserDetail["purchases"][number] {
  return {
    id: rowString(row, ["id"]) || "purchase-unknown",
    product: rowString(row, ["product_name_snapshot", "product_name", "name", "product_type"]) || "Purchase",
    amount: rowNumber(row, ["amount", "total_amount"]),
    currency: rowString(row, ["currency"]) || "EUR",
    status: rowString(row, ["status", "payment_status"]) || "unknown",
    purchasedAt: rowDate(row, ["created_at", "purchased_at"]) ?? "",
    validUntil: rowDate(row, ["expires_at", "valid_until", "valid_until_at"]),
    paymentMethod: rowString(row, ["payment_method"]) || null,
    source: "supabase",
    sessionsTotal: rowNumber(row, ["session_count", "classes_included", "sessions_total"]),
    sessionsConsumed: rowNumber(row, ["sessions_consumed", "consumed_sessions"]),
  };
}

function userMatchesPurchase(purchase: UserPurchase, user: AdminUserRecord) {
  return purchase.userId === user.id || purchase.customerEmail?.toLocaleLowerCase("en-US") === user.email.toLocaleLowerCase("en-US");
}

export async function getAdminUserDetails(user: AdminUserRecord): Promise<AdminUserDetail> {
  const localPurchases = getSimulatedPurchasesForAdmin().filter((purchase) => userMatchesPurchase(purchase, user));
  const localTrials = getFreeTrialRegistrations().filter((trial) => trial.userId === user.id || trial.email.toLocaleLowerCase("en-US") === user.email.toLocaleLowerCase("en-US"));
  const constructionPurchases = localPurchases.map(mapConstructionPurchase);

  let profile: UnknownRow = {};
  let memberships: UnknownRow[] = [];
  let remotePurchases: UnknownRow[] = [];
  let role = user.role;
  let remoteAvailable = false;

  if (supabase && isUuid(user.id)) {
    const [profileResult, roleResult, membershipResult, purchasesResult] = await Promise.all([
      supabase.from("profiles").select("user_id, first_name, last_name, email, email_confirmed, created_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      supabase.from("memberships").select("id, user_id, membership_type, classes_remaining, is_active").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("purchases").select("id, user_id, product_type, product_name, product_name_snapshot, amount, currency, status, created_at, expires_at, invoice_number, invoice_pdf_url, payment_method, course_name, level_names, customer_category_snapshot").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    remoteAvailable = Boolean(profileResult.data || membershipResult.data?.length || purchasesResult.data?.length) && !profileResult.error;
    if (profileResult.data) profile = profileResult.data as UnknownRow;
    if (membershipResult.data) memberships = membershipResult.data as UnknownRow[];
    if (purchasesResult.data) remotePurchases = purchasesResult.data as UnknownRow[];
    const roleValue = rowString((roleResult.data ?? {}) as UnknownRow, ["role"]);
    if (roleValue === "admin" || roleValue === "teacher" || roleValue === "student" || roleValue === "user") role = roleValue;
  }

  const firstName = rowString(profile, ["first_name", "firstName"]) || user.firstName;
  const lastName = rowString(profile, ["last_name", "lastName"]) || user.lastName;
  const email = rowString(profile, ["email"]) || user.email;
  const userRecord: AdminUserRecord = { ...user, firstName, lastName, email, name: formatName(firstName, lastName, email), role };
  const mappedMemberships = memberships.map((membership, index) => ({
    id: rowString(membership, ["id"]) || `membership-${index}`,
    type: rowString(membership, ["membership_type", "type", "name"]) || "membership",
    active: rowBoolean(membership, ["is_active", "active", "status"]) ?? false,
    classesRemaining: rowNumber(membership, ["classes_remaining", "sessions_remaining"]),
    startsAt: rowDate(membership, ["starts_at", "start_date", "valid_from"]),
    endsAt: rowDate(membership, ["ends_at", "end_date", "expires_at", "valid_until"]),
  }));
  const purchaseRecords = [...remotePurchases.map(mapRemotePurchase), ...constructionPurchases]
    .sort((left, right) => new Date(right.purchasedAt).getTime() - new Date(left.purchasedAt).getTime());
  const profileCategory = rowString(profile, ["commercial_category", "customer_category", "category", "customer_category_snapshot"]);
  const hasActiveMembership = mappedMemberships.some((membership) => membership.active);
  const category = profileCategory || (hasActiveMembership ? "member" : null);
  const categorySource = profileCategory ? "profile" : hasActiveMembership ? "membership" : "not-verified";
  const trialRecords = localTrials.map((trial) => ({ id: trial.id, status: trial.status, validUntil: trial.validUntil, createdAt: trial.createdAt, classes: trial.classes.map((item) => `${item.courseName} · ${item.levelName}`) }));
  const activeAccess = purchaseRecords.filter((purchase) => purchase.status === "paid" && isActivePurchase(purchase.status, purchase.validUntil)).length + (hasActiveMembership ? 1 : 0) + trialRecords.filter((trial) => trial.status === "active").length;
  const pendingPurchases = purchaseRecords.filter((purchase) => purchase.status === "pending").length;
  const sessionsRemaining = purchaseRecords.reduce((total, purchase) => total + Math.max(0, (purchase.sessionsTotal ?? 0) - (purchase.sessionsConsumed ?? 0)), 0);
  const totalPaid = purchaseRecords.filter((purchase) => purchase.status === "paid").reduce((total, purchase) => total + (purchase.amount ?? 0), 0);

  return {
    user: userRecord,
    profile: {
      address: rowString(profile, ["address", "street_address"]),
      postalCode: rowString(profile, ["postal_code", "postalCode", "zip"]),
      city: rowString(profile, ["city", "town"]),
      phone: rowString(profile, ["phone", "phone_number", "telephone"]),
      danceRole: rowString(profile, ["dance_role", "danceRole", "role_preference"]),
      emailConfirmed: rowBoolean(profile, ["email_confirmed", "is_email_confirmed"]),
      createdAt: rowDate(profile, ["created_at"]) ?? user.createdAt,
    },
    category,
    categorySource,
    memberships: mappedMemberships,
    purchases: purchaseRecords,
    freeTrials: trialRecords,
    settings: {
      language: settingValue(profile, ["language", "locale", "preferred_language"]),
      darkMode: settingValue(profile, ["dark_mode", "darkMode"]),
      reducedMotion: settingValue(profile, ["reduced_motion", "reducedMotion"]),
      classReminders: settingValue(profile, ["class_reminders", "classReminders"]),
      classReminderTiming: settingValue(profile, ["class_reminder_timing", "classReminderTiming"]),
      newActivityNotifications: settingValue(profile, ["new_activity_notifications", "newActivityNotifications"]),
      emailUpdates: settingValue(profile, ["email_updates", "emailUpdates"]),
    },
    summary: { activeAccess, purchaseCount: purchaseRecords.length, pendingPurchases, sessionsRemaining, totalPaid },
    source: remoteAvailable ? "supabase" : "construction",
  };
}
