import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkOrderOwnership, getOrdersService } from '../services/orderService.js';
import { emitOrderCreated, emitOrderUpdated, setIO } from '../utils/socket.js';

describe('Restaurant order authorization and realtime routing', () => {
  const order = { _id: '65f010101010101010101001', restaurantId: 'rest-a', customerId: 'cust-a', status: 'Preparing' };

  it('does not treat another restaurant as the owner', () => {
    assert.equal(checkOrderOwnership(order, { id: 'rest-b', role: 'restaurant' }), false);
    assert.equal(checkOrderOwnership(order, { id: 'rest-a', role: 'restaurant' }), true);
  });

  it('rejects driver access before querying all orders', async () => {
    await assert.rejects(
      () => getOrdersService({ user: { id: 'driver-a', role: 'driver' }, query: {} }),
      (error) => error.statusCode === 403
    );
  });

  it('emits created and updated orders only to ownership rooms', () => {
    const events = [];
    setIO({ to: (room) => ({ emit: (event, payload) => events.push({ room, event, payload }) }) });
    emitOrderCreated(order);
    emitOrderUpdated(order);
    assert.deepEqual(events.map(({ room, event }) => ({ room, event })), [
      { room: 'restaurant:rest-a', event: 'new-order' },
      { room: 'customer:cust-a', event: 'new-order' },
      { room: 'restaurant:rest-a', event: 'updateOrder' },
      { room: 'customer:cust-a', event: 'updateOrder' }
    ]);
  });
});
