import { zipStore } from "./zip";
import type { PptxResult, Slide } from "./types";

/**
 * Dependency-free .pptx generator.
 *
 * Produces a real PowerPoint (OOXML) package: 16:9 deck, Persian-safe fonts,
 * right-to-left paragraphs when the content is Persian, plus speaker notes on
 * every slide. Runs fine on Vercel's Node runtime (no binary dependencies).
 */

const EMU = 914400; // EMU per inch
const SLIDE_W = 12192000; // 13.333in
const SLIDE_H = 6858000; // 7.5in
const MARGIN_X = 762000; // 0.83in

const FONT = "Tahoma";
const INK = "0B0F14";
const MUTED = "5B6B7B";
const BRAND = "0F9D58";

function esc(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type TextOpts = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  size: number;
  bold?: boolean;
  color?: string;
  align?: "r" | "l" | "ctr";
  rtl?: boolean;
  lineSpacing?: number;
  paragraphs?: Array<{ text: string; bullet?: boolean }>;
};

function textBox(opts: TextOpts) {
  const align = opts.align ?? (opts.rtl ? "r" : "l");
  const paragraphs = (opts.paragraphs ?? [{ text: "" }])
    .map((p) => {
      const bullet = p.bullet
        ? `<a:buChar char="•"/><a:buFont typeface="Arial"/>`
        : `<a:buNone/>`;
      return `<a:p><a:pPr algn="${align}"${opts.rtl ? ' rtl="1"' : ""}${opts.lineSpacing ? `><a:lnSpc><a:spcPct val="${Math.round(opts.lineSpacing * 100000)}"/></a:lnSpc><a:spcBef><a:spcPts val="600"/></a:spcBef>${bullet}</a:pPr>` : `>${bullet}</a:pPr>`}` +
        `<a:r><a:rPr lang="${opts.rtl ? "fa-IR" : "en-US"}" sz="${opts.size}"${opts.bold ? ' b="1"' : ""} dirty="0">` +
        `<a:solidFill><a:srgbClr val="${opts.color ?? INK}"/></a:solidFill>` +
        `<a:latin typeface="${FONT}"/><a:cs typeface="${FONT}"/></a:rPr>` +
        `<a:t>${esc(p.text)}</a:t></a:r></a:p>`;
    })
    .join("");

  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${opts.id}" name="TextBox ${opts.id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${Math.round(opts.x)}" y="${Math.round(opts.y)}"/><a:ext cx="${Math.round(opts.w)}" cy="${Math.round(opts.h)}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>` +
    `<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t"${opts.rtl ? ' rtlCol="1"' : ""}><a:normAutofit/></a:bodyPr><a:lstStyle/>` +
    `${paragraphs}</p:txBody></p:sp>`
  );
}

function rect(id: number, x: number, y: number, w: number, h: number, color: string) {
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Rect ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${Math.round(x)}" y="${Math.round(y)}"/><a:ext cx="${Math.round(w)}" cy="${Math.round(h)}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>` +
    `<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`
  );
}

const EMPTY_TREE = `<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree>`;

function slideXml(slide: Slide, index: number, total: number, rtl: boolean, brand: string) {
  const isCover = index === 0;
  const shapes: string[] = [];
  let id = 2;

  // background band
  shapes.push(rect(id++, 0, 0, SLIDE_W, isCover ? SLIDE_H : 1650000, isCover ? "0B0F14" : "F4F7FA"));
  shapes.push(rect(id++, 0, isCover ? SLIDE_H - 140000 : 1630000, SLIDE_W, 40000, BRAND));

  if (isCover) {
    shapes.push(
      textBox({
        id: id++,
        x: MARGIN_X,
        y: 1900000,
        w: SLIDE_W - MARGIN_X * 2,
        h: 1700000,
        size: 4400,
        bold: true,
        color: "FFFFFF",
        rtl,
        paragraphs: [{ text: slide.title }],
      }),
    );
    if (slide.subtitle) {
      shapes.push(
        textBox({
          id: id++,
          x: MARGIN_X,
          y: 3550000,
          w: SLIDE_W - MARGIN_X * 2,
          h: 900000,
          size: 2000,
          color: "C9D6E2",
          rtl,
          paragraphs: [{ text: slide.subtitle }],
        }),
      );
    }
    shapes.push(
      textBox({
        id: id++,
        x: MARGIN_X,
        y: SLIDE_H - 1150000,
        w: SLIDE_W - MARGIN_X * 2,
        h: 400000,
        size: 1200,
        color: "8CA3B8",
        rtl,
        paragraphs: [{ text: brand }],
      }),
    );
  } else {
    shapes.push(
      textBox({
        id: id++,
        x: MARGIN_X,
        y: 520000,
        w: SLIDE_W - MARGIN_X * 2,
        h: 760000,
        size: 3000,
        bold: true,
        rtl,
        paragraphs: [{ text: slide.title }],
      }),
    );
    if (slide.subtitle) {
      shapes.push(
        textBox({
          id: id++,
          x: MARGIN_X,
          y: 1180000,
          w: SLIDE_W - MARGIN_X * 2,
          h: 380000,
          size: 1400,
          color: MUTED,
          rtl,
          paragraphs: [{ text: slide.subtitle }],
        }),
      );
    }
    if (slide.bullets.length) {
      shapes.push(
        textBox({
          id: id++,
          x: MARGIN_X,
          y: 2100000,
          w: SLIDE_W - MARGIN_X * 2,
          h: SLIDE_H - 2900000,
          size: 1900,
          rtl,
          lineSpacing: 1.25,
          paragraphs: slide.bullets.map((b) => ({ text: b, bullet: true })),
        }),
      );
    }
    shapes.push(
      textBox({
        id: id++,
        x: MARGIN_X,
        y: SLIDE_H - 480000,
        w: 3200000,
        h: 300000,
        size: 1000,
        color: MUTED,
        rtl: !rtl,
        align: "l",
        paragraphs: [{ text: `${index + 1} / ${total}` }],
      }),
    );
  }

  const notes = slide.notes
    ? `<p:notes><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id="2" name="Notes"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="685800" y="457200"/><a:ext cx="10972800" cy="5486400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="${rtl ? "fa-IR" : "en-US"}"/><a:t>${esc(slide.notes)}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:notes>`
    : "";

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">` +
    `<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
    `<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>` +
    shapes.join("") +
    `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>${notes}</p:sld>`
  );
}

const THEME = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Auralis">
  <a:themeElements>
    <a:clrScheme name="Auralis">
      <a:dk1><a:srgbClr val="0B0F14"/></a:dk1>
      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="223040"/></a:dk2>
      <a:lt2><a:srgbClr val="F4F7FA"/></a:lt2>
      <a:accent1><a:srgbClr val="0F9D58"/></a:accent1>
      <a:accent2><a:srgbClr val="4ADE80"/></a:accent2>
      <a:accent3><a:srgbClr val="38BDF8"/></a:accent3>
      <a:accent4><a:srgbClr val="FBBF24"/></a:accent4>
      <a:accent5><a:srgbClr val="F472B6"/></a:accent5>
      <a:accent6><a:srgbClr val="A78BFA"/></a:accent6>
      <a:hlink><a:srgbClr val="0F9D58"/></a:hlink>
      <a:folHlink><a:srgbClr val="A78BFA"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Auralis">
      <a:majorFont><a:latin typeface="Tahoma"/><a:ea typeface=""/><a:cs typeface="Tahoma"/></a:majorFont>
      <a:minorFont><a:latin typeface="Tahoma"/><a:ea typeface=""/><a:cs typeface="Tahoma"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Auralis">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="80000"/></a:schemeClr></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:shade val="80000"/></a:schemeClr></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/></a:schemeClr></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:shade val="90000"/></a:schemeClr></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
  <a:objectDefaults/>
  <a:extraClrSchemeLst/>
</a:theme>`;

export function buildPptx(slides: Slide[], meta: { title: string; subtitle: string; author: string; rtl: boolean }) {
  const total = slides.length;
  const brand = meta.author;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("\n")}
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(meta.title)}</dc:title>
<dc:subject>${esc(meta.subtitle)}</dc:subject>
<dc:creator>${esc(meta.author)}</dc:creator>
<cp:lastModifiedBy>${esc(meta.author)}</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`;

  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>AURALIS Agent</Application>
<Slides>${slides.length}</Slides>
</Properties>`;

  const presentation = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("")}</p:sldIdLst>
<p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}"/><p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

  const presentationRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
${slides.map((_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("\n")}
<Relationship Id="rId${slides.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;

  const master = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>${EMPTY_TREE}</p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`;

  const masterRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

  const layout = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
<p:cSld name="Blank">${EMPTY_TREE}</p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;

  const layoutRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

  const slideRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

  const files = [
    { name: "[Content_Types].xml", content: contentTypes },
    { name: "_rels/.rels", content: rootRels },
    { name: "docProps/core.xml", content: core },
    { name: "docProps/app.xml", content: app },
    { name: "ppt/presentation.xml", content: presentation },
    { name: "ppt/_rels/presentation.xml.rels", content: presentationRels },
    { name: "ppt/slideMasters/slideMaster1.xml", content: master },
    { name: "ppt/slideMasters/_rels/slideMaster1.xml.rels", content: masterRels },
    { name: "ppt/slideLayouts/slideLayout1.xml", content: layout },
    { name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels", content: layoutRels },
    { name: "ppt/theme/theme1.xml", content: THEME },
    ...slides.flatMap((slide, i) => [
      { name: `ppt/slides/slide${i + 1}.xml`, content: slideXml(slide, i, total, meta.rtl, brand) },
      { name: `ppt/slides/_rels/slide${i + 1}.xml.rels`, content: slideRels },
    ]),
  ];

  return zipStore(files);
}

export type DeckInput = {
  title: string;
  subtitle?: string;
  author?: string;
  brief?: string;
  bullets?: string[];
  language?: "fa" | "en";
};

const MAX_BULLETS = 5;

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?؟۔])\s+|\n+/)
    .map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter((s) => s.length > 2);
}

/** Turns a brief (or explicit bullet list) into a sensible slide outline. */
export function planDeck(input: DeckInput): Slide[] {
  const rtl = input.language ? input.language === "fa" : /[\u0600-\u06FF]/.test(`${input.title}${input.brief ?? ""}`);
  const fa = rtl;
  const bullets = (input.bullets ?? []).map((b) => b.trim()).filter(Boolean);
  const sections = bullets.length ? [bullets] : chunk(splitSentences(input.brief ?? ""), MAX_BULLETS);

  const slides: Slide[] = [
    {
      title: input.title,
      subtitle: input.subtitle || (fa ? "ارائه تهیه‌شده توسط ایجنت آورالیس" : "Prepared by the AURALIS agent"),
      bullets: [],
      notes: fa ? "اسلاید جلد — نام ارائه‌دهنده، تاریخ و لوگو را اضافه کنید." : "Title slide — add presenter name, date and logo.",
    },
    {
      title: fa ? "دستور جلسه" : "Agenda",
      subtitle: fa ? "آنچه در این ارائه می‌بینیم" : "What we will cover",
      bullets: sections.map((group, i) => `${i + 1}. ${group[0] ?? (fa ? "بخش" : "Section")}`.slice(0, 90)),
      notes: fa ? "یک مرور سریع از ساختار ارائه." : "A quick overview of the deck structure.",
    },
  ];

  const total = Math.max(sections.length, 1);
  sections.forEach((group, i) => {
    slides.push({
      title: group[0]?.slice(0, 70) || (fa ? `بخش ${i + 1}` : `Section ${i + 1}`),
      subtitle: fa ? `بخش ${i + 1} از ${total}` : `Section ${i + 1} of ${total}`,
      bullets: (group.length > 1 ? group.slice(1) : group).slice(0, MAX_BULLETS),
      notes: fa ? "برای این اسلاید نمودار یا تصویر مرتبط اضافه کنید." : "Add a relevant chart or image here.",
    });
  });

  slides.push({
    title: fa ? "جمع‌بندی و قدم بعدی" : "Summary & next steps",
    subtitle: fa ? "تصمیم‌های پیشنهادی" : "Proposed decisions",
    bullets: fa
      ? ["تایید دامنه کار و زمان‌بندی", "شروع فاز اول و تحویل پیش‌نمایش", "پرداخت به تتر (TRC-20)"]
      : ["Confirm scope and timeline", "Kick off phase one and share a preview", "Payment in USDT (TRC-20)"],
    notes: fa ? "دعوت به اقدام و دریافت تایید نهایی." : "Call to action and sign-off.",
  });

  return slides.slice(0, 14);
}

function chunk<T>(items: T[], size: number): T[][] {
  if (!items.length) return [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function generatePptx(input: DeckInput): PptxResult {
  const rtl = input.language ? input.language === "fa" : /[\u0600-\u06FF]/.test(`${input.title}${input.brief ?? ""}`);
  const slides = planDeck(input);
  const meta = {
    title: input.title,
    subtitle: input.subtitle || (rtl ? "ارائه ایجنت آورالیس" : "AURALIS agent deck"),
    author: input.author || "AURALIS Agent",
    rtl,
  };
  const buffer = buildPptx(slides, meta);
  const fileName = `${(input.title || "presentation").replace(/[^\w\u0600-\u06FF-]+/g, "-").slice(0, 60) || "deck"}.pptx`;

  return {
    kind: "pptx",
    title: meta.title,
    subtitle: meta.subtitle,
    author: meta.author,
    direction: rtl ? "rtl" : "ltr",
    slides,
    fileBase64: buffer.toString("base64"),
    fileName,
    engine: "template",
    outline: slides
      .map((s, i) => `${i + 1}. ${s.title}${s.bullets.length ? `\n${s.bullets.map((b) => `   • ${b}`).join("\n")}` : ""}`)
      .join("\n"),
  };
}
