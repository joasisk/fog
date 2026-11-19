import type { SceneBounds } from "./geometry.ts";
import type { StreetId } from "./network.ts";
import type { LotId, ServiceUseKind, SiteId } from "./places.ts";
import type { GenerationSeed, Scene } from "./scene.ts";
import type { Listener } from "./sound.ts";

export interface ServiceAccessRule {
  readonly minimumHouseholds: number;
  /** The maximum walking distance in scene units. */
  readonly maximumWalkingDistance: number;
}

export interface GenerationSettings {
  readonly serviceAccess: Readonly<Record<ServiceUseKind, ServiceAccessRule>>;
  readonly maxAttempts: number;
}

export enum RegenerationScope {
  Building = "building",
  Street = "street",
  Town = "town",
}

/** Building hits select a site, road hits select a street, and sky hits select the town. */
export type RegenerationTarget =
  | { readonly scope: RegenerationScope.Building; readonly siteId: SiteId }
  | { readonly scope: RegenerationScope.Street; readonly streetId: StreetId }
  | { readonly scope: RegenerationScope.Town };

export interface RegenerationRequest {
  readonly target: RegenerationTarget;
  readonly seed: GenerationSeed;
}

export interface GenerationRecipe {
  readonly initialSeed: GenerationSeed;
  readonly settings: GenerationSettings;
  /** Accepted requests in order, including any that exhausted their options. */
  readonly requests: readonly RegenerationRequest[];
}

export enum LayoutIssueKind {
  LotOutsideFrontage = "lot_outside_frontage",
  OverlappingLots = "overlapping_lots",
  InvalidSiteLots = "invalid_site_lots",
  OverlappingFootprints = "overlapping_footprints",
  OutsideEnvelope = "outside_envelope",
  SharedWallMismatch = "shared_wall_mismatch",
  DisconnectedEntrance = "disconnected_entrance",
  DisconnectedStreet = "disconnected_street",
  MissingServiceAccess = "missing_service_access",
}

export type LayoutIssue =
  | { readonly kind: LayoutIssueKind.LotOutsideFrontage; readonly lotId: LotId }
  | { readonly kind: LayoutIssueKind.OverlappingLots; readonly lotIds: readonly [LotId, LotId] }
  | { readonly kind: LayoutIssueKind.OverlappingFootprints | LayoutIssueKind.SharedWallMismatch; readonly siteIds: readonly [SiteId, SiteId] }
  | { readonly kind: LayoutIssueKind.InvalidSiteLots | LayoutIssueKind.OutsideEnvelope | LayoutIssueKind.DisconnectedEntrance; readonly siteId: SiteId }
  | { readonly kind: LayoutIssueKind.DisconnectedStreet; readonly streetId: StreetId }
  | { readonly kind: LayoutIssueKind.MissingServiceAccess; readonly siteId: SiteId; readonly service: ServiceUseKind };

export enum RegenerationOutcome {
  Generated = "generated",
  Exhausted = "exhausted",
}

export type RegenerationResult =
  | {
      readonly outcome: RegenerationOutcome.Generated;
      readonly scene: Scene;
      /** Encloses the previous and replacement geometry within the selected scope. */
      readonly coverBounds: SceneBounds;
    }
  | { readonly outcome: RegenerationOutcome.Exhausted; readonly issues: readonly LayoutIssue[] };

export enum TransitionPhase {
  Idle = "idle",
  Cover = "cover",
  Replace = "replace",
  Reveal = "reveal",
}

export interface TransitionTiming {
  readonly coverMs: number;
  readonly revealMs: number;
}

export type TransitionTimings = Readonly<Record<RegenerationScope, TransitionTiming>>;

interface ActiveTransition {
  readonly request: RegenerationRequest;
  readonly coverBounds: SceneBounds;
  readonly phaseStartedAtMs: number;
}

export type RegenerationTransition =
  | { readonly phase: TransitionPhase.Idle }
  | (ActiveTransition & { readonly phase: TransitionPhase.Cover | TransitionPhase.Replace })
  | (ActiveTransition & { readonly phase: TransitionPhase.Reveal; readonly outcome: RegenerationOutcome });

export interface SceneSession {
  readonly scene: Scene;
  readonly listener: Listener;
  readonly recipe: GenerationRecipe;
  readonly transition: RegenerationTransition;
}
