from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            page.goto("http://localhost:5173/test-input")

            # Wait for the input to be visible
            input_field = page.get_by_role("textbox")
            expect(input_field).to_be_visible()

            # Verify placeholder is Turkish
            expect(input_field).to_have_attribute("placeholder", "Mesaj gönder…")

            # Find the send button by ROLE button and name "Mesaj gönder"
            # This avoids the strict mode violation from the span wrapper having the label too
            send_button = page.get_by_role("button", name="Mesaj gönder")
            expect(send_button).to_be_visible()
            expect(send_button).to_be_disabled()

            print("Verified disabled state and aria-label (Turkish).")

            input_field.fill("Merhaba")
            expect(send_button).to_be_enabled()
            print("Verified enabled state.")

            send_button.hover()
            # Tooltip should also be "Mesaj gönder"
            expect(page.get_by_text("Mesaj gönder", exact=True)).to_be_visible()
            print("Verified tooltip.")

            page.screenshot(path="verification/ux_verified.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    run()
