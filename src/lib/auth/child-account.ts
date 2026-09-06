/**
 * Logins for goalies whose account a parent holds (Michael's item 6c).
 *
 * The rule this file exists to serve is his, stated twice and unchanged:
 * "A parent creates and holds the account. The young goalie has his own login
 * inside it. The parent consents; the child does the work."
 *
 * The awkward part of "his own login" is that a login needs an identifier, and
 * a nine-year-old usually has no email address. Requiring one would make the
 * feature fail for exactly the goalies it was built for. So a parent may
 * instead give the goalie a *handle* — `jake-a7k2` — which is turned into a
 * real address on a domain that accepts no mail. Firebase gets the address it
 * insists on; the goalie types the short thing on the login page.
 *
 * That trade has a consequence worth stating plainly: a handle account can
 * never be emailed. No verification, no password reset. Which is not a gap in
 * the design, it is the design — the parent holds the account, so the parent
 * resets the password from their dashboard.
 *
 * Nothing here touches the network. It converts between the three forms an
 * identifier takes — what the parent chose, what the goalie types, and what
 * Firebase stores — so that conversion happens one way in one place.
 */

/**
 * Domain for generated goalie logins.
 *
 * Deliberately a subdomain of the real one rather than something like
 * `.local` or `.invalid`: an address on a domain Michael owns is one nobody
 * else can ever claim, and it reads as ours in the Firebase console. It has no
 * MX record and is never meant to get one.
 */
export const GOALIE_LOGIN_DOMAIN = 'goalie.smartergoalie.com';

/**
 * Alphabet for the four-character suffix — no 0/O, 1/I/L.
 *
 * The same exclusions the parent link codes use, for the same reason: this
 * gets read off a screen by an adult and typed in by a child, and every
 * ambiguous character is a support email.
 */
const SUFFIX_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

const SUFFIX_LENGTH = 4;

/** Longest name portion of a handle. Keeps the whole thing typable. */
const MAX_SLUG_LENGTH = 20;

/**
 * What a handle looks like: a name, a hyphen, exactly four characters.
 *
 * Strict on purpose. The login page uses this to decide whether what someone
 * typed is a handle or an email, and a loose pattern would swallow mistyped
 * email addresses — turning "please enter a valid email" into the far less
 * helpful "no account found".
 */
const HANDLE_PATTERN = /^[a-z0-9]{2,20}-[a-z0-9]{4}$/;

/**
 * Reduces a display name to the part of a handle a child can recognise as
 * theirs. Accents are folded rather than dropped so "José" becomes "jose"
 * instead of "jos".
 */
export function slugifyName(displayName: string): string {
  const slug = displayName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, MAX_SLUG_LENGTH);

  // A name written entirely in a script that folds to nothing still needs a
  // handle. "goalie-a7k2" is a worse handle than "jake-a7k2" but it works.
  return slug.length >= 2 ? slug : 'goalie';
}

/** Four random characters from the unambiguous alphabet. */
function randomSuffix(random: () => number): string {
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += SUFFIX_ALPHABET.charAt(Math.floor(random() * SUFFIX_ALPHABET.length));
  }
  return suffix;
}

/**
 * Builds a handle from the goalie's name.
 *
 * The suffix is what makes it unique, not the name — two goalies called Jake
 * is the normal case, not the exception. `random` is injectable so a test can
 * pin the suffix; the caller is still responsible for checking the result is
 * not already taken, because four characters is short enough to collide.
 */
export function generateLoginHandle(displayName: string, random: () => number = Math.random): string {
  return `${slugifyName(displayName)}-${randomSuffix(random)}`;
}

/** Trims and lowercases. Handles are case-insensitive to whoever types them. */
export function normalizeHandle(value: string): string {
  return value.trim().toLowerCase();
}

/** Whether this is a goalie handle rather than an email address. */
export function isLoginHandle(value: string | null | undefined): boolean {
  if (!value) return false;
  return HANDLE_PATTERN.test(normalizeHandle(value));
}

/** The address Firebase stores for a handle. */
export function handleToEmail(handle: string): string {
  return `${normalizeHandle(handle)}@${GOALIE_LOGIN_DOMAIN}`;
}

/** Whether an address is a generated goalie login rather than a real inbox. */
export function isGoalieLoginEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return normalizeHandle(email).endsWith(`@${GOALIE_LOGIN_DOMAIN}`);
}

/**
 * Turns whatever was typed on the login page into what Firebase expects.
 *
 * A handle becomes its address; anything else is passed through untouched,
 * including malformed input — decidingly *not* this function's job to judge.
 * Sign-in will reject it, and the schema already caught the ordinary typos.
 */
export function resolveLoginIdentifier(value: string): string {
  const trimmed = value.trim();
  return isLoginHandle(trimmed) ? handleToEmail(trimmed) : trimmed;
}
