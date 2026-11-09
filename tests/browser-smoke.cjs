const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/tmp/careflow-browser/node_modules/playwright",
);
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5080");
  await page.getByLabel("Email address").fill("admin@careflow.local");
  await page.getByLabel("Password", { exact: true }).fill("CareFlow@Demo2026!");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await page
    .getByRole("heading", { name: "A clearer view of care." })
    .waitFor();
  await page.screenshot({
    path: "docs/screenshots/dashboard.png",
    fullPage: true,
  });
  for (const name of [
    "Patients",
    "Admissions",
    "Bed & ward management",
    "Discharge studio",
    "Follow-ups",
    "Reports",
    "Team access",
  ]) {
    await page.getByRole("button", { name, exact: true }).first().click();
    await page.locator("h1").waitFor();
    if ((await page.locator("#content").innerText()) === "")
      throw Error("Empty page " + name);
  }
  await page.getByRole("button", { name: "Patients", exact: true }).click();
  await page.getByRole("button", { name: "Add patient", exact: true }).click();
  await page.getByLabel("Full name").fill("Browser Demo");
  await page.getByLabel("Medical record number").fill("BROWSER-" + Date.now());
  await page.getByLabel("Date of birth").fill("1994-05-21");
  await page.getByRole("button", { name: "Save patient", exact: true }).click();
  await page.locator("dialog").waitFor({ state: "hidden" });
  await page.getByRole("searchbox").fill("Browser Demo");
  await page.getByText("Browser Demo", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.locator("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("button", { name: "Discharge studio", exact: true })
    .click();
  const select = page.locator("#admission-select");
  const value = await page.evaluate(async () =>
    String(
      (await (await fetch("/api/admissions")).json()).find(
        (a) => !a.dischargedAt,
      ).id,
    ),
  );
  await select.selectOption(value);
  await page
    .getByRole("button", { name: "Generate draft", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.querySelector("#plan-content").value.includes("YOUR CARE SUMMARY"),
  );
  await page
    .getByRole("button", { name: "Save care plan", exact: true })
    .click();
  await page.getByText("Template", { exact: true }).waitFor();
  await page.screenshot({
    path: "docs/screenshots/discharge-studio.png",
    fullPage: true,
  });
  await page
    .getByLabel("I have reviewed these instructions", { exact: false })
    .check();
  await page
    .getByRole("button", { name: "Save care plan", exact: true })
    .click();
  await page.getByText("Reviewed & approved", { exact: true }).waitFor();
  await page.evaluate(() => {
    window.print = () => {};
  });
  await page
    .getByRole("button", { name: "Print / save PDF", exact: true })
    .click();
  await page.pdf({
    path: "docs/sample-care-plan.pdf",
    format: "A4",
    printBackground: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Mobile document overflows");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS desktop navigation, patient creation/search/deletion, discharge generation/save/approval/PDF, mobile layout, zero JavaScript runtime errors",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
