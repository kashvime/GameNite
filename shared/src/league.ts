export type League = "bronze" | "silver" | "gold";

/**
 * Computes the league for a given Elo rating.
 *
 * @param rating - The user's current Elo rating
 * @returns the league the user belongs to
 */
export function computeLeague(rating: number): League {
  if (rating >= 1800) return "gold";
  if (rating >= 1200) return "silver";
  return "bronze";
}
