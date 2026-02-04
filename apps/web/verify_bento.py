import os
from playwright.sync_api import sync_playwright

def verify_bento_grid(page):
    # Mock Backend APIs
    # Auth Check
    page.route("**/auth/me", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"id": "user1", "email": "test@test.com", "name": "Test User", "isSuperadmin": false}'
    ))

    # Orgs
    page.route("**/orgs", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"organizations": [{"id": "org1", "name": "Test Org", "slug": "test-org", "role": "OWNER"}]}'
    ))

    # Single Org (needed for some logic)
    page.route("**/orgs/org1", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"id": "org1", "name": "Test Org", "slug": "test-org", "role": "OWNER", "plan": "FREE"}'
    ))

    # Branding
    page.route("**/orgs/*/branding", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"logoUrl": null, "faviconUrl": null}'
    ))

    # Conversations
    page.route("**/conversations?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"items": [], "meta": {"total": 0}}'
    ))

    # Inject Token
    page.add_init_script("""
        localStorage.setItem('ai_chat_auth_token', 'mock_token');
        localStorage.setItem('i18nextLng', 'en');
    """)

    # Navigate to app
    # Vite usually runs on 5173
    print("Navigating to http://localhost:5173/app")
    page.goto("http://localhost:5173/app")

    # Wait for the Shell to load - .gradient-shell is the container, check for grid
    try:
        # Check if we are redirected to login (if mock auth failed)
        if "login" in page.url:
            print("Redirected to login, forcing direct navigation again...")
            page.goto("http://localhost:5173/app")

        page.wait_for_selector(".gradient-shell", timeout=10000)

        # Check if grid is applied
        # We can evaluate css
        display = page.eval_on_selector(".gradient-shell", "el => getComputedStyle(el).display")
        print(f"Shell display: {display}")

        # Wait for glass panels
        page.wait_for_selector(".kinetic-glass-panel", timeout=5000)
        print("Glass panel found")

        # Allow some time for fonts/styles to settle
        page.wait_for_timeout(2000)

        # Screenshot
        os.makedirs("/home/jules/verification", exist_ok=True)
        page.screenshot(path="/home/jules/verification/bento_layout.png", full_page=True)
        print("Screenshot taken at /home/jules/verification/bento_layout.png")

    except Exception as e:
        print(f"Verification step failed: {e}")
        page.screenshot(path="/home/jules/verification/error.png")
        raise e

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        try:
            verify_bento_grid(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
