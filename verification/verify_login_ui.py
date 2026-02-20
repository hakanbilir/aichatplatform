from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to login page
        print("Navigating to login page...")
        page.goto("http://localhost:5173/auth/login")

        # Wait for Kinetic Typography
        print("Waiting for kinetic typography...")
        page.wait_for_selector(".kinetic-typography")

        # Wait for Specular Button
        print("Waiting for specular button...")
        page.wait_for_selector(".specular-button")

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/login_page.png")
        print("Screenshot saved to verification/login_page.png")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
