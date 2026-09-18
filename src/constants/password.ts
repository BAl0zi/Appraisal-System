// Excludes characters that are easily confused with each other when read/typed from a
// generated password: 0/O, 1/l/I, 5/S. Symbols and most letters/digits are kept to preserve entropy.
const UPPERCASE = 'ABCDEFGHJKLMNPQRTUVWXYZ'; // no I, O, S
const LOWERCASE = 'abcdefghijkmnpqrtuvwxyz'; // no l, o, s
const DIGITS = '2346789'; // no 0, 1, 5
const SYMBOLS = '!@#$%^&*';

export const PASSWORD_CHARSET = UPPERCASE + LOWERCASE + DIGITS + SYMBOLS;

export function generateSecurePassword(length = 12): string {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += PASSWORD_CHARSET.charAt(Math.floor(Math.random() * PASSWORD_CHARSET.length));
  }
  return password;
}
