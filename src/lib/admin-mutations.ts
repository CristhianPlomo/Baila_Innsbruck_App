import type { AdminClassRecord, AdminCourseGroupRecord, AdminCoursePriceRecord, AdminCourseRecord, AdminEventRecord, AdminLevelRecord, AdminOrderRecord, AdminUserRecord } from "./admin-data";
import { supabase } from "./supabase";

export type AdminMutationResult = {
  ok: boolean;
  error?: string;
  code?: string;
  course?: AdminCourseRecord;
  group?: AdminCourseGroupRecord;
  level?: AdminLevelRecord;
  recordId?: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseEventDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseClassDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function slugify(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("en-US")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function validImageUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function currentUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function saveAdminGroup(group: AdminCourseGroupRecord): Promise<AdminMutationResult> {
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const name = group.name.trim();
  const slug = slugify(name);
  if (!name || !slug) return { ok: false, error: "The course group name is not valid." };
  const payload = { name, slug, description: group.description.trim() || null, sort_order: group.sortOrder, is_active: group.active, updated_at: new Date().toISOString() };
  const query = isUuid(group.id)
    ? supabase.from("course_groups").update(payload).eq("id", group.id).select("id, name, slug, description, sort_order, is_active").single()
    : supabase.from("course_groups").insert(payload).select("id, name, slug, description, sort_order, is_active").single();
  const { data, error } = await query;
  if (error || !data) return { ok: false, error: error?.message ?? "The course group could not be saved." };
  return { ok: true, group: { id: data.id, name: data.name, slug: data.slug, description: data.description ?? "", sortOrder: data.sort_order ?? 0, active: data.is_active ?? false } };
}

export async function deleteAdminGroup(id: string): Promise<AdminMutationResult> {
  if (!supabase || !isUuid(id)) return { ok: false, error: "This course group cannot be removed." };
  const { count, error: countError } = await supabase.from("courses").select("id", { count: "exact", head: true }).eq("course_group_id", id);
  if (countError) return { ok: false, error: countError.message };
  if ((count ?? 0) > 0) return { ok: false, code: "courseGroupHasCourses", error: "The course group still has courses." };
  const { error } = await supabase.from("course_groups").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function saveAdminCourse(course: AdminCourseRecord): Promise<AdminMutationResult> {
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const name = course.name.trim();
  const slug = slugify(name);
  if (!name || !slug) return { ok: false, error: "The course name is not valid." };
  if (!course.catalogGroupId || !isUuid(course.catalogGroupId)) return { ok: false, code: "courseGroupRequired", error: "A course must belong to a course group." };
  if (!validImageUrl(course.imageUrl)) return { ok: false, code: "imageInvalid", error: "The course image URL is not valid." };

  const payload = { name, slug, description: course.description.trim() || null, image_url: course.imageUrl.trim() || null, course_group_id: course.catalogGroupId, is_active: course.active, updated_at: new Date().toISOString() };
  const isExisting = isUuid(course.id);
  const query = isExisting
    ? supabase.from("courses").update(payload).eq("id", course.id).select("id, name, slug, description, image_url, course_group_id, is_active").single()
    : supabase.from("courses").insert(payload).select("id, name, slug, description, image_url, course_group_id, is_active").single();
  const { data, error } = await query;
  if (error || !data) return { ok: false, error: error?.message ?? "The course could not be saved." };

  return { ok: true, course: { id: data.id, name: data.name, slug: data.slug, description: data.description ?? "", imageUrl: data.image_url ?? "", sortOrder: 0, active: data.is_active ?? false, catalogGroupId: data.course_group_id ?? undefined, levels: course.levels } };
}

export async function saveAdminLevel(level: AdminLevelRecord): Promise<AdminMutationResult> {
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  if (!isUuid(level.courseId)) return { ok: false, error: "A level must belong to a course or style." };
  const name = level.name.trim();
  if (!name) return { ok: false, error: "The level name is not valid." };
  const payload = { course_id: level.courseId, level_code: level.code, name, description: level.description.trim() || null, sort_order: level.sortOrder, is_active: level.active, updated_at: new Date().toISOString() };
  const query = isUuid(level.id)
    ? supabase.from("course_levels").update(payload).eq("id", level.id).select("id, course_id, name, level_code, description, sort_order, is_active").single()
    : supabase.from("course_levels").insert(payload).select("id, course_id, name, level_code, description, sort_order, is_active").single();
  const { data, error } = await query;
  if (error || !data) return { ok: false, error: error?.message ?? "The level could not be saved." };
  return { ok: true, level: { id: data.id, courseId: data.course_id, name: data.name, code: data.level_code, description: data.description ?? "", sortOrder: data.sort_order ?? 0, active: data.is_active ?? false } };
}

export async function deleteAdminLevel(id: string): Promise<AdminMutationResult> {
  if (!supabase || !isUuid(id)) return { ok: false, error: "This level cannot be removed." };
  const [{ count: classCount, error: classError }, { count: productCount, error: productError }] = await Promise.all([
    supabase.from("course_instances").select("id", { count: "exact", head: true }).eq("course_level_id", id),
    supabase.from("commercial_products").select("id", { count: "exact", head: true }).eq("course_level_id", id),
  ]);
  if (classError) return { ok: false, error: classError.message };
  if (productError) return { ok: false, error: productError.message };
  if ((classCount ?? 0) > 0) return { ok: false, code: "levelHasClasses", error: "The level still has classes." };
  if ((productCount ?? 0) > 0) return { ok: false, code: "levelHasProducts", error: "The level is used by products." };
  const { error } = await supabase.from("course_levels").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteAdminCourse(id: string): Promise<AdminMutationResult> {
  if (!supabase || !isUuid(id)) return { ok: false, error: "This course cannot be removed." };
  const { count, error: countError } = await supabase.from("course_instances").select("id", { count: "exact", head: true }).eq("course_id", id);
  if (countError) return { ok: false, error: countError.message };
  if ((count ?? 0) > 0) return { ok: false, code: "courseHasInstances", error: "Delete the course classes first." };
  const { error: levelsError } = await supabase.from("course_levels").delete().eq("course_id", id);
  if (levelsError) return { ok: false, error: levelsError.message };
  const { error } = await supabase.from("courses").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function saveAdminEvent(event: AdminEventRecord): Promise<AdminMutationResult> {
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const startDate = parseEventDate(event.startDate ?? event.date);
  if (!startDate) return { ok: false, error: "The event date is not valid." };
  const payload = { title: event.title.trim(), event_type: event.type, start_date: startDate, location: event.location.trim() || null, max_capacity: event.capacity, is_active: event.status === "published", updated_at: new Date().toISOString() };
  if (isUuid(event.id)) {
    const { error } = await supabase.from("events").update(payload).eq("id", event.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  }
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "No authenticated administrator was found." };
  const { error } = await supabase.from("events").insert({ ...payload, created_by: userId });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteAdminEvent(id: string): Promise<AdminMutationResult> {
  if (!supabase || !isUuid(id)) return { ok: true };
  const { error } = await supabase.from("events").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

async function syncCoursePrices(instanceId: string, prices: AdminCoursePriceRecord[]) {
  if (!supabase) return { error: new Error("Supabase is not configured.") };
  const { data: existing, error: existingError } = await supabase.from("course_prices").select("id, price_type").eq("course_instance_id", instanceId);
  if (existingError) return { error: existingError };
  const existingByType = new Map((existing ?? []).map((price) => [price.price_type as string, price.id as string]));
  for (const price of prices) {
    const existingId = existingByType.get(price.type);
    if (price.amount === null || price.amount <= 0) {
      if (existingId) {
        const { error } = await supabase.from("course_prices").delete().eq("id", existingId);
        if (error) return { error };
      }
      continue;
    }
    const payload = { course_instance_id: instanceId, price_type: price.type, amount: price.amount, currency: price.currency.trim() || "EUR", is_active: price.active, updated_at: new Date().toISOString() };
    const result = existingId ? await supabase.from("course_prices").update(payload).eq("id", existingId) : await supabase.from("course_prices").insert(payload);
    if (result.error) return { error: result.error };
  }
  return { error: null };
}

export async function saveAdminClass(item: AdminClassRecord): Promise<AdminMutationResult> {
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  if (!isUuid(item.disciplineId) || !isUuid(item.levelId)) return { ok: false, code: "courseLevelRequired", error: "A class must be linked to a course and level." };
  if (item.classesPerWeek < 1 || !Number.isInteger(item.classesPerWeek)) return { ok: false, code: "classesPerWeekInvalid", error: "Classes per week must be at least 1." };
  if (item.durationHours !== undefined && item.durationHours !== null && item.durationHours <= 0) return { ok: false, code: "durationHoursInvalid", error: "Duration hours must be positive." };
  const startDate = parseClassDate(item.startDate ?? item.date ?? "");
  if (!startDate) return { ok: false, error: "The class date is not valid." };
  const { data: level, error: levelError } = await supabase.from("course_levels").select("id").eq("id", item.levelId).eq("course_id", item.disciplineId).maybeSingle();
  if (levelError || !level) return { ok: false, code: "courseLevelMismatch", error: "The selected level does not belong to the selected course." };

  let teacherId = isUuid(item.teacherId ?? "") ? item.teacherId : null;
  const teacherName = item.teacher.trim();
  if (!teacherId && teacherName) {
    const { data: teacher, error: teacherError } = await supabase.from("teachers").select("id").eq("display_name", teacherName).maybeSingle();
    if (teacherError) return { ok: false, error: teacherError.message };
    teacherId = teacher?.id ?? null;
  }
  if (!validImageUrl(item.imageUrl)) return { ok: false, code: "imageInvalid", error: "The class image URL is not valid." };
  const payload = { course_id: item.disciplineId, course_level_id: item.levelId, teacher_id: teacherId, teacher_display_name: teacherId ? null : teacherName || null, title: item.title.trim(), description: item.description.trim() || null, start_date: startDate, end_date: parseClassDate(item.endDate ?? ""), duration_text: item.durationText.trim() || null, duration_hours: item.durationHours ?? null, classes_per_week: item.classesPerWeek, location: item.location.trim() || null, capacity: item.capacity, image_url: item.imageUrl.trim() || null, is_active: item.active, is_visible: item.visible, updated_at: new Date().toISOString() };
  const query = isUuid(item.id)
    ? supabase.from("course_instances").update(payload).eq("id", item.id).select("id").single()
    : supabase.from("course_instances").insert({ ...payload, requires_contract: false, contract_type: "none" }).select("id").single();
  const { data, error } = await query;
  if (error || !data) return { ok: false, error: error?.message ?? "The class could not be saved." };
  const pricesResult = await syncCoursePrices(data.id, item.prices);
  if (pricesResult.error) return { ok: false, code: "pricesSaveFailed", error: pricesResult.error.message };
  return { ok: true, recordId: data.id };
}

export async function deleteAdminClass(id: string): Promise<AdminMutationResult> {
  if (!supabase || !isUuid(id)) return { ok: true };
  const { error: pricesError } = await supabase.from("course_prices").delete().eq("course_instance_id", id);
  if (pricesError) return { ok: false, error: pricesError.message };
  const { error } = await supabase.from("course_instances").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateAdminOrderStatus(id: string, status: AdminOrderRecord["status"]): Promise<AdminMutationResult> {
  if (!supabase || !isUuid(id)) return { ok: true };
  const { error } = await supabase.from("purchases").update({ status }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function saveAdminUser(user: AdminUserRecord): Promise<AdminMutationResult> {
  if (!supabase || !isUuid(user.id)) return { ok: false, error: "This user cannot be edited from the current view." };
  const profileResult = await supabase.from("profiles").update({ first_name: user.firstName.trim(), last_name: user.lastName.trim(), updated_at: new Date().toISOString() }).eq("user_id", user.id);
  if (profileResult.error) return { ok: false, error: profileResult.error.message };
  const roleResult = await supabase.from("user_roles").update({ role: user.role }).eq("user_id", user.id);
  return roleResult.error ? { ok: false, error: roleResult.error.message } : { ok: true };
}
