from playwright.sync_api import sync_playwright, expect
import json
import time

def test_tooltip_with_mock(page):
    # Mock Data
    user = {
        "id": "test-user-id",
        "email": "test@example.com",
        "name": "Test User",
        "isSuperadmin": False
    }
    org = {
        "id": "test-org-id",
        "name": "Test Org",
        "slug": "test-org",
        "role": "OWNER"
    }

    auth_response = {
        "token": "fake-jwt-token",
        "user": user,
        "activeOrg": org,
        "organizations": [org]
    }

    me_response = {
        "user": user,
        "activeOrg": org,
        "organizations": [org]
    }

    # API Handlers
    def handle_signup(route):
        route.fulfill(status=200, content_type="application/json", body=json.dumps(auth_response))

    def handle_me(route):
        route.fulfill(status=200, content_type="application/json", body=json.dumps(me_response))

    def handle_generic_list(route):
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": []}))

    def handle_conversations(route):
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"conversations": []}))

    def handle_orgs(route):
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"organizations": [org]}))

    # Intercept requests - Target API specifically (port 4000)
    page.route("http://localhost:4000/auth/signup", handle_signup)
    page.route("http://localhost:4000/auth/me", handle_me)
    page.route("http://localhost:4000/conversations*", handle_conversations)
    page.route("http://localhost:4000/orgs", handle_orgs)
    page.route("http://localhost:4000/orgs/*/integrations", handle_generic_list)
    page.route("http://localhost:4000/auth/sso/connections*", handle_generic_list)
    page.route("http://localhost:4000/datasets/ingestion/status*", handle_generic_list)
    page.route("http://localhost:4000/knowledge*", handle_generic_list)

    # Force English Locale
    page.add_init_script("window.localStorage.setItem('i18nextLng', 'en');")

    print("Navigating to Signup...")
    page.goto("http://localhost:5173/auth/signup")

    print("Filling form...")
    try:
        page.get_by_label("Name", exact=False).or_(page.get_by_label("Ad Soyad", exact=False)).first.fill("Test User")
        page.get_by_label("Email", exact=False).or_(page.get_by_label("E-posta", exact=False)).first.fill("test@example.com")
        page.get_by_label("Password", exact=False).or_(page.get_by_label("Şifre", exact=False)).first.fill("Password123!")
        page.get_by_label("Workspace name", exact=False).or_(page.get_by_label("Çalışma alanı adı", exact=False)).first.fill("Test Org")
        page.get_by_role("button", name="Create workspace").or_(page.get_by_role("button", name="Kayıt ol")).first.click()
    except Exception as e:
        print(f"Error filling form: {e}")
        raise e

    print("Waiting for Chat UI...")
    send_btn = page.get_by_role("button", name="Send message").or_(page.get_by_role("button", name="Mesaj gönder")).first
    expect(send_btn).to_be_visible(timeout=15000)

    print("Send button found. Verifying properties...")

    # 1. Verify ARIA Label
    aria_label = send_btn.get_attribute("aria-label")
    print(f"ARIA Label: {aria_label}")
    if aria_label not in ["Send message", "Mesaj gönder"]:
        raise AssertionError(f"Unexpected aria-label: {aria_label}")

    # 2. Verify Tooltip
    print("Hovering to trigger tooltip...")
    send_btn.hover(force=True)
    time.sleep(1) # Wait for animation

    tooltip = page.get_by_role("tooltip")
    expect(tooltip).to_be_visible()
    print(f"Tooltip visible with text: {tooltip.text_content()}")

    print("SUCCESS: Tooltip and ARIA label verified!")
    page.screenshot(path="verification_screenshot.png")

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()
        try:
            test_tooltip_with_mock(page)
        except Exception as e:
            print(f"Test failed: {e}")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    run()
