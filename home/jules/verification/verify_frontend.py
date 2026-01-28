from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Mock APIs
        # Auth Me
        page.route("**/auth/me", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"user": {"id": "u1", "email": "test@example.com", "name": "Test User", "isSuperadmin": false}}'
        ))

        # Top Users
        page.route("**/orgs/org-1/analytics/top-users*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"topUsers": [{"userId": "u1", "requestCount": 100, "inputTokens": 5000, "outputTokens": 2000, "estimatedCostMicros": 100000, "user": {"name": "Test User", "email": "test@example.com"}}]}'
        ))

        # SSE stream
        sse_data = """event: status
data: "processing"

data: {"totals":{"requestCount":1234,"inputTokens":50000,"outputTokens":25000,"estimatedCostMicros":500000}}

"""
        page.route("**/orgs/org-1/analytics/stream*", lambda route: route.fulfill(
            status=200,
            content_type="text/event-stream",
            body=sse_data
        ))

        # Set fake token
        page.goto("http://localhost:5173/auth/login")
        page.evaluate("localStorage.setItem('ai_chat_auth_token', 'fake-token')")

        # Go to dashboard
        page.goto("http://localhost:5173/test-dashboard/org-1")

        # Wait for Kinetic elements
        try:
            # Wait for h1 to appear (KineticTypography)
            page.wait_for_selector("h1.kinetic-typography", timeout=15000)
            # Wait for grid
            page.wait_for_selector(".bento-grid", timeout=15000)
            # Wait for panels
            page.wait_for_selector(".kinetic-glass-panel", timeout=15000)
        except Exception as e:
            print(f"Error waiting for selectors: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
            browser.close()
            return

        # Take screenshot
        os.makedirs("/home/jules/verification", exist_ok=True)
        page.screenshot(path="/home/jules/verification/verification.png")
        print("Screenshot taken.")
        browser.close()

if __name__ == "__main__":
    run()
