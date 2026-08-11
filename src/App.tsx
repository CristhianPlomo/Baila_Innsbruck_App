import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Activity,
  Accessibility,
  Bell,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Eye,
  EyeOff,
  Globe2,
  Home,
  LogIn,
  LogOut,
  MailCheck,
  MapPin,
  Menu,
  Monitor,
  Music2,
  Moon,
  Phone,
  Printer,
  ReceiptText,
  ScanLine,
  ScrollText,
  ShoppingBag,
  Settings2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trash2,
  UserPlus,
  Users,
  X,
  Sun,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { fallbackCatalog, getCourseCatalog, type CourseGroup } from "./lib/catalog";
import { readCourseCart, writeCourseCart, type CourseCartItem } from "./lib/cart";
import { getFreeTrialForAccount, registerFreeTrial, type FreeTrialClass, type FreeTrialRegistration } from "./lib/free-trial";
import { getSimulatedCheckoutPrice, getUserPurchaseHistory, rejectedPurchaseRetentionMs, simulateCoursePurchase, simulateMembershipPurchase, simulatorPlans, type PurchaseHistoryResult, type PurchaseKind, type SimulatedPaymentMethod, type UserPurchase } from "./lib/purchases";
import { getEnrollmentMode, getPlanPrice, getVerifiedCommercialCategory } from "./lib/pricing";
import { isStripeCheckoutConfigured, redirectToStripeCheckout } from "./lib/stripe-checkout";
import { fallbackFeaturedEvents, homeOffers, type HomeFeaturedEvent } from "./lib/home-content";
import { getPublishedEvents } from "./lib/events";
import {
  clearDemoSession,
  getDemoAccount,
  getDemoSession,
  formatPersonName,
  getProfileFromUserMetadata,
  isAdminAccount,
  saveDemoAccount,
  type AppRole,
  type Account,
  type AccountProfile,
} from "./lib/account";
import AdminDashboard from "./components/AdminDashboard";
import ConfirmDialog from "./components/ConfirmDialog";
import QrPass from "./components/QrPass";

type Language = "de" | "en" | "es";
type ClassReminderTiming = "15m" | "30m" | "1h" | "2h" | "1d";

const classReminderTimings: ClassReminderTiming[] = ["15m", "30m", "1h", "2h", "1d"];

type ScheduleItem = {
  day: string;
  time: string;
  title: string;
  level: string;
  accent: "gold" | "turquoise" | "ink";
  href: string;
};

const schedule: ScheduleItem[] = [
  { day: "Monday", time: "18:00", title: "Bachata", level: "Beginner", accent: "gold", href: "/courses/bachata?level=beginner" },
  { day: "Monday", time: "19:00", title: "Bachata Sensual", level: "Improver", accent: "turquoise", href: "/courses/bachata?level=improver" },
  { day: "Tuesday", time: "18:00", title: "Salsa On1", level: "Beginner", accent: "gold", href: "/courses/salsa?style=salsa-on1&level=beginner" },
  { day: "Tuesday", time: "19:00", title: "Salsa On1", level: "Improver", accent: "ink", href: "/courses/salsa?style=salsa-on1&level=improver" },
  { day: "Wednesday", time: "18:00", title: "Salsa On2", level: "Beginner", accent: "turquoise", href: "/courses/salsa?style=salsa-on2&level=beginner" },
  { day: "Wednesday", time: "19:00", title: "Salsa On2", level: "Improver", accent: "gold", href: "/courses/salsa?style=salsa-on2&level=improver" },
  { day: "Wednesday", time: "20:00", title: "Bachata Sensual", level: "Intermediate", accent: "ink", href: "/courses/bachata?level=intermediate_1" },
  { day: "Thursday", time: "18:00", title: "Salsa cubana", level: "Beginner", accent: "gold", href: "/courses/salsa?style=salsa-cubana&level=beginner" },
  { day: "Thursday", time: "19:00", title: "Salsa cubana", level: "Improver", accent: "turquoise", href: "/courses/salsa?style=salsa-cubana&level=improver" },
  { day: "Thursday", time: "20:00", title: "Heels Lab by Lena", level: "Open Level", accent: "ink", href: "/courses/heels?level=open_level" },
  { day: "Friday", time: "18:00", title: "Popping Foundations", level: "Open Level", accent: "turquoise", href: "/courses/popping?level=open_level" },
  { day: "Friday", time: "19:30", title: "Bachata Sensual", level: "Advanced", accent: "gold", href: "/courses/bachata?level=advanced_1" },
  { day: "Sunday", time: "17:00", title: "Zouk mode on by Dana", level: "Open Level", accent: "ink", href: "/courses/zouk?level=open_level" },
];

const fallbackEvents = [
  { id: "summer-workshop", titleKey: "summerWorkshop", date: "12–13 Jul 2026", locationKey: "studioLocation", type: "workshop" },
  { id: "community-social", titleKey: "communitySocial", date: "25 Jul 2026 · 20:00", locationKey: "socialLocation", type: "social" },
  { id: "autumn-intensive", titleKey: "autumnIntensive", date: "05–06 Sep 2026", locationKey: "studioLocation", type: "intensive" },
];

void fallbackEvents;

const courseCardMedia: Record<string, { src: string; position: string }> = {
  salsa: { src: "/media/A__00236.jpg", position: "52% center" },
  bachata: { src: "/media/A__00269.jpg", position: "43% center" },
  popping: { src: "/media/A__00223.jpg", position: "48% center" },
  heels: { src: "/media/heels-lena.png", position: "50% 24%" },
  zouk: { src: "/media/A__00236.jpg", position: "73% center" },
};

function getAuthRedirectUrl() {
  return `${window.location.origin}/login`;
}

function isPasswordRecoveryLink() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return hash.get("type") === "recovery";
}

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const candidate = (error as { message?: unknown }).message;
    if (typeof candidate === "string" && candidate.trim() && candidate !== "{}") return candidate;
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code.trim()) return `${fallback} (${code})`;
  }
  return fallback;
}

type ProfileCommercialCategory = "regular" | "student" | "member" | "student_member" | "erasmus";

function getProfileCommercialCategory(account: Account, purchases: UserPurchase[], hasRemoteActiveMembership = false): ProfileCommercialCategory {
  const rawCategory = [account.appMetadata?.commercial_category, account.appMetadata?.customer_category, account.appMetadata?.category]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0)
    ?.trim()
    .toLocaleLowerCase("en-US")
    .replace(/[-\s/]+/g, "_");

  if (rawCategory === "student_member" || rawCategory === "member_student" || rawCategory === "discount") return "student_member";
  if (rawCategory === "student") return "student";
  if (rawCategory === "member" || rawCategory === "membership") return "member";
  if (rawCategory === "erasmus") return "erasmus";

  const hasActiveMembership = purchases.some((purchase) => {
    if (purchase.kind !== "membership" || purchase.status !== "paid") return false;
    return !purchase.validUntil || new Date(purchase.validUntil).getTime() >= Date.now();
  });
  if (hasActiveMembership || hasRemoteActiveMembership) return "member";
  if (account.role === "student") return "student";
  return "regular";
}

function isEmailAlreadyRegistered(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const details = error as { code?: unknown; message?: unknown };
  const message = typeof details.message === "string" ? details.message.toLowerCase() : "";
  return details.code === "user_already_exists" || details.code === "email_exists" || message.includes("already registered") || message.includes("already exists");
}

function accountFromUser(user: { id: string; email?: string; user_metadata: Record<string, unknown>; app_metadata: Record<string, unknown> }): Account {
  return { id: user.id, email: user.email ?? "", profile: getProfileFromUserMetadata(user.user_metadata), source: "supabase", appMetadata: user.app_metadata };
}

function App() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>((localStorage.getItem("baila-language") as Language) || "en");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("baila-theme") === "dark");
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem("baila-reduced-motion") === "true");
  const [classReminders, setClassReminders] = useState(() => localStorage.getItem("baila-class-reminders") !== "false");
  const [classReminderTiming, setClassReminderTiming] = useState<ClassReminderTiming>(() => {
    const stored = localStorage.getItem("baila-class-reminder-timing") as ClassReminderTiming | null;
    return stored && classReminderTimings.includes(stored) ? stored : "1h";
  });
  const [newActivityNotifications, setNewActivityNotifications] = useState(() => localStorage.getItem("baila-new-activity-notifications") !== "false");
  const [emailUpdates, setEmailUpdates] = useState(() => localStorage.getItem("baila-email-updates") === "true");
  const [menuOpen, setMenuOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [authReady, setAuthReady] = useState(() => !supabase);
  const [authRoleRevision, setAuthRoleRevision] = useState(0);
  const [courseCart, setCourseCart] = useState<CourseCartItem[]>(() => readCourseCart());
  const [cartConfirmation, setCartConfirmation] = useState<CourseCartItem | null>(null);
  const [cartRemovalConfirmation, setCartRemovalConfirmation] = useState<CourseCartItem | null>(null);
  const [freeTrialRegistration, setFreeTrialRegistration] = useState<FreeTrialRegistration | null>(null);
  const [freeTrialConfirmation, setFreeTrialConfirmation] = useState<FreeTrialRegistration | null>(null);
  const passwordRecovery = isPasswordRecoveryLink();

  useEffect(() => {
    void i18n.changeLanguage(language);
    localStorage.setItem("baila-language", language);
  }, [i18n, language]);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("baila-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reducedMotion ? "true" : "false";
    localStorage.setItem("baila-reduced-motion", String(reducedMotion));
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem("baila-class-reminders", String(classReminders));
    localStorage.setItem("baila-class-reminder-timing", classReminderTiming);
    localStorage.setItem("baila-new-activity-notifications", String(newActivityNotifications));
    localStorage.setItem("baila-email-updates", String(emailUpdates));
  }, [classReminderTiming, classReminders, emailUpdates, newActivityNotifications]);

  useEffect(() => {
    writeCourseCart(courseCart);
  }, [courseCart]);

  useEffect(() => {
    setFreeTrialRegistration(getFreeTrialForAccount(account));
  }, [account]);

  function addToCourseCart(item: CourseCartItem) {
    if (courseCart.some((entry) => entry.id === item.id)) return;
    setCourseCart((current) => current.some((entry) => entry.id === item.id) ? current : [...current, item]);
    setCartConfirmation(item);
  }

  function removeFromCourseCart(id: string) {
    const item = courseCart.find((current) => current.id === id);
    if (item) setCartRemovalConfirmation(item);
  }

  function confirmRemoveFromCourseCart() {
    if (!cartRemovalConfirmation) return;
    const id = cartRemovalConfirmation.id;
    setCartRemovalConfirmation(null);
    setCourseCart((current) => current.filter((item) => item.id !== id));
  }

  function addFreeTrialClass(classItem: FreeTrialClass) {
    if (!account || isAdminAccount(account)) return;
    const registration = registerFreeTrial(account, classItem);
    setFreeTrialRegistration(registration);
    setFreeTrialConfirmation(registration);
  }

  useEffect(() => {
    if (!supabase) {
      setAccount(getDemoSession());
      setAuthReady(true);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setAccount(data.session?.user ? accountFromUser(data.session.user) : null);
    }).finally(() => {
      if (mounted) setAuthReady(true);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthReady(true);
      if (session?.user) {
        const sessionAccount = accountFromUser(session.user);
        setAccount((current) => {
          if (current && current.id === sessionAccount.id && current.role) {
            return { ...sessionAccount, role: current.role };
          }
          return sessionAccount;
        });
        setAuthRoleRevision((current) => current + 1);
      } else {
        setAccount(null);
      }
    });
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !account?.id || account.source !== "supabase") return;
    let mounted = true;
    supabase.from("user_roles").select("role").eq("user_id", account.id).order("role").limit(1).maybeSingle().then(({ data, error }) => {
      const role = (data as { role?: AppRole } | null)?.role;
      if (mounted && !error) {
        setAccount((current) => current && current.id === account.id ? { ...current, role } : current);
      }
    });
    return () => { mounted = false; };
  }, [account?.id, account?.source, authRoleRevision]);

  async function handleSignOut() {
    try {
      if (supabase) await supabase.auth.signOut();
    } finally {
      clearDemoSession();
      setAccount(null);
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className={`app-shell${menuOpen ? " menu-open" : ""}`}>
      <AppHeader account={account} darkMode={darkMode} onDarkModeChange={setDarkMode} onSignOut={handleSignOut} menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((open) => !open)} cartItems={courseCart} onRemoveFromCart={removeFromCourseCart} />
      <div className="app-layout">
        <Sidebar account={account} menuOpen={menuOpen} onNavigate={() => setMenuOpen(false)} />
        {menuOpen && <button className="sidebar-backdrop" type="button" onClick={() => setMenuOpen(false)} aria-label={t("closeMenu")} />}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage account={account} />} />
            <Route path="/courses" element={<CoursesPage account={account} cartItems={courseCart} onRemoveFromCart={removeFromCourseCart} />} />
            <Route path="/courses/:courseSlug" element={<CourseDetailPage account={account} freeTrialRegistration={freeTrialRegistration} onRegisterFreeTrial={addFreeTrialClass} onAddToCart={addToCourseCart} cartItems={courseCart} />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/profile" element={<ProfilePage account={account} freeTrialRegistration={freeTrialRegistration} onSignOut={handleSignOut} />} />
            <Route path="/settings" element={<AuthenticatedRoute account={account} authReady={authReady}><UserSettingsPage language={language} darkMode={darkMode} reducedMotion={reducedMotion} classReminders={classReminders} classReminderTiming={classReminderTiming} newActivityNotifications={newActivityNotifications} emailUpdates={emailUpdates} onLanguageChange={setLanguage} onDarkModeChange={setDarkMode} onReducedMotionChange={setReducedMotion} onClassRemindersChange={setClassReminders} onClassReminderTimingChange={setClassReminderTiming} onNewActivityNotificationsChange={setNewActivityNotifications} onEmailUpdatesChange={setEmailUpdates} /></AuthenticatedRoute>} />
            <Route path="/events" element={<EventsPage account={account} />} />
            <Route path="/orders" element={<AuthenticatedRoute account={account} authReady={authReady}><OrdersPage account={account} cartItems={courseCart} onRemoveFromCart={removeFromCourseCart} onClearCart={() => setCourseCart([])} /></AuthenticatedRoute>} />
            <Route path="/admin/student-profile" element={<Navigate to="/profile" replace />} />
            <Route path="/admin/*" element={<AdminRoute account={account} />} />
            <Route path="/login" element={passwordRecovery ? <UpdatePasswordPage onAuthenticated={setAccount} /> : <LoginPage onAuthenticated={setAccount} />} />
            <Route path="/privacy" element={<LegalPage page="privacy" />} />
            <Route path="/imprint" element={<LegalPage page="imprint" />} />
            <Route path="/terms" element={<LegalPage page="terms" />} />
            <Route path="/cookies" element={<LegalPage page="cookies" />} />
            <Route path="*" element={<HomePage account={account} />} />
          </Routes>
          <LegalFooter />
        </main>
      </div>
      <MobileNav account={account} />
      {cartConfirmation && <CartAddedDialog item={cartConfirmation} onClose={() => setCartConfirmation(null)} />}
      {freeTrialConfirmation && <FreeTrialDialog registration={freeTrialConfirmation} onClose={() => setFreeTrialConfirmation(null)} />}
      <ConfirmDialog open={Boolean(cartRemovalConfirmation)} eyebrow={t("confirmations.eyebrow")} title={t("confirmations.deleteTitle", { item: cartRemovalConfirmation ? `${cartRemovalConfirmation.courseName}${cartRemovalConfirmation.styleName ? ` · ${cartRemovalConfirmation.styleName}` : ""}` : t("catalog.cart") })} copy={t("confirmations.deleteCopy")} confirmLabel={t("confirmations.delete")} cancelLabel={t("confirmations.cancel")} destructive onConfirm={confirmRemoveFromCourseCart} onCancel={() => setCartRemovalConfirmation(null)} />
    </div>
  );
}

function CartAddedDialog({ item, onClose }: { item: CourseCartItem; onClose: () => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="cart-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="cart-confirmation" role="dialog" aria-modal="true" aria-labelledby="cart-confirmation-title" aria-describedby="cart-confirmation-copy">
        <button className="cart-confirmation-close" type="button" onClick={onClose} aria-label={t("catalog.closeConfirmation")}><X size={18} /></button>
        <span className="cart-confirmation-icon"><ShoppingBag size={24} /></span>
        <p className="eyebrow">{t("catalog.addedEyebrow")}</p>
        <h2 id="cart-confirmation-title">{t("catalog.addedTitle")}</h2>
        <p id="cart-confirmation-copy">{t("catalog.addedCopy", { className: item.levelName })}</p>
        <div className="cart-confirmation-selection"><strong>{item.courseName}{item.styleName ? ` · ${item.styleName}` : ""}</strong><span>{item.levelName}</span></div>
        <div className="cart-confirmation-actions">
          <Link className="secondary-button" to="/courses" onClick={onClose} autoFocus>{t("catalog.continueShopping")}</Link>
          <Link className="primary-button" to="/orders#checkout" onClick={onClose}>{t("catalog.goToCart")} <ArrowUpRight size={16} /></Link>
        </div>
      </section>
    </div>
  );
}

function FreeTrialDialog({ registration, onClose }: { registration: FreeTrialRegistration; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("de") ? "de-AT" : i18n.language.startsWith("es") ? "es-ES" : "en-GB";
  const validUntil = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(registration.validUntil));
  return <div className="cart-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="free-trial-dialog" role="dialog" aria-modal="true" aria-labelledby="free-trial-dialog-title">
      <button className="cart-confirmation-close" type="button" onClick={onClose} aria-label={t("freeTrial.close")}><X size={18} /></button>
      <span className="cart-confirmation-icon"><Sparkles size={24} /></span>
      <p className="eyebrow">{t("freeTrial.dialogEyebrow")}</p>
      <h2 id="free-trial-dialog-title">{t("freeTrial.dialogTitle")}</h2>
      <p>{t("freeTrial.dialogCopy")}</p>
      <div className="free-trial-dialog-grid"><div className="free-trial-dialog-details"><strong>{t("freeTrial.selectedClasses")}</strong>{registration.classes.map((item) => <div className="free-trial-class-row" key={item.id}><span>{item.courseName}{item.styleName ? ` Â· ${item.styleName}` : ""}</span><small>{item.levelName} Â· {item.day} Â· {item.time}</small></div>)}<small className="free-trial-expiry">{t("freeTrial.validUntil", { date: validUntil })}</small></div><div className="free-trial-dialog-qr"><p className="eyebrow">{t("freeTrial.qrTitle")}</p><QrPass value={registration.qrValue} alt={t("freeTrial.qrAlt")} expandable closeLabel={t("qrFullscreen.close")} expandLabel={t("qrFullscreen.expand")} fullscreenTitle={t("freeTrial.qrTitle")} fullscreenCopy={t("freeTrial.qrCopy")} /><p>{t("freeTrial.qrCopy")}</p></div></div>
      <div className="cart-confirmation-actions"><Link className="secondary-button" to="/courses" onClick={onClose}>{t("freeTrial.continueSelecting")}</Link><Link className="primary-button" to="/profile" onClick={onClose}>{t("freeTrial.viewProfile")} <ArrowUpRight size={16} /></Link></div>
    </section>
  </div>;
}

function AppHeader({ account, darkMode, onDarkModeChange, onSignOut, menuOpen, onMenuToggle, cartItems, onRemoveFromCart }: { account: Account | null; darkMode: boolean; onDarkModeChange: (value: boolean) => void; onSignOut: () => Promise<void>; menuOpen: boolean; onMenuToggle: () => void; cartItems: CourseCartItem[]; onRemoveFromCart: (id: string) => void }) {
  const { t } = useTranslation();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const adminAccount = Boolean(account && isAdminAccount(account));

  useEffect(() => {
    if (!accountMenuOpen) return;

    function closeOnOutsideInteraction(event: PointerEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideInteraction);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideInteraction);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);

  function closeAccountMenu() {
    setAccountMenuOpen(false);
  }

  async function signOut() {
    closeAccountMenu();
    await onSignOut();
  }

  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="Baila Innsbruck App">
        <img src="/media/baila-logo.png" alt="Baila Innsbruck" />
        <span><strong>Baila</strong><small>INNSBRUCK APP</small></span>
      </Link>
      <div className="topbar-actions">
        <button className="icon-button theme-toggle" type="button" onClick={() => onDarkModeChange(!darkMode)} aria-label={t(darkMode ? "themeLight" : "themeDark")} title={t(darkMode ? "themeLight" : "themeDark")} aria-pressed={darkMode}>
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        {account && cartItems.length > 0 && <CourseCartMenu cartItems={cartItems} onRemoveFromCart={onRemoveFromCart} />}
        {account && isAdminAccount(account) && <Link className="admin-topbar-link" to="/admin"><ShieldCheck size={16} /><span>{t("admin.shortTitle")}</span></Link>}
        {account ? (
          <div className="account-menu" ref={accountMenuRef}>
            <button className="topbar-login account-menu-trigger" type="button" onClick={() => setAccountMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={accountMenuOpen}>
              <CircleUserRound size={16} /> <span>{account.profile.firstName || t("profile")}</span><ChevronDown size={14} aria-hidden="true" />
            </button>
            {accountMenuOpen && <div className="account-menu-popover" role="menu" aria-label={t("accountMenu")}>
              {adminAccount && <Link to="/admin" role="menuitem" onClick={closeAccountMenu}><ShieldCheck size={15} />{t("admin.dashboardNav")}</Link>}
              <Link to="/profile" role="menuitem" onClick={closeAccountMenu}><CircleUserRound size={15} />{t("nav.profile")}</Link>
              <Link to="/settings" role="menuitem" onClick={closeAccountMenu}><Settings2 size={15} />{t("userSettings.menuLabel")}</Link>
              <button type="button" role="menuitem" onClick={() => void signOut()}><LogOut size={15} />{t("signOut")}</button>
            </div>}
          </div>
        ) : <Link className="topbar-login" to="/login"><LogIn size={16} /> <span>{t("signIn")}</span></Link>}
        <button className="icon-button menu-toggle" type="button" onClick={onMenuToggle} aria-label={menuOpen ? t("closeMenu") : t("openMenu")} aria-expanded={menuOpen}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}

function CourseCartMenu({ cartItems, onRemoveFromCart }: { cartItems: CourseCartItem[]; onRemoveFromCart: (id: string) => void }) {
  const { t } = useTranslation();
  const [cartOpen, setCartOpen] = useState(false);
  return <div className="catalog-cart topbar-cart"><button type="button" className="secondary-button compact catalog-cart-trigger" onClick={() => setCartOpen((open) => !open)} aria-expanded={cartOpen} aria-haspopup="dialog"><ShoppingBag size={15} />{t("catalog.cart")} <b className="cart-count">{cartItems.length}</b><ChevronDown size={14} className={cartOpen ? "cart-chevron open" : "cart-chevron"} /></button>{cartOpen && <div className="catalog-cart-popover" role="dialog" aria-label={t("catalog.cartTitle")}><div className="catalog-cart-popover-heading"><div><p className="eyebrow">{t("catalog.cartEyebrow")}</p><strong>{t("catalog.cartTitle")}</strong></div><span>{t("catalog.cartCopy", { count: cartItems.length })}</span></div>{cartItems.length > 0 ? <div className="catalog-cart-items">{cartItems.map((item) => <div className="catalog-cart-item" key={item.id}><div><strong>{item.courseName}{item.styleName ? ` · ${item.styleName}` : ""}</strong><small>{item.levelName}</small></div><div className="catalog-cart-item-actions"><span>{item.amount ? `${item.currency ?? "EUR"} ${item.amount}` : t("catalog.pricePending")}</span><button className="catalog-cart-remove" type="button" onClick={() => onRemoveFromCart(item.id)} aria-label={t("catalog.removeFromCart")} title={t("catalog.removeFromCart")}><Trash2 size={15} aria-hidden="true" /></button></div></div>)}</div> : <p className="catalog-cart-empty">{t("catalog.cartEmpty")}</p>}<Link to="/orders#checkout" className="primary-button small" onClick={() => setCartOpen(false)}>{t("catalog.openCart")} <ArrowUpRight size={15} /></Link></div>}</div>;
}

function Sidebar({ account, menuOpen, onNavigate }: { account: Account | null; menuOpen: boolean; onNavigate: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();
  const adminAccess = Boolean(account && isAdminAccount(account));
  const isAdminRoute = location.pathname.startsWith("/admin");
  const items = [
    { to: "/", label: t("nav.home"), icon: Home, end: true },
    { to: "/courses", label: t("nav.courses"), icon: Music2 },
    { to: "/schedule", label: t("nav.schedule"), icon: CalendarDays },
    { to: "/events", label: t("nav.events"), icon: Sparkles },
    ...(account ? [{ to: "/orders", label: t("nav.orders"), icon: ShoppingBag }] : []),
    { to: "/profile", label: t("nav.profile"), icon: CircleUserRound },
  ];
  const adminItems = [
    { to: "/admin", label: t("nav.home"), icon: Home, end: true },
    { to: "/admin/users", label: t("admin.tabs.users"), icon: CircleUserRound },
    { to: "/admin/members", label: t("admin.tabs.members"), icon: Users },
    { to: "/admin/events", label: t("admin.tabs.events"), icon: Activity },
    { to: "/admin/classes", label: t("admin.tabs.courses"), icon: BookOpen },
    { to: "/admin/orders", label: t("admin.tabs.orders"), icon: ShoppingBag },
    { to: "/admin/qr-control", label: t("admin.qrControl.navLabel"), icon: ScanLine },
    { to: "/admin/logs", label: t("admin.tabs.logs"), icon: ScrollText },
    { to: "/admin/manual-user", label: t("admin.tabs.manualUser"), icon: UserPlus },
    { to: "/admin/settings", label: t("admin.tabs.settings"), icon: Settings2 },
  ];
  return (
    <aside className={`sidebar${menuOpen ? " mobile-open" : ""}`} aria-label={t("navigation")}>
      <div className="sidebar-caption">{t("userDashboard")}</div>
      <nav>
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `side-link${isActive && !isAdminRoute ? " active" : ""}`} onClick={onNavigate}>
            <Icon size={18} strokeWidth={1.8} /> <span>{label}</span>
          </NavLink>
        ))}
        {adminAccess && <>
          <div className="sidebar-section-divider"><span>{t("admin.sidebarTitle")}</span></div>
          <div className="sidebar-admin-subnav">
            {adminItems.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={location.pathname === to ? "active" : ""} onClick={onNavigate}><Icon size={15} strokeWidth={1.8} /><span>{label}</span></NavLink>)}
          </div>
        </>}
      </nav>
      {!isAdminRoute && !account && (
        <div className="sidebar-card">
          <span className="mini-orb"><Sparkles size={16} /></span>
          <strong>{t("firstClassTitle")}</strong>
          <p>{t("firstClassCopy")}</p>
          <Link to="/courses" className="text-button" onClick={onNavigate}>{t("exploreCourses")} <ArrowUpRight size={15} /></Link>
        </div>
      )}
      <div className="sidebar-foot">{t("location")}</div>
    </aside>
  );
}

function MobileNav({ account }: { account: Account | null }) {
  const { t } = useTranslation();
  const items = [
    { to: "/", label: t("nav.home"), icon: Home, end: true },
    { to: "/courses", label: t("nav.courses"), icon: Music2 },
    { to: "/events", label: t("nav.events"), icon: Sparkles },
    ...(account ? [{ to: "/orders", label: t("nav.orders"), icon: ShoppingBag }] : []),
    { to: "/profile", label: t("nav.profile"), icon: CircleUserRound },
  ];
  return <nav className="mobile-nav" aria-label={t("navigation")}>{items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? "active" : ""}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>;
}

function AuthenticatedRoute({ account, authReady, children }: { account: Account | null; authReady: boolean; children: ReactNode }) {
  if (!authReady) return null;
  return account ? children : <Navigate to="/login" replace />;
}

function HomePage({ account }: { account: Account | null }) {
  const { t } = useTranslation();
  const [featuredEvents, setFeaturedEvents] = useState<HomeFeaturedEvent[]>(fallbackFeaturedEvents);
  const [eventsSource, setEventsSource] = useState<"construction" | "supabase">("construction");

  useEffect(() => {
    let mounted = true;
    getPublishedEvents().then((remoteEvents) => {
      if (!mounted || !remoteEvents || remoteEvents.length === 0) return;
      setFeaturedEvents(remoteEvents.slice(0, 2));
      setEventsSource("supabase");
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="page-stack">
      <section className="welcome-grid">
        <div className="welcome-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> {t("appName")}</div>
          <h1>{t("heroTitle")} <em>{t("heroAccent")}</em></h1>
          <p className="lead">{t("heroCopy")}</p>
          <div className="hero-actions"><Link to="/courses" className="primary-button">{t("findCourse")} <ArrowUpRight size={18} /></Link><Link to="/schedule" className="quiet-link">{t("viewSchedule")} <ChevronRight size={16} /></Link></div>
          <div className="hero-note"><span className="avatar-stack"><i /><i /><i /><b>+</b></span><span>{t("communityNote")}</span></div>
        </div>
        <div className="hero-visual">
          <img src="/media/A__00236.jpg" alt={t("heroImageAlt")} />
          <div className="hero-sticker"><span>MOVE</span><strong>WITH<br />JOY</strong></div>
          <div className="hero-caption"><span>{t("heroCaption")}</span><small>47.2692° N · 11.4041° E</small></div>
        </div>
      </section>

      <section className="home-benefits section-block">
        <div className="section-heading"><div><p className="eyebrow">{t("homeBenefits.eyebrow")}</p><h2>{t("homeBenefits.title")}</h2></div><p className="home-section-copy">{t("homeBenefits.copy")}</p></div>
        <div className="home-benefit-grid">
          <article><span><BookOpen size={21} /></span><h3>{t("homeBenefits.coursesTitle")}</h3><p>{t("homeBenefits.coursesCopy")}</p></article>
          <article><span><ShoppingBag size={21} /></span><h3>{t("homeBenefits.ordersTitle")}</h3><p>{t("homeBenefits.ordersCopy")}</p></article>
          <article><span><ScanLine size={21} /></span><h3>{t("homeBenefits.qrTitle")}</h3><p>{t("homeBenefits.qrCopy")}</p></article>
          <article><span><ShieldCheck size={21} /></span><h3>{t("homeBenefits.secureTitle")}</h3><p>{t("homeBenefits.secureCopy")}</p></article>
        </div>
      </section>

      <section className="home-content-grid section-block">
        <article className="home-events-panel">
          <div className="section-heading"><div><p className="eyebrow"><Ticket size={14} />{t("homeEvents.eyebrow")}</p><h2>{t("homeEvents.title")}</h2></div><Link to="/events" className="quiet-link">{t("homeEvents.viewAll")} <ArrowUpRight size={16} /></Link></div>
          <p className="home-section-copy">{t("homeEvents.copy")}</p>
          <div className="home-featured-events">
            {featuredEvents.map((event, index) => <Link to="/events" className={`home-featured-event tone-${index % 2 === 0 ? "gold" : "turquoise"}`} key={event.id}><span className="home-event-icon"><Ticket size={18} /></span><div><span className="home-event-type">{t(`eventTypes.${event.type}`, { defaultValue: event.type })}</span><h3>{event.titleKey ? t(event.titleKey) : event.title}</h3><p>{event.date} · {event.locationKey ? t(event.locationKey) : event.location}</p></div><ArrowUpRight size={17} /></Link>)}
          </div>
          <p className="source-note">{eventsSource === "supabase" ? t("homeEvents.connected") : t("homeEvents.construction")}</p>
        </article>

        <div className="home-side-stack">
          <article className="home-academy-card">
            <div className="home-card-heading"><span className="home-card-icon turquoise"><CalendarDays size={19} /></span><p className="eyebrow">{t("homeAcademy.eyebrow")}</p></div>
            <h3>{t("homeAcademy.title")}</h3>
            <p>{t("homeAcademy.copy")}</p>
            <Link to="/schedule" className="quiet-link">{t("homeAcademy.cta")} <ArrowUpRight size={15} /></Link>
          </article>
          <article className="home-closure-card">
            <div className="home-card-heading"><span className="home-card-icon gold"><Bell size={19} /></span><p className="eyebrow">{t("homeAcademy.noticeEyebrow")}</p></div>
            <h3>{t("homeAcademy.noticeTitle")}</h3>
            <p>{t("homeAcademy.noticeCopy")}</p>
          </article>
        </div>
      </section>

      <section className="home-offers section-block">
        <div className="section-heading"><div><p className="eyebrow">{t("homeOffers.eyebrow")}</p><h2>{t("homeOffers.title")}</h2></div><p className="home-section-copy">{t("homeOffers.copy")}</p></div>
        <div className="home-offer-grid">{homeOffers.map((offer) => <Link key={offer.id} to={offer.href} className={`home-offer-card tone-${offer.tone}`}><span className="home-offer-icon"><Sparkles size={19} /></span><span className="home-offer-tag">{t(offer.tagKey)}</span><h3>{t(offer.titleKey)}</h3><p>{t(offer.copyKey)}</p><span className="home-offer-cta">{t(offer.ctaKey)} <ArrowUpRight size={15} /></span></Link>)}</div>
      </section>

      <section className="membership-feature">
        <div className="membership-feature-copy">
          <p className="eyebrow">{t("homeMembership.eyebrow")}</p>
          <h2>{t("homeMembership.title")}</h2>
          <p>{t("homeMembership.copy")}</p>
          <ul>
            <li><CheckCircle2 size={17} />{t("homeMembership.benefitCourses")}</li>
            <li><CheckCircle2 size={17} />{t("homeMembership.benefitEvents")}</li>
            <li><CheckCircle2 size={17} />{t("homeMembership.benefitAccount")}</li>
          </ul>
        </div>
        <div className="membership-price-card">
          <div className="membership-price-top"><span>{t("homeMembership.priceLabel")}</span><b>{t("homeMembership.badge")}</b></div>
          <strong>25 €</strong>
          <small>{t("homeMembership.perYear")}</small>
          <Link className="primary-button" to={account ? "/orders?product=membership#checkout" : "/login"}>{t(account ? "homeMembership.buy" : "homeMembership.signInToBuy")} <ArrowUpRight size={17} /></Link>
          <p>{t("homeMembership.renewalNotice")}</p>
        </div>
      </section>

      <section className="home-how-it-works section-block">
        <div className="section-heading"><div><p className="eyebrow">{t("homeHow.eyebrow")}</p><h2>{t("homeHow.title")}</h2></div></div>
        <ol>
          <li><b>01</b><div><h3>{t("homeHow.stepOneTitle")}</h3><p>{t("homeHow.stepOneCopy")}</p></div></li>
          <li><b>02</b><div><h3>{t("homeHow.stepTwoTitle")}</h3><p>{t("homeHow.stepTwoCopy")}</p></div></li>
          <li><b>03</b><div><h3>{t("homeHow.stepThreeTitle")}</h3><p>{t("homeHow.stepThreeCopy")}</p></div></li>
        </ol>
      </section>

    </div>
  );
}

function CourseCard({ group, index }: { group: CourseGroup; index: number }) {
  const { t } = useTranslation();
  const media = courseCardMedia[group.slug] ?? { src: "/media/A__00223.jpg", position: "center" };
  return <Link to={`/courses/${group.slug}`} className={`course-card course-card-with-image card-${index % 3}`}><img className="course-card-image" src={media.src} alt="" aria-hidden="true" loading="lazy" style={{ objectPosition: media.position }} /><span className="course-card-shade" /><span className="card-index">{String(index + 1).padStart(2, "0")}</span><span className="course-symbol">{group.name.slice(0, 1).toUpperCase()}</span><div><p>{t("catalog.courseLabel")}</p><h3>{group.name}</h3><span>{group.description}</span></div><ArrowUpRight className="card-arrow" size={18} /></Link>;
}

function ScheduleRow({ item }: { item: ScheduleItem }) {
  const { t } = useTranslation();
  return <Link to={item.href} className={`schedule-row schedule-${item.accent}`} aria-label={`${t("detailsFor")} ${item.title}, ${item.level}`}><div className="schedule-time"><strong>{item.time}</strong><span>{t(`days.${item.day}`)}</span></div><div className="schedule-main"><strong>{item.title}</strong><span>{item.level}</span></div><span className="round-button" aria-hidden="true"><ChevronRight size={17} /></span></Link>;
}

function CoursesPage({ account, cartItems, onRemoveFromCart }: { account: Account | null; cartItems: CourseCartItem[]; onRemoveFromCart: (id: string) => void }) {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<CourseGroup[]>(fallbackCatalog);
  const [catalogSource, setCatalogSource] = useState("fallback");
  const [cartOpen, setCartOpen] = useState(false);
  const [showFirstClassBanner, setShowFirstClassBanner] = useState(!account);

  useEffect(() => {
    let mounted = true;
    getCourseCatalog().then((remoteGroups) => {
      if (mounted && remoteGroups.length > 0) {
        setGroups(remoteGroups);
        setCatalogSource(remoteGroups === fallbackCatalog ? "fallback" : "supabase");
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!account?.id || isAdminAccount(account)) {
      setShowFirstClassBanner(!account);
      return;
    }
    let mounted = true;
    getUserPurchaseHistory(account.id).then((result) => {
      if (!mounted) return;
      const now = Date.now();
      const hasCurrentCourseAccess = result.purchases.some((purchase) => {
        if (purchase.kind === "membership" || purchase.status === "refunded") return false;
        if (purchase.validUntil && new Date(purchase.validUntil).getTime() < now) return false;
        if (purchase.kind === "package" && purchase.sessions?.length && !purchase.sessions.some((session) => session.status === "available")) return false;
        return true;
      });
      setShowFirstClassBanner(!result.unavailable && !hasCurrentCourseAccess);
    }).catch(() => {
      if (mounted) setShowFirstClassBanner(false);
    });
    return () => { mounted = false; };
  }, [account]);

  return <div className="page-stack inner-page"><PageIntro eyebrow={t("nav.courses")} title={t("coursesTitle")} copy={t("coursesCopy")} /><div className="catalog-toolbar"><span>{t("catalog.coursePath")}</span><div className="catalog-cart"><button type="button" className="secondary-button compact catalog-cart-trigger" onClick={() => setCartOpen((open) => !open)} aria-expanded={cartOpen} aria-haspopup="dialog"><ShoppingBag size={15} />{t("catalog.cart")} <b className="cart-count">{cartItems.length}</b><ChevronDown size={14} className={cartOpen ? "cart-chevron open" : "cart-chevron"} /></button>{cartOpen && <div className="catalog-cart-popover" role="dialog" aria-label={t("catalog.cartTitle")}><div className="catalog-cart-popover-heading"><div><p className="eyebrow">{t("catalog.cartEyebrow")}</p><strong>{t("catalog.cartTitle")}</strong></div><span>{t("catalog.cartCopy", { count: cartItems.length })}</span></div>{cartItems.length > 0 ? <div className="catalog-cart-items">{cartItems.map((item) => <div className="catalog-cart-item" key={item.id}><div><strong>{item.courseName}{item.styleName ? ` · ${item.styleName}` : ""}</strong><small>{item.levelName}</small></div><div className="catalog-cart-item-actions"><span>{item.amount ? `${item.currency ?? "EUR"} ${item.amount}` : t("catalog.pricePending")}</span><button className="catalog-cart-remove" type="button" onClick={() => onRemoveFromCart(item.id)} aria-label={t("catalog.removeFromCart")} title={t("catalog.removeFromCart")}><Trash2 size={15} aria-hidden="true" /></button></div></div>)}</div> : <p className="catalog-cart-empty">{t("catalog.cartEmpty")}</p>}<Link to="/orders#checkout" className="primary-button small" onClick={() => setCartOpen(false)}>{t("catalog.openCart")} <ArrowUpRight size={15} /></Link></div>}</div></div><div className="course-list-page">{groups.map((group, index) => <CourseCard key={group.id} group={group} index={index} />)}</div><p className="source-note">{catalogSource === "supabase" ? t("catalogConnected") : t("catalogFallback")}</p>{showFirstClassBanner && <div className="info-banner"><Sparkles size={19} /><div><strong>{t("firstClassTitle")}</strong><p>{t("firstClassCopy")}</p></div><Link to="/login" className="primary-button small">{t("getStarted")} <ArrowUpRight size={16} /></Link></div>}</div>;
}

function CourseDetailPage({ account, freeTrialRegistration, onRegisterFreeTrial, onAddToCart, cartItems }: { account: Account | null; freeTrialRegistration: FreeTrialRegistration | null; onRegisterFreeTrial: (item: FreeTrialClass) => void; onAddToCart: (item: CourseCartItem) => void; cartItems: CourseCartItem[] }) {
  const { t } = useTranslation();
  const { courseSlug } = useParams();
  const [searchParams] = useSearchParams();
  const [catalog, setCatalog] = useState<CourseGroup[]>(fallbackCatalog);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [source, setSource] = useState("fallback");

  useEffect(() => {
    let mounted = true;
    getCourseCatalog().then((items) => {
      if (!mounted) return;
      setCatalog(items);
      setSource(items === fallbackCatalog ? "fallback" : "supabase");
    });
    return () => { mounted = false; };
  }, []);

  const course = catalog.find((item) => item.slug === courseSlug);
  const requestedStyleSlug = searchParams.get("style");
  const requestedLevelCode = searchParams.get("level");
  const selectedStyle = course?.styles.find((style) => style.id === selectedStyleId) ?? null;
  const levels = selectedStyle?.levels ?? (course?.styles.length ? [] : course?.levels ?? []);
  const selectedLevel = levels.find((level) => level.id === selectedLevelId) ?? null;

  useEffect(() => {
    if (!course || !requestedLevelCode) return;
    const requestedStyle = requestedStyleSlug
      ? course.styles.find((style) => style.slug === requestedStyleSlug)
      : null;
    const availableLevels = requestedStyle?.levels ?? (course.styles.length === 0 ? course.levels : []);
    const requestedLevel = availableLevels.find((level) => level.code === requestedLevelCode || level.id === requestedLevelCode);
    if (!requestedLevel) return;
    setSelectedStyleId(requestedStyle?.id ?? null);
    setSelectedLevelId(requestedLevel.id);
  }, [course, requestedLevelCode, requestedStyleSlug]);

  if (!course) return <div className="page-stack inner-page"><PageIntro eyebrow={t("catalog.courseLabel")} title={t("catalog.notFound")} copy={t("catalog.notFoundCopy")} /><Link to="/courses" className="quiet-link">{t("catalog.backToCourses")} <ArrowUpRight size={15} /></Link></div>;
  const currentCourse = course;

  function selectStyle(styleId: string) {
    setSelectedStyleId(styleId);
    setSelectedLevelId(null);
    moveMobileFlowTop();
  }

  function moveMobileFlowTop() {
    if (!window.matchMedia("(max-width: 1024px)").matches) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function selectLevel(levelId: string) {
    setSelectedLevelId(levelId);
    moveMobileFlowTop();
  }

  function returnToPreviousStep() {
    if (selectedLevelId) setSelectedLevelId(null);
    else if (selectedStyleId) setSelectedStyleId(null);
    moveMobileFlowTop();
  }

  const levelTypeKey = selectedLevel?.code === "open_level"
    ? "openLevel"
    : selectedLevel?.code.startsWith("intermediate")
      ? "intermediate"
      : selectedLevel?.code.startsWith("advanced")
        ? "advanced"
        : selectedLevel?.code;
  const selectedItemId = selectedLevel ? `${course.id}:${selectedStyle?.id ?? "course"}:${selectedLevel.id}` : "";
  const selectedInCart = selectedItemId ? cartItems.some((item) => item.id === selectedItemId) : false;
  const freeTrialAvailable = Boolean(account && !isAdminAccount(account) && (!freeTrialRegistration || freeTrialRegistration.status === "active"));
  const selectedInFreeTrial = Boolean(selectedItemId && freeTrialRegistration?.classes.some((item) => item.id === selectedItemId));
  const flowStep = selectedLevel ? "detail" : course.styles.length > 0 && !selectedStyle ? "styles" : "classes";

  function registerSelectedClass() {
    if (!selectedLevel?.details || !freeTrialAvailable) return;
    onRegisterFreeTrial({ id: selectedItemId, courseId: currentCourse.id, courseName: currentCourse.name, styleId: selectedStyle?.id, styleName: selectedStyle?.name, levelId: selectedLevel.id, levelName: selectedLevel.name, levelDescription: selectedLevel.description, ...selectedLevel.details });
  }

  return (
    <div className={`page-stack inner-page course-detail-flow mobile-step-${flowStep}`}>
      <Link to="/courses" className="back-link"><ChevronRight size={16} className="back-link-icon" />{t("catalog.backToCourses")}</Link>
      <PageIntro eyebrow={t("catalog.courseLabel")} title={course.name} copy={course.description ?? t("catalog.courseCopy")} />
      {freeTrialAvailable && <div className="free-trial-banner"><span className="free-trial-banner-icon"><Sparkles size={19} /></span><div><p className="eyebrow">{t("freeTrial.eyebrow")}</p><strong>{t("freeTrial.courseTitle")}</strong><p>{t("freeTrial.courseCopy")}</p></div><span className="free-trial-validity">{t("freeTrial.validity")}</span></div>}
      {flowStep !== (course.styles.length > 0 ? "styles" : "classes") && <button type="button" className="mobile-flow-back" onClick={returnToPreviousStep}><ChevronLeft size={17} />{flowStep === "detail" ? t("catalog.backToClasses") : t("catalog.backToStyles")}</button>}
      <div className="catalog-breadcrumb"><span>{course.name}</span>{selectedStyle && <><ChevronRight size={14} /><strong>{selectedStyle.name}</strong></>}{selectedLevel && <><ChevronRight size={14} /><strong>{selectedLevel.name}</strong></>}</div>
      {course.styles.length > 0 && (
        <section className="catalog-section course-styles-step">
          <div className="section-heading"><div><p className="eyebrow">{t("catalog.stylesEyebrow")}</p><h2>{t("catalog.stylesTitle")}</h2></div><span>{t("catalog.stylesCopy")}</span></div>
          <div className="style-grid">{course.styles.map((style, index) => <button type="button" className={`style-card card-${index % 3}${selectedStyleId === style.id ? " selected" : ""}`} key={style.id} onClick={() => selectStyle(style.id)}><span className="course-symbol">{style.name.slice(0, 1)}</span><span><strong>{style.name}</strong><small>{style.description || t("catalog.styleFallbackCopy")}</small></span><ChevronRight size={17} /></button>)}</div>
          {course.slug === "salsa" && <div className="style-recommendation"><span className="eyebrow">{t("catalog.stylesPreferenceTitle")}</span><p>{t("catalog.stylesPreferenceCopy")}</p></div>}
        </section>
      )}
      {(course.styles.length === 0 || selectedStyle) && (
        <section className="catalog-section course-classes-step">
          <div className="section-heading"><div><p className="eyebrow">{t("catalog.classesEyebrow")}</p><h2>{selectedStyle?.name ?? course.name}</h2></div><span>{t("catalog.classesCopy")}</span></div>
          {levels.length > 0 ? (
            <div className="level-grid">
              {levels.map((level) => {
                const levelKey = level.code === "open_level" ? "openLevel" : level.code.startsWith("intermediate") ? "intermediate" : level.code.startsWith("advanced") ? "advanced" : level.code;
                return (
                  <button type="button" className={`level-card${selectedLevelId === level.id ? " selected" : ""}`} key={level.id} onClick={() => selectLevel(level.id)} aria-pressed={selectedLevelId === level.id}>
                    <div><span className="level-code">{t(`admin.levelOptions.${levelKey}`)}</span><h3>{level.name}</h3><p>{level.description || t("catalog.levelFallbackCopy")}</p></div>
                    <span className="level-card-action">{t("catalog.viewClass")} <ChevronRight size={16} /></span>
                  </button>
                );
              })}
            </div>
          ) : <div className="empty-state"><BookOpen size={22} /><strong>{t("catalog.noLevels")}</strong><p>{t("catalog.noLevelsCopy")}</p></div>}

          {selectedLevel && (
            <article className="class-detail-panel" aria-live="polite">
              <header className="class-detail-heading">
                <div><p className="eyebrow">{t("catalog.classDetailsEyebrow")}</p><h3>{selectedLevel.name}</h3><span className="level-code">{t(`admin.levelOptions.${levelTypeKey}`)}</span></div>
                {freeTrialAvailable ? <button type="button" className={selectedInFreeTrial ? "secondary-button compact" : "primary-button small"} disabled={selectedInFreeTrial} onClick={registerSelectedClass}>{selectedInFreeTrial ? t("freeTrial.alreadySelected") : freeTrialRegistration ? t("freeTrial.addAnother") : t("freeTrial.registerAction")} {!selectedInFreeTrial && <ArrowUpRight size={15} />}</button> : <button type="button" className={selectedInCart ? "secondary-button compact" : "primary-button small"} disabled={selectedInCart} onClick={() => onAddToCart({ id: selectedItemId, courseId: course.id, courseName: course.name, styleId: selectedStyle?.id, styleName: selectedStyle?.name, levelId: selectedLevel.id, levelName: selectedLevel.name, levelDescription: selectedLevel.description, amount: null, currency: "EUR" })}>{selectedInCart ? t("catalog.inCart") : t("catalog.addToCart")} {!selectedInCart && <ArrowUpRight size={15} />}</button>}
              </header>
              <p className="class-detail-description">{selectedLevel.description || t("catalog.levelFallbackCopy")}</p>
              {selectedLevel.details && (
                <>
                  <div className="class-detail-facts">
                    <div><CalendarDays size={18} /><span><small>{t("catalog.schedule")}</small><strong>{selectedLevel.details.day} · {selectedLevel.details.time}</strong></span></div>
                    <div><Clock size={18} /><span><small>{t("catalog.duration")}</small><strong>{selectedLevel.details.duration}</strong></span></div>
                    <div><CircleUserRound size={18} /><span><small>{t("catalog.teacher")}</small><strong>{selectedLevel.details.teacher}</strong></span></div>
                    <div><MapPin size={18} /><span><small>{t("catalog.address")}</small><strong>{selectedLevel.details.address}</strong></span></div>
                  </div>
                  <div className="class-content"><p className="eyebrow">{t("catalog.classContent")}</p><ul>{selectedLevel.details.content.map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul></div>
                </>
              )}
            </article>
          )}
        </section>
      )}
      {source === "supabase" && <p className="source-note">{t("catalogConnected")}</p>}
      <div className="catalog-cart-callout"><ShoppingBag size={19} /><div><strong>{t("catalog.cartTitle")}</strong><p>{t("catalog.cartCopy", { count: cartItems.length })}</p></div><Link to="/orders#checkout" className="quiet-link">{t("catalog.openCart")} <ArrowUpRight size={15} /></Link></div>
    </div>
  );
}

function SchedulePage() {
  const { t } = useTranslation();
  return <div className="page-stack inner-page"><PageIntro eyebrow={t("nav.schedule")} title={t("scheduleTitle")} copy={t("scheduleCopy")} /><div className="schedule-list schedule-page-list">{schedule.map((item) => <ScheduleRow key={`${item.day}-${item.time}-${item.title}`} item={item} />)}</div></div>;
}

function AdminRoute({ account }: { account: Account | null }) {
  const { t } = useTranslation();
  if (!account) {
    return <div className="page-stack inner-page"><PageIntro eyebrow={t("admin.shortTitle")} title={t("admin.accessTitle")} copy={t("admin.accessCopy")} /><Link to="/login" className="primary-button small">{t("signIn")} <ArrowUpRight size={16} /></Link></div>;
  }
  if (!isAdminAccount(account)) {
    return <div className="page-stack inner-page"><PageIntro eyebrow={t("admin.shortTitle")} title={t("admin.deniedTitle")} copy={t("admin.deniedCopy")} /><Link to="/profile" className="quiet-link">{t("nav.profile")} <ArrowUpRight size={16} /></Link></div>;
  }
  return <div className="admin-responsive-shell"><section className="admin-mobile-access-notice" aria-labelledby="admin-mobile-access-title"><span className="admin-mobile-access-icon"><Monitor size={25} /></span><p className="eyebrow">{t("admin.mobileAccessEyebrow")}</p><h2 id="admin-mobile-access-title">{t("admin.mobileAccessTitle")}</h2><p>{t("admin.mobileAccessCopy")}</p></section><div className="admin-desktop-workspace"><AdminDashboard account={account} /></div></div>;
}

function ProfilePage({ account, freeTrialRegistration, onSignOut }: { account: Account | null; freeTrialRegistration: FreeTrialRegistration | null; onSignOut: () => Promise<void> }) {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [remoteActiveMembership, setRemoteActiveMembership] = useState(false);
  const displayName = account ? [account.profile.firstName, account.profile.lastName].filter(Boolean).map(formatPersonName).join(" ") || account.email : t("guestAccount");
  const commercialCategory = account ? getProfileCommercialCategory(account, purchases, remoteActiveMembership) : "regular";

  useEffect(() => {
    if (!account?.id) {
      setPurchases([]);
      setRemoteActiveMembership(false);
      return;
    }
    let mounted = true;
    void (async () => {
      const purchaseResult = await getUserPurchaseHistory(account.id as string);
      let activeMembership = false;
      if (supabase && account.source === "supabase") {
        const { data, error } = await supabase.from("memberships").select("is_active").eq("user_id", account.id).eq("is_active", true).limit(1);
        activeMembership = !error && ((data as Array<{ is_active?: boolean | null }> | null)?.some((membership) => membership.is_active === true) ?? false);
      }
      if (mounted) {
        setPurchases(purchaseResult.purchases);
        setRemoteActiveMembership(activeMembership);
      }
    })();
    return () => { mounted = false; };
  }, [account?.id, account?.source]);

  return (
    <div className="page-stack inner-page">
      <PageIntro eyebrow={t("nav.profile")} title={t("profileTitle")} copy={t("profileCopy")} />
      {!account ? (
        <div className="guest-access-card">
          <div className="auth-mark"><UserPlus size={21} /></div>
          <div><p className="eyebrow">{t("guestAccount")}</p><h2>{t("personalAreaTitle")}</h2><p>{t("personalAreaCopy")}</p></div>
          <Link to="/login" className="primary-button small">{t("createAccount")} <ArrowUpRight size={16} /></Link>
        </div>
      ) : (
        <MemberDashboard account={account} displayName={displayName} commercialCategory={commercialCategory} freeTrialRegistration={freeTrialRegistration} onSignOut={onSignOut} />
      )}
    </div>
  );
}

function MemberDashboard({ account, displayName, commercialCategory, freeTrialRegistration, onSignOut }: { account: Account; displayName: string; commercialCategory: ProfileCommercialCategory; freeTrialRegistration: FreeTrialRegistration | null; onSignOut: () => Promise<void> }) {
  const { t } = useTranslation();
  return (
    <div className="member-dashboard">
      <section className="dashboard-welcome">
        <div><p className="eyebrow"><span className="eyebrow-dot" />{t("memberAreaEyebrow")}</p><h2>{t("welcomeBack", { name: displayName })}</h2><p>{t("dashboardCopy")}</p></div>
        <div className="dashboard-role"><span className="dashboard-role-icon"><Users size={20} /></span><small>{t("danceRole")}</small><strong>{t(`roles.${account.profile.danceRole}`)}</strong></div>
      </section>
      <div className="dashboard-stats">
        <div><strong>03</strong><span>{t("upcomingClasses")}</span></div>
        <div><strong>02</strong><span>{t("savedEvents")}</span></div>
        <div><strong>08</strong><span>{t("sessionsLeft")}</span></div>
      </div>
      <div className="dashboard-grid">
        <section className="dashboard-panel dashboard-panel-wide"><div className="dashboard-panel-heading"><div><p className="eyebrow">{t("nextClassEyebrow")}</p><h3>{t("nextClassTitle")}</h3></div><CalendarDays size={20} /></div><div className="dashboard-highlight"><strong>18:00</strong><span>{t("nextClassMeta")}</span><span className="status-pill"><Check size={13} />{t("booked")}</span></div><Link to="/schedule" className="quiet-link">{t("openSchedule")} <ArrowUpRight size={15} /></Link></section>
        <section className="dashboard-panel"><div className="dashboard-panel-heading"><div><p className="eyebrow">{t("featuredEventEyebrow")}</p><h3>{t("featuredEventTitle")}</h3></div><Sparkles size={20} /></div><p className="dashboard-panel-copy">{t("featuredEventMeta")}</p><Link to="/events" className="quiet-link">{t("exploreEvents")} <ArrowUpRight size={15} /></Link></section>
        <section className="dashboard-panel"><div className="dashboard-panel-heading"><div><p className="eyebrow">{t("recentOrderEyebrow")}</p><h3>{t("recentOrderTitle")}</h3></div><ShoppingBag size={20} /></div><p className="dashboard-panel-copy">{t("recentOrderMeta")}</p><Link to="/orders" className="quiet-link">{t("viewOrders")} <ArrowUpRight size={15} /></Link></section>
      </div>
      <div className="profile-card profile-card-expanded">
        <div className="profile-avatar">{(account.profile.firstName || account.email).slice(0, 1).toUpperCase()}</div>
        <div className="profile-card-copy"><p className="eyebrow">{t("accountStatus")}</p><h2>{displayName}</h2><p>{account.email}</p><div className="profile-meta">{(account.profile.address || account.profile.postalCode || account.profile.city) && <span><MapPin size={14} />{[account.profile.address, [account.profile.postalCode, account.profile.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</span>}{account.profile.phone && <span><Phone size={14} />{account.profile.phone}</span>}</div><span className="role-pill"><Users size={14} />{t(`roles.${account.profile.danceRole}`)}</span></div>
        <button className="quiet-action" type="button" onClick={() => void onSignOut()}><LogOut size={15} />{t("signOut")}</button>
      </div>
      <section className={`profile-category-card ${commercialCategory}`} aria-label={t("profileCategory.eyebrow")}>
        <span className="profile-category-icon"><ShieldCheck size={19} /></span>
        <div className="profile-category-copy"><p className="eyebrow">{t("profileCategory.eyebrow")}</p><h3>{t(`profileCategory.categories.${commercialCategory}`)}</h3><p>{t(`profileCategory.copy.${commercialCategory}`)}</p></div>
        <span className="profile-category-state">{t(`profileCategory.states.${commercialCategory}`)}</span>
      </section>
      {freeTrialRegistration && <MemberFreeTrialCard registration={freeTrialRegistration} />}
      <div className="account-menu-grid" aria-label={t("accountMenu")}>
        <Link to="/events" className="account-menu-card"><span className="account-menu-icon turquoise"><Sparkles size={18} /></span><span><strong>{t("nav.events")}</strong><small>{t("eventsMenuCopy")}</small></span><ChevronRight size={17} /></Link>
        <Link to="/orders" className="account-menu-card"><span className="account-menu-icon gold"><ShoppingBag size={18} /></span><span><strong>{t("nav.orders")}</strong><small>{t("ordersMenuCopy")}</small></span><ChevronRight size={17} /></Link>
        <Link to="/schedule" className="account-menu-card"><span className="account-menu-icon ink"><CalendarDays size={18} /></span><span><strong>{t("nav.schedule")}</strong><small>{t("scheduleMenuCopy")}</small></span><ChevronRight size={17} /></Link>
        <Link to="/settings" className="account-menu-card"><span className="account-menu-icon settings"><Settings2 size={18} /></span><span><strong>{t("userSettings.menuLabel")}</strong><small>{t("userSettings.profileCopy")}</small></span><ChevronRight size={17} /></Link>
      </div>
      <div className="dashboard-note"><Ticket size={16} /><span>{t("demoActivityNote")}</span></div>
    </div>
  );
}

function MemberFreeTrialCard({ registration }: { registration: FreeTrialRegistration }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("de") ? "de-AT" : i18n.language.startsWith("es") ? "es-ES" : "en-GB";
  const validUntil = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(registration.validUntil));
  return <section className={`free-trial-card ${registration.status}`}><div><p className="eyebrow"><Sparkles size={14} />{t("freeTrial.profileEyebrow")}</p><h2>{t("freeTrial.profileTitle")}</h2><p>{t(`freeTrial.profileStatus.${registration.status}`, { date: validUntil })}</p><div className="free-trial-class-list">{registration.classes.map((item) => <div key={item.id}><strong>{item.courseName}{item.styleName ? ` Â· ${item.styleName}` : ""}</strong><small>{item.levelName} Â· {item.day} Â· {item.time}</small></div>)}</div></div><QrPass value={registration.qrValue} alt={t("freeTrial.qrAlt")} expandable={registration.status === "active"} expandLabel={t("qrFullscreen.expand")} closeLabel={t("qrFullscreen.close")} fullscreenTitle={t("freeTrial.qrTitle")} fullscreenCopy={t("freeTrial.qrCopy")} /></section>;
}

type UserSettingsPageProps = {
  language: Language;
  darkMode: boolean;
  reducedMotion: boolean;
  classReminders: boolean;
  classReminderTiming: ClassReminderTiming;
  newActivityNotifications: boolean;
  emailUpdates: boolean;
  onLanguageChange: (value: Language) => void;
  onDarkModeChange: (value: boolean) => void;
  onReducedMotionChange: (value: boolean) => void;
  onClassRemindersChange: (value: boolean) => void;
  onClassReminderTimingChange: (value: ClassReminderTiming) => void;
  onNewActivityNotificationsChange: (value: boolean) => void;
  onEmailUpdatesChange: (value: boolean) => void;
};

function UserSettingsPage({ language, darkMode, reducedMotion, classReminders, classReminderTiming, newActivityNotifications, emailUpdates, onLanguageChange, onDarkModeChange, onReducedMotionChange, onClassRemindersChange, onClassReminderTimingChange, onNewActivityNotificationsChange, onEmailUpdatesChange }: UserSettingsPageProps) {
  const { t } = useTranslation();

  return (
    <div className="page-stack inner-page user-settings-page">
      <PageIntro eyebrow={t("userSettings.eyebrow")} title={t("userSettings.title")} copy={t("userSettings.copy")} />
      <div className="settings-saved-notice" role="status"><CheckCircle2 size={17} /><span>{t("userSettings.savedNotice")}</span></div>
      <section className="user-settings-card">
        <header><span className="settings-card-icon"><Globe2 size={19} /></span><div><p className="eyebrow">{t("userSettings.languageEyebrow")}</p><h2>{t("userSettings.languageTitle")}</h2><p>{t("userSettings.languageCopy")}</p></div></header>
        <label className="settings-select-field"><span>{t("userSettings.languageLabel")}</span><select value={language} onChange={(event) => onLanguageChange(event.target.value as Language)}><option value="es">{t("userSettings.languages.es")}</option><option value="de">{t("userSettings.languages.de")}</option><option value="en">{t("userSettings.languages.en")}</option></select></label>
      </section>
      <section className="user-settings-card">
        <header><span className="settings-card-icon"><Moon size={19} /></span><div><p className="eyebrow">{t("userSettings.appearanceEyebrow")}</p><h2>{t("userSettings.appearanceTitle")}</h2><p>{t("userSettings.appearanceCopy")}</p></div></header>
        <div className="settings-toggle-list">
          <SettingToggle icon={darkMode ? <Moon size={17} /> : <Sun size={17} />} title={t("userSettings.darkMode")} copy={t("userSettings.darkModeCopy")} checked={darkMode} onChange={onDarkModeChange} />
          <SettingToggle icon={<Accessibility size={17} />} title={t("userSettings.reducedMotion")} copy={t("userSettings.reducedMotionCopy")} checked={reducedMotion} onChange={onReducedMotionChange} />
        </div>
      </section>
      <section className="user-settings-card">
        <header><span className="settings-card-icon"><Bell size={19} /></span><div><p className="eyebrow">{t("userSettings.notificationsEyebrow")}</p><h2>{t("userSettings.notificationsTitle")}</h2><p>{t("userSettings.notificationsCopy")}</p></div></header>
        <div className="settings-toggle-list">
          <div className="setting-toggle-group">
            <SettingToggle icon={<CalendarDays size={17} />} title={t("userSettings.classReminders")} copy={t("userSettings.classRemindersCopy")} checked={classReminders} onChange={onClassRemindersChange} />
            {classReminders && <label className="settings-reminder-field"><span><Clock size={16} />{t("userSettings.reminderTimingLabel")}</span><select value={classReminderTiming} onChange={(event) => onClassReminderTimingChange(event.target.value as ClassReminderTiming)}>{classReminderTimings.map((timing) => <option value={timing} key={timing}>{t(`userSettings.reminderTimings.${timing}`)}</option>)}</select></label>}
          </div>
          <SettingToggle icon={<Sparkles size={17} />} title={t("userSettings.newActivityNotifications")} copy={t("userSettings.newActivityNotificationsCopy")} checked={newActivityNotifications} onChange={onNewActivityNotificationsChange} />
          <SettingToggle icon={<MailCheck size={17} />} title={t("userSettings.emailUpdates")} copy={t("userSettings.emailUpdatesCopy")} checked={emailUpdates} onChange={onEmailUpdatesChange} />
        </div>
        <p className="settings-future-note">{t("userSettings.notificationsFuture")}</p>
      </section>
    </div>
  );
}

function SettingToggle({ icon, title, copy, checked, onChange }: { icon: ReactNode; title: string; copy: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="setting-toggle-row"><span className="setting-toggle-icon">{icon}</span><span><strong>{title}</strong><small>{copy}</small></span><button type="button" role="switch" aria-checked={checked} className={checked ? "setting-switch active" : "setting-switch"} onClick={() => onChange(!checked)}><span /></button></div>;
}

function EventsPage({ account }: { account: Account | null }) {
  const { t, i18n } = useTranslation();
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const today = new Date();
  const locale = i18n.language.startsWith("de") ? "de-AT" : i18n.language.startsWith("es") ? "es-ES" : "en-GB";
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(visibleMonth);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const monday = new Date(2026, 0, 5 + index);
    return new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(monday);
  });
  const firstDayOffset = (visibleMonth.getDay() + 6) % 7;
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    return new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index - firstDayOffset + 1);
  });

  function moveMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <div className="page-stack inner-page">
      <PageIntro eyebrow={t("nav.events")} title={t("eventsTitle")} copy={t("eventsCopy")} />
      {!account && <div className="inline-notice"><UserPlus size={17} /><span>{t("eventsGuestNotice")}</span><Link to="/login" className="quiet-link">{t("signIn")}</Link></div>}
      {account && isAdminAccount(account) && <div className="inline-notice admin-public-notice"><ShieldCheck size={17} /><span>{t("admin.manageEvents")}</span><Link to="/admin" className="primary-button small">{t("admin.shortTitle")} <ArrowUpRight size={15} /></Link></div>}
      <section className="events-calendar" aria-label={t("eventsCalendar.label")}>
        <header className="events-calendar-header">
          <div>
            <p className="eyebrow"><CalendarDays size={14} />{t("eventsCalendar.eyebrow")}</p>
            <h2 aria-live="polite">{monthLabel}</h2>
          </div>
          <div className="events-calendar-controls">
            <button type="button" onClick={() => moveMonth(-1)} aria-label={t("eventsCalendar.previousMonth")}><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>{t("eventsCalendar.today")}</button>
            <button type="button" onClick={() => moveMonth(1)} aria-label={t("eventsCalendar.nextMonth")}><ChevronRight size={18} /></button>
          </div>
        </header>
        <div className="events-calendar-weekdays" aria-hidden="true">
          {weekDays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
        </div>
        <div className="events-calendar-grid">
          {calendarDays.map((date) => {
            const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
            const isToday = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
            const dateLabel = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
            return <div className={`events-calendar-day${isCurrentMonth ? "" : " outside"}${isToday ? " today" : ""}`} key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`} aria-label={dateLabel} aria-current={isToday ? "date" : undefined}><span>{date.getDate()}</span></div>;
          })}
        </div>
      </section>
    </div>
  );
}

function OrdersPage({ account, cartItems, onRemoveFromCart, onClearCart }: { account: Account | null; cartItems: CourseCartItem[]; onRemoveFromCart: (id: string) => void; onClearCart: () => void }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [purchaseNow, setPurchaseNow] = useState(() => Date.now());
  const [purchaseSource, setPurchaseSource] = useState<PurchaseHistoryResult["source"]>(() => isSupabaseConfigured ? "supabase" : "demo");
  const [purchaseUnavailable, setPurchaseUnavailable] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(Boolean(account));
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseKind | "all">("all");
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [simulatorPlan, setSimulatorPlan] = useState<PurchaseKind | null>(null);
  const [simulatorPaymentMethod, setSimulatorPaymentMethod] = useState<SimulatedPaymentMethod>("card");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [purchaseConfirmation, setPurchaseConfirmation] = useState<SimulatedPaymentMethod | null>(null);
  const [checkoutConfirmation, setCheckoutConfirmation] = useState<SimulatedPaymentMethod | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3 | 4>(1);
  const [compactCheckout, setCompactCheckout] = useState(() => window.matchMedia("(max-width: 1024px)").matches);
  const [ordersView, setOrdersView] = useState<"active" | "history">(() => location.hash === "#old-orders" ? "history" : "active");
  const membershipCheckout = searchParams.get("product") === "membership";
  const selectedCourseCount = cartItems.length;
  const enrollmentMode = getEnrollmentMode(cartItems.map((item) => item.id));
  const accountCommercialCategory = getVerifiedCommercialCategory(account?.appMetadata?.commercial_category);
  const membershipInCheckout = membershipCheckout && cartItems.length > 0;
  const simulatorCategory = membershipInCheckout && accountCommercialCategory !== "erasmus" ? "discount" : accountCommercialCategory;
  const availableSimulatorPlans = enrollmentMode === "full" ? simulatorPlans.filter((plan) => plan.kind === "monthly" || plan.kind === "package") : simulatorPlans;

  useEffect(() => {
    if (!account?.id) {
      setPurchaseLoading(false);
      return;
    }
    let mounted = true;
    setPurchaseLoading(true);
    getUserPurchaseHistory(account.id).then((result) => {
      if (!mounted) return;
      setPurchases(result.purchases);
      setPurchaseSource(result.source);
      setPurchaseUnavailable(result.unavailable);
      setSelectedPurchaseId(result.purchases[0]?.id ?? null);
    }).finally(() => {
      if (mounted) setPurchaseLoading(false);
    });
    return () => { mounted = false; };
  }, [account]);

  useEffect(() => {
    const removalDeadlines = purchases
      .filter((purchase) => purchase.status === "refunded" && purchase.cancelledAt)
      .map((purchase) => new Date(purchase.cancelledAt as string).getTime() + rejectedPurchaseRetentionMs)
      .filter((deadline) => Number.isFinite(deadline) && deadline > Date.now());
    if (!removalDeadlines.length) return;
    const timer = window.setTimeout(() => setPurchaseNow(Date.now()), Math.max(0, Math.min(...removalDeadlines) - Date.now() + 50));
    return () => window.clearTimeout(timer);
  }, [purchases, purchaseNow]);

  useEffect(() => {
    if (location.hash !== "#checkout" || !cartItems.length) return;
    const frame = window.requestAnimationFrame(() => document.getElementById("checkout")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [cartItems.length, location.hash]);

  useEffect(() => {
    setOrdersView(location.hash === "#old-orders" ? "history" : "active");
  }, [location.hash]);

  useEffect(() => {
    const checkoutResult = new URLSearchParams(location.search).get("checkout");
    if (!checkoutResult || !account?.id) return;
    if (checkoutResult === "success") {
      setPurchaseConfirmation("card");
      void getUserPurchaseHistory(account.id).then((result) => {
        setPurchases(result.purchases);
        setPurchaseSource(result.source);
        setPurchaseUnavailable(result.unavailable);
        setSelectedPurchaseId(result.purchases[0]?.id ?? null);
      });
    } else if (checkoutResult === "cancelled") {
      setPaymentError(t("purchaseSimulator.paymentCancelled"));
    }
    navigate(checkoutResult === "cancelled" ? "/orders#checkout" : "/orders", { replace: true });
  }, [account?.id, location.search, navigate, t]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent) => setCompactCheckout(event.matches);
    setCompactCheckout(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!cartItems.length) setCheckoutStep(1);
  }, [cartItems.length]);

  useEffect(() => {
    if (enrollmentMode !== "full") return;
    if (simulatorPlan === "quarterly") setSimulatorPlan(null);
  }, [enrollmentMode, simulatorPlan]);

  const locale = i18n.language.startsWith("de") ? "de-AT" : i18n.language.startsWith("es") ? "es-ES" : "en-GB";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isRejectedPurchasePendingRemoval = (purchase: UserPurchase) => purchase.status === "refunded" && Boolean(purchase.cancelledAt) && purchaseNow - new Date(purchase.cancelledAt as string).getTime() < rejectedPurchaseRetentionMs;
  const isRejectedPurchaseHidden = (purchase: UserPurchase) => purchase.status === "refunded" && Boolean(purchase.cancelledAt) && purchaseNow - new Date(purchase.cancelledAt as string).getTime() >= rejectedPurchaseRetentionMs;
  const isActivePurchase = (purchase: UserPurchase) => {
    if (purchase.status === "refunded") return false;
    if (purchase.status === "pending") return true;
    if (purchase.validUntil && new Date(purchase.validUntil).getTime() < today.getTime()) return false;
    if (purchase.kind === "package" && purchase.sessions?.length && !purchase.sessions.some((session) => session.status === "available")) return false;
    return true;
  };
  const activePurchases = purchases.filter(isActivePurchase);
  const historicalPurchases = purchases.filter((purchase) => !isActivePurchase(purchase) && !isRejectedPurchaseHidden(purchase));
  const visiblePurchases = ordersView === "active"
    ? activePurchases
    : purchaseFilter === "all" ? historicalPurchases : historicalPurchases.filter((purchase) => purchase.kind === purchaseFilter);
  const selectedPurchase = visiblePurchases.find((purchase) => purchase.id === selectedPurchaseId) ?? visiblePurchases[0] ?? null;
  const invoiceCount = historicalPurchases.filter((purchase) => purchase.invoiceNumber || purchase.invoicePdfUrl).length;
  const customerName = account ? [account.profile.firstName, account.profile.lastName].filter(Boolean).map(formatPersonName).join(" ") || account.email : "";
  const selectedSession = selectedPurchase?.sessions?.find((session) => session.id === selectedSessionId) ?? null;
  const availableSessions = selectedPurchase?.sessions?.filter((session) => session.status === "available").length ?? 0;
  const consumedSessions = selectedPurchase?.sessions?.filter((session) => session.status === "consumed").length ?? 0;
  const simulatorBasePrice = simulatorPlan ? getPlanPrice(simulatorPlan, enrollmentMode, simulatorCategory) : null;
  const simulatorPricing = simulatorPlan && simulatorBasePrice !== null ? getSimulatedCheckoutPrice(simulatorPlan, simulatorBasePrice) : null;
  const simulatorPrice = simulatorPricing?.amount ?? null;
  const simulatorRegularBasePrice = simulatorPlan ? getPlanPrice(simulatorPlan, enrollmentMode, "regular") : null;
  const simulatorRegularPricing = simulatorPlan && simulatorRegularBasePrice !== null ? getSimulatedCheckoutPrice(simulatorPlan, simulatorRegularBasePrice) : null;
  const simulatorRegularPrice = simulatorRegularPricing?.amount ?? null;
  const hasCategoryDiscount = simulatorCategory !== "regular" && simulatorPrice !== null && simulatorRegularPrice !== null && simulatorPrice < simulatorRegularPrice;
  const membershipFee = membershipInCheckout ? 25 : 0;
  const checkoutTotal = simulatorPrice === null ? null : simulatorPrice + membershipFee;
  const isFullMonthPlan = enrollmentMode === "full" && simulatorPlan === "monthly";

  function moveCheckoutToTop() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => document.getElementById("checkout")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }));
  }

  function goToCheckoutStep(step: 1 | 2 | 3 | 4) {
    setCheckoutStep(step);
    moveCheckoutToTop();
  }

  function formatMoney(purchase: Pick<UserPurchase, "amount" | "currency">) {
    return new Intl.NumberFormat(locale, { style: "currency", currency: purchase.currency || "EUR" }).format(purchase.amount);
  }

  function formatPurchaseDate(value: string | null) {
    if (!value) return t("purchaseHistory.noExpiry");
    return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  }

  function purchaseName(purchase: UserPurchase) {
    return purchase.productKey ? t(`purchaseHistory.products.${purchase.productKey}`) : purchase.productName;
  }

  async function refreshPurchases(nextSelectedId?: string) {
    if (!account?.id) return;
    const result = await getUserPurchaseHistory(account.id);
    setPurchases(result.purchases);
    setPurchaseSource(result.source);
    setPurchaseUnavailable(result.unavailable);
    setSelectedPurchaseId(nextSelectedId ?? result.purchases[0]?.id ?? null);
  }

  async function completePurchase() {
    if (!account?.id || !cartItems.length || !simulatorPlan || simulatorPrice === null) return;
    const plan = simulatorPlans.find((entry) => entry.kind === simulatorPlan);
    if (!plan) return;
    setPaymentError("");

    if (simulatorPaymentMethod === "card" && isStripeCheckoutConfigured()) {
      setPaymentProcessing(true);
      try {
        await redirectToStripeCheckout(cartItems, simulatorPlan);
      } catch {
        setPaymentError(t("purchaseSimulator.paymentError"));
        setPaymentProcessing(false);
      }
      return;
    }

    if (membershipInCheckout) simulateMembershipPurchase(account.id, simulatorPaymentMethod, { name: customerName, email: account.email });
    const purchase = simulateCoursePurchase(account.id, cartItems, plan, simulatorPrice, simulatorCategory, enrollmentMode, simulatorPaymentMethod, { name: customerName, email: account.email }, simulatorPricing?.baseAmount, simulatorPricing?.discountPercentage);
    onClearCart();
    setPurchaseFilter("all");
    setSelectedSessionId(null);
    setPurchaseConfirmation(simulatorPaymentMethod);
    setOrdersView("active");
    navigate("/orders");
    void refreshPurchases(purchase.id);
  }

  function handlePurchase() {
    if (!account?.id || !cartItems.length || !simulatorPlan || simulatorPrice === null) return;
    setCheckoutConfirmation(simulatorPaymentMethod);
  }

  function completeMembershipPurchase() {
    if (!account?.id) return;
    setPaymentError("");
    const purchase = simulateMembershipPurchase(account.id, simulatorPaymentMethod, { name: customerName, email: account.email });
    setPurchaseFilter("all");
    setSelectedSessionId(null);
    setPurchaseConfirmation(simulatorPaymentMethod);
    setOrdersView("active");
    navigate("/orders");
    void refreshPurchases(purchase.id);
  }

  function handleMembershipPurchase() {
    if (!account?.id) return;
    setCheckoutConfirmation(simulatorPaymentMethod);
  }

  function confirmCheckoutPurchase() {
    const method = checkoutConfirmation;
    setCheckoutConfirmation(null);
    if (method === null) return;
    if (membershipCheckout && !cartItems.length) {
      completeMembershipPurchase();
      return;
    }
    void completePurchase();
  }

  function openOrdersView(view: "active" | "history") {
    setOrdersView(view);
    setPurchaseFilter("all");
    setSelectedPurchaseId(null);
    setSelectedSessionId(null);
    navigate(view === "history" ? "/orders#old-orders" : "/orders");
  }

  return (
    <div className="page-stack inner-page orders-page">
      <PageIntro eyebrow={t("nav.orders")} title={t("ordersTitle")} copy={t("ordersCopy")} />
      {account && <nav className="orders-view-navigation" aria-label={t("ordersViews.navigationLabel")}>
        <button type="button" className={ordersView === "active" ? "active" : ""} aria-current={ordersView === "active" ? "page" : undefined} onClick={() => openOrdersView("active")}><Activity size={17} /><span><strong>{t("ordersViews.activeTab")}</strong><small>{t("ordersViews.activeTabCopy")}</small></span>{activePurchases.length > 0 && <b>{activePurchases.length}</b>}</button>
        <button type="button" className={ordersView === "history" ? "active" : ""} aria-current={ordersView === "history" ? "page" : undefined} onClick={() => openOrdersView("history")}><ReceiptText size={17} /><span><strong>{t("ordersViews.historyTab")}</strong><small>{t("ordersViews.historyTabCopy")}</small></span>{historicalPurchases.length > 0 && <b>{historicalPurchases.length}</b>}</button>
      </nav>}
      {ordersView === "active" && membershipCheckout && !cartItems.length && <section className="membership-checkout" id="checkout" tabIndex={-1}>
        <div className="membership-checkout-main">
          <p className="eyebrow">{t("membershipCheckout.eyebrow")}</p>
          <h2>{t("membershipCheckout.title")}</h2>
          <p>{t("membershipCheckout.copy")}</p>
          <ul>
            <li><CheckCircle2 size={17} />{t("homeMembership.benefitCourses")}</li>
            <li><CheckCircle2 size={17} />{t("homeMembership.benefitEvents")}</li>
            <li><CheckCircle2 size={17} />{t("homeMembership.benefitAccount")}</li>
          </ul>
        </div>
        <div className="membership-checkout-payment">
          <span>{t("membershipCheckout.total")}</span><strong>25 €</strong><small>{t("homeMembership.perYear")}</small>
          <div className="membership-payment-options" role="radiogroup" aria-label={t("purchaseSimulator.paymentMethodTitle")}>
            <button type="button" role="radio" aria-checked={simulatorPaymentMethod === "card"} className={simulatorPaymentMethod === "card" ? "selected" : ""} onClick={() => setSimulatorPaymentMethod("card")}><CreditCard size={18} /><span><b>{t("purchaseSimulator.cardPayment")}</b><small>{t("membershipCheckout.cardCopy")}</small></span></button>
            <button type="button" role="radio" aria-checked={simulatorPaymentMethod === "class"} className={simulatorPaymentMethod === "class" ? "selected" : ""} onClick={() => setSimulatorPaymentMethod("class")}><Users size={18} /><span><b>{t("purchaseSimulator.classPayment")}</b><small>{t("purchaseSimulator.classPaymentCopy")}</small></span></button>
          </div>
          <button className="primary-button" type="button" onClick={handleMembershipPurchase}>{t(simulatorPaymentMethod === "card" ? "membershipCheckout.buyCard" : "membershipCheckout.requestClass")} <ArrowUpRight size={17} /></button>
          <Link className="quiet-link" to="/">{t("membershipCheckout.backHome")}</Link>
          <p className="membership-test-notice">{t(simulatorPaymentMethod === "card" ? "membershipCheckout.testNotice" : "purchaseSimulator.classApprovalNotice")}</p>
        </div>
      </section>}
      {ordersView === "active" && (!membershipCheckout || cartItems.length > 0) && cartItems.length > 0 && <section className="cart-panel purchase-simulator" id="checkout" tabIndex={-1}>
        <div className="section-heading"><div><p className="eyebrow">{t("purchaseSimulator.eyebrow")}</p><h2>{t("purchaseSimulator.title")}</h2></div><span>{t("purchaseSimulator.copy")}</span></div>
        {membershipInCheckout && <div className="membership-cart-banner" role="status"><span><ShieldCheck size={18} /><span><strong>{t("membershipCheckout.appliedTitle")}</strong><small>{t("membershipCheckout.appliedCopy")}</small></span></span><Link to="/orders#checkout" className="quiet-link">{t("membershipCheckout.removeMembership")}</Link></div>}
        {compactCheckout && <div className="checkout-progress" aria-label={t("purchaseSimulator.stepsLabel")}>{([1, 2, 3, 4] as const).map((step) => <span className={checkoutStep === step ? "active" : checkoutStep > step ? "complete" : ""} aria-current={checkoutStep === step ? "step" : undefined} key={step}><b>{step}</b><small>{t(`purchaseSimulator.steps.${step}`)}</small></span>)}</div>}

        {(!compactCheckout || checkoutStep === 1) && <div className="checkout-step checkout-cart-step">
          <div className="cart-list">{cartItems.map((item) => <article className="cart-row" key={item.id}><span className="order-icon"><BookOpen size={17} /></span><div className="order-main"><strong>{item.courseName}{item.styleName ? ` · ${item.styleName}` : ""}</strong><span>{item.levelName}</span></div><div className="order-total"><strong>{t("purchasePricing.priceAfterPlan")}</strong><button className="icon-delete-button" type="button" onClick={() => onRemoveFromCart(item.id)} aria-label={t("catalog.removeFromCart")}><Trash2 size={16} /></button></div></article>)}</div>
          <div className="pricing-mode-banner"><span>{t("purchasePricing.selectionType")}</span><strong>{t(`purchasePricing.modes.${enrollmentMode}`)}</strong><small>{t(`purchasePricing.modeCopy.${enrollmentMode}`, { count: selectedCourseCount })}</small></div>
          {enrollmentMode === "full" && <div className="full-plan-warning" role="status"><ShieldCheck size={19} /><div><strong>{t("purchasePricing.fullWarningTitle")}</strong><p>{t("purchasePricing.fullWarningCopy", { count: selectedCourseCount })}</p><small>{t("purchasePricing.fullRemoveCopy")}</small></div></div>}
          {compactCheckout && <div className="checkout-step-actions checkout-step-actions-end"><button className="primary-button small" type="button" onClick={() => goToCheckoutStep(2)}>{t("purchaseSimulator.nextPlan")} <ChevronRight size={16} /></button></div>}
        </div>}

        {(!compactCheckout || checkoutStep === 2) && <div className="checkout-step checkout-plan-step">
          {compactCheckout && <div className="checkout-mobile-heading"><p className="eyebrow">{t("purchaseSimulator.steps.2")}</p><h3>{t("purchaseSimulator.planLabel")}</h3></div>}
          <div className={`simulator-plan-grid${enrollmentMode === "full" ? " full-selection" : ""}`} role="radiogroup" aria-label={t("purchaseSimulator.planLabel")}>{availableSimulatorPlans.map((plan) => {
            const fullMonthOption = enrollmentMode === "full" && plan.kind === "monthly";
            return <button type="button" role="radio" aria-checked={simulatorPlan === plan.kind} className={simulatorPlan === plan.kind ? "selected" : ""} key={plan.kind} onClick={() => setSimulatorPlan(plan.kind)}><span><strong>{fullMonthOption ? t("purchasePricing.fullPlanTitle") : t(`purchaseSimulator.plans.${plan.kind}.title`)}</strong><small>{fullMonthOption ? t("purchasePricing.fullPlanCopy") : t(`purchaseSimulator.plans.${plan.kind}.copy`)}</small></span><ChevronRight size={17} /></button>;
          })}</div>
          {compactCheckout && <div className="checkout-step-actions"><button className="secondary-button small" type="button" onClick={() => goToCheckoutStep(1)}><ChevronLeft size={16} /> {t("purchaseSimulator.back")}</button><button className="primary-button small" type="button" disabled={!simulatorPlan} onClick={() => goToCheckoutStep(3)}>{t("purchaseSimulator.next")} <ChevronRight size={16} /></button></div>}
        </div>}

        {simulatorPlan && (!compactCheckout || checkoutStep === 3) && <div className="pricing-result-panel checkout-step checkout-category-step">
          <div><p className="eyebrow">{t("purchasePricing.categoryEyebrow")}</p><h3>{t("purchasePricing.categoryTitle")}</h3><p>{t("purchasePricing.categoryCopy")}</p></div>
          <div className="verified-category"><ShieldCheck size={18} /><span><small>{t("purchasePricing.verifiedCategory")}</small><strong>{t(`purchasePricing.categories.${simulatorCategory}`)}</strong></span></div>
          {compactCheckout && <div className="checkout-step-actions"><button className="secondary-button small" type="button" onClick={() => goToCheckoutStep(2)}><ChevronLeft size={16} /> {t("purchaseSimulator.back")}</button><button className="primary-button small" type="button" onClick={() => goToCheckoutStep(4)}>{t("purchaseSimulator.nextPayment")} <ChevronRight size={16} /></button></div>}
        </div>}

        {simulatorPlan && (!compactCheckout || checkoutStep === 4) && <div className="checkout-step checkout-payment-step">
          {compactCheckout && <div className="checkout-mobile-heading"><p className="eyebrow">{t("purchaseSimulator.steps.4")}</p><h3>{t("purchaseSimulator.paymentTitle")}</h3></div>}
          <div className="payment-method-panel"><div><p className="eyebrow">{t("purchaseSimulator.paymentMethodEyebrow")}</p><h3>{t("purchaseSimulator.paymentMethodTitle")}</h3><p>{t("purchaseSimulator.paymentMethodCopy")}</p></div><div className="payment-method-options" role="radiogroup" aria-label={t("purchaseSimulator.paymentMethodTitle")}><button type="button" role="radio" aria-checked={simulatorPaymentMethod === "card"} className={simulatorPaymentMethod === "card" ? "selected" : ""} onClick={() => setSimulatorPaymentMethod("card")}><CreditCard size={19} /><span><strong>{t("purchaseSimulator.cardPayment")}</strong><small>{t("purchaseSimulator.cardPaymentCopy")}</small></span></button><button type="button" role="radio" aria-checked={simulatorPaymentMethod === "class"} className={simulatorPaymentMethod === "class" ? "selected" : ""} onClick={() => setSimulatorPaymentMethod("class")}><Users size={19} /><span><strong>{t("purchaseSimulator.classPayment")}</strong><small>{t("purchaseSimulator.classPaymentCopy")}</small></span></button></div>{simulatorPaymentMethod === "card" && <div className="simulated-card"><CreditCard size={22} /><span><small>{t("purchaseSimulator.simulatedCard")}</small><strong>•••• •••• •••• 4242</strong></span><b>VISA</b></div>}{simulatorPaymentMethod === "class" && <div className="class-payment-notice"><ShieldCheck size={17} /><p>{t("purchaseSimulator.classApprovalNotice")}</p></div>}</div>
          <div className={`resolved-price${simulatorPrice === null ? " unavailable" : ""}`}><span><small>{isFullMonthPlan ? t("purchasePricing.fullPlanTitle") : `${t(`purchaseSimulator.plans.${simulatorPlan}.title`)} · ${simulatorPlan === "package" ? t("purchasePricing.flexible") : t(`purchasePricing.modes.${enrollmentMode}`)}`}</small><span className={`resolved-price-values${hasCategoryDiscount ? " discounted" : ""}`}>{hasCategoryDiscount && simulatorRegularPrice !== null && <del aria-label={t("purchasePricing.regularPriceLabel")}>{new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(simulatorRegularPrice)}</del>}<strong>{simulatorPrice === null ? t("purchasePricing.unavailable") : new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(simulatorPrice)}</strong></span></span><p>{simulatorCategory === "discount" ? t("purchasePricing.discountVerification") : simulatorCategory === "erasmus" ? t("purchasePricing.erasmusVerification") : t("purchasePricing.regularPrice")}</p></div>
          {membershipInCheckout && checkoutTotal !== null && <div className="membership-cart-total"><div><span>{t("membershipCheckout.coursePrice")}</span><strong>{new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(simulatorPrice ?? 0)}</strong></div><div><span>{t("membershipCheckout.membershipPrice")}</span><strong>{new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(membershipFee)}</strong></div><div className="total"><span>{t("membershipCheckout.combinedTotal")}</span><strong>{new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(checkoutTotal)}</strong></div></div>}
          {simulatorPlan === "monthly" && <div className={`monthly-proration-note${simulatorPricing?.discountPercentage ? " active" : ""}`}><CalendarRange size={17} /><div><strong>{simulatorPricing?.discountPercentage ? t("purchaseSimulator.prorationApplied") : t("purchaseSimulator.calendarMonthTitle")}</strong><p>{simulatorPricing?.discountPercentage ? t("purchaseSimulator.prorationAppliedCopy", { discount: simulatorPricing.discountPercentage }) : t("purchaseSimulator.calendarMonthCopy")}</p></div></div>}
          {paymentError && <div className="inline-notice error" role="alert"><X size={17} /><span>{paymentError}</span></div>}
          <div className="cart-actions"><span>{t(simulatorPaymentMethod === "card" ? "purchaseSimulator.safeNotice" : "purchaseSimulator.classApprovalNotice")}</span><div className="checkout-payment-actions">{compactCheckout && <button className="secondary-button small" type="button" onClick={() => goToCheckoutStep(3)}><ChevronLeft size={16} /> {t("purchaseSimulator.back")}</button>}<button className="primary-button small" type="button" disabled={simulatorPrice === null || paymentProcessing} onClick={() => void handlePurchase()}>{paymentProcessing ? t("purchaseSimulator.processingPayment") : simulatorPrice === null ? t("purchasePricing.unavailable") : t(simulatorPaymentMethod === "card" ? "purchaseSimulator.payCard" : "purchaseSimulator.requestClassPurchase")} {!paymentProcessing && simulatorPrice !== null && <ArrowUpRight size={16} />}</button></div></div>
        </div>}
      </section>}
      <ConfirmDialog open={Boolean(checkoutConfirmation)} eyebrow={t("confirmations.eyebrow")} title={t("confirmations.purchaseTitle")} copy={t("confirmations.purchaseCopy")} confirmLabel={t("confirmations.purchase")} cancelLabel={t("confirmations.cancel")} onConfirm={confirmCheckoutPurchase} onCancel={() => setCheckoutConfirmation(null)} />
      {ordersView === "active" && purchaseConfirmation && <section className="purchase-celebration" role="status"><button type="button" className="purchase-celebration-close" onClick={() => setPurchaseConfirmation(null)} aria-label={t("purchaseSimulator.close")}><X size={17} /></button><span className="purchase-celebration-icon"><Sparkles size={25} /></span><div><p className="eyebrow">{purchaseConfirmation === "card" ? t("purchaseSimulator.confirmedEyebrow") : t("purchaseSimulator.requestEyebrow")}</p><h2>{purchaseConfirmation === "card" ? t("purchaseSimulator.funConfirmation") : t("purchaseSimulator.funRequestConfirmation")}</h2><p>{purchaseConfirmation === "card" ? t("purchaseSimulator.confirmationCopy") : t("purchaseSimulator.requestConfirmationCopy")}</p></div><button className="primary-button small" type="button" onClick={() => setPurchaseConfirmation(null)}>{t("purchaseSimulator.viewPass")} <ArrowUpRight size={16} /></button></section>}
      {!account ? <div className="guest-access-card compact"><ShoppingBag size={22} /><div><strong>{t("ordersGuestTitle")}</strong><p>{t("ordersGuestCopy")}</p></div><Link to="/login" className="primary-button small">{t("signIn")} <ArrowUpRight size={16} /></Link></div> : (
        <section className={`purchase-history-section ${ordersView === "active" ? "active-orders-section" : "old-orders-section"}`}>
          <header className="purchase-history-heading">
            <div><p className="eyebrow">{t(ordersView === "active" ? "ordersViews.activeEyebrow" : "purchaseHistory.eyebrow")}</p><h2>{t(ordersView === "active" ? "ordersViews.activeTitle" : "purchaseHistory.title")}</h2><p>{t(ordersView === "active" ? "ordersViews.activeCopy" : "purchaseHistory.copy")}</p></div>
            {purchaseSource === "demo" && <span className="purchase-demo-badge">{t("purchaseHistory.demoBadge")}</span>}
          </header>
          {purchaseUnavailable && <div className="inline-notice"><ReceiptText size={17} /><span>{t("purchaseHistory.unavailable")}</span></div>}
          {purchaseLoading ? <div className="purchase-loading" aria-live="polite"><span className="loading-spinner" />{t("purchaseHistory.loading")}</div> : (
            <>
              {ordersView === "history" && <div className="purchase-summary-grid">
                <div><ShoppingBag size={18} /><span><small>{t("purchaseHistory.purchaseCount")}</small><strong>{historicalPurchases.length}</strong></span></div>
                <div><ReceiptText size={18} /><span><small>{t("purchaseHistory.invoiceCount")}</small><strong>{invoiceCount}</strong></span></div>
              </div>}
              {ordersView === "history" && <div className="purchase-filters" role="group" aria-label={t("purchaseHistory.filtersLabel")}>
                {(["all", "monthly", "quarterly", "package", "membership"] as const).map((filter) => <button type="button" className={purchaseFilter === filter ? "active" : ""} key={filter} onClick={() => { setPurchaseFilter(filter); setSelectedPurchaseId(null); }}>{t(`purchaseHistory.filters.${filter}`)}</button>)}
              </div>}
              {visiblePurchases.length > 0 ? (
                <div className="purchase-history-layout">
                  <div className="purchase-history-list" role="list" aria-label={t("purchaseHistory.listLabel")}>
                    {visiblePurchases.map((purchase) => <button type="button" className={`purchase-history-item${selectedPurchase?.id === purchase.id ? " selected" : ""}`} key={purchase.id} onClick={() => { setSelectedPurchaseId(purchase.id); setSelectedSessionId(null); }} aria-pressed={selectedPurchase?.id === purchase.id}><span className={`purchase-kind-icon ${purchase.kind}`}><ReceiptText size={18} /></span><span className="purchase-history-item-copy"><strong>{purchaseName(purchase)}</strong><small>{formatPurchaseDate(purchase.purchasedAt)} · {t(`purchaseHistory.kinds.${purchase.kind}`)}</small><span>{purchase.invoiceNumber ?? purchase.id}</span></span><span className="purchase-history-item-total"><strong>{formatMoney(purchase)}</strong><small className={`purchase-status ${purchase.status}`}>{t(`orderStatuses.${purchase.status}`)}</small></span><ChevronRight size={17} /></button>)}
                  </div>
                  {selectedPurchase && (
                    <article className={`purchase-detail${selectedPurchase.status === "refunded" ? " cancelled" : ""}`} id="printable-invoice">
                      {isRejectedPurchasePendingRemoval(selectedPurchase) && <div className="purchase-rejection-notice" role="status"><X size={21} /><div><p className="eyebrow">{t("purchaseHistory.rejectedEyebrow")}</p><h3>{t("purchaseHistory.rejectedTitle")}</h3><p>{t("purchaseHistory.rejectedCopy")}</p></div></div>}
                      <header className="purchase-detail-header"><div><p className="eyebrow">{t("purchaseHistory.invoiceEyebrow")}</p><h3>{purchaseName(selectedPurchase)}</h3><span>{selectedPurchase.invoiceNumber ?? selectedPurchase.id}</span></div><div className="purchase-detail-actions"><button className="secondary-button compact print-button" type="button" onClick={() => window.print()}><Printer size={16} />{t("purchaseHistory.printInvoice")}</button>{selectedPurchase.invoicePdfUrl && <a className="primary-button small" href={selectedPurchase.invoicePdfUrl} target="_blank" rel="noreferrer">{t("purchaseHistory.openPdf")} <ArrowUpRight size={15} /></a>}</div></header>
                      <div className="invoice-parties"><div><small>{t("purchaseHistory.issuedBy")}</small><strong>BAILA INNSBRUCK – DANCE STUDIO</strong><span>Innsbruck · Austria</span></div><div><small>{t("purchaseHistory.customer")}</small><strong>{customerName}</strong><span>{account.email}</span></div></div>
                      <div className="purchase-detail-facts">
                        <div><CalendarDays size={17} /><span><small>{t("purchaseHistory.purchaseDate")}</small><strong>{formatPurchaseDate(selectedPurchase.purchasedAt)}</strong></span></div>
                        <div><CalendarRange size={17} /><span><small>{t("purchaseHistory.validUntil")}</small><strong>{selectedPurchase.kind === "monthly" ? t("purchaseHistory.endOfMonth") : formatPurchaseDate(selectedPurchase.validUntil)}</strong></span></div>
                        <div><CreditCard size={17} /><span><small>{t("purchaseHistory.paymentMethod")}</small><strong>{selectedPurchase.paymentMethod ?? t("purchaseHistory.notAvailable")}</strong></span></div>
                        <div><Users size={17} /><span><small>{t("purchaseHistory.customerCategory")}</small><strong>{selectedPurchase.customerCategoryKey ? t(`purchasePricing.categories.${selectedPurchase.customerCategoryKey}`) : selectedPurchase.customerCategory ?? t("purchaseHistory.notAvailable")}</strong></span></div>
                      </div>
                      <div className="purchase-product-detail"><p className="eyebrow">{t("purchaseHistory.included")}</p><h4>{selectedPurchase.benefitKey ? t(`purchaseHistory.benefits.${selectedPurchase.benefitKey}`) : selectedPurchase.courseName ?? purchaseName(selectedPurchase)}</h4><p>{selectedPurchase.kind === "membership" ? t("membershipCheckout.orderBenefitCopy") : selectedPurchase.levelNames ?? t("purchaseHistory.levelSubject")}</p>{selectedPurchase.classesIncluded && <span className="sessions-pill">{t("purchaseHistory.sessionsIncluded", { count: selectedPurchase.classesIncluded })}</span>}{Boolean(selectedPurchase.discountPercentage) && <div className="invoice-discount"><span>{t("purchaseSimulator.midMonthDiscount")}</span><strong>-{selectedPurchase.discountPercentage}%</strong></div>}</div>
                      {selectedPurchase.kind !== "package" && selectedPurchase.qrValue && <section className={`pass-qr-section${selectedPurchase.status === "pending" ? " pending" : ""}`}><div><p className="eyebrow">{t("purchaseSimulator.accessPass")}</p><h4>{selectedPurchase.status === "pending" ? t("purchaseSimulator.pendingQrTitle") : t("purchaseSimulator.courseQrTitle")}</h4><p>{selectedPurchase.status === "pending" ? t("purchaseSimulator.pendingQrCopy") : selectedPurchase.kind === "monthly" ? t("purchaseSimulator.monthlyQrCopy") : t("purchaseSimulator.courseQrCopy", { date: formatPurchaseDate(selectedPurchase.validUntil) })}</p></div><QrPass value={selectedPurchase.qrValue} alt={t("purchaseSimulator.courseQrAlt")} expandable={selectedPurchase.status === "paid"} expandLabel={t("qrFullscreen.expand")} closeLabel={t("qrFullscreen.close")} fullscreenTitle={t("qrFullscreen.passTitle")} fullscreenCopy={selectedPurchase.kind === "monthly" ? t("qrFullscreen.monthlyPassCopy") : t("qrFullscreen.passCopy", { date: formatPurchaseDate(selectedPurchase.validUntil) })} /></section>}
                      {selectedPurchase.kind === "package" && selectedPurchase.sessions && (
                        <section className="package-sessions-section">
                          <header>
                            <div><p className="eyebrow">{t("purchaseSimulator.packageControl")}</p><h4>{t("purchaseSimulator.sessionsTitle")}</h4></div>
                            <div className="session-counts"><span><b>{availableSessions}</b>{t("purchaseSimulator.available")}</span><span><b>{consumedSessions}</b>{t("purchaseSimulator.consumed")}</span></div>
                          </header>
                          <div className="session-progress" aria-label={t("purchaseSimulator.progressLabel", { available: availableSessions, total: selectedPurchase.sessions.length })}><span style={{ width: `${(consumedSessions / selectedPurchase.sessions.length) * 100}%` }} /></div>
                          <div className="session-selector" role="list" aria-label={t("purchaseSimulator.sessionList")}>
                            {selectedPurchase.sessions.map((session) => (
                              <button
                                type="button"
                                key={session.id}
                                className={`${session.status}${selectedSession?.id === session.id ? " selected" : ""}`}
                                disabled={session.status === "consumed"}
                                onClick={() => setSelectedSessionId(session.id)}
                                aria-label={session.status === "consumed" ? t("purchaseSimulator.sessionConsumedLabel", { number: session.number }) : t("purchaseSimulator.openSessionQr", { number: session.number })}
                                aria-pressed={session.status === "available" ? selectedSession?.id === session.id : undefined}
                              >
                                <span>{session.status === "consumed" ? <Check size={15} /> : session.number}</span>
                                <small>{session.status === "consumed" ? t("purchaseSimulator.consumed") : selectedSession?.id === session.id ? t("purchaseSimulator.qrOpen") : t("purchaseSimulator.showQr")}</small>
                              </button>
                            ))}
                          </div>
                          {availableSessions === 0 ? (
                            <div className="package-all-consumed" role="status"><CheckCircle2 size={34} /><div><p className="eyebrow">{t("purchaseSimulator.packageCompleteEyebrow")}</p><h4>{t("purchaseSimulator.allSessionsConsumed")}</h4><p>{t("purchaseSimulator.allSessionsConsumedCopy")}</p></div></div>
                          ) : selectedSession ? (
                            <div className="session-qr-card available" id="package-session-qr">
                              <div><p className="eyebrow">{t("purchaseSimulator.sessionNumber", { number: selectedSession.number })}</p><h4>{t("purchaseSimulator.readyToUse")}</h4><p>{selectedPurchase.status === "pending" ? t("purchaseSimulator.pendingQrCopy") : t("purchaseSimulator.sessionQrCopy")}</p></div>
                              <QrPass value={selectedSession.qrValue} alt={t("purchaseSimulator.sessionQrAlt", { number: selectedSession.number })} expandable={selectedPurchase.status === "paid" && selectedSession.status === "available"} expandLabel={t("qrFullscreen.expand")} closeLabel={t("qrFullscreen.close")} fullscreenTitle={t("qrFullscreen.sessionTitle", { number: selectedSession.number })} fullscreenCopy={t("qrFullscreen.sessionCopy")} />
                            </div>
                          ) : (
                            <div className="package-qr-prompt"><ScanLine size={24} /><div><h4>{t("purchaseSimulator.chooseSessionTitle")}</h4><p>{t("purchaseSimulator.chooseSessionCopy")}</p></div></div>
                          )}
                          <p className="server-security-note"><ShieldCheck size={16} />{t("purchaseSimulator.serverNotice")}</p>
                        </section>
                      )}
                      <div className="invoice-total"><span><small>{t("purchaseHistory.status")}</small><strong className={`purchase-status ${selectedPurchase.status}`}>{t(`orderStatuses.${selectedPurchase.status}`)}</strong></span><span><small>{t("purchaseHistory.total")}</small><strong>{formatMoney(selectedPurchase)}</strong></span></div>
                      {(selectedPurchase.isSimulation || purchaseSource === "demo") && <p className="invoice-demo-note">{selectedPurchase.isSimulation ? t("purchaseSimulator.orderNotice") : t("purchaseHistory.demoInvoiceNote")}</p>}
                    </article>
                  )}
                </div>
              ) : <div className="empty-state"><ReceiptText size={22} /><strong>{t(ordersView === "active" ? "ordersViews.activeEmptyTitle" : "purchaseHistory.emptyTitle")}</strong><p>{t(ordersView === "active" ? "ordersViews.activeEmptyCopy" : "purchaseHistory.emptyCopy")}</p></div>}
            </>
          )}
        </section>
      )}
    </div>
  );
}

function LoginPage({ onAuthenticated }: { onAuthenticated: (account: Account) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profile, setProfile] = useState<AccountProfile>({ firstName: "", lastName: "", address: "", postalCode: "", city: "", phone: "", danceRole: "both" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);

  function updateProfile(field: keyof AccountProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value } as AccountProfile));
  }

  function switchMode(nextMode: "login" | "register" | "reset") {
    setMode(nextMode);
    setStatus("idle");
    setMessage("");
    setLegalAccepted(false);
  }

  async function resendConfirmation() {
    if (!supabase || !pendingConfirmationEmail) return;
    setStatus("loading");
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: pendingConfirmationEmail, options: { emailRedirectTo: getAuthRedirectUrl() } });
      if (error) {
        setStatus("error");
        setMessage(getAuthErrorMessage(error, t("registrationFailed")));
        return;
      }
    } catch (error) {
      setStatus("error");
      setMessage(getAuthErrorMessage(error, t("registrationFailed")));
      return;
    }
    setStatus("success");
    setMessage(t("confirmationResent"));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    if (mode === "register" && password !== confirmPassword) {
      setStatus("error");
      setMessage(t("passwordsDoNotMatch"));
      return;
    }

    if (mode === "register" && !legalAccepted) {
      setStatus("error");
      setMessage(t("legal.consentRequired"));
      return;
    }

    if (mode === "reset") {
      if (!supabase) {
        setStatus("error");
        setMessage(t("passwordRecovery.unavailable"));
        return;
      }
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: getAuthRedirectUrl() });
        if (error) {
          setStatus("error");
          setMessage(getAuthErrorMessage(error, t("passwordRecovery.requestFailed")));
          return;
        }
        setStatus("success");
        setMessage(t("passwordRecovery.sentCopy"));
      } catch (error) {
        setStatus("error");
        setMessage(getAuthErrorMessage(error, t("passwordRecovery.requestFailed")));
      }
      return;
    }

    if (!supabase) {
      if (mode === "login") {
        const demoAccount = getDemoAccount();
        if (!demoAccount || demoAccount.email.toLowerCase() !== email.toLowerCase()) {
          setStatus("error");
          setMessage(t("demoAccountMissing"));
          return;
        }
        localStorage.setItem("baila-demo-session", demoAccount.email);
        onAuthenticated(demoAccount);
      } else {
        const normalizedProfile = { ...profile, firstName: formatPersonName(profile.firstName), lastName: formatPersonName(profile.lastName) };
        const demoAccount = saveDemoAccount(email, normalizedProfile);
        onAuthenticated(demoAccount);
      }
      navigate("/profile");
      return;
    }

    if (mode === "login") {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          setStatus("error");
          const errorMessage = typeof error?.message === "string" ? error.message.toLowerCase() : "";
          const isEmailUnconfirmed = error?.code === "email_not_confirmed" || errorMessage.includes("email not confirmed");
          if (isEmailUnconfirmed) {
            setPendingConfirmationEmail(email);
            setMessage(t("emailNotConfirmed"));
          } else {
            setMessage(getAuthErrorMessage(error, t("signInFailed")));
          }
          return;
        }
        onAuthenticated(accountFromUser(data.user));
        navigate("/profile");
      } catch (error) {
        setStatus("error");
        setMessage(getAuthErrorMessage(error, t("signInFailed")));
      }
      return;
    }

    const normalizedProfile = { ...profile, firstName: formatPersonName(profile.firstName), lastName: formatPersonName(profile.lastName) };
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: getAuthRedirectUrl(), data: { first_name: normalizedProfile.firstName, last_name: normalizedProfile.lastName, address: normalizedProfile.address, postal_code: normalizedProfile.postalCode, city: normalizedProfile.city, phone: normalizedProfile.phone, dance_role: normalizedProfile.danceRole } },
      });
      if (error) {
        setStatus("error");
        setPendingConfirmationEmail(isEmailAlreadyRegistered(error) ? email : "");
        setMessage(isEmailAlreadyRegistered(error) ? t("accountAlreadyExists") : getAuthErrorMessage(error, t("registrationFailed")));
      } else if (data.session?.user) {
        onAuthenticated(accountFromUser(data.session.user));
        navigate("/profile");
      } else {
        setPendingConfirmationEmail(email);
        setStatus("success");
        setMessage(t("checkEmailToFinish"));
      }
    } catch (error) {
      setStatus("error");
      setMessage(getAuthErrorMessage(error, t("registrationFailed")));
    }
  }

  const isRegister = mode === "register";
  const isReset = mode === "reset";
  return (
    <div className="auth-page"><div className={`auth-panel ${isRegister ? "auth-panel-wide" : ""}`}>
      <div className="auth-mark">{isRegister ? <UserPlus size={21} /> : isReset ? <MailCheck size={21} /> : <LogIn size={21} />}</div>
      <p className="eyebrow">{t("appName")}</p>
      <h1>{isRegister ? t("registerTitle") : isReset ? t("passwordRecovery.requestTitle") : t("loginTitle")}</h1>
      <p className="lead">{isRegister ? t("registerCopy") : isReset ? t("passwordRecovery.requestCopy") : t("loginCopy")}</p>
      {isReset ? <button className="text-button auth-back-link" type="button" onClick={() => switchMode("login")}><ChevronLeft size={15} />{t("passwordRecovery.backToSignIn")}</button> : <div className="auth-switch" role="tablist" aria-label={t("authOptions")}>
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>{t("signIn")}</button>
        <button type="button" className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>{t("createAccount")}</button>
      </div>}
      <form onSubmit={handleSubmit}>
        {isRegister && <div className="form-grid"><div><label htmlFor="first-name">{t("firstName")}</label><input id="first-name" type="text" value={profile.firstName} onChange={(event) => updateProfile("firstName", event.target.value)} autoComplete="given-name" required /></div><div><label htmlFor="last-name">{t("lastName")}</label><input id="last-name" type="text" value={profile.lastName} onChange={(event) => updateProfile("lastName", event.target.value)} autoComplete="family-name" required /></div></div>}
        <label htmlFor="email">{t("emailUser")}</label>
        <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
        {isRegister && <><label htmlFor="address">{t("address")}</label><input id="address" type="text" value={profile.address} onChange={(event) => updateProfile("address", event.target.value)} autoComplete="street-address" required /><div className="form-grid form-grid-three"><div><label htmlFor="postal-code">{t("postalCode")}</label><input id="postal-code" type="text" value={profile.postalCode} onChange={(event) => updateProfile("postalCode", event.target.value)} autoComplete="postal-code" inputMode="numeric" required /></div><div><label htmlFor="city">{t("city")}</label><input id="city" type="text" value={profile.city} onChange={(event) => updateProfile("city", event.target.value)} autoComplete="address-level2" required /></div><div><label htmlFor="phone">{t("phone")}</label><input id="phone" type="tel" value={profile.phone} onChange={(event) => updateProfile("phone", event.target.value)} autoComplete="tel" /></div></div><div><span className="field-label">{t("danceRole")}</span><div className="role-select"><label><input type="radio" name="dance-role" value="leader" checked={profile.danceRole === "leader"} onChange={() => updateProfile("danceRole", "leader")} />{t("roles.leader")}</label><label><input type="radio" name="dance-role" value="follower" checked={profile.danceRole === "follower"} onChange={() => updateProfile("danceRole", "follower")} />{t("roles.follower")}</label><label><input type="radio" name="dance-role" value="both" checked={profile.danceRole === "both"} onChange={() => updateProfile("danceRole", "both")} />{t("roles.both")}</label></div></div><p className="field-help"><Users size={14} />{t("danceRoleHelp")}</p></>}
        {!isReset && <><label htmlFor="password">{t("password")}</label>
        <div className="password-field"><input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} minLength={6} required /><button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? t("hidePassword") : t("showPassword")} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></>}
        {mode === "login" && <button className="text-button auth-forgot-link" type="button" onClick={() => switchMode("reset")}>{t("passwordRecovery.forgotLink")}</button>}
        {isRegister && <><label htmlFor="confirm-password">{t("confirmPassword")}</label><div className="password-field"><input id="confirm-password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} required /><button className="password-toggle" type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? t("hidePassword") : t("showPassword")} aria-pressed={showConfirmPassword}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></>}
        {isRegister && <label className="legal-consent"><input type="checkbox" checked={legalAccepted} onChange={(event) => setLegalAccepted(event.target.checked)} required /><span>{t("legal.consentPrefix")} <Link to="/privacy" target="_blank" rel="noreferrer">{t("legal.privacyLink")}</Link> {t("legal.consentMiddle")} <Link to="/terms" target="_blank" rel="noreferrer">{t("legal.termsLink")}</Link>{t("legal.consentSuffix")}</span></label>}
        <button className="primary-button full" type="submit" disabled={status === "loading"}>{status === "loading" ? t("working") : isRegister ? t("createAccount") : isReset ? t("passwordRecovery.sendLink") : t("signIn")} <ArrowUpRight size={18} /></button>
      </form>
      {message && <p className={`form-message ${status}`} role="status">{status === "success" && <Check size={15} />}{message}</p>}
      {isReset && status === "success" && <div className="confirmation-box"><MailCheck size={19} /><div><strong>{t("passwordRecovery.sentTitle")}</strong><p>{t("passwordRecovery.sentCopy")}</p></div></div>}
      {pendingConfirmationEmail && supabase && <div className="confirmation-box"><MailCheck size={19} /><div><strong>{t("confirmationTitle")}</strong><p>{t("confirmationCopy")}</p><button className="text-button" type="button" onClick={() => void resendConfirmation()} disabled={status === "loading"}>{t("resendConfirmation")}</button></div></div>}
    </div></div>
  );
}

function UpdatePasswordPage({ onAuthenticated }: { onAuthenticated: (account: Account) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage(t("passwordRecovery.mismatch"));
      return;
    }
    if (password.length < 6) {
      setStatus("error");
      setMessage(t("passwordRecovery.minLength"));
      return;
    }
    if (!supabase) {
      setStatus("error");
      setMessage(t("passwordRecovery.unavailable"));
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error || !data.user) {
        setStatus("error");
        setMessage(getAuthErrorMessage(error, t("passwordRecovery.updateFailed")));
        return;
      }
      onAuthenticated(accountFromUser(data.user));
      navigate("/profile", { replace: true });
    } catch (error) {
      setStatus("error");
      setMessage(getAuthErrorMessage(error, t("passwordRecovery.invalidLink")));
    }
  }

  return <div className="auth-page"><div className="auth-panel">
    <div className="auth-mark"><ShieldCheck size={21} /></div>
    <p className="eyebrow">{t("appName")}</p>
    <h1>{t("passwordRecovery.updateTitle")}</h1>
    <p className="lead">{t("passwordRecovery.updateCopy")}</p>
    <form onSubmit={handleSubmit}>
      <label htmlFor="new-password">{t("passwordRecovery.newPassword")}</label>
      <div className="password-field"><input id="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={6} required /><button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? t("hidePassword") : t("showPassword")} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
      <label htmlFor="confirm-new-password">{t("passwordRecovery.confirmPassword")}</label>
      <div className="password-field"><input id="confirm-new-password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} required /><button className="password-toggle" type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? t("hidePassword") : t("showPassword")} aria-pressed={showConfirmPassword}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
      <button className="primary-button full" type="submit" disabled={status === "loading"}>{status === "loading" ? t("working") : t("passwordRecovery.updateButton")} <ArrowUpRight size={18} /></button>
    </form>
    {message && <p className="form-message error" role="alert">{message}</p>}
    <p className="auth-footnote">{t("passwordRecovery.securityNote")}</p>
  </div></div>;
}

function PageIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) { return <div className="page-intro"><p className="eyebrow"><span className="eyebrow-dot" /> {eyebrow}</p><h1>{title}</h1><p className="lead">{copy}</p></div>; }

type LegalPageKey = "privacy" | "imprint" | "terms" | "cookies";

function LegalPage({ page }: { page: LegalPageKey }) {
  const { t } = useTranslation();
  const sections = t(`legal.pages.${page}.sections`, { returnObjects: true }) as Array<{ title: string; body: string }>;
  return <div className="page-stack inner-page legal-page"><PageIntro eyebrow={t(`legal.pages.${page}.eyebrow`)} title={t(`legal.pages.${page}.title`)} copy={t(`legal.pages.${page}.intro`)} /><div className="legal-draft-notice"><ShieldCheck size={17} /><span>{t("legal.draftNotice")}</span></div><div className="legal-meta">{t("legal.lastUpdated")}</div><div className="legal-sections">{sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}</div></div>;
}

function LegalFooter() {
  const { t } = useTranslation();
  return <footer className="legal-footer" aria-label={t("legal.footerLabel")}><span>{t("legal.footerLabel")}</span><nav><Link to="/privacy">{t("legal.privacyLink")}</Link><Link to="/imprint">{t("legal.imprintLink")}</Link><Link to="/terms">{t("legal.termsLink")}</Link><Link to="/cookies">{t("legal.cookiesLink")}</Link></nav></footer>;
}

export default App;
