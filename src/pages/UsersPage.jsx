import { useEffect, useMemo, useState } from "react";
import RoleGate from "../components/RoleGate";
import { Button, Input, Select, Toast, Loader } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { AuthApiError } from "../lib/authApi";
import {
  createUser,
  deactivateUser,
  fetchTeams,
  fetchUsers,
  updateUser,
} from "../lib/userApi";
import UserFormModal from "../components/users/UserFormModal";
import UserTable from "../components/users/UserTable";
import TeamPanel from "../components/users/TeamPanel";

function normalizeUser(user) {
  return { ...user, team: user.teamName || "" };
}

function UsersContent() {
  const { accessToken, currentUser, logout, refreshCurrentUser } = useAuth();
  const { ready: dataReady, replaceUsers } = useData();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!dataReady || !accessToken) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchUsers(accessToken), fetchTeams(accessToken)])
      .then(([userResult, teamResult]) => {
        if (cancelled) return;
        const authoritativeUsers = userResult.users.map(normalizeUser);
        setUsers(authoritativeUsers);
        setTeams(teamResult.teams);
        replaceUsers(authoritativeUsers);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof AuthApiError && error.code === "INVALID_SESSION") logout();
        else setToast({ type: "error", message: error.message || "Unable to load users." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // DataContext recreates command functions when its state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, dataReady]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) =>
      (!role || user.role === role) &&
      (!query || user.name.toLowerCase().includes(query) || user.username.toLowerCase().includes(query))
    );
  }, [users, search, role]);

  function cacheUsers(nextUsers) {
    setUsers(nextUsers);
    replaceUsers(nextUsers);
  }

  async function saveUser(formUser) {
    const { id, ...payload } = formUser;
    const response = id
      ? await updateUser(accessToken, id, payload)
      : await createUser(accessToken, payload);
    const savedUser = normalizeUser(response.user);
    const nextUsers = id
      ? users.map((user) => (user.id === id ? savedUser : user))
      : [savedUser, ...users];
    cacheUsers(nextUsers);

    if (id === currentUser.id && payload.password) {
      logout();
      return;
    }
    if (id === currentUser.id) await refreshCurrentUser();
    setToast({
      type: "success",
      message: id ? `${savedUser.name} was updated.` : `${savedUser.name} can now sign in.`,
    });
  }

  async function deactivate(user) {
    try {
      const response = await deactivateUser(accessToken, user.id);
      const savedUser = normalizeUser(response.user);
      cacheUsers(users.map((entry) => (entry.id === user.id ? savedUser : entry)));
      setToast({ type: "success", message: `${user.name} has been deactivated.` });
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "INVALID_SESSION") logout();
      else setToast({ type: "error", message: error.message || "Unable to deactivate the user." });
    }
  }

  if (!dataReady || loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <Button onClick={() => { setEditingUser(null); setModalOpen(true); }}>+ Add User</Button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <Input
          label="Search users"
          placeholder="Search by name or username"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1 min-w-[240px]"
        />
        <Select
          label="Role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="flex-1 min-w-[220px]"
          options={[
            { value: "", label: "All roles" },
            ...["central_admin", "warehouse_manager", "field_worker"].map((value) => ({
              value,
              label: value.replace(/_/g, " "),
            })),
          ]}
        />
      </div>

      <UserTable
        users={filteredUsers}
        currentUserId={currentUser.id}
        onEdit={(user) => { setEditingUser(user); setModalOpen(true); }}
        onDeactivate={deactivate}
      />
      <TeamPanel teamList={teams} userList={users} />
      <UserFormModal
        isOpen={modalOpen}
        user={editingUser}
        teams={teams}
        currentUserId={currentUser.id}
        onClose={() => setModalOpen(false)}
        onSave={saveUser}
      />
      {toast && <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default function UsersPage() {
  return (
    <RoleGate allowed={["central_admin"]}>
      <UsersContent />
    </RoleGate>
  );
}
