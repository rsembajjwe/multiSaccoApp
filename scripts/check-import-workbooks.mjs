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

function extractZipFile(zipBuffer, targetName) {
  let offset = 0;
  while (offset < zipBuffer.length - 30) {
    if (zipBuffer.readUInt32LE(offset) !== 0x04034b50) break;
    const compressedSize = zipBuffer.readUInt32LE(offset + 18);
    const fileNameLength = zipBuffer.readUInt16LE(offset + 26);
    const extraLength = zipBuffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const name = zipBuffer.subarray(nameStart, nameStart + fileNameLength).toString("utf8");
    if (name === targetName) {
      return zipBuffer.subarray(dataStart, dataStart + compressedSize).toString("utf8");
    }
    offset = dataStart + compressedSize;
  }
  throw new Error(`${targetName} not found in workbook`);
}

function rowValues(sheetXml, rowNumber) {
  const row = sheetXml.match(new RegExp(`<row r="${rowNumber}">([\\s\\S]*?)<\\/row>`))?.[1];
  if (!row) throw new Error(`Row ${rowNumber} not found`);
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
    const workbookXml = extractZipFile(workbook, "xl/workbook.xml");
    if (!workbookXml.includes('name="Template"') || !workbookXml.includes('name="Guidance"')) {
      throw new Error(`${definition.id} workbook is missing Template or Guidance worksheets`);
    }

    const templateSheet = extractZipFile(workbook, "xl/worksheets/sheet1.xml");
    const guidanceSheet = extractZipFile(workbook, "xl/worksheets/sheet2.xml");
    const workbookHeaders = rowValues(templateSheet, 1);
    assertEqual(workbookHeaders, javaHeaders, `${definition.id} workbook headers`);
    for (const [index, sampleRow] of definition.sampleRows.entries()) {
      assertEqual(rowValues(templateSheet, index + 2), sampleRow.map(String), `${definition.id} sample row ${index + 1}`);
    }
    assertEqual(rowValues(guidanceSheet, 1), ["Column", "Rule"], `${definition.id} guidance headers`);
    for (const [index, guidanceRow] of definition.guidance.entries()) {
      assertEqual(rowValues(guidanceSheet, index + 2), guidanceRow.map(String), `${definition.id} guidance row ${index + 1}`);
    }
  }
  console.log(`Import workbook check passed (${TEMPLATE_DEFINITIONS.length} workbook templates, sample rows and guidance sheets).`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
