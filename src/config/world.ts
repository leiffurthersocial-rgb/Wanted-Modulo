/**
 * Single source of truth for world-generation tuning — rivers, bridges and
 * ramps. Kept in one place so the feel can be dialled in without hunting through
 * the terrain/prop modules. (Bridge/ramp "tuning pass".)
 */
export const WORLD = {
  river: {
    /** Spacing of the river lattice (world units). */
    grid: 150,
    /** Half-width of a river channel. */
    halfWidth: 7,
    /** Probability a lattice line carries a river (lower = fewer rivers). */
    probability: 0.2,
    /** Carve depth below the plains. */
    depth: 5,
  },
  bridge: {
    /** Spacing of candidate bridge slots along a river. */
    spacing: 150,
    /** Probability a candidate slot actually has a bridge. Tuned so you're
     *  rarely far from a crossing, but bridges still feel like landmarks. */
    probability: 0.62,
    /** Half-length of a bridge deck along the river. */
    half: 4.5,
    /** Extra deck reach onto each bank. */
    approach: 4,
    /** Deck height above the plains. */
    y: 0.35,
  },
  ramp: {
    /** Candidate scan spacing along riverbanks. */
    spacing: 11,
    /** Fraction of eligible bank slots that get a ramp. */
    probability: 0.55,
    /** How far a bank point checks for water to face the ramp. */
    reach: 7,
    /** Run-up set-back from the bank. */
    setback: 5,
  },
} as const
