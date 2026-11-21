import type { LotId, SiteId } from "../model/places.ts";
import type { Entrance } from "./massing.ts";
import type { walkingDistances } from "./walking.ts";

export type Service = "school" | "park" | "bus_stop";
export interface ServiceReservation {
  readonly siteId: SiteId;
  readonly use: Service;
  readonly entrance: Entrance;
  readonly capacity: number;
  readonly maximumDistance: number;
  readonly households: { lotId: LotId; distance: number }[];
}

/** Give households with only one reachable facility first claim on its capacity. */
export function serviceAccess(reservations: ServiceReservation[], walk: ReturnType<typeof walkingDistances>) {
  const uses = [...new Set(reservations.map((s) => s.use))];
  const routes = (entrance: Entrance, use: Service) => reservations.filter((s) => s.use === use)
    .map((s) => ({ s, distance: entrance.distanceToRoad + walk(entrance, s.entrance) + s.entrance.distanceToRoad }))
    .filter(({ s, distance }) => distance <= s.maximumDistance).sort((a, b) => a.distance - b.distance);
  return {
    covered: (entrance: Entrance) => uses.every((use) => routes(entrance, use).length > 0),
    assign(homes: readonly { id: LotId; entrance: Entrance }[]): string | undefined {
      for (const use of uses) {
        const demand = homes.map((h) => ({ id: h.id, choices: routes(h.entrance, use) }))
          .sort((a, b) => a.choices.length - b.choices.length);
        for (const h of demand) {
          const choice = h.choices.find(({ s }) => s.households.length < s.capacity);
          if (!choice) return `No ${use} within walking distance and capacity for ${h.id}.`;
          choice.s.households.push({ lotId: h.id, distance: choice.distance });
        }
      }
    },
  };
}
