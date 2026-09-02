import java.io.FileInputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.usermodel.Paragraph;
import org.apache.poi.hwpf.usermodel.Range;

public class ExtractLegacyDocParagraphs {
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
                .replace("\f", "\n[PAGE_BREAK]\n")
                .replaceAll("[ \\t]+", " ")
                .replaceAll("\\n+", "\n")
                .trim();
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 2) {
            throw new IllegalArgumentException("Usage: ExtractLegacyDocParagraphs input.doc output.json");
        }
        try (HWPFDocument doc = new HWPFDocument(new FileInputStream(args[0]));
             PrintWriter writer = new PrintWriter(args[1], StandardCharsets.UTF_8)) {
            Range range = doc.getRange();
            writer.println("{\"paragraphs\":[");
            boolean first = true;
            for (int i = 0; i < range.numParagraphs(); i++) {
                Paragraph paragraph = range.getParagraph(i);
                if (paragraph.isInTable()) {
                    continue;
                }
                String text = clean(paragraph.text());
                if (text.isBlank()) {
                    continue;
                }
                if (!first) {
                    writer.println(",");
                }
                first = false;
                writer.print("{\"index\":" + i + ",\"text\":" + json(text) + "}");
            }
            writer.println("]}");
        }
    }
}
