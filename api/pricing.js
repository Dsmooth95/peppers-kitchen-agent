// Pure pricing helpers for cart items. No imports, no I/O — safe to unit test.

export function modifiersTotal(modifiers) {
  return (modifiers || []).reduce((sum, m) => sum + (m.price || 0), 0);
}

export function unitPriceWithModifiers(item) {
  return (item.unitPrice || 0) + modifiersTotal(item.modifiers);
}

// Builds a Square order line item. Amount is integer cents as a BigInt.
export function toSquareLineItem(item) {
  const modNames = (item.modifiers || []).map((m) => m.name).join(', ');
  const displayName = modNames ? `${item.name} (${modNames})` : item.name;

  return {
    name: displayName,
    quantity: String(item.quantity),
    basePriceMoney: {
      amount: BigInt(Math.round(unitPriceWithModifiers(item) * 100)),
      currency: 'USD',
    },
  };
}

// Order total in dollars.
export function orderTotal(cartItems) {
  return cartItems.reduce(
    (sum, item) => sum + unitPriceWithModifiers(item) * item.quantity,
    0
  );
}
