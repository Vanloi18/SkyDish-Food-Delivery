import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'data', 'db');
fs.mkdirSync(dbPath, { recursive: true });

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
console.log(`✅ Standalone MongoDB running at ${uri} (port 27000)`);

import('net').then(({ default: net }) => {
  const proxy = net.createServer((socket) => {
    const target = net.connect(27000, '127.0.0.1');
    socket.pipe(target);
    target.pipe(socket);
    socket.on('error', () => target.destroy());
    target.on('error', () => socket.destroy());
  });
  proxy.listen(27017, '127.0.0.1', () => {
    console.log('✅ Port proxy 27017 -> 27000 active for seamless MongoDB connectivity');
  });
  proxy.on('error', (err) => console.log('Port 27017 bridge notice:', err.message));
});

process.on('SIGINT', async () => {
  await mongod.stop();
  process.exit(0);
});
