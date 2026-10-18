# Signup Crash Fix - Email Field Validation

## Problem
The app was crashing when trying to create an account after adding the email field.

## Root Cause
**Incorrect Zod schema validation** for the optional email field:

### The Broken Code:
```typescript
email: z
  .string()
  .email('Enter a valid email address')
  .trim()
  .optional()
  .or(z.literal('')), // ❌ This doesn't work!
```

**Why it failed:**
- `.optional()` means the field can be `undefined`
- `.or(z.literal(''))` tries to allow empty string
- `.email()` validation runs on empty strings and fails
- **Result**: Zod throws an error when the field is empty → App crashes

### The Issue Explained:
1. User leaves email field empty → value is `""`
2. Zod tries to validate with `.email()` → validates `""`
3. Empty string is not a valid email → validation fails
4. `.optional()` only helps with `undefined`, not `""`
5. App crashes during form validation

## Solution
Use `.refine()` to conditionally validate only when email is provided:

### The Fixed Code:
```typescript
email: z
  .string()
  .trim()
  .optional()
  .refine(
    (val) => !val || val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    'Enter a valid email address'
  ),
```

**How it works:**
- `.optional()` allows field to be `undefined` (when not in form)
- `.refine()` custom validation:
  - `!val` → If undefined, passes validation ✅
  - `val === ''` → If empty string, passes validation ✅
  - `/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)` → If has value, validates email format ✅
- **Result**: Email field is truly optional and won't crash!

## Validation Logic

### Test Cases:

**Case 1: Field is undefined**
```typescript
email: undefined
→ !val is true
→ Validation passes ✅
```

**Case 2: Field is empty string**
```typescript
email: ""
→ val === '' is true
→ Validation passes ✅
```

**Case 3: Valid email**
```typescript
email: "user@example.com"
→ Regex test passes
→ Validation passes ✅
```

**Case 4: Invalid email**
```typescript
email: "notanemail"
→ Regex test fails
→ Validation fails with error: "Enter a valid email address" ❌
```

**Case 5: Email with spaces**
```typescript
email: "user @example.com"
→ Regex test fails (spaces not allowed)
→ Validation fails ❌
```

## Files Changed

### `src/validation/auth.ts`
```diff
export const baseSignupSchema = z.object({
  displayName: nameField,
  phone: phoneField,
- email: z
-   .string()
-   .email('Enter a valid email address')
-   .trim()
-   .optional()
-   .or(z.literal('')), // Allow empty string
+ email: z
+   .string()
+   .trim()
+   .optional()
+   .refine(
+     (val) => !val || val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
+     'Enter a valid email address'
+   ),
  city: cityField,
  state: stateField,
  language: z.enum(['en', 'mr', 'hi']).default('en'),
  password: passwordField,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
});
```

## Testing

### Scenario 1: Leave Email Empty ✅
```
1. Fill out signup form
2. Leave email field empty
3. Submit form
Result: Works! No crash, account created with phone-based email
```

### Scenario 2: Enter Valid Email ✅
```
1. Fill out signup form
2. Enter email: "john@example.com"
3. Submit form
Result: Works! Account created with real email
```

### Scenario 3: Enter Invalid Email ❌
```
1. Fill out signup form
2. Enter email: "notanemail"
3. Submit form
Result: Shows error: "Enter a valid email address"
```

### Scenario 4: Enter Email with Spaces ❌
```
1. Fill out signup form
2. Enter email: "user @example.com"
3. Submit form
Result: Shows error: "Enter a valid email address"
```

## Why This is Better

### Before (Broken):
- ❌ Crashes on empty email
- ❌ `.optional()` + `.or(literal)` doesn't work correctly
- ❌ `.email()` validates empty strings

### After (Fixed):
- ✅ Accepts empty email (truly optional)
- ✅ Accepts undefined (when field not in form)
- ✅ Validates only when email is provided
- ✅ Clear error message for invalid emails
- ✅ No crashes!

## Email Regex Explained

```regex
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

Breakdown:
- `^` - Start of string
- `[^\s@]+` - One or more characters that are NOT space or @
- `@` - The @ symbol (required)
- `[^\s@]+` - One or more characters that are NOT space or @
- `\.` - A literal dot (required)
- `[^\s@]+` - One or more characters that are NOT space or @
- `$` - End of string

**Matches:**
- ✅ `user@example.com`
- ✅ `john.doe@company.co.uk`
- ✅ `test123@domain.org`

**Doesn't Match:**
- ❌ `notanemail` (no @)
- ❌ `user @example.com` (space)
- ❌ `@example.com` (no local part)
- ❌ `user@` (no domain)
- ❌ `user@example` (no TLD)

## Summary

✅ **Fixed crash** - Email field validation now works correctly  
✅ **Truly optional** - Users can leave email empty without issues  
✅ **Proper validation** - Invalid emails show clear error message  
✅ **No breaking changes** - Phone-only signup still works perfectly  
✅ **App runs smoothly** - No more crashes during account creation!

The fix was a simple change to the Zod schema, using `.refine()` instead of `.optional().or(literal)` to properly handle optional email validation. 🎉
