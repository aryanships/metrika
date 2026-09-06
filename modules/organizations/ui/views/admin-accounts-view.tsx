import { AdminAccountsSection } from "../sections/admin-accounts-section";

export function AdminAccountsView() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Admin accounts</h1>
        <p className="text-sm text-muted-foreground">
          Provision System, State, District, and Department accounts and set operational scopes.
        </p>
      </header>
      <AdminAccountsSection />
    </div>
  );
}
