export const STAFF_DOMAIN = "funcionario.doceencanto.local";

export function normalizeUsername(u: string) {
  return u.trim().toLowerCase();
}

export function isValidUsername(u: string) {
  return /^[a-z0-9._-]{3,30}$/.test(u);
}

/** Turns what was typed in the login field into the email used for sign-in. */
export function loginEmail(input: string) {
  const v = input.trim();
  return v.includes("@") ? v : `${normalizeUsername(v)}@${STAFF_DOMAIN}`;
}

export function displayLogin(email: string) {
  return email.endsWith(`@${STAFF_DOMAIN}`) ? email.slice(0, -STAFF_DOMAIN.length - 1) : email;
}
