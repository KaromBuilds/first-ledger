// End-to-end check of the full candidate -> reviewer -> candidate loop in a real browser.
// Usage: BASE_URL=http://localhost:3000 SHOTS=./shots node tests/e2e.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const ANSWERS = {
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
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

// --- Candidate
await page.goto(BASE);
await shot(page, "intro");
await page.getByRole("textbox").first().fill("Ruth (demo)");
await page.getByRole("button", { name: "Empezar" }).click();
await page.getByText("Parte 1").waitFor();

const flag = async (id, cat) => {
  const row = page.locator(".row", { has: page.locator(`input[type=checkbox]`) }).filter({ hasText: id });
  await row.locator("input[type=checkbox]").check();
  await row.locator("select").selectOption(cat);
};
await shot(page, "part1-empty");
await flag("Cheque 0452 · recibo de luz", "book_error");
await flag("Cheque 0453", "outstanding_cheque");
await flag("Depósito venta F-104", "deposit_in_transit");
await flag("Comisión por manejo", "bank_charge");
await flag("Intereses ganados", "bank_interest");
await page.getByLabel("Saldo conciliado al 30 de septiembre").fill("53,824.00");
await shot(page, "part1-filled");
await page.getByRole("button", { name: "Continuar" }).click();

await page.getByText("Algo cambió").waitFor();
const msg = await page.locator(".card.alert .big").innerText();
const twist = /rebotó/.test(msg) ? "returned" : /nómina/.test(msg) ? "duplicate" : "voided";
console.log("twist:", twist);
await shot(page, "twist-empty");
await page.locator("select").selectOption(ANSWERS[twist].cat);
await page.getByLabel("Nuevo saldo conciliado").fill(ANSWERS[twist].bal);
await page.locator("textarea").fill(ANSWERS[twist].text);
await shot(page, "twist-filled");
await page.getByRole("button", { name: "Continuar" }).click();

await page.getByText("Uso de IA").first().waitFor();
await shot(page, "disclose");
await page.getByLabel("No usé IA").check();
await page.getByRole("button", { name: "Ver mi resultado" }).click();
await page.getByText("Tu resultado").waitFor();
await shot(page, "result");

const pills = await page.locator(".pill.warn").count();
if (pills !== 0) fail(`perfect run shows ${pills} warning pills`);

await page.locator("textarea").fill("Todo lo hice desde el celular.");
await page.getByRole("button", { name: "Crear enlace para compartir" }).click();
const shareUrl = await page.getByTestId("share-url").innerText();
await shot(page, "share");
if (!shareUrl.includes("/review#")) fail("no share url");

// --- Tampered link is detected
const tp = await ctx.newPage();
const [base, frag] = shareUrl.split("#");
const [body, sig] = frag.split(".");
const flipped = body.slice(0, 40) + (body[40] === "A" ? "B" : "A") + body.slice(41);
await tp.goto(`${base}#${flipped}.${sig}`);
await tp.getByText("fue modificado").waitFor();
await shot(tp, "tampered");
await tp.close();

// --- Reviewer
const rv = await ctx.newPage();
await rv.goto(shareUrl);
await rv.getByText("Verificado").waitFor();
await shot(rv, "review");
for (const g of ["what_changed", "which_side", "tell_owner"]) await rv.locator(`input[name=${g}]`).first().check();
await rv.locator("input[name=decision]").first().check();
await rv.locator("input[name=added]").first().check();
await rv.getByLabel("Tu nombre").fill("Revisora Demo");
await rv.getByLabel("Tu rol (ej. dueña, contador)").fill("Dueña (demo)");
await rv.getByRole("button", { name: "Firmar y crear enlace de respuesta" }).click();
const replyUrl = await rv.getByTestId("share-url").innerText();
await shot(rv, "review-signed");
if (!replyUrl.includes("/result#")) fail("no reply url");

// --- Candidate sees the review
const rs = await ctx.newPage();
await rs.goto(replyUrl);
await rs.getByText("Revisora Demo").waitFor();
await shot(rs, "final");

if (errors.length) fail(`page errors: ${errors.join(" | ")}`);
console.log("E2E OK");
await browser.close();
