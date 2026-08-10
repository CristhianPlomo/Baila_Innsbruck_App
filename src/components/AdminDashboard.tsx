import { useEffect, useState, type FormEvent } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  CircleDollarSign,
  CreditCard,
  Database,
  Edit3,
  Eye,
  EyeOff,
  Globe2,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Plus,
  PartyPopper,
  QrCode,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Ticket,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import type { Account } from "../lib/account";
import { getAdminUserDetails, getAdminWorkspaceData, type AdminClassRecord, type AdminCourseGroupRecord, type AdminCoursePriceRecord, type AdminCourseRecord, type AdminLevelRecord, type AdminMembershipRecord, type AdminTeacherRecord, type AdminUserDetail, type AdminUserRecord } from "../lib/admin-data";
import { createManualUser, getManualUserEndpoint, type ManualAccessMode, type ManualAppRole, type ManualCommercialCategory, type ManualDanceRole, type ManualUserDraft } from "../lib/admin-manual-users";
import { deleteAdminClass, deleteAdminCourse, deleteAdminEvent, deleteAdminGroup, deleteAdminLevel, saveAdminClass, saveAdminCourse, saveAdminEvent, saveAdminGroup, saveAdminLevel, saveAdminUser, updateAdminOrderStatus as persistAdminOrderStatus } from "../lib/admin-mutations";
import { getAdminStudioSettings, resetAdminStudioSettings, saveAdminStudioSettings, type AdminStudioSettings } from "../lib/admin-settings";
import { getSimulatedClassPaymentRequests, updateSimulatedClassPaymentStatus, type UserPurchase } from "../lib/purchases";
import { isStripeCheckoutConfigured } from "../lib/stripe-checkout";
import { isSupabaseConfigured } from "../lib/supabase";
import AdminQrControl from "./AdminQrControl";
import AdminLogs from "./AdminLogs";
import ConfirmDialog from "./ConfirmDialog";

type AdminTab = "overview" | "users" | "members" | "events" | "classes" | "orders" | "manual-user" | "qr-control" | "logs" | "settings";
type EventCategory = "all" | "party" | "workshop" | "festival";

function isAdminTab(value: string | null): value is AdminTab {
  return value === "overview" || value === "users" || value === "members" || value === "events" || value === "classes" || value === "orders" || value === "manual-user" || value === "qr-control" || value === "logs" || value === "settings";
}

function adminTabFromPath(pathname: string): AdminTab {
  const segment = pathname.split("/")[2] ?? null;
  return isAdminTab(segment) ? segment : "overview";
}

type AdminClass = AdminClassRecord;
type AdminCourse = AdminCourseRecord;
type AdminGroup = AdminCourseGroupRecord;

type AdminEvent = {
  id: string;
  title: string;
  type: string;
  date: string;
  startDate?: string;
  location: string;
  capacity: number;
  status: "published" | "draft";
};

type AdminOrder = {
  id: string;
  customer: string;
  product: string;
  date: string;
  amount: string;
  status: "paid" | "pending" | "refunded";
};

type ConfirmationRequest = {
  title: string;
  copy: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
};

type AdminMember = {
  id: string;
  name: string;
  email: string;
  role: "leader" | "follower" | "both";
  status: "active" | "pending";
};

type AdminUser = AdminUserRecord;
type AdminMembership = AdminMembershipRecord;

const initialClasses: AdminClass[] = [
  { id: "class-1", title: "Salsa On2", description: "", disciplineId: "", disciplineName: "Salsa", levelId: "", levelName: "Intermediate / Advanced", level: "Intermediate / Advanced", date: "", startDate: "", endDate: "", teacherId: undefined, teacher: "", location: "", period: "", durationText: "", durationHours: undefined, classesPerWeek: 1, imageUrl: "", capacity: 24, enrolled: 18, active: true, visible: true, status: "active", prices: [] },
  { id: "class-2", title: "Bachata Sensual", description: "", disciplineId: "", disciplineName: "Bachata", levelId: "", levelName: "Beginner", level: "Beginner", date: "", startDate: "", endDate: "", teacherId: undefined, teacher: "", location: "", period: "", durationText: "", durationHours: undefined, classesPerWeek: 1, imageUrl: "", capacity: 24, enrolled: 21, active: true, visible: true, status: "active", prices: [] },
  { id: "class-3", title: "Bachata Sensual", description: "", disciplineId: "", disciplineName: "Bachata", levelId: "", levelName: "Improver", level: "Improver", date: "", startDate: "", endDate: "", teacherId: undefined, teacher: "", location: "", period: "", durationText: "", durationHours: undefined, classesPerWeek: 1, imageUrl: "", capacity: 24, enrolled: 16, active: true, visible: true, status: "active", prices: [] },
  { id: "class-4", title: "Yoga for dancers", description: "", disciplineId: "", disciplineName: "Yoga", levelId: "", levelName: "Open Level", level: "Open Level", date: "", startDate: "", endDate: "", teacherId: undefined, teacher: "", location: "", period: "", durationText: "", durationHours: undefined, classesPerWeek: 1, imageUrl: "", capacity: 18, enrolled: 8, active: true, visible: true, status: "active", prices: [] },
];

const initialEvents: AdminEvent[] = [
  { id: "event-1", title: "Summer movement workshop", type: "Workshop", date: "12–13 Jul 2026", location: "Baila Studio · Innsbruck", capacity: 60, status: "published" },
  { id: "event-2", title: "Baila community night", type: "Social", date: "25 Jul 2026 · 20:00", location: "KulturQuartier · Innsbruck", capacity: 120, status: "published" },
  { id: "event-3", title: "Autumn dance intensive", type: "Intensive", date: "05–06 Sep 2026", location: "Baila Studio · Innsbruck", capacity: 48, status: "draft" },
];

const initialOrders: AdminOrder[] = [
  { id: "BAI-2026-014", customer: "Anna Müller", product: "Monthly class pass", date: "18 Jun 2026", amount: "€79", status: "paid" },
  { id: "BAI-2026-013", customer: "Luis García", product: "Bachata workshop ticket", date: "17 Jun 2026", amount: "€35", status: "paid" },
  { id: "BAI-2026-012", customer: "Mia Hofer", product: "Summer movement workshop", date: "16 Jun 2026", amount: "€49", status: "pending" },
];

function emptyClass(courses: AdminCourse[]): AdminClass {
  const discipline = courses[0];
  const level = discipline?.levels[0];
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 3);
  const dateValue = (value: Date) => value.toISOString().slice(0, 10);
  return { id: `class-${Date.now()}`, title: "", description: "", disciplineId: discipline?.id ?? "", disciplineName: discipline?.name ?? "", levelId: level?.id ?? "", levelName: level?.name ?? "", level: level?.name ?? "", startDate: dateValue(startDate), endDate: dateValue(endDate), teacherId: undefined, teacher: "", location: "", period: "", durationText: "", durationHours: undefined, classesPerWeek: 1, imageUrl: "", capacity: 20, enrolled: 0, active: false, visible: true, status: "draft", prices: [] };
}

function emptyCourse(sortOrder: number): AdminCourse {
  return { id: `course-${Date.now()}`, name: "", slug: "", description: "", imageUrl: "", sortOrder, active: true, levels: [] };
}

function emptyGroup(sortOrder: number): AdminGroup {
  return { id: `group-${Date.now()}`, name: "", slug: "", description: "", sortOrder, active: true };
}

function emptyLevel(courses: AdminCourse[]): AdminLevelRecord {
  return { id: `level-${Date.now()}`, courseId: courses[0]?.id ?? "", name: "Beginner", code: "beginner", description: "", sortOrder: 1, active: true };
}

function emptyEvent(): AdminEvent {
  return { id: `event-${Date.now()}`, title: "", type: "workshop", date: "", location: "Baila Studio · Innsbruck", capacity: 40, status: "draft" };
}

export default function AdminDashboard({ account }: { account: Account }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = adminTabFromPath(location.pathname);
  const [classes, setClasses] = useState(initialClasses);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacherRecord[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [events, setEvents] = useState(initialEvents);
  const [orders, setOrders] = useState(initialOrders);
  const [classDraft, setClassDraft] = useState<AdminClass | null>(null);
  const [groupDraft, setGroupDraft] = useState<AdminGroup | null>(null);
  const [courseDraft, setCourseDraft] = useState<AdminCourse | null>(null);
  const [levelDraft, setLevelDraft] = useState<AdminLevelRecord | null>(null);
  const [eventDraft, setEventDraft] = useState<AdminEvent | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [memberships, setMemberships] = useState<AdminMembership[]>([]);
  const [userDraft, setUserDraft] = useState<AdminUser | null>(null);
  const [eventCategory, setEventCategory] = useState<EventCategory>("all");
  const [dataSource, setDataSource] = useState<"loading" | "remote" | "fallback">("loading");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);
  const isWorkspaceLoading = dataSource === "loading";

  useEffect(() => {
    let mounted = true;
    getAdminWorkspaceData().then((remoteData) => {
      if (!mounted) return;
      if (!remoteData) {
        setDataSource("fallback");
        return;
      }
      setUsers(remoteData.users);
      setMemberships(remoteData.memberships);
      setGroups(remoteData.groups);
      setTeachers(remoteData.teachers);
      setCourses(remoteData.courses);
      if (remoteData.events.length > 0) setEvents(remoteData.events);
      if (remoteData.classes.length > 0) setClasses(remoteData.classes);
      if (remoteData.orders.length > 0) setOrders(remoteData.orders);
      setDataSource("remote");
    }).catch(() => {
      if (mounted) setDataSource("fallback");
    });
    return () => { mounted = false; };
  }, []);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function requestConfirmation(request: ConfirmationRequest) {
    setConfirmation(request);
  }

  function confirmPendingAction() {
    const action = confirmation?.onConfirm;
    setConfirmation(null);
    action?.();
  }

  function selectTab(tab: AdminTab) {
    navigate(tab === "overview" ? "/admin" : `/admin/${tab}`);
  }

  function saveClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classDraft?.title.trim()) return;
    const draft = classDraft;
    const commit = () => void saveAdminClass(draft).then((result) => {
      if (!result.ok) {
        const message = result.code === "courseLevelRequired" ? t("admin.courseLevelRequired") : result.code === "courseLevelMismatch" ? t("admin.courseLevelMismatch") : result.code === "classesPerWeekInvalid" ? t("admin.classesPerWeekInvalid") : result.code === "durationHoursInvalid" ? t("admin.durationHoursInvalid") : result.code === "pricesSaveFailed" ? t("admin.pricesSaveFailed") : result.code === "imageInvalid" ? t("admin.imageInvalid") : t("admin.saveFailed");
        showNotice(message);
        return;
      }
      const savedClass = { ...classDraft, id: result.recordId ?? classDraft.id, level: classDraft.levelName };
      setClasses((current) => current.some((item) => item.id === classDraft.id) ? current.map((item) => item.id === classDraft.id ? savedClass : item) : [...current, savedClass]);
      setClassDraft(null);
      showNotice(t("admin.saved"));
    });
    const draftWarning = !draft.active || draft.status === "draft";
    requestConfirmation({ title: t(draftWarning ? "confirmations.saveDraftTitle" : "confirmations.saveTitle"), copy: t(draftWarning ? "confirmations.saveDraftCopy" : "confirmations.saveCopy"), confirmLabel: t(draftWarning ? "confirmations.saveAnyway" : "confirmations.confirm"), onConfirm: commit });
  }

  function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseDraft?.name.trim()) return;
    const draft = courseDraft;
    const commit = () => void saveAdminCourse(draft).then((result) => {
      if (!result.ok || !result.course) {
        showNotice(t("admin.saveFailed"));
        return;
      }
      const savedCourse = { ...result.course, catalogGroupName: groups.find((group) => group.id === result.course?.catalogGroupId)?.name };
      setCourses((current) => current.some((item) => item.id === courseDraft.id) ? current.map((item) => item.id === courseDraft.id ? savedCourse : item) : [...current, savedCourse]);
      setCourseDraft(null);
      showNotice(t("admin.saved"));
    });
    requestConfirmation({ title: t(draft.active ? "confirmations.saveTitle" : "confirmations.saveDraftTitle"), copy: t(draft.active ? "confirmations.saveCopy" : "confirmations.saveDraftCopy"), confirmLabel: t(draft.active ? "confirmations.confirm" : "confirmations.saveAnyway"), onConfirm: commit });
  }

  function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupDraft?.name.trim()) return;
    const draft = groupDraft;
    const commit = () => void saveAdminGroup(draft).then((result) => {
      if (!result.ok || !result.group) {
        showNotice(t("admin.saveFailed"));
        return;
      }
      setGroups((current) => current.some((item) => item.id === groupDraft.id) ? current.map((item) => item.id === groupDraft.id ? result.group! : item) : [...current, result.group!]);
      setGroupDraft(null);
      showNotice(t("admin.saved"));
    });
    requestConfirmation({ title: t(draft.active ? "confirmations.saveTitle" : "confirmations.saveDraftTitle"), copy: t(draft.active ? "confirmations.saveCopy" : "confirmations.saveDraftCopy"), confirmLabel: t(draft.active ? "confirmations.confirm" : "confirmations.saveAnyway"), onConfirm: commit });
  }

  function saveLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!levelDraft?.name.trim() || !levelDraft.courseId) return;
    const draft = levelDraft;
    const commit = () => void saveAdminLevel(draft).then((result) => {
      if (!result.ok || !result.level) {
        const message = result.code === "levelHasClasses" ? t("admin.levelHasClasses") : result.code === "levelHasProducts" ? t("admin.levelHasProducts") : t("admin.saveFailed");
        showNotice(message);
        return;
      }
      setCourses((current) => current.map((course) => course.id === result.level?.courseId ? { ...course, levels: course.levels.some((level) => level.id === result.level?.id) ? course.levels.map((level) => level.id === result.level?.id ? result.level! : level) : [...course.levels, result.level!] } : course));
      setLevelDraft(null);
      showNotice(t("admin.saved"));
    });
    requestConfirmation({ title: t(draft.active ? "confirmations.saveTitle" : "confirmations.saveDraftTitle"), copy: t(draft.active ? "confirmations.saveCopy" : "confirmations.saveDraftCopy"), confirmLabel: t(draft.active ? "confirmations.confirm" : "confirmations.saveAnyway"), onConfirm: commit });
  }

  function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventDraft?.title.trim()) return;
    const draft = eventDraft;
    const commit = () => void saveAdminEvent(draft).then((result) => {
      if (!result.ok) {
        showNotice(t("admin.saveFailed"));
        return;
      }
      setEvents((current) => current.some((item) => item.id === eventDraft.id) ? current.map((item) => item.id === eventDraft.id ? eventDraft : item) : [...current, eventDraft]);
      setEventDraft(null);
      showNotice(t("admin.saved"));
    });
    const draftWarning = draft.status === "draft";
    requestConfirmation({ title: t(draftWarning ? "confirmations.saveDraftTitle" : "confirmations.saveTitle"), copy: t(draftWarning ? "confirmations.saveDraftCopy" : "confirmations.saveCopy"), confirmLabel: t(draftWarning ? "confirmations.saveAnyway" : "confirmations.confirm"), onConfirm: commit });
  }

  function deleteClass(id: string) {
    const item = classes.find((current) => current.id === id);
    requestConfirmation({ title: t("confirmations.deleteTitle", { item: item?.title || t("admin.table.class") }), copy: t("confirmations.deleteCopy"), confirmLabel: t("confirmations.delete"), destructive: true, onConfirm: () => void deleteAdminClass(id).then((result) => {
      if (!result.ok) {
        showNotice(t("admin.saveFailed"));
        return;
      }
      setClasses((current) => current.filter((item) => item.id !== id));
      showNotice(t("admin.deleted"));
    }) });
  }

  function deleteCourse(id: string) {
    const item = courses.find((current) => current.id === id);
    requestConfirmation({ title: t("confirmations.deleteTitle", { item: item?.name || t("admin.table.course") }), copy: t("confirmations.deleteCopy"), confirmLabel: t("confirmations.delete"), destructive: true, onConfirm: () => void deleteAdminCourse(id).then((result) => {
      if (!result.ok) {
        showNotice(result.code === "courseHasInstances" ? t("admin.courseHasInstances") : t("admin.saveFailed"));
        return;
      }
      setCourses((current) => current.filter((course) => course.id !== id));
      showNotice(t("admin.deleted"));
    }) });
  }

  function deleteLevel(id: string) {
    const item = courses.flatMap((course) => course.levels).find((level) => level.id === id);
    requestConfirmation({ title: t("confirmations.deleteTitle", { item: item?.name || t("admin.levelName") }), copy: t("confirmations.deleteCopy"), confirmLabel: t("confirmations.delete"), destructive: true, onConfirm: () => void deleteAdminLevel(id).then((result) => {
      if (!result.ok) {
        showNotice(result.code === "levelHasClasses" ? t("admin.levelHasClasses") : result.code === "levelHasProducts" ? t("admin.levelHasProducts") : t("admin.saveFailed"));
        return;
      }
      setCourses((current) => current.map((course) => ({ ...course, levels: course.levels.filter((level) => level.id !== id) })));
      showNotice(t("admin.deleted"));
    }) });
  }

  function deleteGroup(id: string) {
    const item = groups.find((current) => current.id === id);
    requestConfirmation({ title: t("confirmations.deleteTitle", { item: item?.name || t("admin.table.group") }), copy: t("confirmations.deleteCopy"), confirmLabel: t("confirmations.delete"), destructive: true, onConfirm: () => void deleteAdminGroup(id).then((result) => {
      if (!result.ok) {
        showNotice(result.code === "courseGroupHasCourses" ? t("admin.groupHasCourses") : t("admin.saveFailed"));
        return;
      }
      setGroups((current) => current.filter((group) => group.id !== id));
      showNotice(t("admin.deleted"));
    }) });
  }

  function deleteEvent(id: string) {
    const item = events.find((current) => current.id === id);
    requestConfirmation({ title: t("confirmations.deleteTitle", { item: item?.title || t("admin.eventsTitle") }), copy: t("confirmations.deleteCopy"), confirmLabel: t("confirmations.delete"), destructive: true, onConfirm: () => void deleteAdminEvent(id).then((result) => {
      if (!result.ok) {
        showNotice(t("admin.saveFailed"));
        return;
      }
      setEvents((current) => current.filter((item) => item.id !== id));
      showNotice(t("admin.deleted"));
    }) });
  }

  function updateOrderStatus(id: string, status: AdminOrder["status"]) {
    const order = orders.find((current) => current.id === id);
    if (!order || order.status === status) return;
    requestConfirmation({ title: t("confirmations.statusTitle"), copy: t("confirmations.statusCopy"), confirmLabel: t("confirmations.confirm"), onConfirm: () => void persistAdminOrderStatus(id, status).then((result) => {
      if (!result.ok) {
        showNotice(t("admin.saveFailed"));
        return;
      }
      setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
      showNotice(t("admin.saved"));
    }) });
  }

  function saveUser(user: AdminUser) {
    requestConfirmation({ title: t("confirmations.saveTitle"), copy: t("confirmations.saveCopy"), confirmLabel: t("confirmations.confirm"), onConfirm: () => void saveAdminUser(user).then((result) => {
      if (!result.ok) {
        showNotice(t("admin.saveFailed"));
        return;
      }
      setUsers((current) => current.map((item) => item.id === user.id ? user : item));
      setUserDraft(null);
      showNotice(t("admin.saved"));
    }) });
  }

  return (
    <div className="page-stack admin-shell">
      <section className="admin-hero">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" />{t("admin.eyebrow")}</p>
          <h1>{t("admin.title")}</h1>
          <p className="lead">{t("admin.copy")}</p>
        </div>
        <div className="admin-identity"><ShieldCheck size={20} /><span><strong>{t("admin.owner")}</strong><small>{account.email}</small></span></div>
      </section>

      <div className="admin-data-notice"><Activity size={16} /><span>{dataSource === "remote" ? t("admin.remoteNotice") : dataSource === "loading" ? t("admin.loadingNotice") : t("admin.localNotice")}</span></div>
      {notice && <p className="form-message success" role="status"><Check size={15} />{notice}</p>}
      {activeTab === "overview" && (isWorkspaceLoading ? <AdminLoadingPanel /> : <AdminOverview classes={classes} events={events} orders={orders} onSelect={selectTab} />)}
      {activeTab === "users" && (isWorkspaceLoading ? <AdminLoadingPanel /> : <AdminUsers users={users} account={account} draft={userDraft} onEdit={setUserDraft} onCancel={() => setUserDraft(null)} onSave={saveUser} />)}
      {activeTab === "members" && (isWorkspaceLoading ? <AdminLoadingPanel /> : <AdminMembersRemote account={account} memberships={memberships} />)}
      {activeTab === "manual-user" && <ManualUserForm />}
      {activeTab === "classes" && (isWorkspaceLoading ? <AdminLoadingPanel /> : <AdminCoursesAndClasses groups={groups} groupDraft={groupDraft} onCreateGroup={() => setGroupDraft(emptyGroup(groups.length))} onEditGroup={setGroupDraft} onCancelGroup={() => setGroupDraft(null)} onChangeGroup={setGroupDraft} onSaveGroup={saveGroup} onDeleteGroup={deleteGroup} courses={courses} courseDraft={courseDraft} onCreateCourse={() => setCourseDraft(emptyCourse(courses.length))} onEditCourse={setCourseDraft} onCancelCourse={() => setCourseDraft(null)} onChangeCourse={setCourseDraft} onSaveCourse={saveCourse} onDeleteCourse={deleteCourse} levelDraft={levelDraft} onCreateLevel={() => setLevelDraft(emptyLevel(courses))} onEditLevel={setLevelDraft} onCancelLevel={() => setLevelDraft(null)} onChangeLevel={setLevelDraft} onSaveLevel={saveLevel} onDeleteLevel={deleteLevel} classes={classes} teachers={teachers} draft={classDraft} onCreate={() => setClassDraft(emptyClass(courses))} onEdit={setClassDraft} onCancel={() => setClassDraft(null)} onChange={setClassDraft} onSave={saveClass} onDelete={deleteClass} />)}
      {activeTab === "events" && (isWorkspaceLoading ? <AdminLoadingPanel /> : <AdminEventsWithCategories events={events} category={eventCategory} onCategoryChange={setEventCategory} draft={eventDraft} onCreate={() => setEventDraft(emptyEvent())} onEdit={setEventDraft} onCancel={() => setEventDraft(null)} onChange={setEventDraft} onSave={saveEvent} onDelete={deleteEvent} />)}
      {activeTab === "orders" && (isWorkspaceLoading ? <AdminLoadingPanel /> : <AdminOrders orders={orders} onStatusChange={updateOrderStatus} />)}
      {activeTab === "qr-control" && <AdminQrControl />}
      {activeTab === "logs" && <AdminLogs />}
      {activeTab === "settings" && <AdminSettings />}
      <ConfirmDialog open={Boolean(confirmation)} eyebrow={t("confirmations.eyebrow")} title={confirmation?.title ?? ""} copy={confirmation?.copy ?? ""} confirmLabel={confirmation?.confirmLabel ?? t("confirmations.confirm")} cancelLabel={t("confirmations.cancel")} destructive={confirmation?.destructive} onConfirm={confirmPendingAction} onCancel={() => setConfirmation(null)} />
    </div>
  );
}

function AdminLoadingPanel() {
  const { t } = useTranslation();
  return <section className="admin-panel admin-loading-state" aria-live="polite"><Activity size={20} /><span>{t("admin.loadingNotice")}</span></section>;
}

function AdminOverview({ classes, events, orders, onSelect }: { classes: AdminClass[]; events: AdminEvent[]; orders: AdminOrder[]; onSelect: (tab: AdminTab) => void }) {
  const { t } = useTranslation();
  const pendingOrders = orders.filter((order) => order.status === "pending").length;
  return <div className="admin-content-grid">
    <div className="admin-stat-grid"><AdminStat icon={Users} value="128" label={t("admin.stats.members")} accent="turquoise" /><AdminStat icon={CalendarDays} value={String(classes.length)} label={t("admin.stats.classes")} accent="gold" /><AdminStat icon={Activity} value={String(events.length)} label={t("admin.stats.events")} accent="ink" /><AdminStat icon={CircleDollarSign} value="€2,840" label={t("admin.stats.revenue")} accent="sand" /></div>
    <section className="admin-panel admin-panel-dark"><div className="admin-panel-heading"><div><p className="eyebrow">{t("admin.activityEyebrow")}</p><h2>{t("admin.activityTitle")}</h2></div><Activity size={20} /></div><div className="admin-activity-list"><p><span className="activity-dot gold" />{t("admin.activity.signup")}</p><p><span className="activity-dot turquoise" />{t("admin.activity.order")}</p><p><span className="activity-dot sand" />{t("admin.activity.event")}</p></div></section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">{t("admin.attentionEyebrow")}</p><h2>{t("admin.attentionTitle")}</h2></div><ShieldCheck size={20} /></div><div className="admin-attention-list"><button type="button" onClick={() => onSelect("orders")}><strong>{pendingOrders}</strong><span>{t("admin.pendingOrders")}</span></button><button type="button" onClick={() => onSelect("events")}><strong>{events.filter((event) => event.status === "draft").length}</strong><span>{t("admin.drafts")}</span></button></div></section>
    <section className="admin-quick-actions"><div><p className="eyebrow">{t("admin.quickEyebrow")}</p><h2>{t("admin.quickTitle")}</h2></div><button type="button" className="primary-button small" onClick={() => onSelect("classes")}><Plus size={16} />{t("admin.newClass")}</button><button type="button" className="secondary-button" onClick={() => onSelect("events")}><Plus size={16} />{t("admin.newEvent")}</button></section>
    <AdminInsights />
  </div>;
}

function AdminInsights() {
  const { t } = useTranslation();
  const months = [
    { key: "jan", value: "1,820", height: 44 },
    { key: "feb", value: "2,140", height: 52 },
    { key: "mar", value: "2,480", height: 61 },
    { key: "apr", value: "2,260", height: 56 },
    { key: "may", value: "2,930", height: 72 },
    { key: "jun", value: "3,180", height: 79 },
    { key: "jul", value: "3,460", height: 88 },
    { key: "aug", value: "2,840", height: 70 },
  ];
  const ticketTypes = [
    { key: "parties", value: "42", className: "gold" },
    { key: "workshops", value: "68", className: "turquoise" },
    { key: "specialEvents", value: "31", className: "sand" },
  ];
  return <section className="admin-insights admin-panel">
    <div className="admin-panel-heading"><div><p className="eyebrow"><BarChart3 size={13} />{t("admin.insights.eyebrow")}</p><h2>{t("admin.insights.title")}</h2><p className="admin-insights-copy">{t("admin.insights.copy")}</p></div><span className="admin-planning-badge"><TrendingUp size={14} />{t("admin.insights.planningBadge")}</span></div>
    <div className="admin-insights-summary"><div className="admin-insight-summary-card gold"><CircleDollarSign size={17} /><span>{t("admin.insights.monthlyRevenue")}</span><strong>€2,840</strong><small>+18.4% · {t("admin.insights.vsPreviousMonth")}</small></div><div className="admin-insight-summary-card turquoise"><Users size={17} /><span>{t("admin.insights.monthlyRegistrations")}</span><strong>24</strong><small>+6 · {t("admin.insights.newThisMonth")}</small></div><div className="admin-insight-summary-card ink"><GraduationCap size={17} /><span>{t("admin.insights.annualStudents")}</span><strong>86</strong><small>{t("admin.insights.newStudentsThisYear")}</small></div><div className="admin-insight-summary-card sand"><Ticket size={17} /><span>{t("admin.insights.annualTickets")}</span><strong>141</strong><small>{t("admin.insights.ticketsSoldThisYear")}</small></div></div>
    <div className="admin-insights-grid"><div className="admin-insight-chart"><div className="admin-insight-card-heading"><div><p className="eyebrow">{t("admin.insights.revenueEyebrow")}</p><h3>{t("admin.insights.revenueTitle")}</h3></div><span>{t("admin.insights.year")}</span></div><div className="admin-bars" role="img" aria-label={t("admin.insights.revenueChartLabel")}>{months.map((month) => <div className="admin-bar-column" key={month.key}><strong>€{month.value}</strong><div className="admin-bar-track"><span style={{ height: `${month.height}%` }} /></div><small>{t(`admin.insights.months.${month.key}`)}</small></div>)}</div></div><div className="admin-insight-card"><div className="admin-insight-card-heading"><div><p className="eyebrow">{t("admin.insights.ticketsEyebrow")}</p><h3>{t("admin.insights.ticketsTitle")}</h3></div><Ticket size={18} /></div><div className="admin-ticket-list">{ticketTypes.map((item) => <div className="admin-ticket-row" key={item.key}><span className={`activity-dot ${item.className}`} /><span>{t(`admin.insights.ticketTypes.${item.key}`)}</span><strong>{item.value}</strong></div>)}</div><p className="admin-insight-footnote">{t("admin.insights.dataNote")}</p></div></div>
  </section>;
}

function AdminStat({ icon: Icon, value, label, accent }: { icon: typeof Users; value: string; label: string; accent: string }) {
  return <div className={`admin-stat ${accent}`}><span><Icon size={17} /></span><strong>{value}</strong><small>{label}</small></div>;
}

function AdminCoursesAndClasses({ groups, groupDraft, onCreateGroup, onEditGroup, onCancelGroup, onChangeGroup, onSaveGroup, onDeleteGroup, courses, courseDraft, onCreateCourse, onEditCourse, onCancelCourse, onChangeCourse, onSaveCourse, onDeleteCourse, levelDraft, onCreateLevel, onEditLevel, onCancelLevel, onChangeLevel, onSaveLevel, onDeleteLevel, classes, teachers, draft, onCreate, onEdit, onCancel, onChange, onSave, onDelete }: { groups: AdminGroup[]; groupDraft: AdminGroup | null; onCreateGroup: () => void; onEditGroup: (group: AdminGroup) => void; onCancelGroup: () => void; onChangeGroup: (group: AdminGroup | null) => void; onSaveGroup: (event: FormEvent<HTMLFormElement>) => void; onDeleteGroup: (id: string) => void; courses: AdminCourse[]; courseDraft: AdminCourse | null; onCreateCourse: () => void; onEditCourse: (course: AdminCourse) => void; onCancelCourse: () => void; onChangeCourse: (course: AdminCourse | null) => void; onSaveCourse: (event: FormEvent<HTMLFormElement>) => void; onDeleteCourse: (id: string) => void; levelDraft: AdminLevelRecord | null; onCreateLevel: () => void; onEditLevel: (level: AdminLevelRecord) => void; onCancelLevel: () => void; onChangeLevel: (level: AdminLevelRecord | null) => void; onSaveLevel: (event: FormEvent<HTMLFormElement>) => void; onDeleteLevel: (id: string) => void; classes: AdminClass[]; teachers: AdminTeacherRecord[]; draft: AdminClass | null; onCreate: () => void; onEdit: (item: AdminClass) => void; onCancel: () => void; onChange: (item: AdminClass | null) => void; onSave: (event: FormEvent<HTMLFormElement>) => void; onDelete: (id: string) => void }) {
  const { t } = useTranslation();
  const levelRows = courses.flatMap((course) => course.levels.map((level) => ({ ...level, courseName: course.name })));
  return <section className="admin-panel admin-list-panel">
    <div className="admin-subsection">
      <AdminListHeader eyebrow={t("admin.groupsEyebrow")} title={t("admin.groupsTitle")} actionLabel={t("admin.newGroup")} onAction={onCreateGroup} />
      {groupDraft && <GroupForm draft={groupDraft} onChange={onChangeGroup} onCancel={onCancelGroup} onSave={onSaveGroup} />}
      {groups.length > 0 ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t("admin.table.group")}</th><th>{t("admin.table.course")}</th><th>{t("admin.table.status")}</th><th><span className="sr-only">{t("admin.table.actions")}</span></th></tr></thead><tbody>{groups.map((group) => <tr key={group.id}><td><strong>{group.name}</strong><small>{group.slug}</small></td><td>{courses.filter((course) => course.catalogGroupId === group.id).length}</td><td><span className={`admin-status ${group.active ? "active" : "draft"}`}>{group.active ? t("admin.status.active") : t("admin.status.draft")}</span></td><td className="admin-actions"><button type="button" onClick={() => onEditGroup(group)} aria-label={`${t("admin.edit")} ${group.name}`} title={t("admin.edit")}><Edit3 size={15} /><span>{t("admin.edit")}</span></button><button type="button" onClick={() => onDeleteGroup(group.id)} aria-label={`${t("admin.delete")} ${group.name}`} title={t("admin.delete")}><Trash2 size={15} /><span>{t("admin.delete")}</span></button></td></tr>)}</tbody></table></div> : <div className="empty-state"><BookOpen size={22} /><strong>{t("admin.noCourses")}</strong><p>{t("admin.noCoursesCopy")}</p></div>}
    </div>
    <div className="admin-section-divider" />
    <div className="admin-subsection">
      <AdminListHeader eyebrow={t("admin.levelsEyebrow")} title={t("admin.levelsTitle")} actionLabel={t("admin.newLevel")} onAction={onCreateLevel} />
      {levelDraft && <LevelForm courses={courses} draft={levelDraft} onChange={onChangeLevel} onCancel={onCancelLevel} onSave={onSaveLevel} />}
      {levelRows.length > 0 ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t("admin.parentStyle")}</th><th>{t("admin.levelName")}</th><th>{t("admin.levelDescription")}</th><th>{t("admin.table.status")}</th><th><span className="sr-only">{t("admin.table.actions")}</span></th></tr></thead><tbody>{levelRows.map((level) => <tr key={level.id}><td><strong>{level.courseName}</strong></td><td>{level.name}<small>{level.code}</small></td><td>{level.description || <span className="admin-muted">{t("admin.levelDescription")}</span>}</td><td><span className={`admin-status ${level.active ? "active" : "draft"}`}>{level.active ? t("admin.status.active") : t("admin.status.draft")}</span></td><td className="admin-actions"><button type="button" onClick={() => onEditLevel(level)} aria-label={`${t("admin.edit")} ${level.name}`} title={t("admin.edit")}><Edit3 size={15} /><span>{t("admin.edit")}</span></button><button type="button" onClick={() => onDeleteLevel(level.id)} aria-label={`${t("admin.delete")} ${level.name}`} title={t("admin.delete")}><Trash2 size={15} /><span>{t("admin.delete")}</span></button></td></tr>)}</tbody></table></div> : <div className="empty-state"><GraduationCap size={22} /><strong>{t("admin.noLevels")}</strong><p>{t("admin.noLevelsCopy")}</p></div>}
    </div>
    <div className="admin-section-divider" />
    <div className="admin-subsection">
      <AdminListHeader eyebrow={t("admin.coursesEyebrow")} title={t("admin.coursesTitle")} actionLabel={t("admin.newCourse")} onAction={onCreateCourse} />
      {courseDraft && <CourseForm groups={groups} draft={courseDraft} onChange={onChangeCourse} onCancel={onCancelCourse} onSave={onSaveCourse} />}
      {courses.length > 0 ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t("admin.table.course")}</th><th>{t("admin.table.group")}</th><th>{t("admin.fields.level")}</th><th>{t("admin.table.status")}</th><th><span className="sr-only">{t("admin.table.actions")}</span></th></tr></thead><tbody>{courses.map((course) => <tr key={course.id}><td><strong>{course.name}</strong><small>{course.slug}</small></td><td>{course.catalogGroupName || "—"}</td><td>{course.levels.length > 0 ? <span className="admin-level-list">{course.levels.map((level) => <span className="admin-status active" key={level.id}>{level.name}</span>)}</span> : t("admin.noLevels")}</td><td><span className={`admin-status ${course.active ? "active" : "draft"}`}>{course.active ? t("admin.status.active") : t("admin.status.draft")}</span></td><td className="admin-actions"><button type="button" onClick={() => onEditCourse(course)} aria-label={`${t("admin.edit")} ${course.name}`} title={t("admin.edit")}><Edit3 size={15} /><span>{t("admin.edit")}</span></button><button type="button" onClick={() => onDeleteCourse(course.id)} aria-label={`${t("admin.delete")} ${course.name}`} title={t("admin.delete")}><Trash2 size={15} /><span>{t("admin.delete")}</span></button></td></tr>)}</tbody></table></div> : <div className="empty-state"><BookOpen size={22} /><strong>{t("admin.noCourses")}</strong><p>{t("admin.noCoursesCopy")}</p></div>}
    </div>
    <div className="admin-section-divider" />
    <div className="admin-subsection">
      <AdminListHeader eyebrow={t("admin.classesEyebrow")} title={t("admin.classesTitle")} actionLabel={t("admin.newClass")} onAction={onCreate} />
      {draft && <CourseInstanceForm courses={courses} teachers={teachers} draft={draft} onChange={onChange} onCancel={onCancel} onSave={onSave} />}
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t("admin.table.class")}</th><th>{t("admin.table.weekly")}</th><th>{t("admin.table.teacher")}</th><th>{t("admin.fields.location")}</th><th>{t("admin.table.capacity")}</th><th>{t("admin.table.status")}</th><th><span className="sr-only">{t("admin.table.actions")}</span></th></tr></thead><tbody>{classes.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.disciplineName} / {item.levelName} · {item.period || "—"}</small></td><td>{item.classesPerWeek}</td><td>{item.teacher || "—"}</td><td>{item.location || "—"}</td><td>{item.enrolled} / {item.capacity}</td><td><span className={`admin-status ${item.status}`}>{t(`admin.status.${item.status}`)}</span></td><td className="admin-actions"><button type="button" onClick={() => onEdit(item)} aria-label={`${t("admin.edit")} ${item.title}`} title={t("admin.edit")}><Edit3 size={15} /><span>{t("admin.edit")}</span></button><button type="button" onClick={() => onDelete(item.id)} aria-label={`${t("admin.delete")} ${item.title}`} title={t("admin.delete")}><Trash2 size={15} /><span>{t("admin.delete")}</span></button></td></tr>)}</tbody></table></div>
    </div>
  </section>;
}

function GroupForm({ draft, onChange, onCancel, onSave }: { draft: AdminGroup; onChange: (group: AdminGroup) => void; onCancel: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const { t } = useTranslation();
  return <form className="admin-editor" onSubmit={onSave}><div className="admin-editor-heading"><h3>{t("admin.groupEditor")}</h3><button type="button" onClick={onCancel} aria-label={t("admin.close")}><X size={16} /></button></div><div className="form-grid"><label>{t("admin.fields.title")}<input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} required /></label><label>{t("admin.fields.slug")}<input value={draft.slug || slugPreview(draft.name)} readOnly /></label><label>{t("admin.fields.description")}<input value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} /></label><label>{t("admin.fields.status")}<select value={draft.active ? "active" : "draft"} onChange={(event) => onChange({ ...draft, active: event.target.value === "active" })}><option value="active">{t("admin.status.active")}</option><option value="draft">{t("admin.status.draft")}</option></select></label></div><button className="primary-button small" type="submit"><Save size={16} />{t("admin.save")}</button></form>;
}

function CourseForm({ groups, draft, onChange, onCancel, onSave }: { groups: AdminGroup[]; draft: AdminCourse; onChange: (course: AdminCourse) => void; onCancel: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const { t } = useTranslation();
  return <form className="admin-editor" onSubmit={onSave}><div className="admin-editor-heading"><div><h3>{t("admin.courseEditor")}</h3><small>{t("admin.noStylesCopy")}</small></div><button type="button" onClick={onCancel} aria-label={t("admin.close")}><X size={16} /></button></div><div className="form-grid"><label>{t("admin.fields.title")}<input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value, slug: slugPreview(event.target.value) })} required /></label><label>{t("admin.fields.slug")}<input value={draft.slug || slugPreview(draft.name)} readOnly /></label><label>{t("admin.fields.group")}<select value={draft.catalogGroupId ?? ""} onChange={(event) => onChange({ ...draft, catalogGroupId: event.target.value })} required><option value="">{t("admin.fields.group")}</option>{groups.filter((group) => group.active).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label>{t("admin.fields.description")}<input value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} /></label><label>{t("admin.fields.imageUrl")}<input type="url" value={draft.imageUrl} onChange={(event) => onChange({ ...draft, imageUrl: event.target.value })} /></label><label>{t("admin.fields.status")}<select value={draft.active ? "active" : "draft"} onChange={(event) => onChange({ ...draft, active: event.target.value === "active" })}><option value="active">{t("admin.status.active")}</option><option value="draft">{t("admin.status.draft")}</option></select></label></div><button className="primary-button small" type="submit"><Save size={16} />{t("admin.save")}</button></form>;
}

function LevelForm({ courses, draft, onChange, onCancel, onSave }: { courses: AdminCourse[]; draft: AdminLevelRecord; onChange: (level: AdminLevelRecord | null) => void; onCancel: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const { t } = useTranslation();
  return <form className="admin-editor" onSubmit={onSave}><div className="admin-editor-heading"><div><h3>{t("admin.levelEditor")}</h3><small>{t("admin.noLevelsCopy")}</small></div><button type="button" onClick={onCancel} aria-label={t("admin.close")}><X size={16} /></button></div><div className="form-grid"><label>{t("admin.parentStyle")}<select value={draft.courseId} onChange={(event) => onChange({ ...draft, courseId: event.target.value })} required><option value="">{t("admin.parentStyle")}</option>{courses.filter((course) => course.active).map((course) => <option key={course.id} value={course.id}>{course.catalogGroupName && course.catalogGroupName !== course.name ? `${course.catalogGroupName} · ${course.name}` : `${course.name} · ${t("admin.directLevels")}`}</option>)}</select></label><label>{t("admin.levelCode")}<select value={draft.code} onChange={(event) => onChange({ ...draft, code: event.target.value })} required><option value="beginner">Beginner</option><option value="improver">Improver</option><option value="intermediate_1">Intermediate</option><option value="advanced_1">Advanced</option><option value="open_level">Open Level</option></select></label><label>{t("admin.levelName")}<input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} required /></label><label className="form-field-wide">{t("admin.levelDescription")}<textarea rows={3} value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} /></label><label>{t("admin.levelActive")}<select value={draft.active ? "active" : "draft"} onChange={(event) => onChange({ ...draft, active: event.target.value === "active" })}><option value="active">{t("admin.status.active")}</option><option value="draft">{t("admin.status.draft")}</option></select></label></div><button className="primary-button small" type="submit"><Save size={16} />{t("admin.save")}</button></form>;
}

function CourseInstanceForm({ courses, teachers, draft, onChange, onCancel, onSave }: { courses: AdminCourse[]; teachers: AdminTeacherRecord[]; draft: AdminClass; onChange: (item: AdminClass | null) => void; onCancel: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const { t } = useTranslation();
  const selectedCourse = courses.find((course) => course.id === draft.disciplineId);
  const levels = selectedCourse?.levels.filter((level) => level.active) ?? [];
  const priceFields: Array<{ type: AdminCoursePriceRecord["type"]; key: string }> = [{ type: "regular", key: "regular" }, { type: "student", key: "student" }, { type: "erasmus", key: "erasmus" }, { type: "member", key: "member" }, { type: "student_member", key: "studentMember" }];
  const updatePrice = (type: AdminCoursePriceRecord["type"], value: string) => { const prices = draft.prices.filter((price) => price.type !== type); prices.push({ ...(draft.prices.find((price) => price.type === type) ?? { type, currency: "EUR", active: true }), amount: value === "" ? null : Number(value) }); onChange({ ...draft, prices }); };
  return <form className="admin-editor" onSubmit={onSave}><div className="admin-editor-heading"><div><h3>{t("admin.groupEditor")}</h3><small>{t("admin.pricingNotice")}</small></div><button type="button" onClick={onCancel} aria-label={t("admin.close")}><X size={16} /></button></div><div className="form-grid"><label>{t("admin.fields.course")}<select value={draft.disciplineId} onChange={(event) => { const course = courses.find((item) => item.id === event.target.value); const level = course?.levels.find((item) => item.active); onChange({ ...draft, disciplineId: course?.id ?? "", disciplineName: course?.name ?? "", levelId: level?.id ?? "", levelName: level?.name ?? "", level: level?.name ?? "" }); }} required><option value="">{t("admin.fields.course")}</option>{courses.filter((course) => course.active).map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label><label>{t("admin.fields.level")}<select value={draft.levelId} onChange={(event) => { const level = levels.find((item) => item.id === event.target.value); onChange({ ...draft, levelId: level?.id ?? "", levelName: level?.name ?? "", level: level?.name ?? "" }); }} required><option value="">{levels.length > 0 ? t("admin.fields.level") : t("admin.noLevels")}</option>{levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}</select></label><label>{t("admin.fields.title")}<input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} required /></label><label>{t("admin.fields.startDate")}<input type="date" value={dateFieldValue(draft.startDate ?? draft.date)} onChange={(event) => onChange({ ...draft, date: event.target.value, startDate: event.target.value })} required /></label><label>{t("admin.fields.endDate")}<input type="date" value={dateFieldValue(draft.endDate)} onChange={(event) => onChange({ ...draft, endDate: event.target.value })} /></label><label>{t("admin.fields.durationText")}<input value={draft.durationText} onChange={(event) => onChange({ ...draft, durationText: event.target.value, period: event.target.value })} /></label><label>{t("admin.fields.durationHours")}<input type="number" min="0.1" step="0.1" value={draft.durationHours ?? ""} onChange={(event) => onChange({ ...draft, durationHours: event.target.value === "" ? undefined : Number(event.target.value) })} /></label><label>{t("admin.fields.classesPerWeek")}<input type="number" min="1" step="1" value={draft.classesPerWeek} onChange={(event) => onChange({ ...draft, classesPerWeek: Number(event.target.value) })} required /></label><label>{t("admin.fields.teacher")}<select value={draft.teacherId ?? ""} onChange={(event) => { const teacher = teachers.find((item) => item.id === event.target.value); onChange({ ...draft, teacherId: teacher?.id, teacher: teacher?.displayName ?? draft.teacher }); }}><option value="">{t("admin.fields.teacher")}</option>{teachers.filter((teacher) => teacher.active).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.displayName}</option>)}</select><input value={draft.teacher} onChange={(event) => onChange({ ...draft, teacherId: undefined, teacher: event.target.value })} placeholder={t("admin.fields.teacher")} /></label><label>{t("admin.fields.location")}<input value={draft.location} onChange={(event) => onChange({ ...draft, location: event.target.value })} /></label><label>{t("admin.table.capacity")}<input type="number" min="1" value={draft.capacity} onChange={(event) => onChange({ ...draft, capacity: Number(event.target.value) })} required /></label><label>{t("admin.fields.imageUrl")}<input type="url" value={draft.imageUrl} onChange={(event) => onChange({ ...draft, imageUrl: event.target.value })} /></label><label>{t("admin.fields.active")}<select value={draft.active ? "active" : "draft"} onChange={(event) => onChange({ ...draft, active: event.target.value === "active", status: event.target.value === "active" && draft.visible ? "active" : "draft" })}><option value="active">{t("admin.status.active")}</option><option value="draft">{t("admin.status.draft")}</option></select></label><label>{t("admin.fields.visible")}<select value={draft.visible ? "visible" : "hidden"} onChange={(event) => onChange({ ...draft, visible: event.target.value === "visible", status: draft.active && event.target.value === "visible" ? "active" : "draft" })}><option value="visible">{t("admin.enabled")}</option><option value="hidden">{t("admin.status.draft")}</option></select></label></div><div className="admin-price-grid">{priceFields.map((field) => { const price = draft.prices.find((item) => item.type === field.type); return <label key={field.type}>{t(`admin.fields.${field.key}`)}<input type="number" min="0" step="0.01" value={price?.amount ?? ""} onChange={(event) => updatePrice(field.type, event.target.value)} /></label>; })}</div><button className="primary-button small" type="submit"><Save size={16} />{t("admin.save")}</button></form>;
}

function slugPreview(value: string) {
  return value.trim().toLocaleLowerCase("en-US").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function eventCategoryForType(type: string): Exclude<EventCategory, "all"> {
  const normalized = type.toLocaleLowerCase("en-US");
  if (normalized.includes("party") || normalized.includes("social") || normalized.includes("fiesta")) return "party";
  if (normalized.includes("festival")) return "festival";
  return "workshop";
}

function dateTimeFieldValue(value: string | undefined) {
  const date = new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dateFieldValue(value: string | undefined) {
  const date = new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function AdminEventsWithCategories({ events, category, onCategoryChange, draft, onCreate, onEdit, onCancel, onChange, onSave, onDelete }: { events: AdminEvent[]; category: EventCategory; onCategoryChange: (category: EventCategory) => void; draft: AdminEvent | null; onCreate: () => void; onEdit: (item: AdminEvent) => void; onCancel: () => void; onChange: (item: AdminEvent | null) => void; onSave: (event: FormEvent<HTMLFormElement>) => void; onDelete: (id: string) => void }) {
  const { t } = useTranslation();
  const categories: Array<{ id: EventCategory; label: string }> = [
    { id: "all", label: t("admin.eventCategories.all") },
    { id: "party", label: t("admin.eventCategories.party") },
    { id: "workshop", label: t("admin.eventCategories.workshop") },
    { id: "festival", label: t("admin.eventCategories.festival") },
  ];
  const visibleEvents = category === "all" ? events : events.filter((event) => eventCategoryForType(event.type) === category);
  return <section className="admin-panel admin-list-panel"><AdminListHeader eyebrow={t("admin.eventsEyebrow")} title={t("admin.eventsTitle")} actionLabel={t("admin.newEvent")} onAction={onCreate} /><div className="admin-subtabs" role="tablist" aria-label={t("admin.eventCategories.label")}>{categories.map((item) => <button key={item.id} type="button" className={category === item.id ? "active" : ""} onClick={() => onCategoryChange(item.id)}>{item.label}</button>)}</div>{draft && <EventForm draft={draft} onChange={onChange} onCancel={onCancel} onSave={onSave} />}<div className="admin-card-list">{visibleEvents.map((item) => <article className="admin-record-card" key={item.id}><span className="admin-record-icon turquoise"><PartyPopper size={18} /></span><div><p className="eyebrow">{t(`admin.eventCategories.${eventCategoryForType(item.type)}`)}</p><h3>{item.title}</h3><p>{item.date} · {item.location}</p><small>{t("admin.capacity")}: {item.capacity}</small></div><span className={`admin-status ${item.status}`}>{t(`admin.status.${item.status}`)}</span><div className="admin-actions"><button type="button" onClick={() => onEdit(item)} aria-label={`${t("admin.edit")} ${item.title}`} title={t("admin.edit")}><Edit3 size={15} /><span>{t("admin.edit")}</span></button><button type="button" onClick={() => onDelete(item.id)} aria-label={`${t("admin.delete")} ${item.title}`} title={t("admin.delete")}><Trash2 size={15} /><span>{t("admin.delete")}</span></button></div></article>)}</div>{visibleEvents.length === 0 && <div className="empty-state"><PartyPopper size={22} /><strong>{t("admin.noEvents")}</strong><p>{t("admin.noEventsCopy")}</p></div>}</section>;
}

export function AdminEvents({ events, draft, onCreate, onEdit, onCancel, onChange, onSave, onDelete }: { events: AdminEvent[]; draft: AdminEvent | null; onCreate: () => void; onEdit: (item: AdminEvent) => void; onCancel: () => void; onChange: (item: AdminEvent | null) => void; onSave: (event: FormEvent<HTMLFormElement>) => void; onDelete: (id: string) => void }) {
  const { t } = useTranslation();
  return <section className="admin-panel admin-list-panel"><AdminListHeader eyebrow={t("admin.eventsEyebrow")} title={t("admin.eventsTitle")} actionLabel={t("admin.newEvent")} onAction={onCreate} />{draft && <EventForm draft={draft} onChange={onChange} onCancel={onCancel} onSave={onSave} />}<div className="admin-card-list">{events.map((item) => <article className="admin-record-card" key={item.id}><span className="admin-record-icon turquoise"><Activity size={18} /></span><div><p className="eyebrow">{item.type}</p><h3>{item.title}</h3><p>{item.date} · {item.location}</p><small>{t("admin.capacity")}: {item.capacity}</small></div><span className={`admin-status ${item.status}`}>{t(`admin.status.${item.status}`)}</span><div className="admin-actions"><button type="button" onClick={() => onEdit(item)} aria-label={`${t("admin.edit")} ${item.title}`}><Edit3 size={15} /></button><button type="button" onClick={() => onDelete(item.id)} aria-label={`${t("admin.delete")} ${item.title}`}><Trash2 size={15} /></button></div></article>)}</div></section>;
}

function EventForm({ draft, onChange, onCancel, onSave }: { draft: AdminEvent; onChange: (item: AdminEvent) => void; onCancel: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const { t } = useTranslation();
  return <form className="admin-editor" onSubmit={onSave}><div className="admin-editor-heading"><h3>{t("admin.eventEditor")}</h3><button type="button" onClick={onCancel} aria-label={t("admin.close")}><X size={16} /></button></div><div className="form-grid"><label>{t("admin.fields.title")}<input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} required /></label><label>{t("admin.fields.type")}<select value={draft.type} onChange={(event) => onChange({ ...draft, type: event.target.value })}><option value="workshop">{t("admin.eventCategories.workshop")}</option><option value="party">{t("admin.eventCategories.party")}</option><option value="festival">{t("admin.eventCategories.festival")}</option></select></label><label>{t("admin.fields.date")}<input type="datetime-local" value={dateTimeFieldValue(draft.startDate ?? draft.date)} onChange={(event) => onChange({ ...draft, date: event.target.value, startDate: event.target.value })} required /></label><label>{t("admin.fields.location")}<input value={draft.location} onChange={(event) => onChange({ ...draft, location: event.target.value })} required /></label><label>{t("admin.fields.capacity")}<input type="number" min="1" value={draft.capacity} onChange={(event) => onChange({ ...draft, capacity: Number(event.target.value) })} required /></label><label>{t("admin.fields.status")}<select value={draft.status} onChange={(event) => onChange({ ...draft, status: event.target.value as AdminEvent["status"] })}><option value="published">Published</option><option value="draft">Draft</option></select></label></div><button className="primary-button small" type="submit"><Save size={16} />{t("admin.save")}</button></form>;
}

function AdminListHeader({ eyebrow, title, actionLabel, onAction }: { eyebrow: string; title: string; actionLabel: string; onAction: () => void }) {
  return <div className="admin-list-header"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button className="primary-button small" type="button" onClick={onAction}><Plus size={16} />{actionLabel}</button></div>;
}

function AdminOrders({ orders, onStatusChange }: { orders: AdminOrder[]; onStatusChange: (id: string, status: AdminOrder["status"]) => void }) {
  const { t } = useTranslation();
  return <section className="admin-panel admin-list-panel"><AdminListHeader eyebrow={t("admin.ordersEyebrow")} title={t("admin.ordersTitle")} actionLabel={t("admin.export")} onAction={() => undefined} /><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t("admin.table.order")}</th><th>{t("admin.table.customer")}</th><th>{t("admin.table.product")}</th><th>{t("admin.table.amount")}</th><th>{t("admin.table.status")}</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.id}</strong><small>{order.date}</small></td><td>{order.customer}</td><td>{order.product}</td><td>{order.amount}</td><td><select className="status-select" value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value as AdminOrder["status"])}><option value="paid">{t("admin.status.paid")}</option><option value="pending">{t("admin.status.pending")}</option><option value="refunded">{t("admin.status.refunded")}</option></select></td></tr>)}</tbody></table></div></section>;
}

function AdminUsers({ users, account, draft, onEdit, onCancel, onSave }: { users: AdminUser[]; account: Account; draft: AdminUser | null; onEdit: (user: AdminUser) => void; onCancel: () => void; onSave: (user: AdminUser) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [classPayments, setClassPayments] = useState<UserPurchase[]>(() => getSimulatedClassPaymentRequests());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(draft?.id ?? null);
  const [selectedDetails, setSelectedDetails] = useState<AdminUserDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{ id: string; status: "paid" | "refunded" } | null>(null);
  const rows = users.length > 0 ? users : [{ id: account.id ?? "admin", firstName: account.profile.firstName, lastName: account.profile.lastName, name: [account.profile.firstName, account.profile.lastName].filter(Boolean).join(" ") || account.email, email: account.email, role: "admin" as const, status: "active" as const, createdAt: "—" }];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredRows = normalizedQuery
    ? rows.filter((user) => `${user.name} ${user.firstName} ${user.lastName} ${user.email}`.toLocaleLowerCase().includes(normalizedQuery))
    : rows;

  function inspectUser(user: AdminUser) {
    setSelectedUserId(user.id);
    setSelectedDetails(null);
    setDetailsLoading(true);
    setDetailsError(false);
    onEdit(user);
    void getAdminUserDetails(user).then((details) => setSelectedDetails(details)).catch(() => { setSelectedDetails(null); setDetailsError(true); }).finally(() => setDetailsLoading(false));
  }

  function closeDetails() {
    setSelectedUserId(null);
    setSelectedDetails(null);
    setDetailsError(false);
    onCancel();
  }

  function changeClassPaymentStatus(id: string, status: "paid" | "refunded") {
    setPendingPayment({ id, status });
  }

  function confirmClassPaymentStatus() {
    if (!pendingPayment) return;
    const { id, status } = pendingPayment;
    setPendingPayment(null);
    const updated = updateSimulatedClassPaymentStatus(id, status);
    if (updated) setClassPayments((current) => current.map((payment) => payment.id === id ? updated : payment));
  }

  const paymentsFor = (user: AdminUser) => classPayments.filter((payment) => payment.userId === user.id || payment.customerEmail?.toLocaleLowerCase() === user.email.toLocaleLowerCase());
  return <section className="admin-panel admin-list-panel">
    <AdminListHeader eyebrow={t("admin.usersEyebrow")} title={t("admin.usersTitle")} actionLabel={t("admin.manualUserAction")} onAction={() => undefined} />
    <p className="admin-user-list-copy">{t("admin.userDetail.listCopy")}</p>
    <label className="admin-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{t("admin.searchUsers")}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("admin.searchUsers")} /></label>
    {selectedUserId && (detailsLoading || selectedDetails || detailsError) && <AdminUserProfileDashboard details={selectedDetails} loading={detailsLoading} error={detailsError} onEdit={() => selectedDetails && onEdit(selectedDetails.user)} onClose={closeDetails} />}
    {draft && <UserForm draft={draft} classPayments={paymentsFor(draft)} onClassPaymentStatus={changeClassPaymentStatus} onChange={onEdit} onCancel={onCancel} onSave={onSave} />}
    {filteredRows.length > 0 ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t("admin.table.member")}</th><th>{t("admin.table.role")}</th><th>{t("admin.table.status")}</th><th>{t("admin.table.created")}</th><th><span className="sr-only">{t("admin.table.actions")}</span></th></tr></thead><tbody>{filteredRows.map((user) => { const pendingCount = paymentsFor(user).filter((payment) => payment.status === "pending").length; return <tr key={user.id}><td><strong>{user.name}</strong><small>{user.email}</small>{pendingCount > 0 && <span className="admin-payment-count">{t("admin.classPayments.pendingCount", { count: pendingCount })}</span>}</td><td><span className="admin-status active">{t(`admin.roles.${user.role}`)}</span></td><td><span className={`admin-status ${user.status === "active" ? "active" : "pending"}`}>{t(`admin.status.${user.status}`)}</span></td><td>{user.createdAt}</td><td className="admin-actions"><button type="button" onClick={() => inspectUser(user)} aria-label={`${t("admin.userDetail.inspect")} ${user.name}`} title={t("admin.userDetail.inspect")}><UserCog size={15} /><span>{t("admin.userDetail.inspect")}</span></button></td></tr>; })}</tbody></table></div> : <div className="empty-state"><Search size={22} /><strong>{t("admin.noUsersFound")}</strong><p>{t("admin.noUsersFoundCopy")}</p></div>}
    <ConfirmDialog open={Boolean(pendingPayment)} eyebrow={t("confirmations.eyebrow")} title={pendingPayment?.status === "paid" ? t("confirmations.approveTitle") : t("confirmations.rejectTitle")} copy={pendingPayment?.status === "paid" ? t("confirmations.approveCopy") : t("confirmations.rejectCopy")} confirmLabel={pendingPayment?.status === "paid" ? t("confirmations.approve") : t("confirmations.reject")} cancelLabel={t("confirmations.cancel")} destructive={pendingPayment?.status === "refunded"} onConfirm={confirmClassPaymentStatus} onCancel={() => setPendingPayment(null)} />
  </section>;
}

function AdminUserProfileDashboard({ details, loading, error, onEdit, onClose }: { details: AdminUserDetail | null; loading: boolean; error: boolean; onEdit: () => void; onClose: () => void }) {
  const { t } = useTranslation();

  function dateLabel(value: string | null) {
    if (!value) return t("admin.userDetail.notAvailable");
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
  }

  function moneyLabel(amount: number | null, currency: string) {
    if (amount === null) return t("admin.userDetail.notAvailable");
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "EUR" }).format(amount);
  }

  function settingLabel(value: string | boolean | null) {
    if (value === null) return t("admin.userDetail.notAvailable");
    if (typeof value === "boolean") return value ? t("admin.userDetail.enabled") : t("admin.userDetail.disabled");
    return value;
  }

  if (loading) return <section className="admin-user-detail admin-user-detail-loading" aria-live="polite"><Activity size={18} /><span>{t("admin.userDetail.loading")}</span></section>;
  if (error || !details) return <section className="admin-user-detail admin-user-detail-loading" role="alert"><X size={18} /><span>{t("admin.userDetail.loadError")}</span></section>;
  const address = [details.profile.address, [details.profile.postalCode, details.profile.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return <section className="admin-user-detail">
    <div className="admin-user-detail-heading"><div><p className="eyebrow"><Users size={14} />{t("admin.userDetail.eyebrow")}</p><h2>{details.user.name}</h2><p>{details.user.email}</p></div><div className="admin-user-detail-actions"><button className="secondary-button compact" type="button" onClick={onEdit}><Edit3 size={14} />{t("admin.userDetail.editProfile")}</button><button className="icon-button" type="button" onClick={onClose} aria-label={t("admin.close")}><X size={16} /></button></div></div>
    <div className="admin-user-detail-source"><ShieldCheck size={15} />{details.source === "supabase" ? t("admin.userDetail.remoteSource") : t("admin.userDetail.constructionSource")}</div>
    <div className="admin-user-detail-stats"><div><strong>{details.summary.activeAccess}</strong><span>{t("admin.userDetail.activeAccess")}</span></div><div><strong>{details.summary.purchaseCount}</strong><span>{t("admin.userDetail.purchaseCount")}</span></div><div><strong>{details.summary.pendingPurchases}</strong><span>{t("admin.userDetail.pendingPurchases")}</span></div><div><strong>{details.summary.sessionsRemaining}</strong><span>{t("admin.userDetail.sessionsRemaining")}</span></div></div>
    <div className="admin-user-detail-grid">
      <article className="admin-user-detail-card"><div className="admin-user-detail-card-heading"><div><p className="eyebrow"><UserCog size={14} />{t("admin.userDetail.profileEyebrow")}</p><h3>{t("admin.userDetail.profileTitle")}</h3></div></div><dl className="admin-user-detail-data"><div><dt>{t("firstName")}</dt><dd>{details.user.firstName || t("admin.userDetail.notAvailable")}</dd></div><div><dt>{t("lastName")}</dt><dd>{details.user.lastName || t("admin.userDetail.notAvailable")}</dd></div><div><dt>{t("email")}</dt><dd>{details.user.email}</dd></div><div><dt>{t("admin.userDetail.phone")}</dt><dd>{details.profile.phone || t("admin.userDetail.notAvailable")}</dd></div><div><dt>{t("admin.userDetail.address")}</dt><dd>{address || t("admin.userDetail.notAvailable")}</dd></div><div><dt>{t("admin.userDetail.danceRole")}</dt><dd>{details.profile.danceRole || t("admin.userDetail.notAvailable")}</dd></div><div><dt>{t("admin.userDetail.created")}</dt><dd>{dateLabel(details.profile.createdAt)}</dd></div><div><dt>{t("admin.userDetail.emailStatus")}</dt><dd>{details.profile.emailConfirmed === null ? t("admin.userDetail.notAvailable") : details.profile.emailConfirmed ? t("admin.userDetail.confirmed") : t("admin.userDetail.pending")}</dd></div></dl></article>
      <article className="admin-user-detail-card"><div className="admin-user-detail-card-heading"><div><p className="eyebrow"><CreditCard size={14} />{t("admin.userDetail.commerceEyebrow")}</p><h3>{t("admin.userDetail.commerceTitle")}</h3></div></div><dl className="admin-user-detail-data"><div><dt>{t("admin.userDetail.category")}</dt><dd><span className="admin-status active">{details.category ? t(`admin.userDetail.categories.${details.category}`, { defaultValue: details.category }) : t("admin.userDetail.categories.notVerified")}</span></dd></div><div><dt>{t("admin.userDetail.categorySource")}</dt><dd>{t(`admin.userDetail.categorySources.${details.categorySource}`)}</dd></div><div><dt>{t("admin.table.role")}</dt><dd>{t(`admin.roles.${details.user.role}`)}</dd></div><div><dt>{t("admin.userDetail.paidTotal")}</dt><dd>{moneyLabel(details.summary.totalPaid, "EUR")}</dd></div></dl>{details.memberships.length > 0 ? <div className="admin-user-membership-list">{details.memberships.map((membership) => <div key={membership.id}><span><strong>{membership.type}</strong><small>{membership.startsAt ? dateLabel(membership.startsAt) : t("admin.userDetail.noStartDate")}{membership.endsAt ? ` · ${dateLabel(membership.endsAt)}` : ""}</small></span><span className={`admin-status ${membership.active ? "active" : "pending"}`}>{membership.active ? t("admin.status.active") : t("admin.status.pending")}</span></div>)}</div> : <p className="admin-user-detail-empty">{t("admin.userDetail.noMembership")}</p>}</article>
    </div>
    <article className="admin-user-detail-card"><div className="admin-user-detail-card-heading"><div><p className="eyebrow"><ShoppingBag size={14} />{t("admin.userDetail.purchaseEyebrow")}</p><h3>{t("admin.userDetail.purchaseTitle")}</h3></div><span className="admin-detail-count">{details.purchases.length}</span></div>{details.purchases.length > 0 ? <div className="admin-user-purchase-list">{details.purchases.map((purchase) => <div key={`${purchase.source}-${purchase.id}`}><span className="admin-user-purchase-icon"><QrCode size={16} /></span><div><strong>{purchase.product}</strong><small>{dateLabel(purchase.purchasedAt)}{purchase.paymentMethod ? ` · ${purchase.paymentMethod}` : ""}</small>{purchase.sessionsTotal !== null && <em>{t("admin.userDetail.sessionsInfo", { consumed: purchase.sessionsConsumed ?? 0, total: purchase.sessionsTotal })}</em>}</div><span className="admin-user-purchase-side"><strong>{moneyLabel(purchase.amount, purchase.currency)}</strong><span className={`admin-status ${purchase.status === "paid" ? "active" : purchase.status === "pending" ? "pending" : "draft"}`}>{purchase.status === "paid" ? t("admin.status.paid") : purchase.status === "pending" ? t("admin.status.pending") : purchase.status}</span><small>{purchase.validUntil ? `${t("admin.userDetail.validUntil")} ${dateLabel(purchase.validUntil)}` : t("admin.userDetail.noExpiry")}</small></span></div>)}</div> : <p className="admin-user-detail-empty">{t("admin.userDetail.noPurchases")}</p>}</article>
    <div className="admin-user-detail-grid">
      <article className="admin-user-detail-card"><div className="admin-user-detail-card-heading"><div><p className="eyebrow"><Ticket size={14} />{t("admin.userDetail.trialEyebrow")}</p><h3>{t("admin.userDetail.trialTitle")}</h3></div></div>{details.freeTrials.length > 0 ? <div className="admin-user-trial-list">{details.freeTrials.map((trial) => <div key={trial.id}><span><strong>{trial.classes.join(" · ") || t("admin.userDetail.noClasses")}</strong><small>{t("admin.userDetail.trialCreated")} {dateLabel(trial.createdAt)} · {t("admin.userDetail.validUntil")} {dateLabel(trial.validUntil)}</small></span><span className={`admin-status ${trial.status === "active" ? "active" : "draft"}`}>{t(`admin.userDetail.trialStatus.${trial.status}`)}</span></div>)}</div> : <p className="admin-user-detail-empty">{t("admin.userDetail.noTrial")}</p>}</article>
      <article className="admin-user-detail-card"><div className="admin-user-detail-card-heading"><div><p className="eyebrow"><Settings2 size={14} />{t("admin.userDetail.settingsEyebrow")}</p><h3>{t("admin.userDetail.settingsTitle")}</h3></div></div><dl className="admin-user-detail-data"><div><dt>{t("admin.userDetail.language")}</dt><dd>{settingLabel(details.settings.language)}</dd></div><div><dt>{t("admin.userDetail.darkMode")}</dt><dd>{settingLabel(details.settings.darkMode)}</dd></div><div><dt>{t("admin.userDetail.classReminders")}</dt><dd>{settingLabel(details.settings.classReminders)}{details.settings.classReminderTiming ? ` · ${settingLabel(details.settings.classReminderTiming)}` : ""}</dd></div><div><dt>{t("admin.userDetail.newActivityNotifications")}</dt><dd>{settingLabel(details.settings.newActivityNotifications)}</dd></div><div><dt>{t("admin.userDetail.emailUpdates")}</dt><dd>{settingLabel(details.settings.emailUpdates)}</dd></div><div><dt>{t("admin.userDetail.reducedMotion")}</dt><dd>{settingLabel(details.settings.reducedMotion)}</dd></div></dl><p className="admin-user-detail-note"><CalendarClock size={15} />{t("admin.userDetail.settingsNote")}</p></article>
    </div>
  </section>;
}

function UserForm({ draft, classPayments, onClassPaymentStatus, onChange, onCancel, onSave }: { draft: AdminUser; classPayments: UserPurchase[]; onClassPaymentStatus: (id: string, status: "paid" | "refunded") => void; onChange: (user: AdminUser) => void; onCancel: () => void; onSave: (user: AdminUser) => void }) {
  const { t } = useTranslation();
  return <form className="admin-editor" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><div className="admin-editor-heading"><h3>{t("admin.manage")} · {draft.email}</h3><button type="button" onClick={onCancel} aria-label={t("admin.close")}><X size={16} /></button></div><div className="form-grid"><label>{t("firstName")}<input value={draft.firstName} onChange={(event) => onChange({ ...draft, firstName: event.target.value, name: [event.target.value, draft.lastName].filter(Boolean).join(" ") || draft.email })} required /></label><label>{t("lastName")}<input value={draft.lastName} onChange={(event) => onChange({ ...draft, lastName: event.target.value, name: [draft.firstName, event.target.value].filter(Boolean).join(" ") || draft.email })} required /></label><label>{t("admin.table.role")}<select value={draft.role} onChange={(event) => onChange({ ...draft, role: event.target.value as AdminUser["role"] })}><option value="user">{t("admin.roles.user")}</option><option value="student">{t("admin.roles.student")}</option><option value="teacher">{t("admin.roles.teacher")}</option><option value="admin">{t("admin.roles.admin")}</option></select></label></div><button className="primary-button small" type="submit"><Save size={16} />{t("admin.save")}</button>{classPayments.length > 0 && <section className="admin-class-payments"><div><p className="eyebrow">{t("admin.classPayments.eyebrow")}</p><h4>{t("admin.classPayments.title")}</h4><p>{t("admin.classPayments.copy")}</p></div><div className="admin-class-payment-list">{classPayments.map((payment) => <article key={payment.id}><span className="admin-class-payment-icon"><CircleDollarSign size={18} /></span><div><strong>{payment.productName}</strong><small>{new Intl.NumberFormat(undefined, { style: "currency", currency: payment.currency }).format(payment.amount)} · {payment.paymentMethod}</small><span className={`admin-status ${payment.status}`}>{t(`admin.status.${payment.status}`)}</span></div>{payment.status === "pending" && <div className="admin-class-payment-actions"><button type="button" className="approve" onClick={() => onClassPaymentStatus(payment.id, "paid")}><Check size={15} />{t("admin.classPayments.approve")}</button><button type="button" className="reject" onClick={() => onClassPaymentStatus(payment.id, "refunded")}><X size={15} />{t("admin.classPayments.reject")}</button></div>}</article>)}</div><p className="server-security-note"><ShieldCheck size={16} />{t("admin.classPayments.demoNotice")}</p></section>}</form>;
}

function AdminMembersRemote({ account, memberships }: { account: Account; memberships: AdminMembership[] }) {
  const { t } = useTranslation();
  const rows = memberships.length > 0 ? memberships : [{ id: "admin-membership", userId: account.id ?? "admin", name: [account.profile.firstName, account.profile.lastName].filter(Boolean).join(" ") || account.email, email: account.email, type: "member", classesRemaining: 0, active: true }];
  return <section className="admin-panel admin-list-panel"><AdminListHeader eyebrow={t("admin.membersEyebrow")} title={t("admin.membersTitle")} actionLabel={t("admin.inviteMember")} onAction={() => undefined} /><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t("admin.table.member")}</th><th>{t("admin.table.membership")}</th><th>{t("admin.table.sessions")}</th><th>{t("admin.table.status")}</th></tr></thead><tbody>{rows.map((member) => <tr key={member.id}><td><strong>{member.name}</strong><small>{member.email}</small></td><td>{member.type}</td><td>{member.classesRemaining}</td><td><span className={`admin-status ${member.active ? "active" : "pending"}`}>{member.active ? t("admin.status.active") : t("admin.status.pending")}</span></td></tr>)}</tbody></table></div></section>;
}

const emptyManualUser: ManualUserDraft = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  postalCode: "",
  city: "",
  danceRole: "both",
  appRole: "user",
  commercialCategory: "regular",
  categoryVerified: false,
  accessMode: "email-invite",
  temporaryPassword: "",
  sendWelcomeEmail: true,
  adminNotes: "",
};

function ManualUserForm() {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ManualUserDraft>({ ...emptyManualUser });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "working" | "success" | "error">("idle");
  const [errorCode, setErrorCode] = useState<string>("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const endpointConfigured = Boolean(getManualUserEndpoint());

  function update<K extends keyof ManualUserDraft>(key: K, value: ManualUserDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setStatus("idle");
    setErrorCode("");
  }

  async function submitManualUser() {
    setConfirmationOpen(false);
    setStatus("working");
    setErrorCode("");
    const result = await createManualUser(draft);
    if (!result.ok) {
      setStatus("error");
      setErrorCode(result.code ?? "requestFailed");
      return;
    }
    setStatus("success");
    setDraft({ ...emptyManualUser });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmationOpen(true);
  }

  const resultMessage = errorCode === "invalid" ? t("admin.manualUserForm.validation") : errorCode === "endpointMissing" ? t("admin.manualUserForm.endpointMissing") : errorCode === "unauthorized" ? t("admin.manualUserForm.unauthorized") : t("admin.manualUserForm.requestFailed");

  return <section className="admin-panel admin-list-panel admin-manual-user-page">
    <div className="admin-list-header"><div><p className="eyebrow"><UserPlus size={14} />{t("admin.manualUserEyebrow")}</p><h2>{t("admin.manualUserTitle")}</h2><p className="admin-manual-user-intro">{t("admin.manualUserForm.intro")}</p></div><UserPlus size={22} /></div>
    <div className="admin-manual-user-note"><ShieldCheck size={17} /><p>{t("admin.manualUserNotice")}</p></div>
    <form className="admin-editor admin-manual-user-form" onSubmit={handleSubmit}>
      <section className="admin-manual-section"><div className="admin-manual-section-heading"><span className="admin-manual-section-icon"><UserCog size={17} /></span><div><p className="eyebrow">{t("admin.manualUserForm.personalEyebrow")}</p><h3>{t("admin.manualUserForm.personalTitle")}</h3><p>{t("admin.manualUserForm.personalCopy")}</p></div></div><div className="form-grid"><label>{t("firstName")}<input value={draft.firstName} onChange={(event) => update("firstName", event.target.value)} autoComplete="given-name" required /></label><label>{t("lastName")}<input value={draft.lastName} onChange={(event) => update("lastName", event.target.value)} autoComplete="family-name" required /></label><label>{t("email")}<input value={draft.email} onChange={(event) => update("email", event.target.value)} type="email" autoComplete="email" required /></label><label>{t("phone")}<input value={draft.phone} onChange={(event) => update("phone", event.target.value)} type="tel" autoComplete="tel" /></label><label className="form-field-wide">{t("address")}<input value={draft.address} onChange={(event) => update("address", event.target.value)} autoComplete="street-address" required /></label><label>{t("postalCode")}<input value={draft.postalCode} onChange={(event) => update("postalCode", event.target.value)} autoComplete="postal-code" required /></label><label>{t("city")}<input value={draft.city} onChange={(event) => update("city", event.target.value)} autoComplete="address-level2" required /></label></div></section>

      <section className="admin-manual-section"><div className="admin-manual-section-heading"><span className="admin-manual-section-icon"><Users size={17} /></span><div><p className="eyebrow">{t("admin.manualUserForm.accessEyebrow")}</p><h3>{t("admin.manualUserForm.accessTitle")}</h3><p>{t("admin.manualUserForm.accessCopy")}</p></div></div><div className="form-grid"><label><span>{t("admin.manualUserForm.appRole")}</span><select value={draft.appRole} onChange={(event) => update("appRole", event.target.value as ManualAppRole)}><option value="user">{t("admin.roles.user")}</option><option value="student">{t("admin.roles.student")}</option><option value="admin">{t("admin.roles.admin")}</option></select><small className="form-help">{t("admin.manualUserForm.appRoleHelp")}</small></label><label><span>{t("admin.manualUserForm.danceRole")}</span><select value={draft.danceRole} onChange={(event) => update("danceRole", event.target.value as ManualDanceRole)}><option value="leader">{t("roles.leader")}</option><option value="follower">{t("roles.follower")}</option><option value="both">{t("roles.both")}</option></select><small className="form-help">{t("danceRoleHelp")}</small></label></div></section>

      <section className="admin-manual-section"><div className="admin-manual-section-heading"><span className="admin-manual-section-icon"><CreditCard size={17} /></span><div><p className="eyebrow">{t("admin.manualUserForm.categoryEyebrow")}</p><h3>{t("admin.manualUserForm.categoryTitle")}</h3><p>{t("admin.manualUserForm.categoryCopy")}</p></div></div><div className="form-grid"><label><span>{t("admin.manualUserForm.commercialCategory")}</span><select value={draft.commercialCategory} onChange={(event) => update("commercialCategory", event.target.value as ManualCommercialCategory)}><option value="regular">{t("admin.manualUserForm.categories.regular")}</option><option value="student">{t("admin.manualUserForm.categories.student")}</option><option value="member">{t("admin.manualUserForm.categories.member")}</option><option value="erasmus">{t("admin.manualUserForm.categories.erasmus")}</option></select><small className="form-help">{t("admin.manualUserForm.commercialCategoryHelp")}</small></label><label className="admin-checkbox-field"><span>{t("admin.manualUserForm.verificationTitle")}</span><span className="admin-checkbox-row"><input type="checkbox" checked={draft.categoryVerified} onChange={(event) => update("categoryVerified", event.target.checked)} /><span>{t("admin.manualUserForm.verificationLabel")}</span></span><small className="form-help">{t("admin.manualUserForm.verificationHelp")}</small></label></div>{draft.commercialCategory !== "regular" && !draft.categoryVerified && <div className="admin-manual-warning"><ShieldCheck size={16} /><span>{t("admin.manualUserForm.verificationRequired")}</span></div>}</section>

      <section className="admin-manual-section"><div className="admin-manual-section-heading"><span className="admin-manual-section-icon"><KeyRound size={17} /></span><div><p className="eyebrow">{t("admin.manualUserForm.credentialsEyebrow")}</p><h3>{t("admin.manualUserForm.credentialsTitle")}</h3><p>{t("admin.manualUserForm.credentialsCopy")}</p></div></div><div className="admin-access-options" role="radiogroup" aria-label={t("admin.manualUserForm.accessMethod")}><label className={draft.accessMode === "email-invite" ? "selected" : ""}><input type="radio" name="accessMode" value="email-invite" checked={draft.accessMode === "email-invite"} onChange={() => update("accessMode", "email-invite" as ManualAccessMode)} /><Send size={17} /><span><strong>{t("admin.manualUserForm.emailInvite")}</strong><small>{t("admin.manualUserForm.emailInviteCopy")}</small></span></label><label className={draft.accessMode === "temporary-password" ? "selected" : ""}><input type="radio" name="accessMode" value="temporary-password" checked={draft.accessMode === "temporary-password"} onChange={() => update("accessMode", "temporary-password" as ManualAccessMode)} /><KeyRound size={17} /><span><strong>{t("admin.manualUserForm.temporaryPassword")}</strong><small>{t("admin.manualUserForm.temporaryPasswordCopy")}</small></span></label></div>{draft.accessMode === "temporary-password" && <label className="admin-password-field"><span>{t("admin.manualUserForm.temporaryPasswordLabel")}</span><span className="admin-password-input"><input value={draft.temporaryPassword} onChange={(event) => update("temporaryPassword", event.target.value)} type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={t(showPassword ? "hidePassword" : "showPassword")} title={t(showPassword ? "hidePassword" : "showPassword")}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span><small className="form-help">{t("admin.manualUserForm.temporaryPasswordHelp")}</small></label>}<label className="admin-checkbox-field"><span>{t("admin.manualUserForm.welcomeEmail")}</span><span className="admin-checkbox-row"><input type="checkbox" checked={draft.sendWelcomeEmail} onChange={(event) => update("sendWelcomeEmail", event.target.checked)} /><span>{t("admin.manualUserForm.welcomeEmailLabel")}</span></span></label></section>

      <section className="admin-manual-section"><div className="admin-manual-section-heading"><span className="admin-manual-section-icon"><Mail size={17} /></span><div><p className="eyebrow">{t("admin.manualUserForm.notesEyebrow")}</p><h3>{t("admin.manualUserForm.notesTitle")}</h3><p>{t("admin.manualUserForm.notesCopy")}</p></div></div><label className="admin-notes-field"><span>{t("admin.manualUserForm.notesLabel")}</span><textarea value={draft.adminNotes} onChange={(event) => update("adminNotes", event.target.value)} rows={3} placeholder={t("admin.manualUserForm.notesPlaceholder")} /></label></section>

      <div className="admin-manual-actions"><span className="admin-manual-endpoint-status"><span className={endpointConfigured ? "active" : "pending"} />{endpointConfigured ? t("admin.manualUserForm.endpointReady") : t("admin.manualUserForm.endpointNotReady")}</span><button className="primary-button small" type="submit" disabled={status === "working" || (draft.commercialCategory !== "regular" && !draft.categoryVerified)}>{status === "working" ? t("working") : <><UserPlus size={16} />{t("admin.manualUserSubmit")}</>}</button></div>
    </form>
    {status === "success" && <div className="admin-pending-box" role="status"><Check size={17} /><p>{t("admin.manualUserForm.success")}</p></div>}
    {status === "error" && <div className="form-message error" role="alert"><X size={15} /><span>{resultMessage}</span></div>}
    <ConfirmDialog open={confirmationOpen} eyebrow={t("confirmations.eyebrow")} title={t("confirmations.saveTitle")} copy={t("confirmations.saveCopy")} confirmLabel={t("confirmations.confirm")} cancelLabel={t("confirmations.cancel")} onConfirm={() => void submitManualUser()} onCancel={() => setConfirmationOpen(false)} />
  </section>;
}

export function AdminMembers({ account }: { account: Account }) {
  const { t } = useTranslation();
  const members: AdminMember[] = [{ id: account.id ?? "admin", name: [account.profile.firstName, account.profile.lastName].filter(Boolean).join(" ") || account.email, email: account.email, role: account.profile.danceRole, status: "active" }, { id: "member-2", name: "Anna Müller", email: "anna@example.com", role: "follower", status: "active" }, { id: "member-3", name: "Luis García", email: "luis@example.com", role: "leader", status: "pending" }];
  return <section className="admin-panel admin-list-panel"><AdminListHeader eyebrow={t("admin.membersEyebrow")} title={t("admin.membersTitle")} actionLabel={t("admin.inviteMember")} onAction={() => undefined} /><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t("admin.table.member")}</th><th>{t("admin.table.role")}</th><th>{t("admin.table.status")}</th><th>{t("admin.table.access")}</th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><strong>{member.name}</strong><small>{member.email}</small></td><td><span className="role-pill"><Users size={13} />{t(`roles.${member.role}`)}</span></td><td><span className={`admin-status ${member.status}`}>{t(`admin.status.${member.status}`)}</span></td><td><button className="secondary-button compact" type="button"><UserCog size={14} />{t("admin.manage")}</button></td></tr>)}</tbody></table></div></section>;
}

function AdminSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AdminStudioSettings>(() => getAdminStudioSettings());
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);

  function updateSetting<K extends keyof AdminStudioSettings>(key: K, value: AdminStudioSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
    setSaved(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmation({ title: t("confirmations.saveTitle"), copy: t("confirmations.saveCopy"), confirmLabel: t("confirmations.confirm"), onConfirm: () => { setSettings(saveAdminStudioSettings(settings)); setIsDirty(false); setSaved(true); } });
  }

  function confirmPendingChange() {
    const action = confirmation?.onConfirm;
    setConfirmation(null);
    action?.();
  }

  function handleReset() {
    setConfirmation({ title: t("confirmations.resetTitle"), copy: t("confirmations.resetCopy"), confirmLabel: t("confirmations.confirm"), destructive: true, onConfirm: () => { setSettings(resetAdminStudioSettings()); setIsDirty(false); setSaved(true); } });
  }

  return <>
  <section className="admin-settings-page">
    <div className="admin-settings-heading">
      <div><p className="eyebrow"><Settings2 size={14} />{t("admin.settingsEyebrow")}</p><h2>{t("admin.settingsTitle")}</h2><p>{t("admin.settings.intro")}</p></div>
      <span className="admin-settings-mode"><LockKeyhole size={14} />{t("admin.settings.adminOnly")}</span>
    </div>
    {saved && <div className="admin-settings-saved" role="status"><Check size={16} />{t("admin.settings.savedLocal")}</div>}
    <form onSubmit={handleSubmit}>
      <div className="admin-settings-layout">
        <div className="admin-settings-main">
          <section className="admin-settings-section">
            <div className="admin-settings-section-heading"><span className="admin-settings-icon gold"><Building2 size={18} /></span><div><p className="eyebrow">{t("admin.settings.academyEyebrow")}</p><h3>{t("admin.settings.academyTitle")}</h3><p>{t("admin.settings.academyCopy")}</p></div></div>
            <div className="admin-settings-fields">
              <label>{t("admin.settings.fields.studioName")}<input value={settings.studioName} onChange={(event) => updateSetting("studioName", event.target.value)} required /></label>
              <label>{t("admin.settings.fields.legalName")}<input value={settings.legalName} onChange={(event) => updateSetting("legalName", event.target.value)} required /></label>
              <label><span>{t("admin.settings.fields.supportEmail")}</span><input type="email" value={settings.supportEmail} onChange={(event) => updateSetting("supportEmail", event.target.value)} placeholder="hello@example.com" /></label>
              <label>{t("admin.settings.fields.supportPhone")}<input type="tel" value={settings.supportPhone} onChange={(event) => updateSetting("supportPhone", event.target.value)} placeholder="+43 …" /></label>
              <label className="admin-settings-field-wide"><span>{t("admin.settings.fields.address")}</span><input value={settings.studioAddress} onChange={(event) => updateSetting("studioAddress", event.target.value)} required /></label>
              <label><span>{t("admin.settings.fields.timezone")}</span><select value={settings.timezone} onChange={(event) => updateSetting("timezone", event.target.value)}><option value="Europe/Vienna">Europe/Vienna</option><option value="Europe/Berlin">Europe/Berlin</option><option value="UTC">UTC</option></select></label>
              <label><span>{t("admin.settings.fields.currency")}</span><select value={settings.currency} onChange={(event) => updateSetting("currency", event.target.value)}><option value="EUR">EUR · €</option><option value="CHF">CHF · Fr.</option><option value="USD">USD · $</option></select></label>
            </div>
          </section>

          <section className="admin-settings-section">
            <div className="admin-settings-section-heading"><span className="admin-settings-icon turquoise"><CalendarClock size={18} /></span><div><p className="eyebrow">{t("admin.settings.operationsEyebrow")}</p><h3>{t("admin.settings.operationsTitle")}</h3><p>{t("admin.settings.operationsCopy")}</p></div></div>
            <div className="admin-settings-fields">
              <label><span>{t("admin.settings.fields.defaultCapacity")}</span><input type="number" min="1" max="500" value={settings.defaultClassCapacity} onChange={(event) => updateSetting("defaultClassCapacity", Number(event.target.value))} /></label>
              <label><span>{t("admin.settings.fields.bookingWindow")}</span><input type="number" min="1" max="365" value={settings.bookingWindowDays} onChange={(event) => updateSetting("bookingWindowDays", Number(event.target.value))} /></label>
              <label><span>{t("admin.settings.fields.cancellationWindow")}</span><input type="number" min="1" max="168" value={settings.cancellationWindowHours} onChange={(event) => updateSetting("cancellationWindowHours", Number(event.target.value))} /></label>
              <label><span>{t("admin.settings.fields.freeTrialValidity")}</span><input type="number" min="1" max="60" value={settings.freeTrialValidityDays} onChange={(event) => updateSetting("freeTrialValidityDays", Number(event.target.value))} /></label>
              <label><span>{t("admin.settings.fields.packageValidity")}</span><input type="number" min="1" max="730" value={settings.packageValidityDays} onChange={(event) => updateSetting("packageValidityDays", Number(event.target.value))} /></label>
            </div>
          </section>

          <section className="admin-settings-section">
            <div className="admin-settings-section-heading"><span className="admin-settings-icon sand"><Store size={18} /></span><div><p className="eyebrow">{t("admin.settings.commerceEyebrow")}</p><h3>{t("admin.settings.commerceTitle")}</h3><p>{t("admin.settings.commerceCopy")}</p></div></div>
            <div className="admin-settings-toggle-list">
              <SettingToggle icon={CreditCard} label={t("admin.settings.toggles.inClassPayments")} copy={t("admin.settings.toggles.inClassPaymentsCopy")} checked={settings.requireInClassPaymentApproval} onChange={(checked) => updateSetting("requireInClassPaymentApproval", checked)} />
              <SettingToggle icon={GraduationCap} label={t("admin.settings.toggles.freeTrial")} copy={t("admin.settings.toggles.freeTrialCopy")} checked={settings.freeTrialEnabled} onChange={(checked) => updateSetting("freeTrialEnabled", checked)} />
              <SettingToggle icon={Globe2} label={t("admin.settings.toggles.publicCatalogue")} copy={t("admin.settings.toggles.publicCatalogueCopy")} checked={settings.publicCatalogueVisible} onChange={(checked) => updateSetting("publicCatalogueVisible", checked)} />
            </div>
          </section>

          <section className="admin-settings-section">
            <div className="admin-settings-section-heading"><span className="admin-settings-icon ink"><Bell size={18} /></span><div><p className="eyebrow">{t("admin.settings.notificationsEyebrow")}</p><h3>{t("admin.settings.notificationsTitle")}</h3><p>{t("admin.settings.notificationsCopy")}</p></div></div>
            <div className="admin-settings-toggle-list">
              <SettingToggle icon={UserPlus} label={t("admin.settings.toggles.registrations")} copy={t("admin.settings.toggles.registrationsCopy")} checked={settings.registrationNotifications} onChange={(checked) => updateSetting("registrationNotifications", checked)} />
              <SettingToggle icon={Mail} label={t("admin.settings.toggles.payments")} copy={t("admin.settings.toggles.paymentsCopy")} checked={settings.paymentNotifications} onChange={(checked) => updateSetting("paymentNotifications", checked)} />
              <SettingToggle icon={Users} label={t("admin.settings.toggles.capacity")} copy={t("admin.settings.toggles.capacityCopy")} checked={settings.lowCapacityNotifications} onChange={(checked) => updateSetting("lowCapacityNotifications", checked)} />
            </div>
          </section>
        </div>

        <aside className="admin-settings-sidebar">
          <section className="admin-settings-section admin-settings-status-section"><div className="admin-settings-section-heading"><span className="admin-settings-icon turquoise"><Database size={18} /></span><div><p className="eyebrow">{t("admin.settings.healthEyebrow")}</p><h3>{t("admin.settings.healthTitle")}</h3></div></div><p className="admin-settings-sidebar-copy">{t("admin.settings.healthCopy")}</p><div className="admin-settings-status-list"><SettingsStatus icon={Database} label={t("admin.settings.status.supabase")} value={isSupabaseConfigured ? t("admin.settings.status.connected") : t("admin.settings.status.notConfigured")} active={isSupabaseConfigured} /><SettingsStatus icon={ShieldCheck} label={t("admin.settings.status.rls")} value={t("admin.settings.status.protected")} active /><SettingsStatus icon={CreditCard} label={t("admin.settings.status.stripe")} value={isStripeCheckoutConfigured() ? t("admin.settings.status.ready") : t("admin.settings.status.pending")} active={isStripeCheckoutConfigured()} /></div></section>
          <section className="admin-settings-section admin-settings-guidance"><div className="admin-settings-section-heading"><span className="admin-settings-icon gold"><ShieldCheck size={18} /></span><div><p className="eyebrow">{t("admin.settings.securityEyebrow")}</p><h3>{t("admin.settings.securityTitle")}</h3></div></div><p className="admin-settings-sidebar-copy">{t("admin.settings.securityCopy")}</p><ul><li>{t("admin.settings.securityItems.rls")}</li><li>{t("admin.settings.securityItems.audit")}</li><li>{t("admin.settings.securityItems.secrets")}</li></ul></section>
          <section className="admin-settings-section admin-settings-contact"><div className="admin-settings-section-heading"><span className="admin-settings-icon sand"><MapPin size={18} /></span><div><p className="eyebrow">{t("admin.settings.previewEyebrow")}</p><h3>{settings.studioName}</h3></div></div><p>{settings.studioAddress}</p><small>{settings.timezone} · {settings.currency}</small></section>
        </aside>
      </div>
      <div className="admin-settings-footer"><button type="button" className="secondary-button" onClick={handleReset}><RotateCcw size={15} />{t("admin.settings.reset")}</button><span>{isDirty ? t("admin.settings.unsaved") : t("admin.settings.savedLocal")}</span><button type="submit" className="primary-button small" disabled={!isDirty}><Save size={16} />{t("admin.save")}</button></div>
    </form>
  </section>
  <ConfirmDialog open={Boolean(confirmation)} eyebrow={t("confirmations.eyebrow")} title={confirmation?.title ?? ""} copy={confirmation?.copy ?? ""} confirmLabel={confirmation?.confirmLabel ?? t("confirmations.confirm")} cancelLabel={t("confirmations.cancel")} destructive={confirmation?.destructive} onConfirm={confirmPendingChange} onCancel={() => setConfirmation(null)} />
  </>;
}

function SettingToggle({ icon: Icon, label, copy, checked, onChange }: { icon: typeof Bell; label: string; copy: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="admin-settings-toggle"><span className="admin-settings-toggle-icon"><Icon size={16} /></span><span className="admin-settings-toggle-copy"><strong>{label}</strong><small>{copy}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="admin-settings-switch" aria-hidden="true"><span /></span></label>;
}

function SettingsStatus({ icon: Icon, label, value, active }: { icon: typeof Database; label: string; value: string; active: boolean }) {
  return <div className="admin-settings-status"><span><Icon size={15} /></span><div><strong>{label}</strong><small>{value}</small></div><i className={active ? "active" : "pending"} aria-hidden="true" /></div>;
}
