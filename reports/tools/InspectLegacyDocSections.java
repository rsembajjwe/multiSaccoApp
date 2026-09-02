import java.io.FileInputStream;
import java.lang.reflect.Method;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.usermodel.Range;
import org.apache.poi.hwpf.usermodel.Section;

public class InspectLegacyDocSections {
    public static void main(String[] args) throws Exception {
        try (HWPFDocument doc = new HWPFDocument(new FileInputStream(args[0]))) {
            Range range = doc.getRange();
            System.out.println("sections=" + range.numSections());
            for (int i = 0; i < range.numSections(); i++) {
                Section section = range.getSection(i);
                System.out.println("section " + i);
                for (Method method : Section.class.getMethods()) {
                    String name = method.getName().toLowerCase();
                    if (method.getParameterCount() == 0
                            && (name.contains("page") || name.contains("margin") || name.contains("dxa")
                            || name.contains("dya") || name.contains("width") || name.contains("height")
                            || name.contains("orient") || name.contains("landscape"))) {
                        try {
                            System.out.println("  " + method.getName() + "=" + method.invoke(section));
                        } catch (Exception ignored) {
                        }
                    }
                }
            }
        }
    }
}
