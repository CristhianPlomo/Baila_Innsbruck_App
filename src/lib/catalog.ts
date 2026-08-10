import { supabase } from "./supabase";

export type CatalogLevel = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  sort_order: number;
  details?: CatalogClassDetails;
};

export type CatalogClassDetails = {
  teacher: string;
  day: string;
  time: string;
  duration: string;
  address: string;
  content: string[];
};

export type CatalogStyle = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  levels: CatalogLevel[];
};

export type CourseGroup = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  styles: CatalogStyle[];
  levels: CatalogLevel[];
};

const studioAddress = "Baila Innsbruck · Jahnstraße 20, 6020 Innsbruck";

const fallbackLevel = (
  id: string,
  name: string,
  code: string,
  description: string,
  sort_order: number,
  details: Omit<CatalogClassDetails, "address"> & { address?: string },
): CatalogLevel => ({
  id,
  name,
  code,
  description,
  sort_order,
  details: { ...details, address: details.address ?? studioAddress },
});

export const fallbackCatalog: CourseGroup[] = [
  {
    id: "salsa",
    name: "Salsa",
    slug: "salsa",
    description: "Find your timing, flow and musicality.",
    sort_order: 1,
    levels: [],
    styles: [
      {
        id: "salsa-on1",
        name: "Salsa On1",
        slug: "salsa-on1",
        description: "Our academy favourite: energetic Los Angeles timing with a clear social-dance flow.",
        image_url: null,
        levels: [
          fallbackLevel("salsa-on1-beginner", "Salsa On1 Beginner", "beginner", "Build solid timing, basic partnerwork and confidence from the very first step.", 1, { teacher: "Cristhian", day: "Tuesday", time: "18:00", duration: "60 min", content: ["On1 timing and basic step", "Right and left turns", "Lead and follow connection", "A first social-dance combination"] }),
          fallbackLevel("salsa-on1-improver", "Salsa On1 Improver", "improver", "Expand your vocabulary and make your partnerwork smoother, clearer and more musical.", 2, { teacher: "Cristhian", day: "Tuesday", time: "19:00", duration: "60 min", content: ["Cross-body lead variations", "Inside and outside turns", "Connection and frame", "Musical social combinations"] }),
        ],
      },
      {
        id: "salsa-on2",
        name: "Salsa On2",
        slug: "salsa-on2",
        description: "Our second most popular Salsa style, focused on precision, rhythm and New York timing.",
        image_url: null,
        levels: [
          fallbackLevel("salsa-on2-beginner", "Salsa On2 Beginner", "beginner", "Understand On2 timing and build a precise, comfortable foundation.", 1, { teacher: "Cristhian", day: "Wednesday", time: "18:00", duration: "60 min", content: ["On2 timing and clave awareness", "Basic step and weight transfer", "Cross-body lead", "Simple partnerwork patterns"] }),
          fallbackLevel("salsa-on2-improver", "Salsa On2 Improver", "improver", "Develop flow, turn technique and stronger musical interpretation on On2.", 2, { teacher: "Cristhian", day: "Wednesday", time: "19:00", duration: "60 min", content: ["Turn preparation", "Partnerwork technique", "Shines and body movement", "Musical combinations"] }),
        ],
      },
      {
        id: "salsa-cubana",
        name: "Salsa cubana",
        slug: "salsa-cubana",
        description: "Circular partnerwork, playful movement and the lively character of Cuban Salsa.",
        image_url: null,
        levels: [
          fallbackLevel("salsa-cubana-beginner", "Salsa cubana Beginner", "beginner", "Discover Cuban rhythm, circular movement and the essential partnerwork vocabulary.", 1, { teacher: "Cristhian", day: "Thursday", time: "18:00", duration: "60 min", content: ["Cuban basic step", "Dile que no", "Enchufla", "Circular lead and follow"] }),
          fallbackLevel("salsa-cubana-improver", "Salsa cubana Improver", "improver", "Connect figures with more freedom, rhythm and playful social-dance energy.", 2, { teacher: "Cristhian", day: "Thursday", time: "19:00", duration: "60 min", content: ["Setenta foundations", "Vacílala variations", "Rueda vocabulary", "Musical transitions"] }),
        ],
      },
    ],
  },
  {
    id: "bachata",
    name: "Bachata",
    slug: "bachata",
    description: "Connection, body movement and confidence.",
    sort_order: 2,
    levels: [
      fallbackLevel("bachata-beginner", "Bachata Beginner Level", "beginner", "A welcoming introduction to Bachata timing, basic steps and partner connection.", 1, { teacher: "Cristhian", day: "Monday", time: "18:00", duration: "60 min", content: ["Bachata timing and basic step", "Weight transfer", "Simple turns", "Comfortable partner connection"] }),
      fallbackLevel("bachata-sensual-improver", "Bachata Sensual Improver", "improver", "Build control, body movement and fluid transitions for social dancing.", 2, { teacher: "Cristhian", day: "Monday", time: "19:00", duration: "60 min", content: ["Body movement foundations", "Waves and isolations", "Lead and follow technique", "Sensual combinations"] }),
      fallbackLevel("bachata-sensual-intermediate", "Bachata Sensual Intermediate", "intermediate_1", "Refine your technique and combine movements with more musical freedom.", 3, { teacher: "Cristhian", day: "Wednesday", time: "20:00", duration: "75 min", content: ["Head and body movement safety", "Direction changes", "Musical interpretation", "Intermediate partnerwork"] }),
      fallbackLevel("bachata-sensual-advanced", "Bachata Sensual Advanced", "advanced_1", "Advanced technique, expression and demanding partnerwork for experienced dancers.", 4, { teacher: "Cristhian", day: "Friday", time: "19:30", duration: "75 min", content: ["Advanced movement technique", "Complex transitions", "Musical dynamics", "Performance-quality partnerwork"] }),
    ],
    styles: [],
  },
  { id: "popping", name: "Popping", slug: "popping", description: "Isolations, hits and playful musicality.", sort_order: 3, levels: [fallbackLevel("popping-foundations", "Popping Foundations", "open_level", "An open-level class to explore hits, grooves, isolations and freestyle tools.", 1, { teacher: "Matija", day: "Friday", time: "18:00", duration: "75 min", content: ["Hits and muscle control", "Grooves and foundations", "Isolation drills", "Freestyle concepts"] })], styles: [] },
  { id: "heels", name: "Heels", slug: "heels", description: "Confidence, lines and expressive movement.", sort_order: 4, levels: [fallbackLevel("heels-lab-lena", "Heels Lab by Lena", "open_level", "An open-level lab for confident movement, elegant lines and personal expression.", 1, { teacher: "Lena", day: "Thursday", time: "20:00", duration: "75 min", content: ["Heels posture and walking", "Lines and transitions", "Choreography", "Confidence and performance"] })], styles: [] },
  { id: "zouk", name: "Zouk", slug: "zouk", description: "Flow, connection and contemporary movement.", sort_order: 5, levels: [fallbackLevel("zouk-mode-on-dana", "Zouk mode on by Dana", "open_level", "An open-level journey through Zouk connection, flow and continuous movement.", 1, { teacher: "Dana", day: "Sunday", time: "17:00", duration: "75 min", content: ["Zouk basic step", "Connection and elasticity", "Flowing turns", "Safe head-movement foundations"] })], styles: [] },
];

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("en-US").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function mergeWithStarterCatalog(remoteGroups: CourseGroup[]) {
  const starterBySlug = new Map(fallbackCatalog.map((group) => [group.slug, group]));
  const merged = new Map<string, CourseGroup>();
  const legacyGroups = new Set(["salsa & bachata", "salsa and bachata"]);

  for (const remoteGroup of remoteGroups) {
    if (legacyGroups.has(normalized(remoteGroup.name))) continue;
    const starter = starterBySlug.get(remoteGroup.slug);
    if (!starter) {
      merged.set(remoteGroup.slug, remoteGroup);
      continue;
    }
    const normalizedRemoteStyles = remoteGroup.styles.map((style) => style.slug === "salsa-cubana-afro" ? { ...style, name: "Salsa cubana", slug: "salsa-cubana" } : style);
    const remoteStylesBySlug = new Map(normalizedRemoteStyles.map((style) => [style.slug, style]));
    const starterStyleSlugs = new Set(starter.styles.map((style) => style.slug));
    const styles = starter.styles.map((starterStyle) => {
      const remoteStyle = remoteStylesBySlug.get(starterStyle.slug);
      if (!remoteStyle) return starterStyle;
      const starterLevelsByCode = new Map(starterStyle.levels.map((level) => [level.code, level]));
      const levels = remoteStyle.levels.length > 0
        ? remoteStyle.levels.map((level) => ({ ...starterLevelsByCode.get(level.code), ...level }))
        : starterStyle.levels;
      return { ...starterStyle, ...remoteStyle, levels };
    }).concat(normalizedRemoteStyles.filter((style) => !starterStyleSlugs.has(style.slug)));
    const starterLevelsByCode = new Map(starter.levels.map((level) => [level.code, level]));
    const levels = remoteGroup.levels.length > 0
      ? remoteGroup.levels.map((level) => ({ ...starterLevelsByCode.get(level.code), ...level }))
      : starter.levels;
    merged.set(remoteGroup.slug, { ...starter, ...remoteGroup, styles: styles.length > 0 ? styles : remoteGroup.styles, levels });
  }
  for (const starter of fallbackCatalog) {
    if (!merged.has(starter.slug)) merged.set(starter.slug, starter);
  }
  return [...merged.values()].sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name));
}

export async function getCourseGroups(): Promise<CourseGroup[]> {
  if (!supabase) return [];
  const [groupsResult, stylesResult, levelsResult] = await Promise.all([
    supabase.from("course_groups").select("id, name, slug, description, sort_order").eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true }),
    supabase.from("courses").select("id, name, slug, description, image_url, course_group_id").eq("is_active", true).order("name", { ascending: true }),
    supabase.from("course_levels").select("id, course_id, name, level_code, description, sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
  ]);
  if (groupsResult.error || stylesResult.error || levelsResult.error || !groupsResult.data) return [];

  const levelsByStyle = new Map<string, CatalogLevel[]>();
  for (const row of levelsResult.data ?? []) {
    const levels = levelsByStyle.get(row.course_id) ?? [];
    levels.push({ id: row.id, name: row.name, code: row.level_code, description: row.description ?? null, sort_order: row.sort_order ?? 0 });
    levelsByStyle.set(row.course_id, levels);
  }
  const stylesByGroup = new Map<string, CatalogStyle[]>();
  const directLevelsByGroup = new Map<string, CatalogLevel[]>();
  for (const row of stylesResult.data ?? []) {
    const levels = levelsByStyle.get(row.id) ?? [];
    const groupId = row.course_group_id;
    if (!groupId) continue;
    const group = groupsResult.data.find((item) => item.id === groupId);
    const isDirectLevelSet = Boolean(group && normalized(row.name) === normalized(group.name));
    if (isDirectLevelSet) {
      directLevelsByGroup.set(groupId, levels);
      continue;
    }
    const styles = stylesByGroup.get(groupId) ?? [];
    styles.push({ id: row.id, name: row.name, slug: row.slug, description: row.description ?? null, image_url: row.image_url ?? null, levels });
    stylesByGroup.set(groupId, styles);
  }
  return groupsResult.data.map((group) => ({ id: group.id, name: group.name, slug: group.slug, description: group.description ?? null, sort_order: group.sort_order ?? 0, styles: stylesByGroup.get(group.id) ?? [], levels: directLevelsByGroup.get(group.id) ?? [] }));
}

export async function getCourseCatalog(): Promise<CourseGroup[]> {
  const remoteGroups = await getCourseGroups();
  return remoteGroups.length > 0 ? mergeWithStarterCatalog(remoteGroups) : fallbackCatalog;
}
