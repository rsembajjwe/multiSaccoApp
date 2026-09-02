import java.io.FileInputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.usermodel.Range;
import org.apache.poi.hwpf.usermodel.Table;
import org.apache.poi.hwpf.usermodel.TableCell;
import org.apache.poi.hwpf.usermodel.TableIterator;
import org.apache.poi.hwpf.usermodel.TableRow;

public class ExtractLegacyDocTables {
    private static String json(String value) {
        StringBuilder out = new StringBuilder("\"");
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            switch (ch) {
                case '\\': out.append("\\\\"); break;
                case '"': out.append("\\\""); break;
                case '\n': out.append("\\n"); break;
                case '\r': break;
                case '\t': out.append("\\t"); break;
                default:
                    if (ch < 0x20) {
                        out.append(String.format("\\u%04x", (int) ch));
                    } else {
                        out.append(ch);
                    }
            }
        }
        out.append('"');
        return out.toString();
    }

    private static String clean(String text) {
        return text.replace('\u0007', '\n')
                .replace('\u000b', '\n')
                .replace('\f', '\n')
                .replaceAll("[ \\t]+", " ")
                .replaceAll("\\n+", "\n")
                .trim();
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 2) {
            throw new IllegalArgumentException("Usage: ExtractLegacyDocTables input.doc output.json");
        }
        try (HWPFDocument doc = new HWPFDocument(new FileInputStream(args[0]));
             PrintWriter writer = new PrintWriter(args[1], StandardCharsets.UTF_8)) {
            Range range = doc.getRange();
            TableIterator iterator = new TableIterator(range);
            List<Table> tables = new ArrayList<>();
            while (iterator.hasNext()) {
                tables.add(iterator.next());
            }

            writer.println("{\"tables\":[");
            for (int ti = 0; ti < tables.size(); ti++) {
                Table table = tables.get(ti);
                if (ti > 0) writer.println(",");
                int startParagraph = -1;
                int endParagraph = -1;
                for (int pi = 0; pi < range.numParagraphs(); pi++) {
                    if (range.getParagraph(pi).getStartOffset() >= table.getStartOffset()
                            && range.getParagraph(pi).getEndOffset() <= table.getEndOffset()) {
                        if (startParagraph == -1) {
                            startParagraph = pi;
                        }
                        endParagraph = pi;
                    }
                }
                writer.println("{\"startParagraph\":" + startParagraph + ",\"endParagraph\":" + endParagraph + ",\"rows\":[");
                for (int ri = 0; ri < table.numRows(); ri++) {
                    TableRow row = table.getRow(ri);
                    if (ri > 0) writer.println(",");
                    writer.print("[");
                    for (int ci = 0; ci < row.numCells(); ci++) {
                        TableCell cell = row.getCell(ci);
                        if (ci > 0) writer.print(",");
                        writer.print(json(clean(cell.text())));
                    }
                    writer.print("]");
                }
                writer.println("]}");
            }
            writer.println("]}");
        }
    }
}
