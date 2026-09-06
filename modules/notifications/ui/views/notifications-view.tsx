import { NotificationsListSection } from "../sections/notifications-list-section";

export function NotificationsView() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Updates about your instruments, applications, and certificates.</p>
      </header>
      <NotificationsListSection />
    </div>
  );
}
