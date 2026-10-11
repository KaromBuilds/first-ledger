// Verified task bank. All data is FICTIONAL (demo business, demo amounts).
// Amounts are integer cents to avoid floating-point errors.

export type Lang = "es" | "en";
export type Side = "ledger" | "bank";
export type Bilingual = { es: string; en: string };

export type Category =
  | "deposit_in_transit"
  | "outstanding_cheque"
  | "bank_charge"
  | "bank_interest"
  | "book_error"
  | "returned_cheque"
  | "bank_error"
  | "voided_cheque";

export const CATEGORIES: Category[] = [
  "deposit_in_transit",
  "outstanding_cheque",
  "bank_charge",
  "bank_interest",
  "book_error",
  "returned_cheque",
  "bank_error",
  "voided_cheque",
];

export type Line = { id: string; side: Side; date: string; desc: Bilingual; amount: number };

export const TASK_ID = "recon-sep-2026-v1";

export const BUSINESS: Bilingual = {
  es: "Costales y Rafia La Esperanza (negocio ficticio de demostración)",
  en: "Costales y Rafia La Esperanza (fictional demo business)",
};

export const OPENING_BALANCE = 4_820_000; // $48,200.00 on Sep 1, same in books and bank

export const LEDGER: Line[] = [
  { id: "L1", side: "ledger", date: "03-sep", desc: { es: "Depósito venta F-101", en: "Sale deposit F-101" }, amount: 1_250_000 },
  { id: "L2", side: "ledger", date: "06-sep", desc: { es: "Cheque 0451 · Rafia del Centro (proveedor)", en: "Cheque 0451 · Rafia del Centro (supplier)" }, amount: -870_000 },
  { id: "L3", side: "ledger", date: "10-sep", desc: { es: "Depósito venta F-102", en: "Sale deposit F-102" }, amount: 980_000 },
  { id: "L4", side: "ledger", date: "14-sep", desc: { es: "Transferencia nómina", en: "Payroll transfer" }, amount: -1_500_000 },
  { id: "L5", side: "ledger", date: "18-sep", desc: { es: "Cheque 0452 · recibo de luz", en: "Cheque 0452 · electricity bill" }, amount: -234_000 },
  { id: "L6", side: "ledger", date: "25-sep", desc: { es: "Depósito venta F-103", en: "Sale deposit F-103" }, amount: 645_000 },
  { id: "L7", side: "ledger", date: "29-sep", desc: { es: "Cheque 0453 · Fletes Ruiz (transportista)", en: "Cheque 0453 · Fletes Ruiz (freight carrier)" }, amount: -390_000 },
  { id: "L8", side: "ledger", date: "30-sep", desc: { es: "Depósito venta F-104", en: "Sale deposit F-104" }, amount: 720_000 },
];

export const BANK: Line[] = [
  { id: "B1", side: "bank", date: "03-sep", desc: { es: "Depósito en efectivo", en: "Cash deposit" }, amount: 1_250_000 },
  { id: "B2", side: "bank", date: "07-sep", desc: { es: "Cheque 0451 cobrado", en: "Cheque 0451 cashed" }, amount: -870_000 },
  { id: "B3", side: "bank", date: "10-sep", desc: { es: "Depósito en efectivo", en: "Cash deposit" }, amount: 980_000 },
  { id: "B4", side: "bank", date: "14-sep", desc: { es: "SPEI enviado · nómina", en: "SPEI transfer · payroll" }, amount: -1_500_000 },
  { id: "B5", side: "bank", date: "19-sep", desc: { es: "Cheque 0452 cobrado", en: "Cheque 0452 cashed" }, amount: -243_000 },
  { id: "B6", side: "bank", date: "25-sep", desc: { es: "Depósito cheque cliente", en: "Customer cheque deposit" }, amount: 645_000 },
  { id: "B7", side: "bank", date: "30-sep", desc: { es: "Comisión por manejo de cuenta (IVA incl.)", en: "Account fee (VAT incl.)" }, amount: -34_800 },
  { id: "B8", side: "bank", date: "30-sep", desc: { es: "Intereses ganados", en: "Interest earned" }, amount: 5_200 },
];

// One expected difference may be flagged on either side (e.g. the 0452 cheque appears in both lists).
export type Expected = { key: string; ids: string[]; category: Category; label: Bilingual };

export const EXPECTED: Expected[] = [
  { key: "chq0452", ids: ["L5", "B5"], category: "book_error", label: { es: "Cheque 0452: registrado $2,340 en libros, el banco cobró $2,430", en: "Cheque 0452: booked as $2,340, bank paid $2,430" } },
  { key: "chq0453", ids: ["L7"], category: "outstanding_cheque", label: { es: "Cheque 0453 aún no cobrado", en: "Cheque 0453 not yet cashed" } },
  { key: "f104", ids: ["L8"], category: "deposit_in_transit", label: { es: "Depósito F-104 aún no aparece en el banco", en: "Deposit F-104 not yet on the statement" } },
  { key: "fee", ids: ["B7"], category: "bank_charge", label: { es: "Comisión bancaria no registrada", en: "Bank fee not booked" } },
  { key: "interest", ids: ["B8"], category: "bank_interest", label: { es: "Intereses no registrados", en: "Interest not booked" } },
];

export const BASE_ADJUSTED = 5_382_400; // $53,824.00

export type TwistId = "returned" | "duplicate" | "voided";

export type Twist = {
  id: TwistId;
  message: Bilingual;
  newBankLine?: Line;      // a line that appears on the statement
  affectedId: string;      // the line the candidate must classify
  category: Category;      // the correct category for the affected line
  adjusted: number;        // the correct new adjusted balance (cents)
  // for the voided twist, the affected line changes category instead of a new line appearing
  replaces?: string;       // expected key whose category is replaced
};

export const TWISTS: Twist[] = [
  {
    id: "returned",
    message: {
      es: "El banco acaba de publicar un movimiento nuevo del 30 de septiembre: el cheque del cliente que depositaron el 25 (venta F-103) rebotó.",
      en: "The bank just posted a new Sep 30 line: the customer cheque deposited on the 25th (sale F-103) bounced.",
    },
    newBankLine: { id: "B9", side: "bank", date: "30-sep", desc: { es: "Cheque devuelto · depósito del 25-sep", en: "Returned cheque · Sep 25 deposit" }, amount: -645_000 },
    affectedId: "B9",
    category: "returned_cheque",
    adjusted: 4_737_400, // $47,374.00
  },
  {
    id: "duplicate",
    message: {
      es: "El banco acaba de publicar un movimiento nuevo del 30 de septiembre: otro cargo por la nómina. La dueña jura que la nómina se pagó una sola vez.",
      en: "The bank just posted a new Sep 30 line: another payroll charge. The owner swears payroll was paid only once.",
    },
    newBankLine: { id: "B9", side: "bank", date: "30-sep", desc: { es: "SPEI enviado · nómina", en: "SPEI transfer · payroll" }, amount: -1_500_000 },
    affectedId: "B9",
    category: "bank_error",
    adjusted: 5_382_400, // $53,824.00
  },
  {
    id: "voided",
    message: {
      es: "La dueña te escribe: el cheque 0453 a Fletes Ruiz se canceló el mismo día. Nunca se entregó y ya está anulado.",
      en: "The owner messages you: cheque 0453 to Fletes Ruiz was cancelled the same day. It was never handed over and it is now void.",
    },
    affectedId: "L7",
    category: "voided_cheque",
    replaces: "chq0453",
    adjusted: 5_772_400, // $57,724.00
  },
];

export function getTwist(id: string): Twist | undefined {
  return TWISTS.find((t) => t.id === id);
}

export function allLines(twist?: Twist): Line[] {
  const lines = [...LEDGER, ...BANK];
  if (twist?.newBankLine) lines.push(twist.newBankLine);
  return lines;
}

export function lineById(id: string, twist?: Twist): Line | undefined {
  return allLines(twist).find((l) => l.id === id);
}

export function closing(side: Side, twist?: Twist): number {
  return allLines(twist)
    .filter((l) => l.side === side)
    .reduce((sum, l) => sum + l.amount, OPENING_BALANCE);
}

/**
 * Computes both adjusted balances from a category assignment.
 * Bank side: closing statement balance adjusted for items the bank hasn't seen or got wrong.
 * Book side: closing ledger balance adjusted for items the books haven't recorded or got wrong.
 */
export function adjustedBalances(assign: Record<string, Category>, twist?: Twist): { bank: number; books: number } {
  let bank = closing("bank", twist);
  let books = closing("ledger", twist);
  for (const [id, cat] of Object.entries(assign)) {
    const line = lineById(id, twist);
    if (!line) continue;
    switch (cat) {
      case "deposit_in_transit": bank += Math.abs(line.amount); break;
      case "outstanding_cheque": bank -= Math.abs(line.amount); break;
      case "bank_error": bank -= line.amount; break; // reverse the wrong bank movement
      case "bank_charge":
      case "bank_interest":
      case "returned_cheque": books += line.amount; break; // record what the bank already did
      case "voided_cheque": books -= line.amount; break; // reverse the cheque in the books
      case "book_error": {
        // books recorded the wrong amount; correct to what the bank actually paid
        if (line.id === "L5" || line.id === "B5") books += (lineById("B5")!.amount - lineById("L5")!.amount);
        break;
      }
    }
  }
  return { bank, books };
}

/** The correct assignment for the base task (one id per expected difference). */
export function keyAssignment(twist?: Twist): Record<string, Category> {
  const assign: Record<string, Category> = {};
  for (const e of EXPECTED) {
    if (twist?.replaces === e.key) continue;
    assign[e.ids[0]] = e.category;
  }
  if (twist) assign[twist.affectedId] = twist.category;
  return assign;
}

export const TIME_LIMITS = { part1Min: 25, twistMin: 8 };
