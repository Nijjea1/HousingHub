import { Bike, Bus, Car, Footprints } from 'lucide-react';
import { formatDistance } from '@/lib/map';
import type { Commute, CommuteMode } from '@shared/schema';
import { COMMUTE_MODES } from '@shared/schema';

const MODES: Record<CommuteMode, { label: string; Icon: typeof Car }> = {
  walk: { label: 'Walk', Icon: Footprints },
  bike: { label: 'Bike', Icon: Bike },
  drive: { label: 'Drive', Icon: Car },
  transit: { label: 'Transit', Icon: Bus },
};

interface CommuteSectionProps {
  campusName: string;
  byMode: Record<CommuteMode, Commute | null>;
  pending: boolean;
  selected: CommuteMode;
  onSelect: (mode: CommuteMode) => void;
}

/** Travel time from the listing to campus by each mode. Picking one draws its route on the map. */
const CommuteSection = ({ campusName, byMode, pending, selected, onSelect }: CommuteSectionProps) => {
  const chosen = byMode[selected];

  return (
    <section aria-labelledby="commute-heading">
      <h2 id="commute-heading" className="mb-3 text-xl font-semibold">
        Getting to {campusName}
      </h2>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Travel mode">
        {COMMUTE_MODES.map((mode) => {
          const { label, Icon } = MODES[mode];
          const commute = byMode[mode];
          const active = selected === mode;
          return (
            <button
              key={mode}
              type="button"
              disabled={!commute}
              aria-pressed={active}
              onClick={() => onSelect(mode)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
              } ${commute ? '' : 'cursor-not-allowed opacity-50'}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
              <span className="tabular-nums">{commute ? `${Math.round(commute.minutes)} min` : pending ? '...' : 'n/a'}</span>
            </button>
          );
        })}
      </div>
      {chosen && (
        <p className="mt-3 text-sm text-muted-foreground">
          {MODES[selected].label} is {Math.round(chosen.minutes)} minutes
          {chosen.distanceM !== null && ` over ${formatDistance(chosen.distanceM / 1000)}`}. The route is drawn on the map below.
        </p>
      )}
    </section>
  );
};

export default CommuteSection;
