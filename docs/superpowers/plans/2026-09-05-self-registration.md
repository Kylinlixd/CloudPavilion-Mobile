# CloudPavilion Self-Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a new mobile user to create an ordinary account, become authenticated immediately, and only then create or join a family.

**Architecture:** Django REST Framework exposes one anonymous, rate-limited registration endpoint that validates passwords with Django, creates a non-privileged user, and returns JWT tokens. The Expo app keeps authentication requests in a focused library, stores returned tokens in SecureStore, and switches from an unauthenticated Login/Register stack to the existing authenticated application stack.

**Tech Stack:** Django 5.2, Django REST Framework, SimpleJWT, drf-spectacular, React Native 0.86, Expo 57, React Navigation 7, TypeScript 6, Vitest, Xcode 26.

---

## File map

- Backend modify: `/Users/leexd/CloudPavilion/accounts/tests/test_api.py` — registration and family-auth regression coverage.
- Backend modify: `/Users/leexd/CloudPavilion/accounts/auth_serializers.py` — registration input validation and response schema.
- Backend modify: `/Users/leexd/CloudPavilion/accounts/views.py` — anonymous, throttled registration endpoint.
- Backend modify: `/Users/leexd/CloudPavilion/accounts/urls.py` — route `auth/register/`.
- Backend modify: `/Users/leexd/CloudPavilion/cloudpavilion/settings.py` — `registration` throttle rate.
- Mobile create: `/Users/leexd/CloudPavilion-Mobile/src/lib/auth.ts` — login/register API calls and session persistence.
- Mobile create: `/Users/leexd/CloudPavilion-Mobile/src/test/auth.test.ts` — request and token-persistence tests.
- Mobile modify: `/Users/leexd/CloudPavilion-Mobile/src/context/AuthContext.tsx` — expose `register` and use the auth library.
- Mobile create: `/Users/leexd/CloudPavilion-Mobile/src/screens/RegisterScreen.tsx` — account creation form.
- Mobile modify: `/Users/leexd/CloudPavilion-Mobile/src/screens/LoginScreen.tsx` — registration navigation entry.
- Mobile modify: `/Users/leexd/CloudPavilion-Mobile/src/navigation/types.ts` — `Register` route type.
- Mobile modify: `/Users/leexd/CloudPavilion-Mobile/src/navigation/RootNavigator.tsx` — unauthenticated Login/Register stack.

### Task 1: Lock the backend contract with failing tests

**Files:**
- Modify: `/Users/leexd/CloudPavilion/accounts/tests/test_api.py`

- [ ] **Step 1: Add registration and authorization tests**

Add these methods to `AccountsApiTests`:

```python
    def test_anonymous_user_can_register_and_receive_tokens(self):
        response = self.client.post(
            reverse('register'),
            {
                'username': 'new_reader',
                'password': 'Safe-cloud-2026!',
                'password_confirm': 'Safe-cloud-2026!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['username'], 'new_reader')
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        user = User.objects.get(username='new_reader')
        self.assertTrue(user.check_password('Safe-cloud-2026!'))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.family_memberships.exists())

    def test_registration_rejects_duplicate_username(self):
        response = self.client.post(
            reverse('register'),
            {
                'username': self.owner.username,
                'password': 'Safe-cloud-2026!',
                'password_confirm': 'Safe-cloud-2026!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_registration_rejects_password_mismatch(self):
        response = self.client.post(
            reverse('register'),
            {
                'username': 'mismatch_reader',
                'password': 'Safe-cloud-2026!',
                'password_confirm': 'Different-cloud-2026!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', response.data)

    def test_registration_rejects_weak_password(self):
        response = self.client.post(
            reverse('register'),
            {
                'username': 'weak_reader',
                'password': 'password',
                'password_confirm': 'password',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
        self.assertFalse(User.objects.filter(username='weak_reader').exists())

    def test_anonymous_user_cannot_create_family(self):
        response = self.client.post(reverse('family-list'), {'name': '匿名家庭'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_registered_user_can_create_family_as_owner(self):
        registration = self.client.post(
            reverse('register'),
            {
                'username': 'family_founder',
                'password': 'Safe-cloud-2026!',
                'password_confirm': 'Safe-cloud-2026!',
            },
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {registration.data['access']}")

        response = self.client.post(reverse('family-list'), {'name': '新读者家庭'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            FamilyMembership.objects.filter(
                family_id=response.data['id'],
                user__username='family_founder',
                role='owner',
                is_active=True,
            ).exists()
        )
```

- [ ] **Step 2: Run the focused tests and verify the red state**

Run:

```bash
cd /Users/leexd/CloudPavilion
/opt/anaconda3/envs/cloudp/bin/python manage.py test accounts.tests.test_api.AccountsApiTests.test_anonymous_user_can_register_and_receive_tokens accounts.tests.test_api.AccountsApiTests.test_anonymous_user_cannot_create_family
```

Expected: the registration test errors because `reverse('register')` cannot resolve; the family test passes with HTTP 401.

- [ ] **Step 3: Commit the contract tests**

```bash
cd /Users/leexd/CloudPavilion
git add accounts/tests/test_api.py
git commit -m "test: define self-registration contract"
```

### Task 2: Implement the registration endpoint

**Files:**
- Modify: `/Users/leexd/CloudPavilion/accounts/auth_serializers.py`
- Modify: `/Users/leexd/CloudPavilion/accounts/views.py`
- Modify: `/Users/leexd/CloudPavilion/accounts/urls.py`
- Modify: `/Users/leexd/CloudPavilion/cloudpavilion/settings.py`

- [ ] **Step 1: Add input validation and response schemas**

Replace `accounts/auth_serializers.py` with:

```python
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User
from .serializers import UserSerializer


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = ['username', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': ['两次输入的密码不一致']})
        candidate = User(username=attrs['username'])
        try:
            validate_password(attrs['password'], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        return User.objects.create_user(password=password, **validated_data)


class RegistrationResponseSerializer(serializers.Serializer):
    user = UserSerializer()
    access = serializers.CharField()
    refresh = serializers.CharField()
```

- [ ] **Step 2: Add the anonymous throttled view**

In `accounts/views.py`, import `AllowAny`, `ScopedRateThrottle`, `APIView`, `RegistrationSerializer`, `RegistrationResponseSerializer`, and `UserSerializer`, then add:

```python
class RegistrationView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'registration'

    @extend_schema(
        request=RegistrationSerializer,
        responses={201: RegistrationResponseSerializer},
    )
    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )
```

- [ ] **Step 3: Route the endpoint and set its rate**

In `accounts/urls.py`, import `RegistrationView` and add this path before the logout path:

```python
    path('auth/register/', RegistrationView.as_view(), name='register'),
```

Add this entry to `REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']` in `cloudpavilion/settings.py`:

```python
        'registration': '5/minute',
```

- [ ] **Step 4: Run backend tests and project checks**

Run:

```bash
cd /Users/leexd/CloudPavilion
/opt/anaconda3/envs/cloudp/bin/python manage.py test accounts.tests.test_api -v 2
/opt/anaconda3/envs/cloudp/bin/python manage.py test
/opt/anaconda3/envs/cloudp/bin/python manage.py check
/opt/anaconda3/envs/cloudp/bin/python manage.py makemigrations --check --dry-run
/opt/anaconda3/envs/cloudp/bin/python manage.py spectacular --file /tmp/cloudpavilion-schema.yml --validate
```

Expected: all tests pass, Django reports no issues, no model changes are detected, and schema validation exits successfully.

- [ ] **Step 5: Commit the backend feature**

```bash
cd /Users/leexd/CloudPavilion
git add accounts/auth_serializers.py accounts/views.py accounts/urls.py cloudpavilion/settings.py
git commit -m "feat: add rate-limited account registration"
```

### Task 3: Add a tested mobile authentication service

**Files:**
- Create: `/Users/leexd/CloudPavilion-Mobile/src/test/auth.test.ts`
- Create: `/Users/leexd/CloudPavilion-Mobile/src/lib/auth.ts`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/context/AuthContext.tsx`

- [ ] **Step 1: Write the failing service test**

Create `src/test/auth.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '../lib/api'
import { registerAccount } from '../lib/auth'
import { setSession } from '../lib/storage'

vi.mock('../lib/api', () => ({ apiClient: { post: vi.fn() } }))
vi.mock('../lib/storage', () => ({ setSession: vi.fn() }))

describe('registration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('posts the account fields and persists returned tokens', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      user: { id: 9, username: 'new_reader' },
      access: 'access-token',
      refresh: 'refresh-token',
    })

    await expect(registerAccount('new_reader', 'Safe-cloud-2026!', 'Safe-cloud-2026!')).resolves.toBe('access-token')
    expect(apiClient.post).toHaveBeenCalledWith('/auth/register/', {
      username: 'new_reader',
      password: 'Safe-cloud-2026!',
      password_confirm: 'Safe-cloud-2026!',
    })
    expect(setSession).toHaveBeenCalledWith('access-token', 'refresh-token')
  })
})
```

- [ ] **Step 2: Run the focused test and verify the red state**

```bash
cd /Users/leexd/CloudPavilion-Mobile
npx vitest run src/test/auth.test.ts
```

Expected: FAIL because `src/lib/auth.ts` does not exist.

- [ ] **Step 3: Implement the authentication service**

Create `src/lib/auth.ts`:

```typescript
import { apiClient } from './api'
import { setSession } from './storage'

type AuthResponse = {
  user?: { id: number; username: string }
  access: string
  refresh: string
}

async function persist(result: AuthResponse) {
  await setSession(result.access, result.refresh)
  return result.access
}

export async function loginAccount(username: string, password: string) {
  return persist(await apiClient.post<AuthResponse>('/auth/token/', { username, password }))
}

export async function registerAccount(username: string, password: string, passwordConfirm: string) {
  return persist(await apiClient.post<AuthResponse>('/auth/register/', {
    username,
    password,
    password_confirm: passwordConfirm,
  }))
}
```

- [ ] **Step 4: Expose registration from AuthContext**

Change `AuthValue` in `src/context/AuthContext.tsx` to include:

```typescript
register: (username: string, password: string, passwordConfirm: string) => Promise<void>
```

Import `loginAccount` and `registerAccount`, replace the direct login request with `loginAccount`, and add:

```typescript
  const register = useCallback(async (username: string, password: string, passwordConfirm: string) => {
    setAccess(await registerAccount(username, password, passwordConfirm))
  }, [])
```

Include `register` in the memoized context value and dependency list.

- [ ] **Step 5: Run the focused and existing mobile tests**

```bash
cd /Users/leexd/CloudPavilion-Mobile
npx vitest run src/test/auth.test.ts
npm test -- --run
```

Expected: the registration test and all pre-existing tests pass.

- [ ] **Step 6: Commit the mobile service layer**

```bash
cd /Users/leexd/CloudPavilion-Mobile
git add src/lib/auth.ts src/context/AuthContext.tsx src/test/auth.test.ts
git commit -m "feat: add mobile registration session service"
```

### Task 4: Add the registration screen and navigation

**Files:**
- Create: `/Users/leexd/CloudPavilion-Mobile/src/screens/RegisterScreen.tsx`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/screens/LoginScreen.tsx`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/navigation/types.ts`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Extend the unauthenticated route type**

Add `Register: undefined` to `RootStackParamList`:

```typescript
export type RootStackParamList = { Login: undefined; Register: undefined; Main: undefined; BookDetail: { bookId: number }; Reservations: undefined; Reports: undefined; Settings: undefined }
```

- [ ] **Step 2: Create the registration form**

Create `src/screens/RegisterScreen.tsx` with a scrollable keyboard-safe form that:

```typescript
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { ActionButton } from '../components/ActionButton'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

function firstValidationMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
    if (typeof value === 'string') return value
  }
  return null
}

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Register'>>()
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit() {
    if (!username.trim() || !password || !passwordConfirm) {
      setError('请填写用户名、密码和确认密码')
      return
    }
    if (password !== passwordConfirm) {
      setError('两次输入的密码不一致')
      return
    }
    setError('')
    setPending(true)
    try {
      await register(username.trim(), password, passwordConfirm)
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(firstValidationMessage(caught.payload) || caught.message)
      } else {
        setError('注册失败，请稍后再试')
      }
    } finally {
      setPending(false)
    }
  }

  const inputStyle = { backgroundColor: colors.paperBright, borderColor: colors.line, borderRadius: 8, borderWidth: 1, color: colors.ink, minHeight: 52, paddingHorizontal: 15 }
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ backgroundColor: colors.paper, flex: 1 }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl }} keyboardShouldPersistTaps="handled">
      <View style={{ backgroundColor: colors.ink, borderRadius: 22, padding: spacing.xl }}>
        <Text style={{ color: colors.terracottaLight, fontFamily: typography.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' }}>CloudPavilion · New Reader</Text>
        <Text style={{ color: colors.white, fontFamily: typography.display, fontSize: 39, letterSpacing: -1.5, lineHeight: 43, marginTop: 50 }}>先拥有一把钥匙，再建立你的家庭书房。</Text>
        <Text style={{ color: 'rgba(255,255,255,.62)', fontFamily: typography.body, fontSize: 14, lineHeight: 21, marginTop: 20 }}>账号只用于登录；家庭可以在进入云阁后创建或加入。</Text>
      </View>
      <View style={{ paddingTop: spacing.xxl }}>
        <Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 30, letterSpacing: -1 }}>创建账号</Text>
        <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
          <TextInput autoCapitalize="none" autoComplete="username-new" onChangeText={setUsername} placeholder="用户名" placeholderTextColor={colors.muted} style={inputStyle} value={username} />
          <TextInput autoCapitalize="none" autoComplete="password-new" onChangeText={setPassword} placeholder="密码（至少 8 位，避免常见密码）" placeholderTextColor={colors.muted} secureTextEntry style={inputStyle} value={password} />
          <TextInput autoCapitalize="none" autoComplete="password-new" onChangeText={setPasswordConfirm} placeholder="再次输入密码" placeholderTextColor={colors.muted} secureTextEntry style={inputStyle} value={passwordConfirm} />
          {error ? <Text accessibilityRole="alert" style={{ color: colors.danger, fontFamily: typography.body, fontSize: 13 }}>{error}</Text> : null}
          <ActionButton disabled={pending} onPress={() => void submit()}>{pending ? '正在创建…' : '创建账号  →'}</ActionButton>
        </View>
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }}>
          <Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 12 }}>已经有账号？返回登录</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>
}
```

- [ ] **Step 3: Connect Login to Register**

In `LoginScreen.tsx`, type `useNavigation` with `RootStackParamList`, then change the current inert footer to:

```typescript
<TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Register')} style={{ marginTop: spacing.lg }}>
  <Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 12 }}>还没有账号？先创建账号</Text>
</TouchableOpacity>
```

- [ ] **Step 4: Mount Register in the unauthenticated navigator**

Import `RegisterScreen` in `RootNavigator.tsx` and render the unauthenticated branch as:

```typescript
<>
  <Root.Screen name="Login" component={LoginScreen} />
  <Root.Screen name="Register" component={RegisterScreen} />
</>
```

- [ ] **Step 5: Run static checks and tests**

```bash
cd /Users/leexd/CloudPavilion-Mobile
npm run typecheck
npm run lint
npm test -- --run
npx expo-doctor
```

Expected: TypeScript and ESLint exit with no errors, all Vitest tests pass, and Expo Doctor reports every check passed.

- [ ] **Step 6: Commit the registration UI**

```bash
cd /Users/leexd/CloudPavilion-Mobile
git add src/screens/RegisterScreen.tsx src/screens/LoginScreen.tsx src/navigation/types.ts src/navigation/RootNavigator.tsx
git commit -m "feat: add self-registration screen"
```

### Task 5: Verify production, deploy, and reinstall on iPhone

**Files:**
- Deploy from: `/Users/leexd/CloudPavilion`
- Build from: `/Users/leexd/CloudPavilion-Mobile/ios/CloudPavilion.xcworkspace`
- Output: `/Users/leexd/CloudPavilion-Mobile/.build/ios-signed/Build/Products/Release-iphoneos/CloudPavilion.app`

- [ ] **Step 1: Re-run full local verification**

```bash
cd /Users/leexd/CloudPavilion
/opt/anaconda3/envs/cloudp/bin/python manage.py test
/opt/anaconda3/envs/cloudp/bin/python manage.py check --deploy --settings=cloudpavilion.settings_prod
git diff --check

cd /Users/leexd/CloudPavilion-Mobile
npm run typecheck
npm run lint
npm test -- --run
npx expo-doctor
git diff --check
```

Expected: every command exits zero. `check --deploy` may only use the already reviewed production environment values.

- [ ] **Step 2: Sync changed backend source without overwriting production secrets**

From the local backend, transfer only these reviewed paths to `/opt/cloudpavilion`:

```text
accounts/auth_serializers.py
accounts/tests/test_api.py
accounts/urls.py
accounts/views.py
cloudpavilion/settings.py
```

Use the existing interactive SSH connection to `root@192.3.221.53`; do not transfer or replace `/opt/cloudpavilion/.env.production`.

- [ ] **Step 3: Test and restart the production web image**

Run on the server:

```bash
cd /opt/cloudpavilion
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml run --rm web python manage.py test accounts.tests.test_api
docker compose -f docker-compose.prod.yml up -d web worker beat
docker compose -f docker-compose.prod.yml ps
```

Expected: the production-container account tests pass and the web, worker, beat, database, and Redis services are running/healthy.

- [ ] **Step 4: Exercise the public registration-to-family flow**

Create a disposable unique username, then call:

```text
POST https://leexd.top/cloudpavilion/api/v1/auth/register/
POST https://leexd.top/cloudpavilion/api/v1/families/ with Authorization: Bearer <access>
GET  https://leexd.top/cloudpavilion/health/ready/
```

Expected: registration returns HTTP 201 and JWTs, anonymous family creation returns HTTP 401, authenticated family creation returns HTTP 201 with an owner membership, and readiness returns HTTP 200. Delete the disposable user and its family in the production Django shell after validation.

- [ ] **Step 5: Produce a signed Release build**

```bash
cd /Users/leexd/CloudPavilion-Mobile
xcodebuild -workspace ios/CloudPavilion.xcworkspace -scheme CloudPavilion -configuration Release -sdk iphoneos -destination 'id=00008130-0002345A02E2001C' -derivedDataPath .build/ios-signed -allowProvisioningUpdates DEVELOPMENT_TEAM=M7U9C9L2DF CODE_SIGN_STYLE=Automatic build
codesign --verify --deep --strict .build/ios-signed/Build/Products/Release-iphoneos/CloudPavilion.app
```

Expected: Xcode reports `BUILD SUCCEEDED` and `codesign` exits zero.

- [ ] **Step 6: Install and launch on the connected iPhone 15 Pro Max**

```bash
xcrun devicectl device install app --device 00008130-0002345A02E2001C .build/ios-signed/Build/Products/Release-iphoneos/CloudPavilion.app
xcrun devicectl device process launch --device 00008130-0002345A02E2001C com.kylinlixd.cloudpavilion
```

Expected: installation and launch succeed. On-device acceptance is: tap “先创建账号”, register, arrive authenticated, open Settings, create a family, and see the new family become current.

