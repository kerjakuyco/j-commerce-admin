import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../components/Badge";
import { DataTable } from "../components/DataTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Panel } from "../components/Panel";
import { useAuth, useToken } from "../context/AuthContext";
import { request } from "../lib/api";
import { readError, shortDate } from "../lib/format";
import type { Paginated, User } from "../types";

export function UsersPage() {
  const token = useToken();
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
      toast.success("User access updated");
    },
    onError: (error) => toast.error(readError(error)),
  });

  if (usersQuery.isLoading) return <LoadingState />;
  if (usersQuery.error)
    return <ErrorState message={readError(usersQuery.error)} />;

  return (
    <Panel title="Customers" eyebrow="access control">
      <div className="toolbar">
        <Search size={18} aria-hidden="true" />
        <label className="sr-only" htmlFor="user-search">
          Search users
        </label>
        <input
          id="user-search"
          name="search"
          type="search"
          autoComplete="off"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, phone"
        />
      </div>
      <DataTable
        caption="Customer access table"
        columns={["Name", "Email", "Role", "Joined", "Status", "Action"]}
        rows={(usersQuery.data?.data ?? []).map((user) => {
          const protectedUser =
            user.role === "ADMIN" || user.id === session?.user.id;
          return [
            user.name,
            user.email,
            user.role,
            shortDate(user.createdAt),
            <Badge
              key={`${user.id}-status`}
              tone={user.isActive ? "good" : "danger"}
            >
              {user.isActive ? "ACTIVE" : "DISABLED"}
            </Badge>,
            <button
              key={user.id}
              className="table-button"
              type="button"
              disabled={protectedUser || toggleMutation.isPending}
              onClick={() => {
                // The backend enforces self-disable and protected-admin
                // rejection; guard here so we never even attempt the call.
                if (protectedUser) return;
                if (
                  user.isActive &&
                  !window.confirm(`Disable access for ${user.email}?`)
                ) {
                  return;
                }
                toggleMutation.mutate(user);
              }}
              title={protectedUser ? "Admin accounts are protected" : undefined}
            >
              {protectedUser
                ? "Protected"
                : user.isActive
                  ? "Disable"
                  : "Enable"}
            </button>,
          ];
        })}
      />
    </Panel>
  );
}
