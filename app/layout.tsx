import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Space_Grotesk } from 'next/font/google';
import { getCurrentUser } from '@/src/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });

export const metadata: Metadata = {
  title: 'AddDropper',
  description: 'Real-time seat-availability alerts for California Community College classes.'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="min-h-screen font-sans">
        <div className="gradient-hero">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
            <Link href="/" className="text-lg font-black tracking-tight transition-colors hover:text-emerald-700">
              AddDropper
            </Link>
            <nav className="flex items-center gap-4 text-sm font-semibold text-slate-700">
              {user ? (
                <>
                  <Link href="/dashboard" className="transition-colors hover:text-emerald-700">
                    Dashboard
                  </Link>
                  <Link href="/watch/new" className="transition-colors hover:text-emerald-700">
                    Add watch
                  </Link>
                  <LogoutButton variant="link" />
                </>
              ) : (
                <>
                  <Link href="/signup" className="transition-colors hover:text-emerald-700">
                    Sign up
                  </Link>
                  <Link href="/login" className="transition-colors hover:text-emerald-700">
                    Log in
                  </Link>
                </>
              )}
            </nav>
          </header>
        </div>
        <main className="mx-auto w-full max-w-6xl px-6 pb-16">{children}</main>
        <footer className="border-t border-emerald-100/50 py-8 text-center text-xs text-slate-500">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-6">
            <p>Alerts only. We never auto-enroll or store school credentials.</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-emerald-700">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-emerald-700">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
