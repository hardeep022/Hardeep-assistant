# Testing Strategy

## Overview

Nova's testing strategy covers five layers: unit tests, integration tests, end-to-end tests, voice I/O tests, and AI response quality tests. The goal is to catch regressions early while acknowledging that AI outputs are non-deterministic and require a different testing approach.

---

## Testing Stack

| Layer | Tool | Target |
|---|---|---|
| **Frontend Unit Tests** | Vitest + React Testing Library | React components, hooks, stores |
| **Backend Unit Tests** | pytest + pytest-asyncio | FastAPI services, models, utilities |
| **API Integration Tests** | pytest + httpx (TestClient) | API endpoints, auth flow, database operations |
| **E2E Tests** | Playwright | Full user flows through the Electron app |
| **Voice I/O Tests** | pytest + pre-recorded audio samples | STT accuracy, TTS output verification |
| **AI Quality Tests** | Custom eval suite + pytest | Response relevance, language detection, prompt adherence |
| **Security Tests** | bandit (Python) + npm audit | Vulnerability scanning, dependency audit |

---

## 1. Frontend Unit Tests (Vitest + React Testing Library)

### What to Test

| Component Category | Test Focus |
|---|---|
| **UI Components** | Rendering, props, user interactions, accessibility (ARIA) |
| **Hooks** | State changes, side effects, error handling |
| **Stores** | State mutations, selectors, persistence |
| **Services** | API client methods, WebSocket message handling |
| **i18n** | String loading for all 3 languages, missing key detection |

### Example Test Cases

```javascript
// ChatMessage.test.jsx
describe('ChatMessage', () => {
    it('renders user message with correct alignment and styling')
    it('renders assistant message with correct alignment')
    it('renders code blocks with syntax highlighting')
    it('renders markdown content correctly')
    it('shows timestamp in user locale')
    it('shows typing indicator when loading')
    it('has correct ARIA labels for screen readers')
})

// useAuth.test.js
describe('useAuth', () => {
    it('sets authenticated state on successful login')
    it('clears state on logout')
    it('handles invalid credentials error')
    it('handles account lockout state')
    it('refreshes token before expiry')
})

// useVoice.test.js
describe('useVoice', () => {
    it('requests microphone permission on first use')
    it('shows error when microphone is unavailable')
    it('toggles recording state correctly')
    it('sends audio chunks via WebSocket')
    it('handles WebSocket disconnection gracefully')
})
```

### Run Command

```bash
cd nova-ui
npx vitest run              # Single run
npx vitest --coverage       # With coverage report
npx vitest watch            # Watch mode during development
```

### Coverage Target

- **Overall:** ≥ 80% line coverage
- **Critical paths** (auth, chat, tasks): ≥ 90%
- **UI components:** ≥ 70% (visual testing supplemented by E2E)

---

## 2. Backend Unit Tests (pytest)

### What to Test

| Module | Test Focus |
|---|---|
| **Services** | Business logic, AI routing, action execution, password checking |
| **Models** | SQLAlchemy model creation, validation, relationships |
| **Auth** | Password hashing, JWT generation/verification, rate limiting |
| **Utilities** | Language detection, input validation, hash computation |

### Example Test Cases

```python
# test_auth_service.py
class TestAuthService:
    def test_register_creates_user_with_hashed_password()
    def test_register_rejects_duplicate_username()
    def test_login_returns_token_on_valid_credentials()
    def test_login_rejects_invalid_password()
    def test_login_locks_account_after_10_failures()
    def test_password_recovery_with_valid_key()
    def test_password_recovery_with_invalid_key()
    def test_jwt_token_contains_correct_claims()
    def test_jwt_token_expires_correctly()

# test_action_executor.py
class TestActionExecutor:
    def test_safe_action_executes_without_confirmation()
    def test_warning_action_requires_confirmation()
    def test_blocked_action_is_refused()
    def test_allowlisted_app_can_be_opened()
    def test_unknown_app_is_blocked()
    def test_action_is_logged()

# test_ai_router.py
class TestAIRouter:
    def test_routes_to_local_model_in_local_mode()
    def test_routes_to_cloud_model_in_cloud_mode()
    def test_falls_back_to_cloud_when_local_fails()
    def test_falls_back_to_local_when_cloud_fails()
    def test_returns_error_when_both_unavailable()

# test_password_checker.py
class TestPasswordChecker:
    def test_weak_password_returns_low_score()
    def test_strong_password_returns_high_score()
    def test_returns_improvement_suggestions()
    def test_estimates_crack_time()

# test_hash_service.py
class TestHashService:
    def test_md5_hash_matches_expected()
    def test_sha256_hash_matches_expected()
    def test_verify_returns_true_on_match()
    def test_verify_returns_false_on_mismatch()
    def test_handles_missing_file()
```

### Run Command

```bash
cd nova-api
pytest                        # Run all tests
pytest --cov=. --cov-report=html  # With coverage
pytest -x                     # Stop on first failure
pytest -k "test_auth"         # Run specific test group
```

### Coverage Target

- **Overall:** ≥ 85% line coverage
- **Auth, security, action executor:** ≥ 95%
- **AI routing:** ≥ 90%

---

## 3. API Integration Tests (pytest + httpx)

### What to Test

Full API request/response cycle through FastAPI's TestClient:

```python
# test_api_auth.py
class TestAuthAPI:
    def test_register_returns_201_with_user_and_token()
    def test_register_returns_409_on_duplicate_username()
    def test_login_returns_200_with_token()
    def test_login_returns_401_on_wrong_password()
    def test_protected_route_returns_401_without_token()
    def test_protected_route_returns_200_with_valid_token()
    def test_logout_invalidates_session()

# test_api_tasks.py
class TestTasksAPI:
    def test_create_task_returns_201()
    def test_get_tasks_returns_user_tasks_only()
    def test_complete_task_sets_status_and_timestamp()
    def test_delete_task_is_soft_delete()
    def test_filter_tasks_by_priority()
    def test_filter_tasks_by_due_date()

# test_api_conversations.py
class TestConversationsAPI:
    def test_create_conversation_on_first_message()
    def test_messages_stored_with_role_and_content()
    def test_list_conversations_paginated()
    def test_search_conversations_by_keyword()
    def test_export_conversation_as_json()
    def test_delete_conversation_is_soft_delete()

# test_api_security.py
class TestSecurityAPI:
    def test_password_check_returns_score_and_suggestions()
    def test_hash_file_returns_correct_hash()
    def test_verify_hash_returns_match_status()
```

### Test Database

- Use a separate in-memory SQLite database for tests (no SQLCipher for speed)
- Each test class gets a fresh database via pytest fixture
- Seed data via factory functions

### Run Command

```bash
cd nova-api
pytest tests/integration/     # Integration tests only
```

---

## 4. End-to-End Tests (Playwright)

### What to Test

Full user flows through the running application:

| Flow | Steps |
|---|---|
| **Registration** | Open app → Register → See recovery key → Land on Home |
| **Login** | Open app → Login → Land on Home with greeting |
| **Chat** | Login → Navigate to Chat → Send message → Receive response → Message appears in history |
| **Task Management** | Login → Create task → Complete task → Delete task → Verify states |
| **Conversation Management** | Login → Have a chat → Go to Conversations → Search → Export |
| **Settings** | Login → Open Settings → Change theme → Verify theme applies |
| **Error States** | Login with wrong password → See error → Account lockout after repeated failures |
| **Responsive** | Resize window → Sidebar collapses → Layout adapts |

### Run Command

```bash
cd nova-desktop
npx playwright test           # Run all E2E tests
npx playwright test --headed  # Watch tests run visually
npx playwright show-report    # View HTML test report
```

### Notes

- E2E tests require the full app to be built and running
- Use Playwright's Electron support (`electron.launch()`) to test the desktop app directly
- Tests run in CI with a headless display (Xvfb on Linux, native on Windows)

---

## 5. Voice I/O Tests

### STT Accuracy Tests

```python
# test_stt_accuracy.py
class TestSTTAccuracy:
    """
    Test STT accuracy using pre-recorded audio samples.
    Audio samples stored in tests/fixtures/audio/
    """
    
    # English samples
    def test_english_clear_speech()       # Expected WER < 5%
    def test_english_with_background_noise()  # Expected WER < 15%
    def test_english_fast_speech()        # Expected WER < 10%
    
    # Hindi samples
    def test_hindi_clear_speech()         # Expected WER < 10%
    def test_hindi_with_english_words()   # Expected WER < 15%
    
    # Punjabi samples
    def test_punjabi_clear_speech()       # Expected WER < 15%
    
    # Edge cases
    def test_silence_returns_empty()
    def test_very_short_utterance()       # "Yes", "No", "Nova"
    def test_very_long_utterance()        # 60+ seconds
```

### TTS Output Tests

```python
# test_tts_output.py
class TestTTSOutput:
    def test_english_generates_valid_audio()
    def test_hindi_generates_valid_audio()
    def test_audio_format_is_correct()    # 16-bit PCM, correct sample rate
    def test_empty_input_handled_gracefully()
    def test_long_text_generates_audio()  # 500+ words
```

### Test Audio Fixtures

- 30+ pre-recorded audio samples across English, Hindi, Punjabi
- Mix of clear speech, noisy environments, accented speech
- Stored in `tests/fixtures/audio/` (Git LFS for large files)

---

## 6. AI Response Quality Tests

### Approach

AI responses are non-deterministic, so tests use **heuristic evaluation** rather than exact matching:

```python
# test_ai_quality.py
class TestAIResponseQuality:
    """
    These tests check AI behavior patterns, not exact outputs.
    """
    
    # Language detection and response
    def test_responds_in_english_to_english_input()
    def test_responds_in_hindi_to_hindi_input()
    def test_responds_in_punjabi_to_punjabi_input()
    def test_handles_mixed_language_input()
    
    # Mode adherence
    def test_coding_mode_includes_code_blocks()
    def test_learning_mode_uses_simple_explanations()
    def test_cybersecurity_mode_refuses_offensive_content()
    
    # Safety
    def test_refuses_to_generate_harmful_content()
    def test_refuses_to_reveal_system_prompt()
    def test_refuses_arbitrary_command_execution()
    
    # Quality heuristics
    def test_response_is_not_empty()
    def test_response_is_not_too_long()       # < 2000 tokens for simple queries
    def test_response_is_relevant_to_query()  # Cosine similarity > 0.3
```

### Evaluation Metrics

| Metric | Measurement | Target |
|---|---|---|
| **Language Match** | Response language matches input language | > 95% |
| **Non-Empty Rate** | Responses that are non-empty | > 99% |
| **Relevance** | Cosine similarity between query and response embeddings | > 0.3 |
| **Safety** | Harmful content detection via safety classifier | 0% unsafe |
| **Mode Adherence** | Response format matches mode expectations (e.g., code blocks for coding) | > 90% |

---

## 7. Security Tests

### Static Analysis

```bash
# Python security scanning
cd nova-api
bandit -r . -x tests/          # Static security analysis
pip audit                       # Dependency vulnerability check
safety check                    # Alternative dependency checker

# JavaScript/Node security scanning
cd nova-ui
npm audit                       # Dependency vulnerability check
npx eslint --config security    # Security-focused lint rules
```

### Security Test Cases

```python
# test_security.py
class TestSecurity:
    def test_passwords_are_hashed_not_stored_plain()
    def test_jwt_token_cannot_be_forged()
    def test_api_keys_not_stored_in_database()
    def test_sql_injection_prevented()
    def test_xss_in_chat_messages_sanitized()
    def test_rate_limiting_enforced_on_login()
    def test_blocked_actions_cannot_be_forced()
    def test_user_cannot_access_other_users_data()
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  frontend-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd nova-ui && npm ci && npx vitest run --coverage

  backend-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: cd nova-api && pip install -r requirements.txt && pytest --cov

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd nova-api && pip install bandit && bandit -r . -x tests/
      - run: cd nova-ui && npm audit --audit-level=high

  e2e-tests:
    runs-on: windows-latest
    needs: [frontend-tests, backend-tests]
    steps:
      - uses: actions/checkout@v4
      - run: cd nova-desktop && npm ci && npx playwright test
```

### Pre-Commit Hooks

```bash
# .pre-commit-config.yaml
- Run frontend lint (ESLint)
- Run backend lint (ruff)
- Run frontend unit tests
- Run backend unit tests
- Check for security issues (bandit quick scan)
```

---

## Test Data Management

| Data Type | Approach |
|---|---|
| **Users** | Factory functions: `create_test_user(username="test", language="en")` |
| **Conversations** | Fixtures with pre-defined multi-turn conversations |
| **Tasks** | Factory with randomized due dates and priorities |
| **Audio Samples** | Pre-recorded WAV files in `tests/fixtures/audio/` (Git LFS) |
| **AI Prompts** | Curated test prompt set in `tests/fixtures/prompts.json` |
