import time
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Browser Error: {err}"))

    # Mock Models
    def handle_models(route):
        print(f"Mocking models for {route.request.url}")
        route.fulfill(
            status=200,
            content_type="application/json",
            body='{"models": [{"modelName": "gpt-4", "displayName": "GPT-4"}, {"modelName": "claude-3", "displayName": "Claude 3"}]}'
        )

    page.route("**/models", handle_models)

    # Mock Conversations
    page.route("**/conversations*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"conversations": [], "items": []}'
    ))

    # Mock Auth Me
    page.route("**/auth/me", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"user": {"id": "user1", "email": "test@test.com", "name": "Test User", "isSuperadmin": false}, "activeOrg": {"id": "org1", "name": "Test Org", "slug": "test-org"}, "organizations": [{"id": "org1", "name": "Test Org", "slug": "test-org"}]}'
    ))

    # Mock Orgs list
    page.route("**/orgs", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"organizations": [{"id": "org1", "name": "Test Org", "slug": "test-org"}]}'
    ))

    # Go to app with token injected
    page.goto("http://localhost:4173/auth/login")

    page.evaluate("localStorage.setItem('ai_chat_auth_token', 'mock-token');")

    page.goto("http://localhost:4173/app")

    # Wait for page load
    time.sleep(5)

    page.screenshot(path="verification.png")

    try:
        # Check if "GPT-4" is visible on the page
        expect(page.get_by_text("GPT-4")).to_be_visible()
        print("Success: GPT-4 is selected")
    except Exception as e:
        print(f"Failure: {e}")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
