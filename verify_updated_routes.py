import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 720})

        await page.goto("http://localhost:8088/gci-admin/index.html")
        await page.wait_for_selector("a[href='#agenda-rutas']")

        # Click on Agenda de Rutas
        await page.click("a[href='#agenda-rutas']")
        await page.wait_for_selector(".routes-module")

        # Select Dept and Muni
        await page.select_option("#route-dept-select", "Quetzaltenango")
        await page.wait_for_timeout(300)
        await page.select_option("#route-muni-select", "Quetzaltenango (Xela)")
        await page.wait_for_timeout(300)

        # Click Planificar Ruta del Día
        await page.click("#btn-plan-route-now")
        await page.wait_for_timeout(1000)

        os.makedirs("/tmp/screenshots", exist_ok=True)
        await page.screenshot(path="/tmp/screenshots/routes_muni_origin.png")
        print("Screenshot saved to /tmp/screenshots/routes_muni_origin.png")

        await browser.close()

asyncio.run(run())
