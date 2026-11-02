import mongoose from 'mongoose';
import { env } from './env';

mongoose.set('strictQuery', true);

const CONNECT_TIMEOUT_MS = 10_000;

/** The URI's host(s) without credentials, safe to log. */
function describeTarget(uri: string) {
  return uri.replace(/^mongodb(\+srv)?:\/\/(?:[^@/]*@)?/, '').split(/[/?]/)[0] || 'unknown host';
}

export async function connectDB(): Promise<void> {
  const target = describeTarget(env.MONGODB_URI);
  console.log(`Connecting to MongoDB at ${target}…`);

  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS });
  } catch (err) {
    if (err instanceof mongoose.Error.MongooseServerSelectionError) {
      throw new Error(
        [
          `Couldn't reach MongoDB at ${target} within ${CONNECT_TIMEOUT_MS / 1000}s.`,
          '  - Atlas: allow this machine under Network Access (Render and similar hosts need 0.0.0.0/0).',
          '  - Check the username and password in MONGODB_URI (URL-encode special characters like @ or #).',
          '  - Local: make sure mongod is running.',
        ].join('\n'),
      );
    }
    throw err;
  }

  const name = mongoose.connection.name;
  console.log(`MongoDB connected: ${name}`);
  if (name === 'test') {
    console.warn('MONGODB_URI has no database name, so data goes to "test". Add one, e.g. …mongodb.net/batchops?…');
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
