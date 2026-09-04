import { BusinessProfileSection } from "@/modules/businesses/ui/sections/business-profile-section";

export default function ProfilePage() {
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
