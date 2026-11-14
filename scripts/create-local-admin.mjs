import 'dotenv/config'
import { isIP } from 'node:net'
import { emitKeypressEvents } from 'node:readline'
import { createInterface } from 'node:readline/promises'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

class ScriptError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ScriptError'
  }
}

function assertLoopbackDatabase() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new ScriptError('DATABASE_URL is required; no database was accessed.')
  }

  let url
  try {
    url = new URL(connectionString)
  } catch {
    throw new ScriptError('DATABASE_URL is invalid; no database was accessed.')
  }

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  const isLoopback = host === 'localhost'
    || host === '::1'
    || (isIP(host) === 4 && host.startsWith('127.'))

  if (!isLoopback) {
    throw new ScriptError('DATABASE_URL must use a loopback host; no database was accessed.')
  }

  return connectionString
}

async function promptEmail() {
  const input = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return (await input.question('Admin email: ')).trim()
  } catch {
    throw new ScriptError('Input was cancelled.')
  } finally {
    input.close()
  }
}

function promptHiddenPassword() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new ScriptError('A TTY is required to enter the password without echo.')
  }

  return new Promise((resolve, reject) => {
    process.stdout.write('Admin password (input hidden): ')
    emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.resume()

    let password = ''
    const cleanup = () => {
      process.stdin.off('keypress', onKeypress)
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdout.write('\n')
    }

    const onKeypress = (character, key = {}) => {
      if (key.ctrl && key.name === 'c') {
        cleanup()
        reject(new ScriptError('Input was cancelled.'))
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup()
        resolve(password)
      } else if (key.name === 'backspace') {
        password = Array.from(password).slice(0, -1).join('')
      } else if (character && !key.ctrl && !key.meta && character >= ' ') {
        password += character
      }
    }

    process.stdin.on('keypress', onKeypress)
  })
}

async function main() {
  const connectionString = assertLoopbackDatabase()

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new ScriptError('Run this script in an interactive terminal.')
  }

  const email = await promptEmail()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new ScriptError('Enter a valid email address.')
  }

  const password = await promptHiddenPassword()
  const passwordBytes = Buffer.byteLength(password, 'utf8')
  if (!password.trim() || passwordBytes < 12 || passwordBytes > 72) {
    throw new ScriptError('Use a non-blank password between 12 and 72 UTF-8 bytes.')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const pool = new Pool({ connectionString })

  try {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const existing = await client.query(
        'SELECT 1 FROM "User" WHERE "email" = $1 LIMIT 1',
        [email],
      )

      if (existing.rowCount > 0) {
        throw new ScriptError('That email already exists; no account was changed.')
      }

      await client.query(
        'INSERT INTO "User" ("name", "email", "password", "role", "organizerStatus") VALUES ($1, $2, $3, $4, $5)',
        ['Local Development Admin', email, passwordHash, 'ADMIN', 'NONE'],
      )
      await client.query('COMMIT')
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch {
        throw new ScriptError('Database operation failed and rollback could not be confirmed; check the database state before retrying.')
      }
      if (error instanceof ScriptError) throw error
      if (error?.code === '23505') {
        throw new ScriptError('That email already exists; no account was changed.')
      }
      throw error
    } finally {
      client.release()
    }

    const verification = await pool.query(
      'SELECT "role"::text AS role, "organizerStatus"::text AS "organizerStatus" FROM "User" WHERE "email" = $1 LIMIT 1',
      [email],
    )
    const verifiedUser = verification.rows[0]
    if (
      !verifiedUser
      || verifiedUser.role !== 'ADMIN'
      || verifiedUser.organizerStatus !== 'NONE'
    ) {
      throw new ScriptError('Account creation could not be verified; check the database state before retrying.')
    }

    const result = await pool.query(
      'SELECT "role"::text AS role, COUNT(*)::int AS count FROM "User" GROUP BY "role" ORDER BY "role"',
    )
    const counts = new Map(result.rows.map(({ role, count }) => [role, count]))

    console.log('Account created. Role counts:')
    for (const role of ['ATTENDEE', 'ORGANIZER', 'ADMIN']) {
      console.log(`${role}: ${counts.get(role) ?? 0}`)
    }
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error instanceof ScriptError
    ? error.message
    : 'Admin creation failed. Database, account, and secret details were not printed.')
  process.exitCode = 1
})