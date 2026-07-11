import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

export interface InvoiceData {
  invoiceNumber: string;
  date: string; // e.g. "19 Jun 2026"
  buyer: { name: string; email: string; phone?: string | null };
  transactionId: string;
  paymentMode: string; // "Online (PhonePe)"
  paymentDate: string;
  lineItems: { title: string; amount: number }[]; // paise
  total: number; // paise
}

// Seller (from the Contact page). Not GST-registered → plain invoice, no GST.
const SELLER = {
  name: "Luxaar Institute",
  sub: "A unit of SABI CONSTRUCTION",
  addressLines: ["14/2/5, 14, 5F-3 Moolachel,", "Verkilambi, Kanyakumari,", "Tamil Nadu - 629166"],
  email: "luxaarinstitute@gmail.com",
  phone: "+91 9443472954",
};

// Helvetica (WinAnsi) can't encode the Rupee sign or Tamil, so keep drawn text
// to printable ASCII and use "Rs." for currency.
const safe = (s: string) => (s ?? "").replace(/₹/g, "Rs. ").replace(/[^\x20-\x7E]/g, "").trim();
const money = (paise: number) => "Rs. " + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const INK = rgb(0.07, 0.07, 0.07);
const MUTED = rgb(0.45, 0.45, 0.45);
const GOLD = rgb(0.78, 0.65, 0.36);
const LINE = rgb(0.9, 0.9, 0.9);

export async function buildInvoicePdf(d: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const H = page.getHeight();
  const L = 50, R = 545;
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const text = (t: string, x: number, yTop: number, size: number, f: PDFFont, color = INK) =>
    page.drawText(safe(t), { x, y: H - yTop, size, font: f, color });
  const rightText = (t: string, yTop: number, size: number, f: PDFFont, color = INK) => {
    const s = safe(t);
    page.drawText(s, { x: R - f.widthOfTextAtSize(s, size), y: H - yTop, size, font: f, color });
  };
  const hline = (yTop: number) => page.drawLine({ start: { x: L, y: H - yTop }, end: { x: R, y: H - yTop }, thickness: 1, color: LINE });
  const label = (t: string, x: number, yTop: number) => text(t.toUpperCase(), x, yTop, 7.5, bold, MUTED);

  // Header
  text(SELLER.name, L, 60, 20, bold);
  text(SELLER.sub, L, 76, 9, font, MUTED);
  rightText("INVOICE", 58, 18, bold);
  rightText("Payment Receipt", 74, 9, font, GOLD);
  hline(96);

  // From (seller)
  let y = 122;
  label("From", L, y); y += 15;
  text(SELLER.name, L, y, 11, bold); y += 14;
  for (const line of SELLER.addressLines) { text(line, L, y, 9, font, MUTED); y += 12; }
  text(SELLER.email + "  ·  " + SELLER.phone, L, y, 9, font, MUTED);

  // Invoice metadata grid (two columns)
  const cx = L, cx2 = 320;
  let my = 210;
  const cell = (lab: string, val: string, x: number, yTop: number) => {
    label(lab, x, yTop);
    text(val, x, yTop + 15, 10, bold);
  };
  cell("Invoice No.", d.invoiceNumber, cx, my);
  cell("Payment Mode", d.paymentMode, cx2, my);
  my += 40;
  cell("Invoice Date", d.date, cx, my);
  cell("Payment Date", d.paymentDate, cx2, my);
  my += 40;
  cell("Transaction ID", d.transactionId, cx, my);

  // Invoice for (buyer)
  hline(my + 30);
  let by = my + 55;
  label("Invoice for", L, by); by += 15;
  text(d.buyer.name, L, by, 11, bold); by += 13;
  text(d.buyer.email, L, by, 9, font, MUTED); by += 12;
  if (d.buyer.phone) text(d.buyer.phone, L, by, 9, font, MUTED);

  // Particulars
  let py = by + 45;
  label("Particulars", L, py);
  rightText("Amount", py, 7.5, bold, MUTED);
  py += 10;
  hline(py);
  py += 20;
  for (const li of d.lineItems) {
    text(li.title, L, py, 10, font);
    rightText(money(li.amount), py, 10, font);
    py += 22;
  }
  py += 2;
  hline(py);
  py += 22;
  text("Total Paid", L, py, 12, bold);
  rightText(money(d.total), py, 13, bold);

  // Footer
  text("1. This is a computer-generated invoice and does not require a signature.", L, H - 70, 8, font, MUTED);
  text("Thank you for choosing Luxaar Institute.", L, H - 56, 8, font, MUTED);

  return await doc.save();
}
