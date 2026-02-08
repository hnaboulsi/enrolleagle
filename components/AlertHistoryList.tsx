import { StatusPill } from '@/components/StatusPill';

export type AlertEventView = {
  id: string;
  type: string;
  createdAt: string;
  payload: any;
};

export function AlertHistoryList({ items }: { items: AlertEventView[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-600">No alerts sent yet.</p>;
  }

  return (
    <ul className="space-y-3 text-sm text-slate-600">
      {items.map((event) => (
        <li key={event.id} className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{event.type.replace(/_/g, ' ')}</p>
              <p className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</p>
            </div>
            <StatusPill state={event.payload?.state ?? 'unknown'} />
          </div>
          {event.payload?.seatsAvailable !== undefined ? (
            <p className="mt-2 text-xs">Seats available: {event.payload.seatsAvailable ?? 'Unknown'}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
