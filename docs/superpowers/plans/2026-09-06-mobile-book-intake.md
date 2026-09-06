# Mobile Book Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authenticated iPhone user scan an ISBN or enter book details manually and atomically add a physical copy to the selected family.

**Architecture:** Django owns third-party metadata lookup, caching, validation, permissions, and the atomic `Book` plus `BookCopy` write. The Expo app owns camera permission, EAN-13 scanning, an editable intake form, and navigation back to the catalog/detail view. Existing uploaded covers remain in `cover`; external cover links use a new `cover_url` field.

**Tech Stack:** Django 5.2, Django REST Framework, Requests, Redis/Django cache, Expo 57, React Native 0.86, Expo Camera, TypeScript, Vitest, Xcode/CoreDevice.

---

## File map

Backend repository `/Users/leexd/CloudPavilion`:

- Create `catalog/metadata.py`: provider adapters, normalized metadata shape, cache, fallback policy.
- Create `catalog/migrations/0002_book_cover_url.py`: additive URL field migration.
- Modify `catalog/models.py`: persist external cover URLs without changing uploaded covers.
- Modify `catalog/serializers.py`: lookup, intake request, and intake response contracts.
- Modify `catalog/services.py`: transactional book-and-copy creation with ISBN reuse.
- Modify `catalog/views.py`: ISBN lookup and atomic add actions.
- Modify `catalog/tests/test_api.py`: API, permissions, duplicate ISBN, and transaction regression tests.
- Create `catalog/tests/test_metadata.py`: provider mapping, fallback, cache, and failure tests.
- Modify `.env.example`, `README.md`: optional Google API key and endpoint documentation.

Mobile repository `/Users/leexd/CloudPavilion-Mobile`:

- Modify `package.json`, `package-lock.json`: add the Expo-compatible camera package.
- Modify `app.json`, `ios/CloudPavilion/Info.plist`, `ios/Podfile.lock`: camera plugin, iOS permission string, native pod resolution.
- Create `src/lib/books.ts`: scan validation, intake types, lookup and save calls.
- Create `src/test/books.test.ts`: scan and request contract tests.
- Create `src/screens/AddBookScreen.tsx`: camera/manual modes and editable form.
- Modify `src/navigation/types.ts`, `src/navigation/RootNavigator.tsx`: add the intake route.
- Modify `src/screens/CatalogScreen.tsx`: mobile add entry point and focus refresh.
- Modify `src/components/BookCover.tsx`, `src/screens/BookDetailScreen.tsx`, `src/lib/types.ts`: render external cover URLs.

### Task 1: Add external cover URL storage

**Files:**
- Modify: `/Users/leexd/CloudPavilion/catalog/models.py`
- Modify: `/Users/leexd/CloudPavilion/catalog/serializers.py`
- Create: `/Users/leexd/CloudPavilion/catalog/migrations/0002_book_cover_url.py`
- Test: `/Users/leexd/CloudPavilion/catalog/tests/test_api.py`

- [ ] **Step 1: Write the failing serializer test**

Add a test that creates a family-owned book with `cover_url='https://covers.example/book.jpg'`, fetches `/api/v1/books/`, and asserts that exact URL is returned while the existing `cover` field remains present.

```python
def test_book_response_exposes_external_cover_url(self):
    book = Book.objects.create(
        title='有真实封面的书',
        cover_url='https://covers.example/book.jpg',
    )
    BookCopy.objects.create(book=book, family=self.family, created_by=self.owner)
    self.authenticate(self.owner, self.family)

    response = self.client.get(reverse('book-list'))

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(response.data['results'][0]['cover_url'], 'https://covers.example/book.jpg')
    self.assertIn('cover', response.data['results'][0])
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
/opt/anaconda3/envs/cloudp/bin/python manage.py test catalog.tests.test_api.CatalogApiTests.test_book_response_exposes_external_cover_url
```

Expected: error because `Book` has no `cover_url` field.

- [ ] **Step 3: Add the model field, migration, and serializer field**

Add to `Book`:

```python
cover_url = models.URLField(max_length=1000, blank=True)
```

Add `cover_url` immediately after `cover` in `BookSerializer.Meta.fields`. Generate the migration:

```bash
/opt/anaconda3/envs/cloudp/bin/python manage.py makemigrations catalog --name book_cover_url
```

- [ ] **Step 4: Run the focused test and migration check**

```bash
/opt/anaconda3/envs/cloudp/bin/python manage.py test catalog.tests.test_api.CatalogApiTests.test_book_response_exposes_external_cover_url
/opt/anaconda3/envs/cloudp/bin/python manage.py makemigrations --check --dry-run --settings=cloudpavilion.settings_dev
```

Expected: PASS and `No changes detected`.

- [ ] **Step 5: Commit**

```bash
git add catalog/models.py catalog/serializers.py catalog/migrations/0002_book_cover_url.py catalog/tests/test_api.py
git commit -m "feat: store external book covers"
```

### Task 2: Implement cached ISBN metadata lookup

**Files:**
- Create: `/Users/leexd/CloudPavilion/catalog/metadata.py`
- Create: `/Users/leexd/CloudPavilion/catalog/tests/test_metadata.py`
- Modify: `/Users/leexd/CloudPavilion/cloudpavilion/settings.py`

- [ ] **Step 1: Write failing tests for local hit, provider mapping, fallback, cache, and outage**

Use `unittest.mock.Mock` and `patch('catalog.metadata.requests.get')`. Start with this complete test class and keep its fixture builders inside the test module:

```python
from unittest.mock import Mock, patch

import requests
from django.core.cache import cache
from django.test import TestCase

from catalog.metadata import BookLookupUnavailable, lookup_book_metadata
from catalog.models import Book


def response_with(payload):
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = payload
    return response


class BookMetadataLookupTests(TestCase):
    def setUp(self):
        cache.clear()

    @patch('catalog.metadata.requests.get')
    def test_local_isbn_hit_skips_external_requests(self, get):
        Book.objects.create(title='本地书', isbn='9787506365437', isbn_normalized='9787506365437')
        result = lookup_book_metadata('978-7-5063-6543-7')
        self.assertEqual(result.title, '本地书')
        self.assertEqual(result.source, 'local')
        get.assert_not_called()

    @patch('catalog.metadata.requests.get')
    def test_google_result_maps_to_normalized_fields(self, get):
        get.return_value = response_with(GOOGLE_PAYLOAD)
        result = lookup_book_metadata('9787506365437')
        self.assertEqual(result.title, '活着')
        self.assertEqual(result.author, '余华')
        self.assertEqual(result.publish_date, '2012-08-01')
        self.assertEqual(result.cover_url, 'https://covers.example/alive.jpg')
        self.assertEqual(result.source, 'google')

    @patch('catalog.metadata.requests.get')
    def test_open_library_is_used_after_google_miss(self, get):
        get.side_effect = [response_with({'totalItems': 0}), response_with(OPEN_LIBRARY_PAYLOAD)]
        result = lookup_book_metadata('9787506365437')
        self.assertEqual(result.title, '围城')
        self.assertEqual(result.author, '钱钟书')
        self.assertEqual(result.source, 'openlibrary')
        self.assertEqual(get.call_count, 2)

    @patch('catalog.metadata.cache.set', wraps=cache.set)
    @patch('catalog.metadata.requests.get')
    def test_success_is_cached_for_24_hours(self, get, cache_set):
        get.return_value = response_with(GOOGLE_PAYLOAD)
        lookup_book_metadata('9787506365437')
        lookup_book_metadata('9787506365437')
        self.assertEqual(get.call_count, 1)
        self.assertEqual(cache_set.call_args.args[2], 86400)

    @patch('catalog.metadata.cache.set', wraps=cache.set)
    @patch('catalog.metadata.requests.get')
    def test_two_clean_misses_return_none_and_cache_for_10_minutes(self, get, cache_set):
        get.side_effect = [response_with({'totalItems': 0}), response_with({'numFound': 0, 'docs': []})]
        self.assertIsNone(lookup_book_metadata('9787506365437'))
        self.assertEqual(cache_set.call_args.args[2], 600)

    @patch('catalog.metadata.requests.get', side_effect=requests.RequestException('offline'))
    def test_provider_failures_raise_lookup_unavailable(self, get):
        with self.assertRaises(BookLookupUnavailable):
            lookup_book_metadata('9787506365437')
        self.assertEqual(get.call_count, 2)
```

Google fixture:

```python
{
    'items': [{'volumeInfo': {
        'title': '活着',
        'authors': ['余华'],
        'publisher': '作家出版社',
        'publishedDate': '2012-08-01',
        'categories': ['小说'],
        'description': '一本小说',
        'imageLinks': {'thumbnail': 'http://covers.example/alive.jpg'},
    }}]
}
```

Open Library fixture:

```python
{'docs': [{'title': '围城', 'author_name': ['钱钟书'], 'publisher': ['人民文学出版社'], 'cover_i': 12345}]}
```

- [ ] **Step 2: Run the metadata tests and verify RED**

```bash
/opt/anaconda3/envs/cloudp/bin/python manage.py test catalog.tests.test_metadata
```

Expected: import failure for the missing `catalog.metadata` module.

- [ ] **Step 3: Implement the metadata service**

Create an immutable normalized shape and public lookup function:

```python
@dataclass(frozen=True)
class BookMetadata:
    title: str
    author: str = ''
    isbn: str = ''
    publisher: str = ''
    publish_date: str | None = None
    category: str = ''
    description: str = ''
    cover_url: str = ''
    source: str = ''


class BookLookupUnavailable(Exception):
    pass


def lookup_book_metadata(raw_isbn: str) -> BookMetadata | None:
    isbn = normalize_isbn(raw_isbn)
    local = Book.objects.filter(isbn_normalized=isbn).first()
    if local:
        return BookMetadata(
            title=local.title,
            author=local.author,
            isbn=local.isbn or isbn,
            publisher=local.publisher,
            publish_date=local.publish_date.isoformat() if local.publish_date else None,
            category=local.category,
            description=local.description,
            cover_url=local.cover_url,
            source='local',
        )
```

Use cache key `catalog:isbn:<normalized>`. Store `{'state': 'found', 'data': asdict(metadata)}` for 86400 seconds and `{'state': 'missing'}` for 600 seconds. Query Google with `q=isbn:<isbn>`, optional `key=settings.GOOGLE_BOOKS_API_KEY`, `maxResults=1`, and `timeout=3`. Query Open Library Search with `isbn=<isbn>`, `limit=1`, and `fields=title,author_name,publisher,cover_i`. Convert `http://` covers to HTTPS and only retain published dates matching `YYYY-MM-DD`. If either provider raises `requests.RequestException` and no provider returns metadata, raise `BookLookupUnavailable`; only return `None` when both providers cleanly return no match.

Add to settings:

```python
GOOGLE_BOOKS_API_KEY = os.environ.get('GOOGLE_BOOKS_API_KEY', '')
BOOK_METADATA_TIMEOUT_SECONDS = 3
BOOK_METADATA_SUCCESS_CACHE_SECONDS = 86400
BOOK_METADATA_MISS_CACHE_SECONDS = 600
```

- [ ] **Step 4: Run metadata tests and verify GREEN**

```bash
/opt/anaconda3/envs/cloudp/bin/python manage.py test catalog.tests.test_metadata
```

Expected: all metadata tests PASS without real network calls.

- [ ] **Step 5: Commit**

```bash
git add catalog/metadata.py catalog/tests/test_metadata.py cloudpavilion/settings.py
git commit -m "feat: look up ISBN book metadata"
```

### Task 3: Expose the family-scoped ISBN lookup API

**Files:**
- Modify: `/Users/leexd/CloudPavilion/catalog/serializers.py`
- Modify: `/Users/leexd/CloudPavilion/catalog/views.py`
- Test: `/Users/leexd/CloudPavilion/catalog/tests/test_api.py`

- [ ] **Step 1: Write failing API tests**

Add tests for a successful normalized response, invalid ISBN `400`, no result `404`, provider outage `503`, missing family `400`, and non-member `403`. Mock `catalog.views.lookup_book_metadata`; do not call public services.

```python
@patch('catalog.views.lookup_book_metadata')
def test_member_can_lookup_isbn(self, lookup):
    lookup.return_value = BookMetadata(title='活着', author='余华', isbn='9787506365437', source='google')
    self.authenticate(self.member, self.family)

    response = self.client.get(reverse('book-lookup'), {'isbn': '978-7-5063-6543-7'})

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(response.data['title'], '活着')
    self.assertEqual(response.data['source'], 'google')
```

- [ ] **Step 2: Run the focused tests and verify RED**

```bash
/opt/anaconda3/envs/cloudp/bin/python manage.py test catalog.tests.test_api.CatalogApiTests.test_member_can_lookup_isbn
```

Expected: `NoReverseMatch` for `book-lookup`.

- [ ] **Step 3: Add serializer and view action**

Add a response serializer with the nine normalized fields. Add to `BookViewSet`:

```python
@action(detail=False, methods=['get'], url_path='lookup')
def lookup(self, request):
    if get_current_family(request) is None:
        return Response({'detail': '请选择有效的家庭'}, status=status.HTTP_400_BAD_REQUEST)
    raw_isbn = request.query_params.get('isbn', '')
    try:
        metadata = lookup_book_metadata(raw_isbn)
    except DjangoValidationError as exc:
        return Response({'isbn': list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
    except BookLookupUnavailable:
        return Response({'detail': '书目信息服务暂时不可用'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    if metadata is None:
        return Response({'detail': '没有找到这本书'}, status=status.HTTP_404_NOT_FOUND)
    return Response(BookLookupSerializer(asdict(metadata)).data)
```

Import `action`, `asdict`, `DjangoValidationError`, and the metadata service. Because lookup is a read action, the existing family member permission path applies.

- [ ] **Step 4: Run all lookup API tests**

```bash
/opt/anaconda3/envs/cloudp/bin/python manage.py test catalog.tests.test_api
```

Expected: catalog API tests PASS.

- [ ] **Step 5: Commit**

```bash
git add catalog/serializers.py catalog/views.py catalog/tests/test_api.py
git commit -m "feat: expose ISBN lookup API"
```

### Task 4: Add atomic book-and-copy intake API

**Files:**
- Modify: `/Users/leexd/CloudPavilion/catalog/serializers.py`
- Modify: `/Users/leexd/CloudPavilion/catalog/services.py`
- Modify: `/Users/leexd/CloudPavilion/catalog/views.py`
- Test: `/Users/leexd/CloudPavilion/catalog/tests/test_api.py`

- [ ] **Step 1: Write failing intake tests**

Add tests for manual no-ISBN creation, ISBN creation, repeated ISBN adding a second copy without adding a second book, simulated concurrent ISBN insertion, `viewer` rejection, server-bound family/creator/status, duplicate family barcode validation, and rollback when copy creation fails. Simulate the race by creating the winning `Book`, patching `Book.objects.get_or_create` to raise `IntegrityError`, and asserting the endpoint re-fetches that book and returns `201` with a new copy.

```python
def test_repeated_isbn_reuses_book_and_adds_another_copy(self):
    self.authenticate(self.member, self.family)
    payload = {'title': '活着', 'author': '余华', 'isbn': '9787506365437'}

    first = self.client.post(reverse('book-copy-add-book'), payload, format='json')
    second = self.client.post(reverse('book-copy-add-book'), payload, format='json')

    self.assertEqual(first.status_code, status.HTTP_201_CREATED)
    self.assertEqual(second.status_code, status.HTTP_201_CREATED)
    self.assertEqual(Book.objects.filter(isbn_normalized='9787506365437').count(), 1)
    self.assertEqual(BookCopy.objects.filter(family=self.family, book_id=first.data['book']['id']).count(), 2)
```

- [ ] **Step 2: Run the repeated ISBN test and verify RED**

```bash
/opt/anaconda3/envs/cloudp/bin/python manage.py test catalog.tests.test_api.CatalogApiTests.test_repeated_isbn_reuses_book_and_adds_another_copy
```

Expected: `NoReverseMatch` for `book-copy-add-book`.

- [ ] **Step 3: Define intake request and response serializers**

Create `BookIntakeSerializer` with `title` required; optional `author`, `isbn`, `publisher`, `publish_date`, `category`, `description`, `cover_url`, `barcode`, and `notes`. Reuse `normalize_isbn` in `validate_isbn`. Create `BookIntakeResponseSerializer` with nested `book = BookSerializer()` and `copy = BookCopySerializer()`.

- [ ] **Step 4: Implement the transactional service**

Add this public boundary to `CatalogService`:

```python
@staticmethod
@transaction.atomic
def add_book_copy(family, user, validated_data):
    data = dict(validated_data)
    copy_data = {name: data.pop(name, None) for name in ('barcode', 'notes')}
    isbn_normalized = normalize_isbn(data.get('isbn'))
    if isbn_normalized:
        data['isbn_normalized'] = isbn_normalized
        try:
            with transaction.atomic():
                book, _ = Book.objects.get_or_create(isbn_normalized=isbn_normalized, defaults=data)
        except IntegrityError:
            book = Book.objects.get(isbn_normalized=isbn_normalized)
    else:
        book = Book.objects.create(**data)
    copy = BookCopy.objects.create(
        family=family,
        book=book,
        created_by=user,
        barcode=copy_data['barcode'] or None,
        notes=copy_data['notes'] or '',
    )
    return book, copy
```

Before creating, reject a non-empty barcode already used in the same family with serializer field error `{'barcode': ['当前家庭已经使用这个副本条码']}`. Do not accept `family`, `created_by`, `status`, `location`, or `tags` in this endpoint.

- [ ] **Step 5: Add the write action and permission mapping**

Extend `FamilyScopedViewSet.get_permissions` so `add_book` is a write action. Add to `BookCopyViewSet`:

```python
@action(detail=False, methods=['post'], url_path='add-book')
def add_book(self, request):
    family = get_current_family(request)
    if family is None:
        return Response({'detail': '请选择有效的家庭'}, status=status.HTTP_400_BAD_REQUEST)
    serializer = BookIntakeSerializer(data=request.data, context={'family': family})
    serializer.is_valid(raise_exception=True)
    book, copy = CatalogService.add_book_copy(family, request.user, serializer.validated_data)
    return Response(
        {'book': BookSerializer(book, context={'request': request}).data,
         'copy': BookCopySerializer(copy, context={'request': request}).data},
        status=status.HTTP_201_CREATED,
    )
```

- [ ] **Step 6: Run intake and full backend tests**

```bash
/opt/anaconda3/envs/cloudp/bin/python manage.py test catalog.tests.test_api
/opt/anaconda3/envs/cloudp/bin/python manage.py test
```

Expected: catalog and full backend suites PASS.

- [ ] **Step 7: Commit**

```bash
git add catalog/serializers.py catalog/services.py catalog/views.py catalog/tests/test_api.py
git commit -m "feat: atomically add family books"
```

### Task 5: Document backend configuration and contracts

**Files:**
- Modify: `/Users/leexd/CloudPavilion/.env.example`
- Modify: `/Users/leexd/CloudPavilion/README.md`

- [ ] **Step 1: Add the optional environment setting**

Add without a secret value:

```dotenv
GOOGLE_BOOKS_API_KEY=
```

- [ ] **Step 2: Document both mobile-facing endpoints**

Document `GET /api/v1/books/lookup/?isbn=...`, `POST /api/v1/book-copies/add-book/`, the normalized response fields, role requirements, Google/Open Library fallback, cache durations, and that the key is optional and server-only.

- [ ] **Step 3: Validate docs and commit**

```bash
git diff --check
git add .env.example README.md
git commit -m "docs: describe mobile book intake API"
```

### Task 6: Add camera dependency and native permission

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/package.json`
- Modify: `/Users/leexd/CloudPavilion-Mobile/package-lock.json`
- Modify: `/Users/leexd/CloudPavilion-Mobile/app.json`
- Modify: `/Users/leexd/CloudPavilion-Mobile/ios/CloudPavilion/Info.plist`
- Modify: `/Users/leexd/CloudPavilion-Mobile/ios/Podfile.lock`

- [ ] **Step 1: Install the Expo-compatible camera module**

```bash
npx expo install expo-camera
```

Expected: Expo selects the SDK 57-compatible version.

- [ ] **Step 2: Configure reusable and native permission text**

Set the plugin entry:

```json
[
  "expo-camera",
  { "cameraPermission": "允许云阁扫描书籍 ISBN 条码。" }
]
```

Add to `ios/CloudPavilion/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>允许云阁扫描书籍 ISBN 条码。</string>
```

- [ ] **Step 3: Resolve iOS pods and run Expo Doctor**

```bash
npx pod-install ios
npx expo-doctor
```

Expected: pod installation succeeds and all Expo Doctor checks pass.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.json ios/CloudPavilion/Info.plist ios/Podfile.lock
git commit -m "feat: enable ISBN camera scanning"
```

### Task 7: Build the mobile book intake API module

**Files:**
- Create: `/Users/leexd/CloudPavilion-Mobile/src/lib/books.ts`
- Create: `/Users/leexd/CloudPavilion-Mobile/src/test/books.test.ts`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/lib/types.ts`

- [ ] **Step 1: Write failing scan and API contract tests**

Test ISBN cleanup/checksum, rejection of non-book EAN-13 values, lookup URL encoding, save payload, and submission guard:

```typescript
expect(normalizeScannedIsbn('978-7-5063-6543-7')).toBe('9787506365437')
expect(normalizeScannedIsbn('6901234567892')).toBeNull()
expect(normalizeScannedIsbn('9787506365438')).toBeNull()
```

Mock `apiClient.get` and `apiClient.post` to assert:

```typescript
await lookupBookByIsbn('9787506365437')
expect(apiClient.get).toHaveBeenCalledWith('/books/lookup/?isbn=9787506365437')

await addBookToFamily(draft)
expect(apiClient.post).toHaveBeenCalledWith('/book-copies/add-book/', expectedPayload)
```

Verify the guard drops a second in-flight call and becomes reusable after the first settles:

```typescript
let release!: () => void
const submit = vi.fn(() => new Promise<void>((resolve) => { release = resolve }))
const guarded = createSubmissionGuard(submit)
const first = guarded()
await expect(guarded()).resolves.toBeUndefined()
expect(submit).toHaveBeenCalledTimes(1)
release()
await first
await guarded()
expect(submit).toHaveBeenCalledTimes(2)
```

- [ ] **Step 2: Run tests and verify RED**

```bash
npm test -- --run src/test/books.test.ts
```

Expected: import failure for `../lib/books`.

- [ ] **Step 3: Implement focused types and functions**

Export:

```typescript
export type BookDraft = {
  title: string; author: string; isbn: string; publisher: string
  publish_date: string; category: string; description: string
  cover_url: string; barcode: string; notes: string
}
export type BookLookup = Omit<BookDraft, 'barcode' | 'notes'> & { source: 'local' | 'google' | 'openlibrary' }
export type BookIntakeResult = { book: Book; copy: BookCopy }

export function normalizeScannedIsbn(value: string): string | null
export async function lookupBookByIsbn(isbn: string): Promise<BookLookup>
export async function addBookToFamily(draft: BookDraft): Promise<BookIntakeResult>
export function createSubmissionGuard<T>(operation: () => Promise<T>): () => Promise<T | undefined>
```

Implement ISBN-13 checksum as `(10 - weightedSum % 10) % 10`, with alternating weights 1 and 3 across the first 12 digits. Only accept 13 digits beginning `978` or `979`. Trim every outgoing string; send empty optional fields as `''` except `publish_date`, which is omitted when blank. `createSubmissionGuard` holds an internal boolean, returns `undefined` while an operation is active, and always clears the boolean in `finally`.

Add `cover_url: string` to `Book` in `src/lib/types.ts`.

- [ ] **Step 4: Run the focused and existing tests**

```bash
npm test -- --run src/test/books.test.ts
npm test -- --run
```

Expected: all Vitest tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/books.ts src/lib/types.ts src/test/books.test.ts
git commit -m "feat: add mobile book intake client"
```

### Task 8: Implement the scan/manual intake screen

**Files:**
- Create: `/Users/leexd/CloudPavilion-Mobile/src/screens/AddBookScreen.tsx`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/navigation/types.ts`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Add the route before the screen implementation**

Add `AddBook: undefined` to `RootStackParamList`, import `AddBookScreen`, and register `<Root.Screen name="AddBook" component={AddBookScreen} />` in the authenticated stack. Run typecheck and confirm it fails because the screen module does not exist.

```bash
npm run typecheck
```

- [ ] **Step 2: Build the two-mode screen**

Use `CameraView` and `useCameraPermissions` from `expo-camera`. The screen owns:

```typescript
type Mode = 'scan' | 'manual'
const EMPTY_DRAFT: BookDraft = {
  title: '', author: '', isbn: '', publisher: '', publish_date: '',
  category: '', description: '', cover_url: '', barcode: '', notes: '',
}
```

In scan mode, render `CameraView` only after permission is granted:

```tsx
<CameraView
  barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
  onBarcodeScanned={scanning ? ({ data }) => void handleScan(data) : undefined}
  style={{ height: 360, width: '100%' }}
/>
```

`handleScan` must synchronously set `scanning` false, validate through `normalizeScannedIsbn`, call `lookupBookByIsbn`, and populate every metadata field. For `ApiError` 404 or 503, retain the ISBN, set a Chinese explanation, and switch to manual mode. An invalid EAN displays “这不是有效的 ISBN-13 条码” and restores scanning.

Manual mode renders labeled inputs for all `BookDraft` fields except `cover_url`, which is displayed as a cover preview when populated. Title is required. ISBN is optional but validated when present. Wrap the save operation with `createSubmissionGuard`, memoize that guarded function, and also disable the button while the visible pending state is true so rapid taps cannot call the API twice. On success:

```typescript
const result = await addBookToFamily(draft)
navigation.replace('BookDetail', { bookId: result.book.id })
```

If no family is selected, render a message and button navigating to `Settings`. Preserve form values on every error.

- [ ] **Step 3: Typecheck and lint the screen**

```bash
npm run typecheck
npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/screens/AddBookScreen.tsx src/navigation/types.ts src/navigation/RootNavigator.tsx
git commit -m "feat: add scan and manual book screen"
```

### Task 9: Integrate intake with catalog and real covers

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/screens/CatalogScreen.tsx`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/components/BookCover.tsx`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/screens/BookDetailScreen.tsx`

- [ ] **Step 1: Add the catalog entry point and focus refresh**

Place an `ActionButton` under the catalog header:

```tsx
<ActionButton onPress={() => navigation.navigate('AddBook')}>扫描或手动添加</ActionButton>
```

Change the empty copy to “扫描 ISBN 或手动录入第一本书。” Replace the one-time loading effect with `useFocusEffect` plus the existing 220 ms query debounce so returning from intake refreshes the list.

- [ ] **Step 2: Make `BookCover` use real metadata covers**

Add `coverUrl?: string | null` to its props and choose:

```typescript
const uri = coverUrl || `https://picsum.photos/seed/mobile-book-${seed}/600/820`
```

Pass `book.cover_url || book.cover` from catalog and detail screens.

- [ ] **Step 3: Run all mobile checks**

```bash
npm test -- --run
npm run typecheck
npm run lint
npx expo-doctor
git diff --check
```

Expected: every command exits 0 and Expo Doctor reports all checks passing.

- [ ] **Step 4: Commit**

```bash
git add src/screens/CatalogScreen.tsx src/components/BookCover.tsx src/screens/BookDetailScreen.tsx
git commit -m "feat: add mobile catalog intake entry"
```

### Task 10: Review, deploy, and verify production

**Files:**
- Verify both repositories and the signed application bundle.

- [ ] **Step 1: Review the complete diffs**

Inspect `git diff main...HEAD` in both repositories. Confirm no secrets, no Web intake page, no client-supplied family/creator/status, and no unrelated files. Run the requesting-code-review workflow and fix Critical/Important findings with new failing regression tests.

- [ ] **Step 2: Run final local verification**

Backend:

```bash
/opt/anaconda3/envs/cloudp/bin/python manage.py test
/opt/anaconda3/envs/cloudp/bin/python manage.py check --settings=cloudpavilion.settings_dev
/opt/anaconda3/envs/cloudp/bin/python manage.py makemigrations --check --dry-run --settings=cloudpavilion.settings_dev
/opt/anaconda3/envs/cloudp/bin/python manage.py spectacular --file /tmp/cloudpavilion-schema.yml --validate --settings=cloudpavilion.settings_dev
git diff --check
```

Mobile:

```bash
npm test -- --run
npm run typecheck
npm run lint
npx expo-doctor
git diff --check
```

- [ ] **Step 3: Deploy backend files and migrate**

Upload only committed backend changes to `/opt/cloudpavilion`, preserve `.env.production`, then run:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build web
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm web python manage.py migrate
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm -e SECURE_SSL_REDIRECT=false -e APP_BASE_PATH= web python manage.py test catalog.tests
docker compose --env-file .env.production -f docker-compose.prod.yml up -d web worker beat
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Expected: migration and catalog tests pass; DB/Redis/Web are healthy; Worker/Beat are up.

- [ ] **Step 4: Run disposable public API smoke test**

Register a uniquely named ordinary user, create a family, call `POST /book-copies/add-book/` with a manual no-ISBN title, confirm `201`, fetch `/books/` and confirm the title is present, then delete exactly that test family/user through `manage.py shell`. Never print JWTs or production secrets.

- [ ] **Step 5: Build, sign, and install the iPhone app**

```bash
xcodebuild -workspace ios/CloudPavilion.xcworkspace \
  -scheme CloudPavilion \
  -configuration Release \
  -destination 'id=00008130-0002345A02E2001C' \
  -derivedDataPath .build/ios-signed \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM=M7U9C9L2DF \
  CODE_SIGN_STYLE=Automatic \
  build

codesign --verify --deep --strict --verbose=2 \
  .build/ios-signed/Build/Products/Release-iphoneos/CloudPavilion.app

xcrun devicectl device install app \
  --device 029B5201-EC1D-5BEE-89DC-64888EF543EF \
  .build/ios-signed/Build/Products/Release-iphoneos/CloudPavilion.app

xcrun devicectl device process launch \
  --device 029B5201-EC1D-5BEE-89DC-64888EF543EF \
  com.kylinlixd.cloudpavilion
```

Expected: `BUILD SUCCEEDED`, signature valid, app installed, app launched.

- [ ] **Step 6: Perform the physical scan acceptance test**

On the unlocked iPhone, open 藏书 → 扫描或手动添加, grant camera permission, scan an ISBN-13 beginning with 978 or 979, review the filled metadata, and save. Scan it again and confirm `copy_count` increments while only one title appears. Then add one no-ISBN title manually and confirm both books are visible in the catalog.
