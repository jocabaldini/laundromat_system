import { redirect } from 'next/navigation';

// Settings root redirects to the first settings sub-page
export default function SettingsPage() {
  redirect('/settings/service-items');
}
