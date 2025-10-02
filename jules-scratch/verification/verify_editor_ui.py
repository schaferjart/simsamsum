from playwright.sync_api import sync_playwright, Page, expect
import json
import time

def run_verification(page: Page):
    """
    This script performs a full end-to-end verification of the editor UI.
    """
    # Listen for console messages and errors
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PAGE_ERROR: {err}"))

    # 1. Navigate and wait for the graph to load
    page.goto("http://localhost:5173/")
    expect(page.locator(".node").first).to_be_visible(timeout=20000)

    # --- Test Node Selection and Styling ---
    print("Testing Node Selection and Styling...")

    # 2. Use SQL to select "Pre Call SMS"
    sql_input = page.locator("#sql-command-input")
    expect(sql_input).to_be_visible()
    sql_input.fill("SELECT * FROM ? WHERE name = 'Pre Call SMS'")
    sql_input.press("Enter")
    expect(page.locator("#selection-status-bar")).to_contain_text("Selected 1 element(s)")

    # 3. Style the selected node (Green Diamond)
    page.locator("#shape-select").select_option("diamond")
    page.locator("#color-picker").fill("#00ff00") # Green

    # --- Test Bidirectional Selection and Link Styling ---
    print("Testing Bidirectional Selection and Link Styling...")

    # 4. Click on "AI Call" IN THE TABLE to test bidirectional selection
    page.locator('#nodes-table >> text="AI Call"').click()
    expect(sql_input).to_have_value("SELECT * FROM ? WHERE id IN ('ai_call')")

    # 5. Style the connected links (Curved, Blue)
    page.locator("#shape-select").select_option("curved")
    page.locator("#color-picker").fill("#0000ff") # Blue

    # --- Test Clearing Selection with the new button ---
    print("Testing Clearing Selection...")

    # 6. Clear selection using the new button
    page.locator("#clear-selection-btn").click()

    # 7. Verify selection is cleared
    expect(page.locator("#selection-status-bar")).to_contain_text("No elements selected.")

    # 8. Take the final verification screenshot
    print("Taking screenshot...")
    page.screenshot(path="jules-scratch/verification/final-verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        run_verification(page)
        browser.close()

if __name__ == "__main__":
    main()