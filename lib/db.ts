import Datastore from '@seald-io/nedb'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
fs.mkdirSync(DATA_DIR, { recursive: true })

declare global {
  // eslint-disable-next-line no-var
  var __nedb_users: Datastore | undefined
  var __nedb_characters: Datastore | undefined
}

export const usersDb: Datastore =
  global.__nedb_users ??
  new Datastore({
    filename: path.join(DATA_DIR, 'users.db'),
    autoload: true,
  })

export const charactersDb: Datastore =
  global.__nedb_characters ??
  new Datastore({
    filename: path.join(DATA_DIR, 'characters.db'),
    autoload: true,
  })

if (process.env.NODE_ENV !== 'production') {
  global.__nedb_users = usersDb
  global.__nedb_characters = charactersDb
}

void usersDb.ensureIndexAsync({ fieldName: 'email', unique: true })
void charactersDb.ensureIndexAsync({ fieldName: 'userId' })
