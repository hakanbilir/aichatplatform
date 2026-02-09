import json
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()

    context.add_init_script("""
        localStorage.setItem('ai_chat_auth_token', 'fake-token');
        localStorage.setItem('i18nextLng', 'en');
    """)

    page = context.new_page()

    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Page Error: {err}"))
    page.on("requestfailed", lambda req: print(f"Request Failed: {req.url} {req.failure}"))

    # Mock API responses

    def handle_me(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "user": {"id": "u1", "email": "test@example.com", "name": "Test User", "isSuperadmin": False},
                "activeOrg": {"id": "o1", "name": "Test Org", "slug": "test-org"},
                "organizations": [{"id": "o1", "name": "Test Org", "slug": "test-org"}]
            })
        )

    def handle_orgs(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "organizations": [{"id": "o1", "name": "Test Org", "slug": "test-org"}]
            })
        )

    def handle_conversations(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "conversations": [
                    {
                        "id": "c1",
                        "title": "Old Title",
                        "model": "gpt-4",
                        "createdAt": "2023-01-01T00:00:00Z",
                        "updatedAt": "2023-01-01T00:00:00Z",
                        "orgId": "o1"
                    }
                ]
            })
        )

    def handle_tools(route):
        route.fulfill(status=200, body=json.dumps([]))

    def handle_models(route):
        route.fulfill(status=200, body=json.dumps({"models": []}))

    def handle_update_conversation(route):
        print(f"Handling UPDATE {route.request.url}")
        data = route.request.post_data_json
        print(f"Payload: {data}")
        title = data.get("title")

        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "conversation": {
                    "id": "c1",
                    "title": title,
                    "model": "gpt-4",
                    "createdAt": "2023-01-01T00:00:00Z",
                    "updatedAt": "2023-01-01T00:01:00Z",
                    "orgId": "o1",
                    "messages": []
                }
            })
        )

    # Intercept requests
    page.route("**/auth/me", handle_me)
    page.route("**/orgs", handle_orgs)
    page.route("**/conversations", handle_conversations)
    page.route("**/tools", handle_tools)
    page.route("**/models", handle_models)
    page.route("**/orgs/*/models", handle_models)
    page.route("**/conversations/c1", handle_update_conversation)

    print("Navigating to app...")
    page.goto("http://localhost:5173/app")

    try:
        print("Waiting for 'Old Title'...")
        # Use exact=False to match text content even if nested
        title_locator = page.get_by_text("Old Title", exact=False).first
        title_locator.wait_for(timeout=10000)
    except Exception as e:
        print(f"Timeout waiting for title. URL: {page.url}")
        page.screenshot(path="verification/timeout.png")
        raise e

    # Take screenshot
    page.screenshot(path="verification/before_rename.png")

    # Rename flow
    try:
        print("Locating list item...")

        # Hover to reveal menu
        title_locator.hover()

        item = page.locator("div[role='button']").filter(has=title_locator).first
        if not item.count():
             item = page.locator("li").filter(has=title_locator).first

        item.hover()

        print("Clicking menu button...")
        btn = item.locator("button").first
        btn.click()

        print("Clicking Rename...")
        rename_item = page.get_by_role("menuitem").filter(has_text="Rename").first
        if not rename_item.count():
             rename_item = page.get_by_role("menuitem").filter(has_text="Yeniden adlandır").first

        rename_item.click()

        print("Verifying input...")
        # Target the input by value
        input_locator = page.locator("input[value='Old Title']")
        expect(input_locator).to_be_visible()

        print("Typing new title...")
        input_locator.fill("New Title")

        # Verify value changed. locator matches only on new value now?
        # No, locator selects by value. So old locator might fail if we reuse it.
        # But `fill` waits for element.

        # After fill, value is "New Title".
        # Check by new value
        expect(page.locator("input[value='New Title']")).to_be_visible()

        print("Saving...")
        page.locator("input[value='New Title']").press("Enter")

        print("Waiting for 'New Title' (as text)...")
        # After save, it becomes text again.
        page.get_by_text("New Title").wait_for(timeout=5000)

        page.screenshot(path="verification/after_rename.png")
        print("Verification successful!")

    except Exception as e:
        print(f"Verification failed: {e}")
        page.screenshot(path="verification/error.png")
        # raise e

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
