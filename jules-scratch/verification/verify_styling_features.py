from playwright.sync_api import sync_playwright, Page, expect

def verify_styling(page: Page):
    """
    This script verifies the new styling features by selecting a node
    and applying various styles from the new symbology toolbar.
    It includes enhanced debugging by capturing console logs and taking a failure screenshot.
    """
    # Capture console messages for debugging
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

    try:
        # 1. Navigate to the application
        page.goto("http://localhost:5173/")

        # 2. Wait for the data to be loaded by checking for the "Indeed" row in the table.
        # This is a more reliable signal than waiting for SVG elements to render.
        elements_table = page.locator("#nodes-table")
        indeed_row = elements_table.locator("td").get_by_text("indeed", exact=True)
        expect(indeed_row).to_be_visible(timeout=15000)

        # 3. Now that the data is loaded, find and select the "Indeed" node in the graph.
        # We use force=True to bypass actionability checks, as the node might be small or obscured.
        node_selector = f"//g[contains(@class, 'node') and .//text[contains(text(),'Indeed')]]"
        indeed_node = page.locator(node_selector).first
        indeed_node.click(force=True)

        # 4. Verify the click was successful by checking the SQL input
        sql_input = page.locator("#sql-input")
        expect(sql_input).to_have_value("SELECT * FROM Elements WHERE id = 'indeed'")

        # 4. Apply a new shape
        page.locator("#shape-btn").click()
        shape_picker = page.locator("#shape-picker-popup")
        expect(shape_picker).to_be_visible()
        shape_picker.locator("[data-shape='star']").click()

        # 5. Apply a new border width
        page.locator("#border-width-input").fill("5")

        # 6. Apply font styles
        page.locator("#font-size-input").fill("16")
        page.locator("#font-bold-btn").click()
        page.locator("#font-italic-btn").click()

        # 7. Change text location
        page.locator("#text-location-btn").click()
        location_picker = page.locator("#text-location-picker-popup")
        expect(location_picker).to_be_visible()
        location_picker.locator("[data-location='top-right']").click()

        page.wait_for_timeout(500)

        # 8. Take a success screenshot
        page.screenshot(path="jules-scratch/verification/styling_verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/failure_screenshot.png")
        # Re-raise the exception to ensure the script exits with a non-zero code
        raise

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_styling(page)
        browser.close()

if __name__ == "__main__":
    main()