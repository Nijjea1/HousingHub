/** Types for random-listings.mjs, so search.test.ts type checks. */
import type { PGlite } from '@electric-sql/pglite';
import type { Coordinates, Listing } from '../../shared/schema';

export const MCMASTER: Coordinates;
export const USER_ID: string;
/** A seeded random number generator returning values in [0, 1). */
export function rng(seed: number): () => number;
export function randomListings(count: number, options?: { seed?: number; spreadKm?: number }): Listing[];
export function insertListings(db: PGlite, listings: Listing[]): Promise<void>;
