import { supabase } from "./supabase";

export type PublicEvent = {
  id: string;
  title: string;
  type: string;
  date: string;
  location: string;
};

function normalizeEventType(value: string | null) {
  const type = (value ?? "workshop").toLocaleLowerCase("en-US");
  if (type.includes("party") || type.includes("social") || type.includes("fiesta")) return "party";
  if (type.includes("festival")) return "festival";
  return "workshop";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export async function getPublishedEvents(): Promise<PublicEvent[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("events")
    .select("id, title, event_type, start_date, location")
    .eq("is_active", true)
    .order("start_date", { ascending: true });

  if (error || !data || data.length === 0) return null;
  return (data ?? []).map((event) => ({
    id: event.id,
    title: event.title,
    type: normalizeEventType(event.event_type),
    date: formatDate(event.start_date),
    location: event.location ?? "—",
  }));
}
