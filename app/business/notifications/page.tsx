import { NotificationsListSection } from "@/modules/notifications/ui/sections/notifications-list-section";

export default function NotificationsPage() {
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
