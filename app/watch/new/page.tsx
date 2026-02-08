import { redirect } from 'next/navigation';
import { AddWatchFlow } from '@/components/AddWatchFlow';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';

export default async function AddWatchPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const colleges = await prisma.college.findMany({ orderBy: { name: 'asc' } });

  if (colleges.length === 0) {
    return (
      <div className="card mt-12 p-8 text-center border border-amber-200 bg-amber-50 fade-in">
        <span className="text-4xl block mb-3">⚠️</span>
        <h2 className="text-xl font-bold text-amber-900 mb-2">No Colleges Configured</h2>
        <p className="text-sm text-amber-800">
          Run the Prisma seed script to load the default colleges:
        </p>
        <code className="mt-3 block bg-white px-4 py-2 rounded-lg text-sm font-mono text-slate-800">
          npm run prisma:seed
        </code>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-8 fade-in">
      <div>
        <h1 className="text-4xl font-bold text-slate-800">Add a Watch</h1>
        <p className="text-base text-slate-600 mt-1">Find a class section and we'll monitor it for seat changes</p>
      </div>
      <AddWatchFlow
        colleges={colleges.map((college) => ({ id: college.id, name: college.name, slug: college.slug }))}
      />
    </div>
  );
}
