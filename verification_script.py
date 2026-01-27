from playwright.sync_api import Page, expect, sync_playwright
import os

def test_message_input(page: Page):
    try:
        # Go to verification page
        page.goto("http://localhost:5173/verification")

        # Wait for page to be network idle
        page.wait_for_load_state("networkidle")

        # Determine language (English or Turkish) based on placeholder
        # Try finding English placeholder first
        input_en = page.get_by_placeholder("Send a message…")
        input_tr = page.get_by_placeholder("Mesaj gönder…")

        if input_en.is_visible():
            print("Detected English locale")
            input_field = input_en
            send_label = "Send message"
        elif input_tr.is_visible():
            print("Detected Turkish locale")
            input_field = input_tr
            send_label = "Mesaj gönder"
        else:
            print("Could not detect placeholder. Dumping page text.")
            print(page.content())
            page.screenshot(path="/home/jules/verification/debug_unknown_locale.png")
            raise Exception("Could not find input field with expected placeholder")

        expect(input_field).to_be_visible()

        # The button should have aria-label
        send_button = page.get_by_role("button", name=send_label)
        expect(send_button).to_be_visible()
        expect(send_button).to_be_disabled()

        # Take screenshot of disabled state
        page.screenshot(path="/home/jules/verification/message_input_disabled.png")

        # Type something
        input_field.fill("Hello")

        # Check button enabled
        expect(send_button).to_be_enabled()

        # Check tooltip (hover)
        send_button.hover()
        # Wait a bit for tooltip
        page.wait_for_timeout(1000)

        # Take screenshot of enabled state with tooltip
        page.screenshot(path="/home/jules/verification/message_input_enabled.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="/home/jules/verification/error_retry.png")
        raise e

if __name__ == "__main__":
    os.makedirs("/home/jules/verification", exist_ok=True)
    with sync_playwright() as p:
        # Launch with specific args if needed, but default should be fine.
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_message_input(page)
        finally:
            browser.close()
