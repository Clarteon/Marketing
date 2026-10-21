import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { relative, resolve, isAbsolute } from "node:path";

export const BACKUP_FORMAT = "clarteon-backup-v1";
export const BACKUP_TABLES = ["leads", "bookings"];
const MIN_PASSPHRASE = 16;

function keyFor(passphrase, salt) {
  if (typeof passphrase !== "string" || passphrase.length < MIN_PASSPHRASE) {
    throw new Error(`BACKUP_PASSPHRASE must be at least ${MIN_PASSPHRASE} characters.`);
  }
  return scryptSync(passphrase, salt, 32);
}

/** Encrypt a JSON-serializable value with AES-256-GCM and a scrypt-derived key. */
export function encryptBackup(value, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(passphrase, salt), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);

  return JSON.stringify({
    format: BACKUP_FORMAT,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  });
}

/** Decrypt a backup file's text. Throws on a wrong passphrase or a tampered file. */
export function decryptBackup(text, passphrase) {
  const file = JSON.parse(text);
  if (file.format !== BACKUP_FORMAT) throw new Error("Not a Clarteon backup file.");

  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyFor(passphrase, Buffer.from(file.salt, "base64")),
    Buffer.from(file.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(file.tag, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(file.data, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString("utf8"));
}

/** Backups hold personal data, so they must never be written inside the repository. */
export function assertOutsideRepo(filePath, repoRoot) {
  const target = resolve(filePath);
  const rel = relative(resolve(repoRoot), target);
  if (!rel.startsWith("..") && !isAbsolute(rel)) {
    throw new Error("Write backups outside the repository, for example to an encrypted drive.");
  }
  return target;
}

/** Build a parameterized insert that skips rows that already exist. Columns come from our own backup. */
export function insertStatement(table, row) {
  if (!BACKUP_TABLES.includes(table)) throw new Error(`Unknown table: ${table}`);
  const columns = Object.keys(row);
  if (columns.length === 0 || !columns.every((column) => /^[a-z_]{1,40}$/.test(column))) {
    throw new Error(`Unexpected columns in ${table} backup.`);
  }
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  return {
    text: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
    params: columns.map((column) => row[column]),
  };
}
