import { BusinessProfileSection } from "../sections/business-profile-section";

export function BusinessProfileView() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Business profile</h1>
        <p className="text-sm text-muted-foreground">Your business identity, used across registrations and certificates.</p>
      </header>
      <BusinessProfileSection />
    </div>
  );
}
