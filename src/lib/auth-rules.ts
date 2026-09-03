/**
 * The signup rules, in one place: the form applies them for a quick answer and
 * `/api/register` applies them again because the browser is not trusted.
 */
export const PASSWORD_MIN_LENGTH = 8;

/** Deliberately loose: the only authority on a deliverable address is delivery. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
