import time
import json
import re
from playwright.sync_api import sync_playwright

def run():
    print("Starting verification...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            locale='en-US',
            permissions=['clipboard-read', 'clipboard-write'],
            viewport={'width': 1280, 'height': 720}
        )

        page = context.new_page()

        # Enhanced logging
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        # Common CORS headers
        cors_headers = {
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept-Language",
            "Access-Control-Allow-Credentials": "true"
        }

        # Handle OPTIONS requests globally for the API domain
        page.route("*://localhost:4000/**", lambda route: (
            route.fulfill(status=200, headers=cors_headers)
            if route.request.method == "OPTIONS"
            else route.fallback()
        ))

        # Mocks
        page.route("*://localhost:4000/auth/me", lambda route: (
            print(f"MOCK HIT: auth/me"),
            route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps({
                "user": {"id": "user-123", "email": "test@example.com", "name": "Test User", "isSuperadmin": False},
                "activeOrg": {"id": "org-123", "name": "Test Org", "slug": "test-org", "role": "admin"},
                "organizations": [{"id": "org-123", "name": "Test Org", "slug": "test-org", "role": "admin"}]
            }))
        ))
        page.route("*://localhost:4000/orgs", lambda route: (
            route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps({"organizations": [{"id": "org-123", "name": "Test Org", "slug": "test-org", "role": "admin"}]}))
        ))
        page.route("*://localhost:4000/orgs/*/knowledge/spaces", lambda route: (
            print(f"MOCK HIT: spaces"),
            route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps({"spaces": [{"id": "space-1", "name": "General", "description": "General knowledge", "isDefault": True, "slug": "general"}]}))
        ))
        page.route("*://localhost:4000/orgs/*/knowledge/retrieve*", lambda route: (
            print(f"MOCK HIT: retrieve"),
            route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps({
                "chunks": [{"chunkId": "chunk-1", "text": "This is a test chunk content to copy.", "score": 0.95, "metadata": {"source": "manual"}, "document": {"title": "Test Doc", "type": "text"}}],
                "total": 1
            }))
        ))

        # Correctly mock Search to avoid crashes if it's called
        page.route("*://localhost:4000/orgs/*/search", lambda route: (
             print(f"MOCK HIT: search (global/inbox)"),
             route.fulfill(
                status=200,
                headers=cors_headers,
                content_type="application/json",
                body=json.dumps({
                    "total": 0,
                    "page": 0,
                    "pageSize": 20,
                    "hits": []
                })
             )
        ))

        page.route("*://localhost:4000/conversations*", lambda route: route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps({"conversations": []})))
        page.route("*://localhost:4000/ai-context", lambda route: route.fulfill(status=200, headers=cors_headers, body="{}"))

        # Setup Token
        print("Setting up auth token...")
        try:
            page.goto("http://localhost:5173/auth/login")
            page.wait_for_load_state("networkidle")
            page.evaluate("localStorage.setItem('ai_chat_auth_token', 'fake-token')")
            page.evaluate("localStorage.setItem('i18nextLng', 'en-US')")
        except Exception as e:
            print(f"Setup failed: {e}")

        # Navigate
        print("Navigating...")
        page.goto("http://localhost:5173/app/orgs/org-123/knowledge")

        try:
            page.wait_for_load_state("networkidle", timeout=5000)
        except:
            pass

        # Debugging layout
        print("Taking debug screenshot...")
        page.screenshot(path="/home/jules/verification/debug_layout.png")

        inputs = page.locator("input").all()
        print(f"Found {len(inputs)} inputs.")
        for i, inp in enumerate(inputs):
            print(f"Input {i}: placeholder='{inp.get_attribute('placeholder')}', type='{inp.get_attribute('type')}'")

        # Check for search input
        print("Looking for search input...")
        try:
            # Try to identify the correct input from the list logic above or assume logic
            # Knowledge search usually has placeholder "Search knowledge..." or similar
            # In Turkish "Bilgi tabanında ara..."?

            # We will use the one inside a card that is NOT the first card (spaces) if spaces are in a card?
            # Actually, let's just pick the last text input, as it's likely the search box in the main area
            search_input = page.locator("input[type='text']").last
            search_input.wait_for(state="visible", timeout=10000)
            print(f"Selected input placeholder: {search_input.get_attribute('placeholder')}")

            # Type
            search_input.click()
            search_input.type("test", delay=100)

            # Press Enter
            print("Pressing Enter...")
            search_input.press("Enter")

            # Also try clicking the button
            card = page.locator("div.MuiCard-root", has=search_input)
            search_btn = card.locator("button.MuiButton-contained").first

            time.sleep(1)
            if search_btn.is_enabled():
                print("Button enabled, clicking...")
                search_btn.click()
            else:
                print("Button disabled.")

        except Exception as e:
            print(f"Interaction error: {e}")
            page.screenshot(path="/home/jules/verification/failure_search_interaction.png")
            browser.close()
            exit(1)

        # Check results
        print("Waiting for results...")
        try:
            chunk_locator = page.locator("text=This is a test chunk content to copy.")
            chunk_locator.wait_for(state="visible", timeout=10000)
            print("Chunk found.")

            # Click copy
            # Find the card with the text
            result_card = page.locator("div.MuiCard-root", has_text="This is a test chunk content to copy.").last
            # The copy button is the IconButton in that card.
            # We can use the tooltip text? "Copy content" or "Kopyala"?

            copy_btn = result_card.locator("button").last
            copy_btn.click()
            print("Clicked copy.")

            # Verify clipboard
            time.sleep(0.5)
            content = page.evaluate("navigator.clipboard.readText()")
            if content == "This is a test chunk content to copy.":
                print("VERIFICATION SUCCESSFUL")
            else:
                print(f"VERIFICATION FAILED: Clipboard has '{content}'")
                exit(1)

        except Exception as e:
            print(f"Error checking results: {e}")
            page.screenshot(path="/home/jules/verification/failure_results.png")
            browser.close()
            exit(1)

        browser.close()

if __name__ == "__main__":
    run()
