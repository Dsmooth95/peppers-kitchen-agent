import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  modifiersTotal,
  unitPriceWithModifiers,
  toSquareLineItem,
  orderTotal,
} from '../api/pricing.js';

test('modifiersTotal sums modifier prices', () => {
  assert.equal(modifiersTotal([{ name: 'Cheese', price: 1 }, { name: 'Bacon', price: 2.5 }]), 3.5);
});

test('modifiersTotal treats missing prices as 0', () => {
  assert.equal(modifiersTotal([{ name: 'No onions' }, { name: 'Bacon', price: 2 }]), 2);
});

test('modifiersTotal handles missing or empty modifiers', () => {
  assert.equal(modifiersTotal(undefined), 0);
  assert.equal(modifiersTotal(null), 0);
  assert.equal(modifiersTotal([]), 0);
});

test('unitPriceWithModifiers adds modifiers to base price', () => {
  assert.equal(unitPriceWithModifiers({ unitPrice: 8, modifiers: [{ price: 1.5 }] }), 9.5);
  assert.equal(unitPriceWithModifiers({ unitPrice: 8 }), 8);
  assert.equal(unitPriceWithModifiers({ modifiers: [{ price: 1 }] }), 1);
});

test('toSquareLineItem converts dollars to integer cents as BigInt', () => {
  const li = toSquareLineItem({ name: 'Taco', unitPrice: 3.99, quantity: 1 });
  assert.equal(typeof li.basePriceMoney.amount, 'bigint');
  assert.equal(li.basePriceMoney.amount, 399n);
  assert.equal(li.basePriceMoney.currency, 'USD');
});

test('toSquareLineItem rounds floating-point sums to whole cents', () => {
  // 0.1 + 0.2 = 0.30000000000000004 in floating point
  const li = toSquareLineItem({ name: 'X', unitPrice: 0.1, modifiers: [{ name: 'Y', price: 0.2 }], quantity: 1 });
  assert.equal(li.basePriceMoney.amount, 30n);
});

test('toSquareLineItem name without modifiers', () => {
  assert.equal(toSquareLineItem({ name: 'Burrito', unitPrice: 10, quantity: 1 }).name, 'Burrito');
  assert.equal(toSquareLineItem({ name: 'Burrito', unitPrice: 10, modifiers: [], quantity: 1 }).name, 'Burrito');
});

test('toSquareLineItem name with modifiers and price includes them', () => {
  const li = toSquareLineItem({
    name: 'Burrito',
    unitPrice: 10,
    modifiers: [{ name: 'Guac', price: 2 }, { name: 'Extra salsa' }],
    quantity: 2,
  });
  assert.equal(li.name, 'Burrito (Guac, Extra salsa)');
  assert.equal(li.basePriceMoney.amount, 1200n);
});

test('toSquareLineItem quantity is a string', () => {
  const li = toSquareLineItem({ name: 'Taco', unitPrice: 3, quantity: 4 });
  assert.equal(li.quantity, '4');
});

test('orderTotal multiplies by quantity and includes modifiers', () => {
  const total = orderTotal([
    { name: 'Taco', unitPrice: 3, quantity: 3 },
    { name: 'Burrito', unitPrice: 10, modifiers: [{ name: 'Guac', price: 2 }], quantity: 2 },
  ]);
  assert.equal(total, 33);
});

test('orderTotal treats a missing unitPrice as 0, not NaN', () => {
  const total = orderTotal([
    { name: 'Mystery', modifiers: [{ name: 'Cheese', price: 1 }], quantity: 2 },
    { name: 'Taco', unitPrice: 3, quantity: 1 },
  ]);
  assert.ok(!Number.isNaN(total));
  assert.equal(total, 5);
});

test('orderTotal of an empty cart is 0', () => {
  assert.equal(orderTotal([]), 0);
});
