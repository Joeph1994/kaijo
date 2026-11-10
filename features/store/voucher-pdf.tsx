import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";

/** Font sources (URLs in production, local file paths for a sample render). */
export type VoucherPdfAssets = {
  monoRegular: string;
  monoBold: string;
  display: string;
  /** Handwritten script used for the "JH" signature mark. */
  signatureFont: string;
};

export type VoucherPdfInput = {
  code: string;
  /** What the voucher is for, e.g. "2-hour private workshop". */
  subject: string;
  /** Value in euros, shown on the voucher. */
  value: number | null;
  issuedAt: Date;
};

/** Build the font sources from a site origin — fonts live in `public/fonts`. */
export function voucherPdfAssets(origin: string): VoucherPdfAssets {
  return {
    monoRegular: `${origin}/fonts/basiercirclemono-regular.ttf`,
    monoBold: `${origin}/fonts/basiercirclemono-bold.ttf`,
    display: `${origin}/fonts/art-grootfontein-flexible.otf`,
    signatureFont: `${origin}/fonts/mrs-saint-delafield-regular.ttf`,
  };
}

let registered = false;
function registerFonts(assets: VoucherPdfAssets) {
  if (registered) {
    return;
  }
  Font.register({
    family: "Mono",
    fonts: [
      { src: assets.monoRegular, fontWeight: "normal" },
      { src: assets.monoBold, fontWeight: "bold" },
    ],
  });
  Font.register({ family: "Display", src: assets.display });
  Font.register({ family: "Signature", src: assets.signatureFont });
  // Codes and the wordmark must never be hyphen-split across lines.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

const INK = "#111111";
const MUTED = "#6b6b6b";
const LINE = "#d7d7d7";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: INK,
    paddingTop: 54,
    paddingBottom: 48,
    paddingHorizontal: 54,
    fontFamily: "Mono",
    fontSize: 10.5,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingBottom: 10,
  },
  wordmark: { fontFamily: "Display", fontSize: 22, letterSpacing: 1 },
  headerMeta: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: MUTED, textAlign: "right" },
  eyebrow: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: MUTED, marginTop: 34 },
  subject: { fontFamily: "Display", fontSize: 30, marginTop: 8, lineHeight: 1.1 },
  value: { fontSize: 13, marginTop: 10, color: INK },
  codeBox: {
    marginTop: 26,
    borderWidth: 1,
    borderColor: INK,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  codeLabel: { fontSize: 8, letterSpacing: 2.5, textTransform: "uppercase", color: MUTED },
  code: { fontFamily: "Mono", fontWeight: "bold", fontSize: 19, letterSpacing: 1.5, marginTop: 7 },
  sectionTitle: { fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: MUTED, marginTop: 30, marginBottom: 8 },
  step: { flexDirection: "row", marginBottom: 6 },
  stepNo: { width: 18, fontWeight: "bold" },
  stepText: { flex: 1 },
  signatureRow: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  signatureBlock: { width: 230 },
  // Handwritten "JH" — negative tracking tangles the J and H, as chosen.
  signatureScript: { fontFamily: "Signature", fontSize: 46, letterSpacing: -5, marginBottom: 2, color: INK },
  signatureRule: { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6, fontSize: 9, color: MUTED },
  issued: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: MUTED, textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 54,
    right: 54,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: MUTED,
  },
});

const STEPS = [
  "The code above is unique to this voucher — keep it somewhere safe.",
  "To redeem, email me@joephijwegen.com with your code and I'll arrange a date and time that suits you.",
  "Valid any time — it never expires. Use it yourself or give it as a gift.",
];

function issuedStamp(when: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(when);
}

function VoucherDocument({ input }: { input: VoucherPdfInput }) {
  return (
    <Document title={`Voucher ${input.code}`} author="Joep Hijwegen">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>JOEP HIJWEGEN</Text>
          <Text style={styles.headerMeta}>Photography{"\n"}Amsterdam</Text>
        </View>

        <Text style={styles.eyebrow}>Gift voucher</Text>
        <Text style={styles.subject}>{input.subject}</Text>
        {input.value != null && <Text style={styles.value}>Value €{input.value}</Text>}

        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Voucher code</Text>
          <Text style={styles.code}>{input.code}</Text>
        </View>

        <Text style={styles.sectionTitle}>What's next</Text>
        {STEPS.map((step, i) => (
          <View key={step} style={styles.step}>
            <Text style={styles.stepNo}>{i + 1}.</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureScript}>JH</Text>
            <Text style={styles.signatureRule}>Joep Hijwegen</Text>
          </View>
          <Text style={styles.issued}>
            Issued{"\n"}
            {issuedStamp(input.issuedAt)}
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>joephijwegen.com</Text>
          <Text>me@joephijwegen.com</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Render a single voucher to a PDF buffer. */
export async function renderVoucherPdf(input: VoucherPdfInput, assets: VoucherPdfAssets): Promise<Buffer> {
  registerFonts(assets);
  return renderToBuffer(<VoucherDocument input={input} />);
}
