import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(repoRoot, "docs", "import-templates");

export const TEMPLATE_DEFINITIONS = [
  {
    id: "members",
    title: "Members",
    filename: "members-import-template.xlsx",
    javaConstant: "MEMBER_IMPORT_HEADERS",
    javaFile: "backend-java/src/main/java/com/methaltech/sacco/member/MemberController.java",
    headers: ["membershipNo", "branchId", "fullName", "memberType", "phone", "email", "nationalId", "kycStatus", "joiningDate", "password"],
    sampleRows: [
      ["GVS-0100", "branch_green_main", "Pilot Member", "individual", "+256700000000", "pilot.member@example.local", "CM0000000PILOT", "pending_verification", "2026-07-18", "Member@12345"]
    ],
    guidance: [
      ["membershipNo", "Required, unique inside the SACCO and the import file."],
      ["branchId", "Required, must belong to the selected SACCO tenant."],
      ["kycStatus", "Allowed: not_verified, pending_verification, verified, rejected, expired."],
      ["password", "Required temporary member portal password, minimum 8 characters."]
    ]
  },
  {
    id: "member-metadata",
    title: "Member Metadata",
    filename: "member-metadata-import-template.xlsx",
    javaConstant: "MEMBER_METADATA_IMPORT_HEADERS",
    javaFile: "backend-java/src/main/java/com/methaltech/sacco/member/MemberController.java",
    headers: ["recordType", "membershipNo", "fullName", "relationship", "phone", "address", "primaryContact", "allocationPercent", "documentType", "storageKey", "verificationStatus", "kycStatus"],
    sampleRows: [
      ["kyc_status", "GVS-0100", "", "", "", "", "", "", "", "", "", "verified"],
      ["document", "GVS-0100", "", "", "", "", "", "", "national_id", "kyc/GVS-0100/national-id.pdf", "verified", ""],
      ["next_of_kin", "GVS-0100", "Sample Next Of Kin", "spouse", "+256700111222", "Kampala", "true", "", "", "", "", ""],
      ["beneficiary", "GVS-0100", "Sample Beneficiary", "daughter", "+256700333444", "", "", "50", "", "", "", ""]
    ],
    guidance: [
      ["recordType", "Allowed: kyc_status, document, next_of_kin, beneficiary."],
      ["documentType", "Allowed: national_id, photo, signature, bylaws, registration_certificate, other."],
      ["allocationPercent", "Beneficiary totals for a member cannot exceed 100."],
      ["primaryContact", "Use true/false or yes/no."]
    ]
  },
  {
    id: "opening-balances",
    title: "Opening Balances",
    filename: "opening-balances-import-template.xlsx",
    javaConstant: "OPENING_BALANCE_IMPORT_HEADERS",
    javaFile: "backend-java/src/main/java/com/methaltech/sacco/finance/FinancialTransactionController.java",
    headers: ["membershipNo", "savingsBalance", "sharesBalance", "welfareBalance", "reference", "postingDate", "narration"],
    sampleRows: [
      ["GVS-0100", "100000", "50000", "10000", "OB-GVS-0100", "2026-07-18", "Opening balances from pilot data import"]
    ],
    guidance: [
      ["membershipNo", "Required, must already exist in the selected SACCO tenant."],
      ["postingDate", "Optional YYYY-MM-DD; rejected when the accounting period is closed."],
      ["reference", "Optional base reference; account suffixes are added by the backend."],
      ["amount columns", "Use numeric values. Zero values are skipped."]
    ]
  },
  {
    id: "loan-book",
    title: "Loan Book",
    filename: "loan-book-import-template.xlsx",
    javaConstant: "LOAN_IMPORT_HEADERS",
    javaFile: "backend-java/src/main/java/com/methaltech/sacco/loan/LoanController.java",
    headers: ["membershipNo", "product", "originalAmount", "outstandingBalance", "repaymentMonths", "remainingMonths", "monthlyInstallment", "disbursedDate", "status", "purpose"],
    sampleRows: [
      ["GVS-0100", "Development Loan", "1200000", "900000", "12", "9", "100000", "2026-04-18", "active", "Migrated dairy equipment loan"]
    ],
    guidance: [
      ["product", "Allowed: Development Loan, Emergency Loan, Agriculture Loan, School Fees Loan."],
      ["outstandingBalance", "Must be between 0 and originalAmount."],
      ["status", "Allowed: active, closed. Closed loans must have zero outstanding balance."],
      ["monthlyInstallment", "Required when remainingMonths is greater than 0."]
    ]
  },
  {
    id: "repayment-history",
    title: "Repayment History",
    filename: "repayment-history-import-template.xlsx",
    javaConstant: "REPAYMENT_IMPORT_HEADERS",
    javaFile: "backend-java/src/main/java/com/methaltech/sacco/loan/LoanController.java",
    headers: ["membershipNo", "product", "loanDisbursedDate", "amount", "channel", "reference", "receivedDate", "narration"],
    sampleRows: [
      ["GVS-0100", "Development Loan", "2026-04-18", "300000", "bank", "LRH-GVS-0100-001", "2026-05-18", "Migrated historical repayment"]
    ],
    guidance: [
      ["amount", "Must be greater than zero and cannot exceed paid-to-date capacity."],
      ["channel", "Allowed: cash, bank, mobile_money, payroll."],
      ["reference", "Required, unique in the import and not already recorded."],
      ["loanDisbursedDate", "Required when the member has multiple matching loans."]
    ]
  }
];

function xml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function columnName(index) {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const modulo = (current - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    current = Math.floor((current - modulo) / 26);
  }
  return name;
}

function sheetXml(rows) {
  const rowXml = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
      return `<c r="${ref}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`;
}

function workbookXml(sheets) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`;
}

function workbookRelsXml(sheets) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}</Relationships>`;
}

function contentTypesXml(sheets) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
}

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let index = 0; index < 8; index += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const dosTime = 0;
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.from(file.content, "utf8");
    const checksum = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

export function workbookBuffer(definition) {
  const sheets = [
    {
      name: "Template",
      rows: [definition.headers, ...definition.sampleRows]
    },
    {
      name: "Guidance",
      rows: [["Column", "Rule"], ...definition.guidance]
    }
  ];
  const files = [
    { name: "[Content_Types].xml", content: contentTypesXml(sheets) },
    { name: "_rels/.rels", content: rootRelsXml() },
    { name: "xl/workbook.xml", content: workbookXml(sheets) },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml(sheets) },
    ...sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, content: sheetXml(sheet.rows) }))
  ];
  return zip(files);
}

export async function generateImportWorkbooks(targetDir = outputDir) {
  await mkdir(targetDir, { recursive: true });
  const written = [];
  for (const definition of TEMPLATE_DEFINITIONS) {
    const target = resolve(targetDir, definition.filename);
    await writeFile(target, workbookBuffer(definition));
    written.push(target);
  }
  return written;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const written = await generateImportWorkbooks();
  for (const file of written) {
    console.log(`Wrote ${file}`);
  }
}
