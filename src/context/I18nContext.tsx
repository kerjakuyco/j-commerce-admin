import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "id";

const storageKey = "j-commerce-admin-language";

const translations = {
  en: {
    language: { label: "Language", english: "English", indonesian: "Indonesian" },
    theme: { label: "Theme", light: "Light", dark: "Dark" },
    app: { loading: "Loading admin surface..." },
    common: {
      loadingLiveData: "Loading live data...",
      noRecords: "No records yet.",
    },
    shell: {
      adminConsole: "Admin console",
      operator: "operator",
      controlPlane: "control plane",
      operationsConsole: "Operations console",
      apiTarget: "API target",
      logout: "Logout",
      signingOut: "Signing out...",
    },
    nav: {
      dashboard: { label: "Dashboard", kicker: "overview" },
      orders: { label: "Orders", kicker: "fulfillment" },
      catalog: { label: "Catalog", kicker: "products" },
      users: { label: "Users", kicker: "access" },
      vouchers: { label: "Vouchers", kicker: "promo" },
      messages: { label: "Messages", kicker: "broadcast" },
      banners: { label: "Banners", kicker: "home" },
      upload: { label: "Upload", kicker: "assets" },
    },
    login: {
      eyebrow: "single-store admin",
      title: "Manage orders, catalog, and campaigns from one console.",
      body: "A calm operations workspace for fulfillment, promos, banners, uploads, and revenue telemetry.",
      apiTarget: "api target",
      email: "Email",
      password: "Password",
      signIn: "Sign in",
      signingIn: "Signing in...",
      loginFailed: "Login failed",
      adminOnly: "This account is not an admin",
      welcome: (name: string) => `Welcome back, ${name}`,
    },
    dashboard: {
      loading: "Loading dashboard data...",
      snapshot: "Store snapshot",
      today: "today",
      summary:
        "Track revenue, fulfillment, catalog health, campaigns, broadcasts, Midtrans callbacks, and uploaded assets from one workspace.",
      operations: "Primary operation areas",
      operationsAlerts: "Operations alerts",
      needsAttention: "needs attention",
      alertsUnavailable: "Alerts unavailable",
      loadingAlerts: "Loading alerts...",
      noAlerts: "No alerts available.",
      alertClear: "Clear",
      alertOpenRelated: "Open related work",
      alertLabels: {
        "pending-payment": "Pending payment",
        "paid-to-pack": "Ready to pack",
        "low-stock": "Low-stock variants",
        "out-of-stock": "Out-of-stock variants",
        "failed-payments": "Failed or expired payments",
        "expired-flash": "Expired flash products",
        "expiring-vouchers": "Vouchers expiring in 7 days",
      },
      operationOrders: "Orders",
      operationCatalog: "Catalog",
      operationPromos: "Promos",
      operationAssets: "Assets",
      revenue: "Revenue",
      revenueDetail: "this month",
      revenueGrowthSuffix: "vs previous month",
      orders: "Orders",
      orderGrowth: (percent: number) => `${percent}% growth`,
      orderCount: (count: string) => `${count} orders`,
      customers: "Customers",
      customersDetail: "active accounts",
      products: "Products",
      productsDetail: "sellable catalog",
      statsUnavailable: "Stats unavailable",
      revenueTrend: "Revenue trend",
      thirtyDays: "30 days",
      revenueUnavailable: "Revenue trend unavailable",
      orderStatus: "Order status",
      orderStatusEyebrow: "orders",
      orderStatusUnavailable: "Order status unavailable",
      orderStatusDrilldowns: "Order status drill-downs",
      recentOrders: "Recent orders",
      latestActivity: "latest activity",
      customerUnavailable: "Customer unavailable",
      noRecentOrders: "No recent orders yet.",
      topProducts: "Top products",
      byQuantity: "by quantity",
      topUnavailable: "Top products unavailable",
      loadingTop: "Loading top products...",
      noSold: "No sold products yet.",
      unknownProduct: "Unknown product",
      sold: "sold",
      revenuePeriod: (period: string) => `Revenue period: ${period}`,
      revenuePeriodLabel: "Revenue period",
      statusLabels: {
        PENDING: "Pending",
        PAID: "Paid",
        PACKED: "Packed",
        SHIPPED: "Shipped",
        DELIVERED: "Delivered",
        CANCELLED: "Cancelled",
      },
    },
  },
  id: {
    language: { label: "Bahasa", english: "English", indonesian: "Indonesia" },
    theme: { label: "Tema", light: "Terang", dark: "Gelap" },
    app: { loading: "Memuat admin..." },
    common: {
      loadingLiveData: "Memuat data live...",
      noRecords: "Belum ada data.",
    },
    shell: {
      adminConsole: "Konsol admin",
      operator: "operator",
      controlPlane: "control plane",
      operationsConsole: "Operations console",
      apiTarget: "Target API",
      logout: "Keluar",
      signingOut: "Keluar...",
    },
    nav: {
      dashboard: { label: "Dashboard", kicker: "ringkasan" },
      orders: { label: "Pesanan", kicker: "fulfillment" },
      catalog: { label: "Katalog", kicker: "produk" },
      users: { label: "Pengguna", kicker: "akses" },
      vouchers: { label: "Voucher", kicker: "promo" },
      messages: { label: "Pesan", kicker: "broadcast" },
      banners: { label: "Banner", kicker: "home" },
      upload: { label: "Upload", kicker: "aset" },
    },
    login: {
      eyebrow: "admin single-store",
      title: "Kelola pesanan, katalog, dan campaign dari satu konsol.",
      body: "Workspace operasional yang tenang untuk fulfillment, promo, banner, upload, dan telemetry revenue.",
      apiTarget: "target api",
      email: "Email",
      password: "Password",
      signIn: "Masuk",
      signingIn: "Masuk...",
      loginFailed: "Login gagal",
      adminOnly: "Akun ini bukan admin",
      welcome: (name: string) => `Selamat datang, ${name}`,
    },
    dashboard: {
      loading: "Memuat data dashboard...",
      snapshot: "Snapshot toko",
      today: "hari ini",
      summary:
        "Pantau revenue, fulfillment, kesehatan katalog, campaign, broadcast, callback Midtrans, dan aset upload dari satu workspace.",
      operations: "Area operasional utama",
      operationsAlerts: "Alert operasional",
      needsAttention: "perlu perhatian",
      alertsUnavailable: "Alert tidak tersedia",
      loadingAlerts: "Memuat alert...",
      noAlerts: "Tidak ada alert.",
      alertClear: "Clear",
      alertOpenRelated: "Open related work",
      alertLabels: {
        "pending-payment": "Pembayaran tertunda",
        "paid-to-pack": "Siap dikemas",
        "low-stock": "Varian stok rendah",
        "out-of-stock": "Varian stok habis",
        "failed-payments": "Pembayaran gagal atau kedaluwarsa",
        "expired-flash": "Produk flash sale kedaluwarsa",
        "expiring-vouchers": "Voucher berakhir dalam 7 hari",
      },
      operationOrders: "Pesanan",
      operationCatalog: "Katalog",
      operationPromos: "Promo",
      operationAssets: "Aset",
      revenue: "Revenue",
      revenueDetail: "bulan ini",
      revenueGrowthSuffix: "dibanding bulan lalu",
      orders: "Pesanan",
      orderGrowth: (percent: number) => `${percent}% growth`,
      orderCount: (count: string) => `${count} pesanan`,
      customers: "Pelanggan",
      customersDetail: "akun aktif",
      products: "Produk",
      productsDetail: "katalog aktif",
      statsUnavailable: "Statistik tidak tersedia",
      revenueTrend: "Tren revenue",
      thirtyDays: "30 hari",
      revenueUnavailable: "Tren revenue tidak tersedia",
      orderStatus: "Status pesanan",
      orderStatusEyebrow: "pesanan",
      orderStatusUnavailable: "Status pesanan tidak tersedia",
      orderStatusDrilldowns: "Order status drill-downs",
      recentOrders: "Pesanan terbaru",
      latestActivity: "aktivitas terbaru",
      customerUnavailable: "Pelanggan tidak tersedia",
      noRecentOrders: "Belum ada pesanan terbaru.",
      topProducts: "Produk teratas",
      byQuantity: "berdasarkan jumlah",
      topUnavailable: "Produk teratas tidak tersedia",
      loadingTop: "Memuat produk teratas...",
      noSold: "Belum ada produk terjual.",
      unknownProduct: "Produk tidak dikenal",
      sold: "terjual",
      revenuePeriod: (period: string) => `Periode revenue: ${period}`,
      revenuePeriodLabel: "Periode revenue",
      statusLabels: {
        PENDING: "Pending",
        PAID: "Paid",
        PACKED: "Packed",
        SHIPPED: "Shipped",
        DELIVERED: "Delivered",
        CANCELLED: "Cancelled",
      },
    },
  },
} as const;

export type Translations = (typeof translations)[Language];

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function normalizeLanguage(value: string | null | undefined): Language {
  return value === "id" ? "id" : "en";
}

export function getTranslations(language: Language) {
  return translations[language];
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    normalizeLanguage(window.localStorage.getItem(storageKey)),
  );

  useEffect(() => {
    window.localStorage.setItem(storageKey, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage: setLanguageState, t: getTranslations(language) }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
