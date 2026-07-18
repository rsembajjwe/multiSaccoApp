import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TEMPLATE_DEFINITIONS, generateImportWorkbooks } from "./generate-import-workbooks.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function extractJavaHeaders(source, constantName) {
  const pattern = new RegExp(`${constantName}\\s*=\\s*List\\.of\\(([\\s\\S]*?)\\);`);
  const match = source.match(pattern);
  if (!match) throw new Error(`Could not find ${constantName}`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

function extractTemplateSheet(zipBuffer) {
  let offset = 0;
  while (offset < zipBuffer.length - 30) {
    if (zipBuffer.readUInt32LE(offset) !== 0x04034b50) break;
    const compressedSize = zipBuffer.readUInt32LE(offset + 18);
    const fileNameLength = zipBuffer.readUInt16LE(offset + 26);
    const extraLength = zipBuffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const name = zipBuffer.subarray(nameStart, nameStart + fileNameLength).toString("utf8");
    if (name === "xl/worksheets/sheet1.xml") {
      return zipBuffer.subarray(dataStart, dataStart + compressedSize).toString("utf8");
    }
    offset = dataStart + compressedSize;
  }
  throw new Error("Template sheet not found in workbook");
}

function firstRowValues(sheetXml) {
  const row = sheetXml.match(/<row r="1">([\s\S]*?)<\/row>/)?.[1];
  if (!row) throw new Error("Header row not found");
  return [...row.matchAll(/<t>([\s\S]*?)<\/t>/g)].map((item) => item[1]
    .replaceAll("&quot;", "\"")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&"));
}

function assertEqual(actual, expected, label) {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error(`${label} mismatch.\nExpected: ${expected.join(",")}\nActual:   ${actual.join(",")}`);
  }
}

const tempDir = await mkdtemp(resolve(tmpdir(), "sacco-import-workbooks-"));
try {
  await generateImportWorkbooks(tempDir);
  for (const definition of TEMPLATE_DEFINITIONS) {
    const javaSource = await readFile(resolve(repoRoot, definition.javaFile), "utf8");
    const javaHeaders = extractJavaHeaders(javaSource, definition.javaConstant);
    assertEqual(definition.headers, javaHeaders, `${definition.id} script headers`);

    const workbook = await readFile(resolve(tempDir, definition.filename));
    const workbookHeaders = firstRowValues(extractTemplateSheet(workbook));
    assertEqual(workbookHeaders, javaHeaders, `${definition.id} workbook headers`);
  }
  console.log(`Import workbook check passed (${TEMPLATE_DEFINITIONS.length} workbook templates).`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
