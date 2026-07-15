from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from playwright.sync_api import Page, expect, sync_playwright


BASE_URL = os.environ.get("ATLAS_BASE_URL", "http://127.0.0.1:3000")
ARTIFACT_DIR = Path(os.environ.get("ATLAS_UI_ARTIFACT_DIR", tempfile.gettempdir()))
PAYLOAD = json.loads((Path(__file__).resolve().parents[1] / "app" / "briefing.generated.json").read_text(encoding="utf-8"))


def assert_no_horizontal_overflow(page: Page) -> None:
    dimensions = page.evaluate(
        """() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        })"""
    )
    assert dimensions["content"] <= dimensions["viewport"] + 1, dimensions


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    console_errors: list[str] = []
    failed_requests: list[str] = []
    summary: dict[str, object] = {}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("requestfailed", lambda request: failed_requests.append(f"{request.method} {request.url}"))
        page.goto(BASE_URL, wait_until="networkidle")

        cards = page.locator(".event-card")
        assert cards.count() == len(PAYLOAD["events"])
        assert_no_horizontal_overflow(page)
        if os.environ.get("ATLAS_UI_SCREENSHOTS") == "1":
            page.screenshot(path=ARTIFACT_DIR / "atlas-desktop.png", full_page=True)

        event_trigger = cards.first.locator("button", has_text="查看完整分析")
        event_trigger.click()
        dialog = page.get_by_role("dialog").first
        assert dialog.is_visible(), {"console_errors": console_errors, "failed_requests": failed_requests}
        detail_heading = dialog.get_by_role("heading", level=2).inner_text()
        assert detail_heading == PAYLOAD["events"][0]["title"], detail_heading
        for heading in ("已确认事实", "驱动与传导", "潜在受益", "承压与反方风险", "下一步验证信号", "证据来源"):
            assert dialog.get_by_role("heading", name=heading).is_visible()
        assert dialog.locator(".detail-sources a").count() >= 1
        page.keyboard.press("Escape")
        assert page.get_by_role("dialog").count() == 0
        assert event_trigger.evaluate("element => document.activeElement === element")

        first_scenario = page.locator(".scenario-item").first
        first_scenario.locator("button").click()
        assert first_scenario.locator(".scenario-detail").is_visible()
        scenario_sources = set(first_scenario.locator(".scenario-sources a").evaluate_all(
            "elements => elements.map(element => element.href)"
        ))
        assert scenario_sources == {source["href"] for source in PAYLOAD["scenarios"][0]["sourceRefs"]}

        page.locator(".portfolio-open").first.click()
        portfolio_dialog = page.get_by_role("dialog", name="US 虚拟组合")
        assert portfolio_dialog.is_visible()
        allocation_count = portfolio_dialog.locator(".allocation-legend span").count()
        assert allocation_count >= 1
        assert portfolio_dialog.locator(".position-row").count() == 0
        assert PAYLOAD["portfolios"]["us"].get("accountId") is None
        portfolio_dialog.get_by_role("button", name="关闭组合详情").click()

        page.get_by_role("button", name="科技", exact=True).click()
        assert cards.count() == sum(item["category"] == "科技" for item in PAYLOAD["events"])
        page.get_by_role("button", name="全部", exact=True).click()
        assert cards.count() == len(PAYLOAD["events"])

        first_watch = page.locator(".checklist input").first
        first_watch_label = page.locator(".checklist label").first
        initially_checked = first_watch.is_checked()
        first_watch_label.click()
        page.reload(wait_until="networkidle")
        assert page.locator(".checklist input").first.is_checked() is (not initially_checked)
        page.locator(".checklist label").first.click()

        summary["desktop"] = {
            "eventCards": cards.count(),
            "detailDialog": "passed",
            "scenarioExpansion": "passed",
            "publicPortfolioAllocations": allocation_count,
            "persistentWatchlist": "passed",
        }

        mobile = browser.new_page(viewport={"width": 390, "height": 844})
        mobile.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        mobile.on("requestfailed", lambda request: failed_requests.append(f"{request.method} {request.url}"))
        mobile.goto(BASE_URL, wait_until="networkidle")
        assert_no_horizontal_overflow(mobile)
        hero_height = mobile.locator(".hero h1").evaluate("element => element.getBoundingClientRect().height")
        assert hero_height <= 380, hero_height
        for selector in (".mobile-nav-button", ".print-button", ".filter-row button", ".event-actions a"):
            target = mobile.locator(selector).first
            size = target.evaluate("element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })")
            assert size["height"] >= 44, (selector, size)
        if os.environ.get("ATLAS_UI_SCREENSHOTS") == "1":
            mobile.screenshot(path=ARTIFACT_DIR / "atlas-mobile.png", full_page=True)
        navigation_button = mobile.get_by_role("button", name="打开报告导航")
        navigation_button.click()
        assert mobile.get_by_role("button", name="关闭报告导航").is_visible()
        assert mobile.locator("#mobile-navigation").is_visible()
        mobile.locator("#mobile-navigation a", has_text="情景推演").click()
        assert mobile.locator("#mobile-navigation").count() == 0

        mobile_event_trigger = mobile.locator(".event-card").first.locator("button", has_text="查看完整分析")
        mobile_event_trigger.click()
        mobile_dialog = mobile.get_by_role("dialog").first
        assert mobile_dialog.is_visible()
        dialog_width = mobile_dialog.evaluate("element => element.getBoundingClientRect().width")
        assert dialog_width <= 390
        mobile.get_by_role("button", name="关闭详细分析").click()
        expect(mobile_event_trigger).to_be_focused()
        assert_no_horizontal_overflow(mobile)

        summary["mobile"] = {
            "viewport": "390x844",
            "navigation": "passed",
            "detailDialog": "passed",
            "horizontalOverflow": False,
        }
        browser.close()

    assert not console_errors, console_errors
    assert not failed_requests, failed_requests
    summary["consoleErrors"] = console_errors
    summary["failedRequests"] = failed_requests
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
