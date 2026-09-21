import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import Delivery from '../src/models/Delivery.js';
import Driver from '../src/models/Driver.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food_delivery_db';

describe('Delivery Service Tests (Assignment, Ownership, Status Lifecycle)', () => {
  let driverA;
  let driverB;
  let testDelivery;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    const ts = Date.now();
    driverA = await Driver.create({
      name: 'Nguyễn Văn Driver A',
      email: `driverA_${ts}@skydish.com`,
      password: 'password123',
      phone: `0911${String(ts).slice(-6)}`,
      vehicleType: 'bike',
      vehicleNumber: `29A-${String(ts).slice(-5)}`
    });

    driverB = await Driver.create({
      name: 'Lê Văn Driver B',
      email: `driverB_${ts}@skydish.com`,
      password: 'password123',
      phone: `0922${String(ts).slice(-6)}`,
      vehicleType: 'bike',
      vehicleNumber: `29B-${String(ts).slice(-5)}`
    });

    testDelivery = await Delivery.create({
      driver: driverA._id,
      orderId: `ORDER_TEST_${ts}`,
      customerId: 'Customer Test',
      pickupAddressString: '120 Phố Huế, Hà Nội',
      pickupLocation: { type: 'Point', coordinates: [105.85, 21.02] },
      deliveryAddressString: '45 Lê Lợi, Hà Nội',
      deliveryLocation: { type: 'Point', coordinates: [105.86, 21.03] },
      status: 'assigned'
    });
  });

  after(async () => {
    if (driverA) await Driver.findByIdAndDelete(driverA._id);
    if (driverB) await Driver.findByIdAndDelete(driverB._id);
    if (testDelivery) await Delivery.findByIdAndDelete(testDelivery._id);
    await mongoose.disconnect();
  });

  it('DELIVERY ASSIGNMENT: delivery is correctly linked to assigned driver', async () => {
    assert.ok(testDelivery._id);
    assert.strictEqual(testDelivery.driver.toString(), driverA._id.toString());
    assert.strictEqual(testDelivery.status, 'assigned');
  });

  it('OWNERSHIP ENFORCEMENT: Driver B is not the owner of Driver A delivery', () => {
    const isOwner = testDelivery.driver.toString() === driverB._id.toString();
    assert.strictEqual(isOwner, false, 'Driver B must NOT match Driver A delivery assignment');
  });

  it('STATUS LIFECYCLE: delivery progresses through To be delivered -> Picked-up -> Delivered', async () => {
    testDelivery.status = 'To be delivered';
    await testDelivery.save();
    assert.strictEqual(testDelivery.status, 'To be delivered');

    testDelivery.status = 'Picked-up';
    await testDelivery.save();
    assert.strictEqual(testDelivery.status, 'Picked-up');

    testDelivery.status = 'Delivered';
    await testDelivery.save();
    assert.strictEqual(testDelivery.status, 'Delivered');
  });

  it('PAGINATION: get driver deliveries supports page and limit slicing', async () => {
    const filter = { driver: driverA._id };
    const totalItems = await Delivery.countDocuments(filter);
    const deliveries = await Delivery.find(filter).skip(0).limit(5);
    assert.ok(deliveries.length <= 5);
    assert.ok(totalItems >= 1);
  });

  it('VALIDATION: unsupported delivery statuses are rejected by the schema', async () => {
    const invalidDelivery = new Delivery({
      driver: driverA._id,
      orderId: `ORDER_INVALID_STATUS_${Date.now()}`,
      customerId: 'Customer Test',
      pickupAddressString: '120 Phố Huế, Hà Nội',
      pickupLocation: { type: 'Point', coordinates: [105.85, 21.02] },
      deliveryAddressString: '45 Lê Lợi, Hà Nội',
      deliveryLocation: { type: 'Point', coordinates: [105.86, 21.03] },
      status: 'cancelled'
    });

    await assert.rejects(
      invalidDelivery.validate(),
      /`cancelled` is not a valid enum value/
    );
  });
});
