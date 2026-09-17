import { validateRestaurantToken } from './restaurantToken';

const tokenFor = (payload) => {
  const encode = (value) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.test-signature`;
};

describe('RestaurantPartnerGuard token role checks', () => {
  test('accepts an unexpired restaurant token', () => {
    expect(validateRestaurantToken(tokenFor({ role: 'restaurant', restaurantId: 'rest-a', exp: Math.floor(Date.now() / 1000) + 60 }))).toBe(true);
  });

  test('rejects customer and expired tokens', () => {
    expect(validateRestaurantToken(tokenFor({ role: 'customer', id: 'customer-a' }))).toBe(false);
    expect(validateRestaurantToken(tokenFor({ role: 'restaurant', exp: Math.floor(Date.now() / 1000) - 1 }))).toBe(false);
  });
});
