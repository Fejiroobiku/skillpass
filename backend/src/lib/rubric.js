export const DEFAULT_RUBRIC = ['Task completed without help', 'Safe working practice followed', 'Finished to client standard'];

/** The observable criteria for a skill, in order. Skills without their own rows use the default rubric. */
export async function getRubric(db, skillId) {
  const { rows } = await db.query('SELECT text FROM skill_criteria WHERE skill_id = $1 ORDER BY position', [skillId]);
  return rows.length ? rows.map((r) => r.text) : DEFAULT_RUBRIC;
}
