import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = browser.new_page()

    # Capture and print all browser console messages
    page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

    try:
        # 1. Navigate to the app
        page.goto("http://localhost:5173/")

        # 2. Wait for the graph to load by checking for a specific node
        indeed_node_locator = page.locator(".node-group", has_text=re.compile(r"^Indeed$"))
        expect(indeed_node_locator).to_be_visible(timeout=15000) # Increased timeout

        # Get initial node count
        initial_node_count = page.locator(".node-group").count()
        print(f"Initial node count: {initial_node_count}")

        # 3. Verify Option+Drag duplication
        print("Testing Option/Alt+Drag duplication...")
        indeed_node_bb = indeed_node_locator.bounding_box()

        # Perform the drag with the 'alt' modifier
        page.mouse.move(indeed_node_bb['x'] + indeed_node_bb['width'] / 2, indeed_node_bb['y'] + indeed_node_bb['height'] / 2)
        page.mouse.down()
        page.keyboard.down('Alt')
        page.mouse.move(indeed_node_bb['x'] + 150, indeed_node_bb['y'] + 150)
        page.keyboard.up('Alt')
        page.mouse.up()

        # Assert that a new node was created
        duplicated_node_locator = page.locator(".node-group", has_text=re.compile(r"Indeed \(Copy\)"))
        expect(duplicated_node_locator).to_be_visible()
        print("Duplication successful.")

        # 4. Verify Cmd/Ctrl+C and Cmd/Ctrl+V paste
        print("Testing Copy/Paste...")
        text_app_node_locator = page.locator(".node-group", has_text=re.compile(r"^Text Application$"))
        expect(text_app_node_locator).to_be_visible()

        text_app_node_locator.click()

        modifier = 'Meta' if page.evaluate('navigator.platform.includes("Mac")') else 'Control'
        page.keyboard.press(f'{modifier}+C')
        print("Copy command sent.")

        page.keyboard.press(f'{modifier}+V')
        print("Paste command sent.")

        pasted_node_locator = page.locator(".node-group", has_text=re.compile(r"Text Application \(Copy\)"))
        expect(pasted_node_locator).to_be_visible()
        print("Paste successful.")

        # Final check on node count
        final_node_count = page.locator(".node-group").count()
        print(f"Final node count: {final_node_count}")
        expect(page.locator(".node-group")).to_have_count(initial_node_count + 2)

        # 5. Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot taken.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
        print("Error screenshot taken.")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)