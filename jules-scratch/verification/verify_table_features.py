from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    try:
        # 1. Navigate to the app
        page.goto("http://localhost:8000/") # Updated port for the simple server

        # 2. Wait for the main editor panel and tables to be ready
        editor_panel = page.locator("#editor-panel")
        expect(editor_panel).to_be_visible(timeout=10000)

        elements_table = page.locator("#elements-table-container")
        connections_table = page.locator("#connections-table-container")
        variables_table = page.locator("#variables-table-container")

        expect(elements_table).to_be_visible()
        expect(connections_table).to_be_visible()
        expect(variables_table).to_be_visible()
        print("✅ Multi-table view verified.")

        # 3. Test vertical resizing
        resizer = page.locator('.vertical-resizer[data-table-target="elements-table-container"]')
        resizer_box = resizer.bounding_box()
        page.mouse.move(resizer_box['x'] + resizer_box['width'] / 2, resizer_box['y'] + resizer_box['height'] / 2)
        page.mouse.down()
        page.mouse.move(resizer_box['x'] + resizer_box['width'] / 2, resizer_box['y'] + 100)
        page.mouse.up()
        print("✅ Vertical resizing tested.")

        # 4. Test column hiding
        columns_button = connections_table.locator('[data-action="toggle-columns"]')
        columns_button.click()

        popup = page.locator('.column-toggle-popup[data-table="connections"]')
        expect(popup).to_be_visible()

        # Hide the 'From' column
        popup.locator('label', has_text='From').locator('input').uncheck()
        print("✅ Column hiding tested.")

        # 5. Test maximizing a table
        maximize_button = variables_table.locator('[data-action="toggle-maximize"]')
        maximize_button.click()
        expect(variables_table).to_have_class( "table-container maximized")
        expect(elements_table).to_be_hidden()
        print("✅ Maximize feature verified.")

        # 6. Take a screenshot of the final state
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("📸 Screenshot captured.")

    except Exception as e:
        print(f"❌ Verification failed: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)