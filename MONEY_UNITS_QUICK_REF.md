# Money Units Quick Reference

## For Backend Developers

**Rule**: Return raw DB values. NO division or multiplication.

```javascript
// ✅ CORRECT:
return {
  totalIncome: dbValue,              // e.g., 3500000
  totalIncomeCents: dbValue,         // Same value
};

// ❌ WRONG:
return {
  totalIncome: dbValue / 100,        // NO! Don't divide
  totalIncomeCents: dbValue,         
};
```

## For Frontend Developers

**Rule**: Divide ALL monetary API values by 100 before display.

```javascript
// ✅ CORRECT:
const displayValue = apiResponse.totalIncome / 100;
// 3500000 → 35000 → Display as "PKR 35,000.00"

// ❌ WRONG:
const displayValue = apiResponse.totalIncome;
// 3500000 → Display as "PKR 3,500,000" (100x too large!)
```

## Quick Examples

| DB Value | API Returns | Frontend Display |
|----------|-------------|------------------|
| 36000 | 36000 | PKR 360.00 |
| 3500000 | 3500000 | PKR 35,000.00 |
| 154750 | 154750 | PKR 1,547.50 |
| 7200000 | 7200000 | PKR 72,000.00 |
| -3854750 | -3854750 | PKR -38,547.50 |

## Field Name Guide

All these fields contain THE SAME raw DB value:

```javascript
{
  "total": 3500000,
  "totalAmount": 3500000,
  "totalAmountCents": 3500000,
  "totalIncome": 3500000,
  "totalIncomeCents": 3500000,
  "amount": 3500000,
  "amountCents": 3500000
}
```

**Ignore the `*Cents` suffix** — it's legacy naming, the value is NOT different.

## Formatting Function

```javascript
function formatMoney(cents, currency = 'PKR') {
  const whole = cents / 100;
  return `${currency} ${whole.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Usage:
formatMoney(3500000)  // "PKR 35,000.00"
formatMoney(154750)   // "PKR 1,547.50"
```

## Testing

```bash
# Backend test (verify raw values returned):
node test-raw-values.js

# Expected: All endpoints return DB values without conversion
```

## Troubleshooting

**Values 100x too large?** → Frontend not dividing by 100  
**Values 100x too small?** → Frontend dividing when it shouldn't (check if old backend code still converts)  
**Different values across pages?** → Using different field names, stick to one
