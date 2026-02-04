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
      <div className="card mt-6 p-6 text-sm text-slate-600">
        No colleges configured yet. Run the Prisma seed script to load the default colleges.
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      <div>
        <h1 className="text-3xl font-bold">Add a watch</h1>
        <p className="text-sm text-slate-600">Find a section and we’ll monitor it for seat changes.</p>
      </div>
      <AddWatchFlow
        colleges={colleges.map((college) => ({ id: college.id, name: college.name, slug: college.slug }))}
      />
    </div>
  );
}
