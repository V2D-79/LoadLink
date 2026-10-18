# Email Field Addition & Debug Logging

## Changes Made

### 1. Added Optional Email Field to Signup

Users can now **optionally** provide an email address during account creation. This email can be used for login instead of phone number.

#### Files Modified:

**`src/validation/auth.ts`**
- Added `email` field to `baseSignupSchema` (optional)
- Accepts valid email format or empty string
- Validation: Must be valid email if provided

**`app/(auth)/signup.tsx`**
- Added email input field in PersonalStep (after phone number)
- Placeholder: "e.g., user@example.com"
- Label: "Email (Optional)"
- Added to form validation trigger
- Added to default values for both factory and driver forms

### 2. Updated Authentication Logic

**`src/services/authService.ts`**

#### signUpFactory & signUpDriver Functions:
- Now check if email is provided during signup
- **If email provided**: Use email for Firebase Auth
- **If email NOT provided**: Use phone-based internal email (existing behavior)
- Store both `internalEmail` (for auth) and `realEmail` (user's actual email) in private profile

```typescript
// Logic:
let authEmail: string;
if (data.email && data.email.trim().length > 0) {
  authEmail = data.email.trim(); // Use real email
} else {
  authEmail = await phoneToInternalEmail(data.phone, INTERNAL_EMAIL_DOMAIN); // Use phone-based email
}
```

#### Login Flow:
- **User enters email**: Uses email directly for login
- **User enters phone**: Converts phone to internal email
- Works with both real emails and phone numbers!

### 3. Added Comprehensive Debug Logging

Added `console.log` statements at **every critical step** to help debug login issues:

#### resolveToEmail Function:
```typescript
console.log('[resolveToEmail] Input:', emailOrPhone);
console.log('[resolveToEmail] Cleaned:', cleaned);
console.log('[resolveToEmail] Detected as email' OR 'Normalized phone');
console.log('[resolveToEmail] Generated internal email:', internalEmail);
```

#### signUpFactory Function:
```typescript
console.log('[signUpFactory] Starting signup with data:', { phone, email, displayName });
console.log('[signUpFactory] Checking if phone is registered...');
console.log('[signUpFactory] Phone is available');
console.log('[signUpFactory] Using provided email' OR 'Generated internal email');
console.log('[signUpFactory] Creating Firebase user...');
console.log('[signUpFactory] Firebase user created with UID:', user.uid);
console.log('[signUpFactory] Writing base profile to RTDB...');
console.log('[signUpFactory] Signup completed successfully');
```

#### signUpDriver Function:
```typescript
console.log('[signUpDriver] Starting signup with data:', { phone, email, displayName });
console.log('[signUpDriver] Checking if phone is registered...');
console.log('[signUpDriver] Phone is available');
console.log('[signUpDriver] Using provided email' OR 'Generated internal email');
console.log('[signUpDriver] Creating Firebase user...');
console.log('[signUpDriver] Firebase user created with UID:', user.uid);
console.log('[signUpDriver] Creating truck record...');
console.log('[signUpDriver] Signup completed successfully');
```

#### loginUser Function:
```typescript
console.log('[loginUser] Starting login with:', emailOrPhone);
console.log('[loginUser] Resolved to email:', email);
console.log('[loginUser] Attempting signInWithEmailAndPassword...');
console.log('[loginUser] Login successful! User UID:', cred.user.uid);
console.error('[loginUser] Login failed with error:', err.code, err.message);
```

#### Login Screen:
```typescript
console.log('[LoginScreen] Submit with data:', data.emailOrPhone);
console.log('[LoginScreen] Calling loginUser...');
console.log('[LoginScreen] Login successful! AuthContext will handle navigation.');
console.error('[LoginScreen] Login error:', err);
```

### 4. How to Debug Login Issues

With the new logging, you can now trace the exact flow:

1. **Open Browser Dev Tools** or **React Native Debugger**
2. **Open Console** tab
3. **Create an account** and watch the logs:
   ```
   [signUpFactory] Starting signup with data: { phone: "9876543210", email: "", displayName: "John" }
   [signUpFactory] Checking if phone is registered...
   [signUpFactory] Phone is available
   [signUpFactory] Generated internal email from phone: abc123...@users.loadlink.app
   [signUpFactory] Creating Firebase user...
   [signUpFactory] Firebase user created with UID: xyz789
   [signUpFactory] Signup completed successfully
   ```

4. **Try to login** and watch the logs:
   ```
   [LoginScreen] Submit with data: 9876543210
   [LoginScreen] Calling loginUser...
   [loginUser] Starting login with: 9876543210
   [resolveToEmail] Input: 9876543210
   [resolveToEmail] Cleaned: 9876543210
   [resolveToEmail] Normalized phone: 9876543210
   [resolveToEmail] Generated internal email: abc123...@users.loadlink.app
   [loginUser] Resolved to email: abc123...@users.loadlink.app
   [loginUser] Attempting signInWithEmailAndPassword...
   [loginUser] Login successful! User UID: xyz789
   ```

5. **If login fails**, you'll see:
   ```
   [loginUser] Login failed with error: auth/invalid-credential Invalid credentials
   ```

This tells you **exactly** where the issue is!

## User Experience

### Signup Flow:

**Step 1: Personal Details**
- Full Name: Required
- Mobile Number: Required
- **Email: Optional** ← NEW!
- City: Required
- State: Required
- Language: Required
- Password: Required
- Confirm Password: Required

**Benefits:**
- Users can provide email if they want to login with email
- Email is completely optional (phone-only signup still works)
- Backward compatible with existing users

### Login Flow:

**Users can now login with:**
1. **Phone number**: "9876543210" (existing behavior)
2. **Email address**: "user@example.com" (new feature)

**How it works:**
- Input contains `@` → Treated as email
- Input doesn't contain `@` → Treated as phone number

## Database Changes

### userPrivate/{uid}:
```typescript
{
  uid: string,
  internalEmail: string,  // Email used for Firebase Auth (real email OR phone-based)
  realEmail: string | null,  // User's actual email if provided (NEW)
  emailVerified: boolean,
  // ... other fields
}
```

- `internalEmail`: The email used to create Firebase Auth account
- `realEmail`: The user's actual email address (if they provided one)

## Testing Scenarios

### Scenario 1: Signup WITHOUT Email (Phone Only)
```
Signup:
  Phone: 9876543210
  Email: [left empty]
  Password: test1234

Result:
  internalEmail: "abc123...@users.loadlink.app" (phone-based)
  realEmail: null

Login Options:
  ✅ Phone: 9876543210
  ❌ Email: (no email to use)
```

### Scenario 2: Signup WITH Email
```
Signup:
  Phone: 9876543210
  Email: john@example.com
  Password: test1234

Result:
  internalEmail: "john@example.com" (real email)
  realEmail: "john@example.com"

Login Options:
  ✅ Email: john@example.com
  ❌ Phone: 9876543210 (won't work - different email was used)
```

### Scenario 3: Debug Login Issue
```
1. User creates account with phone: 9876543210
2. Check console logs during signup:
   [signUpFactory] Generated internal email: abc123...@users.loadlink.app

3. User tries to login with phone: 9876543210
4. Check console logs during login:
   [loginUser] Resolved to email: xyz789...@users.loadlink.app

5. Compare the emails:
   - Signup email: abc123...
   - Login email: xyz789...
   - They don't match! This is the problem!

6. Debug further:
   [resolveToEmail] Normalized phone: 9876543210
   - Is the normalization correct?
   - Are there extra characters?
   - Is the SHA-256 hash consistent?
```

## Important Notes

### Phone vs Email Login:

**Current Behavior:**
- If user signs up with **phone only** → Can login with **phone**
- If user signs up with **email** → Can login with **email only**
- Phone and email logins are **separate** (you can't mix them)

**Reason:**
- Firebase Auth uses ONE email per account
- If email provided during signup → That's the auth email
- If no email provided → Phone-based internal email is used
- You can't have two different emails for the same account

### Recommendations:

For best user experience:
1. **Encourage users to provide email** during signup
2. **Show clear guidance** about what they can login with
3. **Consider adding email to existing phone-only accounts** later

## Summary

✅ **Added optional email field** to signup form  
✅ **Users can login with email** if they provided one  
✅ **Phone-only signup still works** (backward compatible)  
✅ **Comprehensive logging** added to debug login issues  
✅ **No other features affected** - only added new functionality  
✅ **Console logs show exact flow** - easy to debug problems  

Now you can:
1. See exactly what email is being used for auth
2. Debug login issues by checking console logs
3. Give users the option to use email or phone for login! 🎉
