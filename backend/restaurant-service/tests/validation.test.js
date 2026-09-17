import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateFoodPayload, validateRestaurantRegistration } from '../src/utils/validation.js';

describe('Restaurant and food request validation', () => {
  it('accepts the frontend food payload including string boolean availability', () => {
    assert.deepEqual(validateFoodPayload({ name: 'Phở bò', price: '65000', category: 'Phở', availability: 'false' }), {});
  });

  it('rejects missing food name, negative price and invalid availability', () => {
    const errors = validateFoodPayload({ name: ' ', price: '-1', category: '', availability: 'yes' });
    assert.deepEqual(Object.keys(errors).sort(), ['availability', 'category', 'name', 'price']);
  });

  it('requires restaurant passwords to match the frontend eight-character rule', () => {
    const errors = validateRestaurantRegistration({
      name: 'Sky Kitchen', ownerName: 'Bao', location: 'Ha Noi', contactNumber: '0901234567',
      email: 'owner@example.com', password: 'short'
    });
    assert.equal(errors.password, 'Password must be at least 8 characters');
  });
});
