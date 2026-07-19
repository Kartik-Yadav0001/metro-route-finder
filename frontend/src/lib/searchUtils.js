/**
 * Computes the Levenshtein Distance between two strings.
 * Represents the minimum number of single-character edits required to transform one string into another.
 */
export function levenshteinDistance(s1, s2) {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost  // substitution
      );
    }
  }
  return matrix[len1][len2];
}

/**
 * Computes a fuzzy match score between 0.0 and 1.0.
 * 1.0 represents a perfect match, and 0.0 represents zero similarity.
 */
export function fuzzyMatch(stationName, query) {
  const name = stationName.toLowerCase().trim();
  const q = query.toLowerCase().trim();

  if (!q) return 1.0;
  if (name === q) return 1.0;

  // Prefix/Substring matching boost
  if (name.includes(q)) {
    const idx = name.indexOf(q);
    // Higher score if query appears closer to the beginning of the station name
    return 0.95 - (idx * 0.05);
  }

  // Levenshtein distance matching
  const distance = levenshteinDistance(name, q);
  const maxLength = Math.max(name.length, q.length);
  if (maxLength === 0) return 0.0;

  const score = 1.0 - (distance / maxLength);
  return score;
}
