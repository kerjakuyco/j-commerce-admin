import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Power, PowerOff, Search, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../components/Badge";
import { DataTable } from "../components/DataTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Panel } from "../components/Panel";
import { useAuth, useToken } from "../context/AuthContext";
import { useI18n, type Language } from "../context/I18nContext";
import { request } from "../lib/api";
import { readError, shortDate } from "../lib/format";
import type { Paginated, User, UserRole } from "../types";

type UsersCopy = {
  updated: string;
  title: string;
  eyebrow: string;
  searchLabel: string;
  searchPlaceholder: string;
  tableCaption: string;
  columns: string[];
  active: string;
  disabled: string;
  protectedAria: (email: string) => string;
  toggleAria: (action: string, email: string) => string;
  confirmDisable: (email: string) => string;
  protectedTitle: string;
  disable: string;
  enable: string;
  roles: Record<UserRole, string>;
};

const copy: Record<Language, UsersCopy> = {
  en: {
    updated: "User access updated",
    title: "Customers",
    eyebrow: "access control",
    searchLabel: "Search users",
    searchPlaceholder: "Search name, email, phone",
    tableCaption: "Customer access table",
    columns: ["Name", "Email", "Role", "Joined", "Status", "Action"],
    active: "ACTIVE",
    disabled: "DISABLED",
    protectedAria: (email) => `${email} is protected`,
    toggleAria: (action, email) => `${action} ${email}`,
    confirmDisable: (email) => `Disable access for ${email}?`,
    protectedTitle: "Protected",
    disable: "Disable",
    enable: "Enable",
    roles: { ADMIN: "Admin", CUSTOMER: "Customer" },
  },
  id: {
    updated: "Akses pengguna diperbarui",
    title: "Pelanggan",
    eyebrow: "kontrol akses",
    searchLabel: "Cari pengguna",
    searchPlaceholder: "Cari nama, email, telepon",
    tableCaption: "Tabel akses pelanggan",
    columns: ["Nama", "Email", "Role", "Bergabung", "Status", "Aksi"],
    active: "ACTIVE",
    disabled: "DISABLED",
    protectedAria: (email) => `${email} dilindungi`,
    toggleAria: (action, email) => `${action} ${email}`,
    confirmDisable: (email) => `Nonaktifkan akses untuk ${email}?`,
    protectedTitle: "Protected",
    disable: "Disable",
    enable: "Enable",
    roles: { ADMIN: "Admin", CUSTOMER: "Pelanggan" },
  },
};

export function UsersPage() {
  const token = useToken();
  const { language } = useI18n();
  const c = copy[language];
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // useDeferredValue is not a debounce; use a 250ms timer so typing doesn't
  // fire a request on every keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(handle);
  }, [search]);
  const usersQuery = useQuery({
    queryKey: ["users", debouncedSearch],
    queryFn: ({ signal }) =>
      request<Paginated<User>>(
        `/users?limit=80&search=${encodeURIComponent(debouncedSearch)}`,
        { token, signal },
      ),
    placeholderData: (previousData) => previousData,
  });
  const toggleMutation = useMutation({
    mutationFn: (user: User) =>
      request<User>(`/users/${user.id}/active`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ isActive: !user.isActive }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(c.updated);
    },
    onError: (error) => toast.error(readError(error, language)),
  });

  if (usersQuery.isLoading) return <LoadingState />;
  if (usersQuery.error)
    return <ErrorState message={readError(usersQuery.error, language)} />;

  return (
    <Panel title={c.title} eyebrow={c.eyebrow}>
      <div className="toolbar">
        <Search size={18} aria-hidden="true" />
        <label className="sr-only" htmlFor="user-search">
          {c.searchLabel}
        </label>
        <input
          id="user-search"
          name="search"
          type="search"
          autoComplete="off"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={c.searchPlaceholder}
        />
      </div>
      <DataTable
        caption={c.tableCaption}
        columns={c.columns}
        rows={(usersQuery.data?.data ?? []).map((user) => {
          const protectedUser =
            user.role === "ADMIN" || user.id === session?.user.id;
          return [
            user.name,
            user.email,
            c.roles[user.role],
            shortDate(user.createdAt, language),
            <Badge
              key={`${user.id}-status`}
              tone={user.isActive ? "good" : "danger"}
            >
              {user.isActive ? c.active : c.disabled}
            </Badge>,
            <button
              key={user.id}
              className={`icon-button${user.isActive && !protectedUser ? " icon-button-danger" : ""}`}
              type="button"
              aria-label={
                protectedUser
                  ? c.protectedAria(user.email)
                  : c.toggleAria(user.isActive ? c.disable : c.enable, user.email)
              }
              disabled={protectedUser || toggleMutation.isPending}
              onClick={() => {
                // The backend enforces self-disable and protected-admin
                // rejection; guard here so we never even attempt the call.
                if (protectedUser) return;
                if (
                  user.isActive &&
                  !window.confirm(c.confirmDisable(user.email))
                ) {
                  return;
                }
                toggleMutation.mutate(user);
              }}
              title={
                protectedUser
                  ? c.protectedTitle
                  : user.isActive
                    ? c.disable
                    : c.enable
              }
            >
              {protectedUser ? (
                <ShieldCheck size={16} aria-hidden="true" />
              ) : user.isActive ? (
                <PowerOff size={16} aria-hidden="true" />
              ) : (
                <Power size={16} aria-hidden="true" />
              )}
            </button>,
          ];
        })}
      />
    </Panel>
  );
}
