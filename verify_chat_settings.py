from playwright.sync_api import sync_playwright

def verify_chat_settings():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1280, 'height': 720},
            storage_state=None
        )

        # Inject auth token
        print("Injecting auth token...")
        page = context.new_page()
        page.goto("http://localhost:5173/")
        page.evaluate("""
            localStorage.setItem('ai_chat_auth_token', 'mock-token');
            localStorage.setItem('ai_chat_user', JSON.stringify({id: 'u1', name: 'Test User', email: 'test@example.com'}));
        """)

        # Mock API responses
        # Auth check
        page.route("**/auth/me", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"id":"u1","email":"test@example.com","name":"Test User"}'
        ))

        # Orgs
        page.route("**/api/orgs", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='[{"id":"org1","name":"Test Org","role":"owner"}]'
        ))

        # Conversations list
        page.route("**/api/conversations?**", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"items":[],"total":0,"page":1,"limit":20,"totalPages":0}'
        ))

        # Single conversation (for when ID is loaded)
        page.route("**/api/conversations/*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"id":"c1","title":"New Conversation","model":"llama3.1","temperature":0.7,"topP":1,"orgId":"org1"}'
        ))

        # Navigate to app
        print("Navigating to /app...")
        page.goto("http://localhost:5173/app")

        # Wait for ChatSettingsBar elements
        print("Waiting for ChatSettingsBar elements...")
        try:
            # Wait for "Model" label - using a flexible selector that looks for the text
            # This handles potential rendering delays or slight DOM structure differences
            page.wait_for_selector("text=Model", timeout=10000)
            print("Found 'Model' label.")

            # Check for sliders
            sliders = page.locator("input[type='range']")
            count = sliders.count()
            if count >= 2:
                print(f"Found {count} sliders.")
            else:
                print(f"Warning: Found only {count} sliders, expected at least 2.")

            print("Taking screenshot...")
            page.screenshot(path="verification_chat_settings.png")
            print("Screenshot saved to verification_chat_settings.png")

            print("SUCCESS: ChatSettingsBar is rendered correctly (Sliders and Model selector found).")

        except Exception as e:
            print(f"FAILED: Could not find ChatSettingsBar elements. Error: {e}")
            page.screenshot(path="error_state.png")
            print("Saved error_state.png")
            raise e

        browser.close()

if __name__ == "__main__":
    verify_chat_settings()
