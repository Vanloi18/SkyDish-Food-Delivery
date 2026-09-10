import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';

const dbPath = path.resolve('f:/Desktop/Food-Delivery-Microservices/data/db');

console.log('Starting MongoDB on port 27017 with dbPath:', dbPath);

const mongod = await MongoMemoryServer.create({
  instance: {
    port: 27000,
    dbPath: dbPath,
    dbName: 'food_delivery_db',
    storageEngine: 'wiredTiger',
  },
  binary: {
    version: '7.0.14',
  }
});

const uri = mongod.getUri();
console.log(`✅ Standalone MongoDB running at ${uri} (port 27017)`);

process.on('SIGINT', async () => {
  await mongod.stop();
  process.exit(0);
});
