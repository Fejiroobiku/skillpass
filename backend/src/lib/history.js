const same = (x) => x;

/**
 * What a timeline may show to people who are not administrators. Free-text accusations and the identity of
 * whoever raised a flag stay private: the page says THAT a concern was raised, not who raised it or what they wrote.
 */
const VISIBLE = {
  'credential.issued': same,
  'credential.confirmed': same,
  'credential.cosigned': same,
  'credential.held': same,
  'credential.released': same,
  'credential.revoked': same,
  'credential.under_review': same,
  'credential.reinstated': same,
  'flag.dismissed': same,
  'audit.completed': same,
  'credential.flagged': (e) => ({ ...e, actor: 'A verified user', detail: 'A concern was raised and is being reviewed.' }),
  'credential.disputed': (e) => ({ ...e, actor: 'The apprentice', detail: 'A concern was raised and is being reviewed.' }),
};

/** entries: [{ at, actor, action, detail, ... }] */
export const redactHistory = (entries) => entries.filter((e) => VISIBLE[e.action]).map((e) => VISIBLE[e.action](e));
