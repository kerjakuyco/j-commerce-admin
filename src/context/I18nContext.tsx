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
    app: { loading: "Loading admin surface..." },
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
      operationOrders: "Orders",
      operationCatalog: "Catalog",
      operationPromos: "Promos",
      operationAssets: "Assets",
      revenue: "Revenue",
      revenueDetail: "this month",
      orders: "Orders",
      orderGrowth: (percent: number) => `${percent}% growth`,
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
      topProducts: "Top products",
      byQuantity: "by quantity",
      topUnavailable: "Top products unavailable",
      loadingTop: "Loading top products...",
      noSold: "No sold products yet.",
      unknownProduct: "Unknown product",
      sold: "sold",
    },
  },
  id: {
    language: { label: "Bahasa", english: "English", indonesian: "Indonesia" },
    app: { loading: "Memuat admin..." },
    shell: {
      adminConsole: "Konsol admin",
      operator: "operator",
      controlPlane: "panel kendali",
      operationsConsole: "Konsol operasional",
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
      operationOrders: "Pesanan",
      operationCatalog: "Katalog",
      operationPromos: "Promo",
      operationAssets: "Aset",
      revenue: "Revenue",
      revenueDetail: "bulan ini",
      orders: "Pesanan",
      orderGrowth: (percent: number) => `${percent}% growth`,
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
      topProducts: "Produk teratas",
      byQuantity: "berdasarkan jumlah",
      topUnavailable: "Produk teratas tidak tersedia",
      loadingTop: "Memuat produk teratas...",
      noSold: "Belum ada produk terjual.",
      unknownProduct: "Produk tidak dikenal",
      sold: "terjual",
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
