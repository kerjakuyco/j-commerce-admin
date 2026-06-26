import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Power, PowerOff, Search, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../components/Badge";
import {
  DataTable,
  type ColumnDef,
  type SortChangeDirection,
  type SortDirection,
} from "../components/DataTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PaginationStrip } from "../components/PaginationStrip";
import { Panel } from "../components/Panel";
import { SelectMenu } from "../components/SelectMenu";
import { useAuth, useToken } from "../context/AuthContext";
import { useI18n, type Language } from "../context/I18nContext";
import { request } from "../lib/api";
import { readError, shortDate } from "../lib/format";
import type { Paginated, User, UserRole } from "../types";

type UsersCopy = {
  updated: string;
  title: string;
  eyebrow: string;
  filtersLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  usersCount: (count: number) => string;
  roleLabel: string;
  allRoles: string;
  statusLabel: string;
  allStatuses: string;
  reset: string;
  tableCaption: string;
  columns: ColumnDef[];
  active: string;
  disabled: string;
  protectedAria: (email: string) => string;
  toggleAria: (action: string, email: string) => string;
  confirmDisable: (email: string) => string;
  protectedTitle: string;
  disable: string;
  enable: string;
  paginationLabel: string;
  rowsPerPage: string;
  previous: string;
  next: string;
  pageOf: (page: number, totalPages: number) => string;
  roles: Record<UserRole, string>;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const userRoleFilters: UserRole[] = ["ADMIN", "CUSTOMER"];
type UserStatusFilter = "" | "active" | "disabled";
const userSortKeys = ["name", "email", "role", "createdAt", "isActive"] as const;
type UserSortKey = (typeof userSortKeys)[number];

const copy: Record<Language, UsersCopy> = {
  en: {
    updated: "User access updated",
    title: "Customers",
    eyebrow: "access control",
    filtersLabel: "Customer filters",
    searchLabel: "Search users",
    searchPlaceholder: "Search name, email, phone",
    usersCount: (count) => `${count} ${count === 1 ? "user" : "users"}`,
    roleLabel: "Role",
    allRoles: "All roles",
    statusLabel: "Status",
    allStatuses: "All statuses",
    reset: "Reset",
    tableCaption: "Customer access table",
    columns: [
      { label: "Name", key: "name", sortable: true, defaultSortDirection: "asc" },
      { label: "Email", key: "email", sortable: true, defaultSortDirection: "asc" },
      { label: "Role", key: "role", sortable: true, defaultSortDirection: "asc" },
      { label: "Joined", key: "joined", sortKey: "createdAt", sortable: true },
      { label: "Status", key: "status", sortKey: "isActive", sortable: true },
      { label: "Action", key: "action" },
    ],
    active: "Active",
    disabled: "Inactive",
    protectedAria: (email) => `${email} is protected`,
    toggleAria: (action, email) => `${action} ${email}`,
    confirmDisable: (email) => `Disable access for ${email}?`,
    protectedTitle: "Protected",
    disable: "Disable",
    enable: "Enable",
    paginationLabel: "Customer table pagination",
    rowsPerPage: "Rows per page",
    previous: "Previous",
    next: "Next",
    pageOf: (page, totalPages) => `Page ${page} of ${totalPages}`,
    roles: { ADMIN: "Admin", CUSTOMER: "Customer" },
  },
  id: {
    updated: "Akses pengguna diperbarui",
    title: "Pelanggan",
    eyebrow: "kontrol akses",
    filtersLabel: "Filter pelanggan",
    searchLabel: "Cari pengguna",
    searchPlaceholder: "Cari nama, email, telepon",
    usersCount: (count) => `${count} pengguna`,
    roleLabel: "Role",
    allRoles: "Semua role",
    statusLabel: "Status",
    allStatuses: "Semua status",
    reset: "Reset",
    tableCaption: "Tabel akses pelanggan",
    columns: [
      { label: "Nama", key: "name", sortable: true, defaultSortDirection: "asc" },
      { label: "Email", key: "email", sortable: true, defaultSortDirection: "asc" },
      { label: "Role", key: "role", sortable: true, defaultSortDirection: "asc" },
      { label: "Bergabung", key: "joined", sortKey: "createdAt", sortable: true },
      { label: "Status", key: "status", sortKey: "isActive", sortable: true },
      { label: "Aksi", key: "action" },
    ],
    active: "Active",
    disabled: "Inactive",
    protectedAria: (email) => `${email} dilindungi`,
    toggleAria: (action, email) => `${action} ${email}`,
    confirmDisable: (email) => `Nonaktifkan akses untuk ${email}?`,
    protectedTitle: "Dilindungi",
    disable: "Nonaktifkan",
    enable: "Aktifkan",
    paginationLabel: "Pagination tabel pelanggan",
    rowsPerPage: "Baris per halaman",
    previous: "Sebelumnya",
    next: "Berikutnya",
    pageOf: (page, totalPages) => `Halaman ${page} dari ${totalPages}`,
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
  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("");
  const [sortBy, setSortBy] = useState<UserSortKey | "">("");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const effectiveSortBy = sortBy || "createdAt";
  const effectiveSortDir = sortBy ? sortDir : "desc";
  // useDeferredValue is not a debounce; use a 250ms timer so typing doesn't
  // fire a request on every keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [search]);
  const usersQuery = useQuery({
    queryKey: [
      "users",
      debouncedSearch.trim(),
      roleFilter,
      statusFilter,
      effectiveSortBy,
      effectiveSortDir,
      page,
      pageSize,
    ],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        limit: String(pageSize),
        page: String(page),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("isActive", statusFilter === "active" ? "true" : "false");
      params.set("sortBy", effectiveSortBy);
      params.set("sortDir", effectiveSortDir);
      return request<Paginated<User>>(`/users?${params.toString()}`, {
        token,
        signal,
      });
    },
    placeholderData: (previousData) => previousData,
  });
  const setUserSort = (key: string, direction: SortChangeDirection) => {
    if (!direction) {
      setSortBy("");
      setSortDir("desc");
      setPage(1);
      return;
    }
    if (!(userSortKeys as readonly string[]).includes(key)) return;
    setSortBy(key as UserSortKey);
    setSortDir(direction);
    setPage(1);
  };
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
    <Panel
      title={c.title}
      eyebrow={c.eyebrow}
      headerMeta={c.usersCount(
        usersQuery.data?.meta.total ?? usersQuery.data?.data.length ?? 0,
      )}
      className="users-list-panel"
    >
      <div className="catalog-toolbar users-toolbar" aria-label={c.filtersLabel}>
        <label htmlFor="user-search">
          {c.searchLabel}
          <span className="filter-input-with-icon">
            <Search size={16} aria-hidden="true" />
            <input
              id="user-search"
              name="search"
              type="search"
              autoComplete="off"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={c.searchPlaceholder}
            />
          </span>
        </label>
        <label htmlFor="user-role-filter">
          {c.roleLabel}
          <SelectMenu
            id="user-role-filter"
            value={roleFilter}
            options={[
              { value: "", label: c.allRoles },
              ...userRoleFilters.map((role) => ({
                value: role,
                label: c.roles[role],
              })),
            ]}
            onChange={(value) => {
              setRoleFilter(value as "" | UserRole);
              setPage(1);
            }}
          />
        </label>
        <label htmlFor="user-status-filter">
          {c.statusLabel}
          <SelectMenu
            id="user-status-filter"
            value={statusFilter}
            options={[
              { value: "", label: c.allStatuses },
              { value: "active", label: c.active },
              { value: "disabled", label: c.disabled },
            ]}
            onChange={(value) => {
              setStatusFilter(value as UserStatusFilter);
              setPage(1);
            }}
          />
        </label>
        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            setSearch("");
            setDebouncedSearch("");
            setRoleFilter("");
            setStatusFilter("");
            setSortBy("");
            setSortDir("desc");
            setPage(1);
          }}
        >
          {c.reset}
        </button>
      </div>
      <DataTable
        caption={c.tableCaption}
        columns={c.columns}
        sort={{ key: sortBy, direction: sortDir, onSort: setUserSort }}
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
              className={`icon-button${user.isActive && !protectedUser ? " icon-button-destructive-glyph" : ""}`}
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
      <PaginationStrip
        meta={usersQuery.data?.meta}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        label={c.paginationLabel}
        pageSizeLabel={c.rowsPerPage}
        previous={c.previous}
        next={c.next}
        pageOf={c.pageOf}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
      />
    </Panel>
  );
}
