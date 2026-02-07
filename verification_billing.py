from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()

    # Mock API responses
    def handle_route(route):
        request = route.request
        url = request.url

        # Only mock API requests (port 4000)
        if "localhost:4000" not in url:
            route.continue_()
            return

        print(f"API Request: {url}")

        if "/auth/me" in url:
            print("Mocking /auth/me")
            route.fulfill(status=200, content_type="application/json", body='{"user": {"id": "user1", "email": "test@example.com", "name": "Test User"}, "activeOrg": {"id": "org1", "name": "Test Org", "role": "OWNER"}, "token": "fake-token"}')
            return

        if "/billing/plans" in url:
            print("Mocking /billing/plans")
            route.fulfill(status=200, content_type="application/json", body='{"plans": [{"id": "plan1", "name": "Basic Plan", "monthlyPriceMinor": 1000, "description": "Basic features", "currency": "TRY"}, {"id": "plan2", "name": "Pro Plan", "monthlyPriceMinor": 2000, "description": "Pro features", "currency": "TRY"}]}')
            return

        if "/orgs/org1/billing" in url and "change-plan" not in url:
             print("Mocking /orgs/org1/billing")
             route.fulfill(status=200, content_type="application/json", body='{"subscription": {"id": "sub1", "orgId": "org1", "planId": "plan1", "status": "active", "plan": {"id": "plan1", "name": "Basic Plan", "monthlyPriceMinor": 1000, "currency": "TRY"}}}')
             return

        if "/orgs/org1/billing/change-plan" in url:
             print("Mocking /orgs/org1/billing/change-plan")
             route.fulfill(status=200, content_type="application/json", body='{"checkoutToken": "token123", "merchantOid": "oid123"}')
             return

        route.continue_()

    # Apply route handler to all requests
    context.route("**/*", handle_route)

    page = context.new_page()

    # Visit the site to set local storage
    page.goto("http://localhost:5173")

    # Set auth token
    page.evaluate("window.localStorage.setItem('ai_chat_auth_token', 'fake-token')")

    # Navigate to billing page
    # Correct path is /app/orgs/org1/billing
    page.goto("http://localhost:5173/app/orgs/org1/billing")

    # Wait for the "Available plans" section or specific plan name
    try:
        page.wait_for_selector("text=Pro Plan", timeout=10000)
    except Exception as e:
        page.screenshot(path="verification_failure.png")
        print("Failed to find 'Pro Plan'")
        raise e

    # Find the "Select plan" button for Pro Plan (plan2)
    select_button = page.get_by_role("button", name="Select plan").first
    select_button.click()

    # Expect error message
    try:
        err_msg = page.get_by_text("Payment gateway not initialized")
        err_msg.wait_for(timeout=5000)
    except Exception as e:
        page.screenshot(path="verification_failure_error.png")
        print("Failed to find error message")
        raise e

    # Take screenshot of the error state
    page.screenshot(path="verification_billing.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
