import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the landing page
        try:
            await page.goto("http://localhost:5173", timeout=60000)

            # Wait for the main heading to be visible
            await page.wait_for_selector("h1", timeout=30000)

            # Take a screenshot of the landing page
            await page.screenshot(path="verification_landing.png", full_page=True)
            print("Screenshot saved to verification_landing.png")

        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="verification_error.png")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
