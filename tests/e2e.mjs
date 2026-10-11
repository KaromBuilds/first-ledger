// End-to-end check of the full candidate -> reviewer -> candidate loop in a real browser.
// Usage: BASE_URL=http://localhost:3000 SHOTS=./shots node tests/e2e.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const L = {
  es: { start: "Empezar", part1: "Parte 1", bal1: "Saldo conciliado al 30 de septiembre", cont: "Continuar", twist: "Algo cambió", bal2: "Saldo conciliado después del cambio (puede quedar igual)", ai: "Uso de IA", noai: "No usé IA", submit: "Ver mi resultado", result: "Tu resultado", share: "Crear enlace para compartir", tamper: "fue modificado", verified: "Verificado", name: "Tu nombre", role: "Tu rol (ej. dueña, contador)", sign: "Firmar y crear enlace de respuesta",
        rows: ["Cheque 0452 · recibo de luz", "Cheque 0453", "Depósito venta F-104", "Comisión por manejo", "Intereses ganados"], reRet: /rebotó/, reDup: /nómina/ },
  en: { start: "Start", part1: "Part 1", bal1: "Reconciled balance on Sep 30", cont: "Continue", twist: "Something changed", bal2: "Reconciled balance after the change (it may stay the same)", ai: "AI use", noai: "I didn't use AI", submit: "See my result", result: "Your result", share: "Create a share link", tamper: "was edited", verified: "Verified", name: "Your name", role: "Your role (e.g. owner, accountant)", sign: "Sign and create reply link",
        rows: ["Cheque 0452 · electricity bill", "Cheque 0453", "Sale deposit F-104", "Account fee", "Interest earned"], reRet: /bounced/, reDup: /payroll/ },
};
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const ANSWERS_EN = {
  returned: { cat: "returned_cheque", bal: "47,374", text: "The bank returned the customer's cheque from sale F-103 because it bounced. That money isn't there anymore, so I take it out of the books. I'd tell the owner she needs to collect from the customer again." },
  duplicate: { cat: "bank_error", bal: "53,824", text: "The bank charged payroll twice, so it's the bank's error. I don't touch the books; I add it back on the bank side. I'd tell the owner to call the bank and have them reverse the charge." },
  voided: { cat: "voided_cheque", bal: "57,724", text: "Cheque 0453 was cancelled and never handed over, so it's no longer outstanding. I reverse it in the books by adding back the 3,900. I'd tell the owner she still owes Fletes Ruiz for the freight." },
};
const ANSWERS_ES = {
  returned: { cat: "returned_cheque", bal: "47,374", text: "El banco nos regresó el cheque del cliente de la venta F-103 porque rebotó. Ese dinero ya no está, así que lo resto en los libros. Le diría a la dueña que hay que volver a cobrarle al cliente." },
  duplicate: { cat: "bank_error", bal: "53,824", text: "El banco cobró la nómina dos veces, es un error del banco. No toco los libros, lo sumo de regreso del lado del banco. Le diría a la dueña que llame al banco para que reviertan el cargo." },
  voided: { cat: "voided_cheque", bal: "57,724", text: "El cheque 0453 se canceló y nunca se entregó, entonces ya no es cheque en circulación. Lo regreso en los libros sumando los 3,900. Le diría a la dueña que todavía le debe el flete a Fletes Ruiz." },
};

let n = 0;
const shot = async (page, name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, "0")}-${name}.png`, fullPage: true });
};
const fail = (msg) => {
  console.error("FAIL:", msg);
  process.exit(1);
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const LANG = process.env.LANG_UI === "es" ? "es" : "en";
await ctx.addInitScript((l) => { try { localStorage.setItem("fl-lang", l); } catch {} }, LANG);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

// --- Candidate
await page.goto(BASE);
await shot(page, "intro");
await page.getByRole("textbox").first().fill("Ruth (demo)");
await page.getByRole("button", { name: L[LANG].start }).click();
await page.getByText(L[LANG].part1).waitFor();

const flag = async (id, cat) => {
  const row = page.locator(".row", { has: page.locator(`input[type=checkbox]`) }).filter({ hasText: id });
  await row.locator("input[type=checkbox]").check();
  await row.locator("select").selectOption(cat);
};
await shot(page, "part1-empty");
const cats = ["book_error", "outstanding_cheque", "deposit_in_transit", "bank_charge", "bank_interest"];
for (let i = 0; i < 5; i++) await flag(L[LANG].rows[i], cats[i]);
await page.getByLabel(L[LANG].bal1).fill("53,824.00");
await shot(page, "part1-filled");
await page.getByRole("button", { name: L[LANG].cont }).click();

await page.getByText(L[LANG].twist).waitFor();
const msg = await page.locator(".card.alert .big").innerText();
const twist = L[LANG].reRet.test(msg) ? "returned" : L[LANG].reDup.test(msg) ? "duplicate" : "voided";
console.log("twist:", twist);
const ANSWERS = LANG === "en" ? ANSWERS_EN : ANSWERS_ES;
await shot(page, "twist-empty");
await page.locator("select").selectOption(ANSWERS[twist].cat);
await page.getByLabel(L[LANG].bal2).fill(ANSWERS[twist].bal);
await page.locator("textarea").fill(ANSWERS[twist].text);
await shot(page, "twist-filled");
await page.getByRole("button", { name: L[LANG].cont }).click();

await page.getByText(L[LANG].ai).first().waitFor();
await shot(page, "disclose");
await page.getByLabel(L[LANG].noai).check();
await page.getByRole("button", { name: L[LANG].submit }).click();
await page.getByText(L[LANG].result).waitFor();
await shot(page, "result");

const pills = await page.locator(".pill.warn").count();
if (pills !== 0) fail(`perfect run shows ${pills} warning pills`);

await page.locator("textarea").fill(LANG === "en" ? "I did everything on my phone." : "Todo lo hice desde el celular.");
await page.getByRole("button", { name: L[LANG].share }).click();
const shareUrl = await page.getByTestId("share-url").innerText();
await shot(page, "share");
if (!shareUrl.includes("/review#")) fail("no share url");

// --- Tampered link is detected
const tp = await ctx.newPage();
const [base, frag] = shareUrl.split("#");
const [body, sig] = frag.split(".");
const flipped = body.slice(0, 40) + (body[40] === "A" ? "B" : "A") + body.slice(41);
await tp.goto(`${base}#${flipped}.${sig}`);
await tp.getByText(L[LANG].tamper).waitFor();
await shot(tp, "tampered");
await tp.close();

// --- Reviewer
const rv = await ctx.newPage();
await rv.goto(shareUrl);
await rv.getByText(L[LANG].verified).waitFor();
await shot(rv, "review");
for (const g of ["what_changed", "which_side", "tell_owner"]) await rv.locator(`input[name=${g}]`).first().check();
await rv.locator("input[name=decision]").first().check();
await rv.locator("input[name=added]").first().check();
await rv.getByLabel(L[LANG].name).fill("Demo Reviewer");
await rv.getByLabel(L[LANG].role).fill("Owner (demo)");
await rv.getByRole("button", { name: L[LANG].sign }).click();
const replyUrl = await rv.getByTestId("share-url").innerText();
await shot(rv, "review-signed");
if (!replyUrl.includes("/result#")) fail("no reply url");

// --- Candidate sees the review
const rs = await ctx.newPage();
await rs.goto(replyUrl);
await rs.getByText("Demo Reviewer").waitFor();
await shot(rs, "final");

if (errors.length) fail(`page errors: ${errors.join(" | ")}`);
console.log("E2E OK");
await browser.close();
