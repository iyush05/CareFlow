const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "/tmp/careflow-browser/node_modules/playwright");

const markdown = "# Your stay\n\nA **synthetic** care plan.\n\n## Your care instructions\n\n- Keep the supplied **5 mg** dose.\n- Ask your care team about *questions*.\n  - Bring your notes.\n\n## Follow-up\n\n1. Confirm your appointment.\n2. Bring this plan.\n\n| Item | Detail |\n| --- | --- |\n| Reminder | As instructed |\n\nContact your care team for details.";
const generated = markdown.replace("# Your stay", "# Generated plan");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let plan = { id: 1, admissionId: 1, content: markdown, approved: false, source: "AI draft" };
    // Intercept every API call: this test never changes clinical records or calls an LLM.
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api/", "");
      let data;
      if (path === "auth/me") data = { name: "Test Clinician", role: "Admin" };
      else if (path === "auth/csrf") data = { token: "test-token" };
      else if (path === "patients") data = [{ id: 1, name: "Synthetic Patient", medicalRecordNumber: "TEST-ONLY" }];
      else if (path === "admissions") data = [{ id: 1, patientId: 1, bedId: 1, diagnosis: "Synthetic test", admittedAt: "2026-11-01T09:00:00Z", priority: "Routine" }];
      else if (path === "notes") data = [{ id: 1, admissionId: 1, instructions: "Synthetic instructions." }];
      else if (path === "followups") data = [];
      else if (path === "plans") data = [plan];
      else if (path === "plans/1" && route.request().method() === "PUT") data = plan = route.request().postDataJSON();
      else if (path === "hospital/generate-plan") data = { content: generated, source: "AI draft", approved: false };
      else if (path === "hospital/lookups") data = { departments: [], wards: [], beds: [], demo: true };
      else if (path === "hospital/analytics") data = { totalBeds: 1, occupied: 1, admissions: 1, days: 30, readmissionRate: null, readmitted: 0, cohortCount: 0, averageStay: 0, wards: [], series: [{ date: "2026-11-01", admissions: 1, occupied: 1 }, { date: "2026-11-02", admissions: 0, occupied: 1 }] };
      else throw Error("Unexpected API request: " + path);
      await route.fulfill({ json: data });
    });
    const openPlan = async () => {
      await page.getByRole("button", { name: "Discharge studio", exact: true }).click();
      await page.locator("#admission-select").selectOption("1");
    };
    await page.goto(process.env.CAREFLOW_URL || "http://localhost:5080");
    await openPlan();
    const preview = page.locator("#print-content");
    assert.equal(await preview.locator("h1").innerText(), "Your stay");
    assert.equal(await preview.locator("strong").nth(1).innerText(), "5 mg");
    assert.equal(await preview.locator("ul ul li").innerText(), "Bring your notes.");
    assert.equal(await preview.locator("ol > li").count(), 2);
    assert.equal(await preview.locator("table tbody tr").count(), 1);
    assert.equal(await page.locator("#plan-content").isVisible(), false);
    assert.equal(await page.locator("#plan-content").inputValue(), markdown);
    assert(!/\*\*|^#{1,6} /m.test(await preview.innerText()));

    await page.evaluate(() => { window.printCalls = 0; window.print = () => window.printCalls++; });
    await page.locator("#print-plan").click();
    assert.equal(await page.evaluate(() => window.printCalls), 0);
    await page.locator("#generation-mode").selectOption("ai");
    await page.locator("#generate").click();
    await preview.getByRole("heading", { name: "Generated plan" }).waitFor();
    await page.locator("#edit-plan").click();
    const edited = generated + "\n\nEdited instruction.";
    await page.locator("#approve").check();
    await page.locator("#plan-content").fill(edited);
    assert.equal(await page.locator("#approve").isChecked(), false);
    assert((await preview.innerText()).includes("Edited instruction."));
    await page.locator("#edit-plan").click();
    assert.equal(await page.locator("#plan-content").isVisible(), false);
    await page.locator("#approve").check();
    await page.locator("#save-plan").click();
    await page.getByText("Reviewed & approved", { exact: true }).waitFor();
    assert.equal(plan.content, edited);

    await page.reload();
    await openPlan();
    await page.evaluate(() => { window.printCalls = 0; window.print = () => window.printCalls++; });
    const screenText = await preview.innerText();
    await page.locator("#print-plan").click();
    assert.equal(await page.evaluate(() => window.printCalls), 1);
    await page.emulateMedia({ media: "print" });
    assert.equal(await preview.isVisible(), true);
    assert.equal(await page.locator("#edit-plan").isVisible(), false);
    assert.equal(await page.locator("#plan-content").isVisible(), false);
    assert.equal(await preview.innerText(), screenText);
    await page.pdf({ path: "/tmp/careflow-formatted-plan.pdf", format: "A4", printBackground: true });
    await page.screenshot({ path: "/tmp/careflow-formatted-plan-print.png", fullPage: true });
    await page.emulateMedia({ media: "screen" });

    const safety = await page.evaluate(() => {
      const node = document.createElement("div");
      node.innerHTML = renderCarePlan('# Test\n\n<script>alert(1)</script><img src="/leak" onerror="alert(1)"><svg onload="alert(1)"></svg><a href="javascript:alert(1)">Unsafe</a><p id="approve" style="display:none">Keep this text</p>\n\n[Bad](javascript:alert)');
      return { forbidden: node.querySelectorAll("script,img,svg,iframe,[onerror],[onload],[style],[id],a[href^='javascript:']").length, text: node.textContent };
    });
    assert.equal(safety.forbidden, 0);
    assert(safety.text.includes("Keep this text"));
    const plain = await page.evaluate(() => {
      const node = document.createElement("div");
      node.innerHTML = renderCarePlan("YOUR CARE SUMMARY\nKeep 1.5 mg exactly as supplied.\nConfirm if value < 5.\n\nFOLLOW-UP\nContact the care team.");
      return { text: node.textContent, breaks: node.querySelectorAll("br").length };
    });
    assert(plain.text.includes("1.5 mg") && plain.text.includes("value < 5"));
    assert.equal(plain.breaks, 3);
    await page.screenshot({ path: "/tmp/careflow-formatted-plan-screen.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log("PASS saved/generated Markdown, editing, approval, save/reload, formatted print/PDF, plain text, sanitization, and mobile layout.");
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exit(1); });
