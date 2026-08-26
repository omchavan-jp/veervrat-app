/**
 * Adding a first password to an account that signs in with Google (#196).
 *
 * The same token and the same form as `/reset-password` — the operation is identical, and a
 * second implementation would be a second thing to keep correct. Only the address differs,
 * because a link reading `/reset-password` sent to somebody who has never had one is a small
 * untruth, and the email that carries it says "set", not "reset".
 */
export { default } from '../reset-password/page';
