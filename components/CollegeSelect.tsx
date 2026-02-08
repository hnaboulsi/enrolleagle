export type CollegeOption = {
  id: string;
  name: string;
  slug: string;
  supported?: boolean;
};

export function CollegeSelect({
  value,
  options,
  onChange
}: {
  value: string;
  options: CollegeOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">College</label>
      <select className="input mt-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((college) => (
          <option key={college.id} value={college.slug}>
            {college.name}{college.supported === false ? ' (Coming Soon)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
