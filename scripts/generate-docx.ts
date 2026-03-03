/**
 * USER_GUIDE.md → USER_GUIDE.docx 변환 스크립트
 *
 * Usage:
 *   npm run generate-docx
 *
 * 출력: 프로젝트 루트의 USER_GUIDE.docx
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  NumberFormat,
  LevelFormat,
  convertInchesToTwip,
  convertMillimetersToTwip,
} from 'docx';

// ────────────────────────────────────────────────────────────────────────────
// 색상 상수
// ────────────────────────────────────────────────────────────────────────────
const COLOR = {
  H1: '1E3A8A',
  H2: '1D4ED8',
  H3: '374151',
  H4: '4B5563',
  TABLE_HEADER_BG: 'E5E7EB',
  CODE_BG: 'F3F4F6',
  QUOTE_BG: 'FEF9C3',
  WHITE: 'FFFFFF',
  BORDER: 'D1D5DB',
  CODE_BORDER: 'D1D5DB',
};

// ────────────────────────────────────────────────────────────────────────────
// 인라인 마크다운(bold/italic/code) 파싱 → TextRun 배열
// ────────────────────────────────────────────────────────────────────────────
function parseInline(text: string, baseOptions?: { size?: number; color?: string; font?: string }): TextRun[] {
  const runs: TextRun[] = [];
  // 패턴: **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const makeRun = (t: string, bold = false, italics = false, code = false): TextRun =>
    new TextRun({
      text: t,
      bold,
      italics,
      font: code ? 'Courier New' : (baseOptions?.font ?? 'Malgun Gothic'),
      size: code ? (baseOptions?.size ? baseOptions.size - 2 : 18) : (baseOptions?.size ?? 22),
      color: baseOptions?.color,
    });

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(makeRun(text.slice(lastIndex, match.index)));
    }
    if (match[2] !== undefined) {
      // **bold**
      runs.push(makeRun(match[2], true));
    } else if (match[3] !== undefined) {
      // *italic*
      runs.push(makeRun(match[3], false, true));
    } else if (match[4] !== undefined) {
      // `code`
      runs.push(makeRun(match[4], false, false, true));
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    runs.push(makeRun(text.slice(lastIndex)));
  }
  if (runs.length === 0) {
    runs.push(makeRun(''));
  }
  return runs;
}

// ────────────────────────────────────────────────────────────────────────────
// 마크다운 → 마크다운 링크 텍스트만 추출 ([text](url) → text)
// ────────────────────────────────────────────────────────────────────────────
function stripLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}

// ────────────────────────────────────────────────────────────────────────────
// Table 빌더
// ────────────────────────────────────────────────────────────────────────────
function buildTable(rows: string[][]): Table {
  const colCount = rows[0]?.length ?? 1;
  const colWidth = Math.floor(9000 / colCount); // 총 너비 9000 twip

  const tableRows = rows.map((cols, rowIdx) => {
    const isHeader = rowIdx === 0;
    return new TableRow({
      tableHeader: isHeader,
      children: cols.map((cell) =>
        new TableCell({
          width: { size: colWidth, type: WidthType.DXA },
          shading: isHeader
            ? { fill: COLOR.TABLE_HEADER_BG, type: ShadingType.CLEAR, color: 'auto' }
            : undefined,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: COLOR.BORDER },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.BORDER },
            left: { style: BorderStyle.SINGLE, size: 4, color: COLOR.BORDER },
            right: { style: BorderStyle.SINGLE, size: 4, color: COLOR.BORDER },
          },
          children: [
            new Paragraph({
              children: parseInline(cell.trim(), { size: 19, bold: isHeader }),
              spacing: { before: 60, after: 60 },
            }),
          ],
        })
      ),
    });
  });

  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: tableRows,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 코드블록 빌더 (여러 줄)
// ────────────────────────────────────────────────────────────────────────────
function buildCodeBlock(lines: string[]): Paragraph[] {
  return lines.map((line, i) =>
    new Paragraph({
      children: [
        new TextRun({
          text: line === '' ? ' ' : line,
          font: 'Courier New',
          size: 17,
        }),
      ],
      shading: { fill: COLOR.CODE_BG, type: ShadingType.CLEAR, color: 'auto' },
      spacing: { before: i === 0 ? 80 : 0, after: i === lines.length - 1 ? 80 : 0, line: 240, lineRule: 'auto' },
      indent: { left: convertInchesToTwip(0.15) },
      border: {
        top: i === 0 ? { style: BorderStyle.SINGLE, size: 4, color: COLOR.CODE_BORDER } : { style: BorderStyle.NONE, size: 0, color: 'auto' },
        bottom: i === lines.length - 1 ? { style: BorderStyle.SINGLE, size: 4, color: COLOR.CODE_BORDER } : { style: BorderStyle.NONE, size: 0, color: 'auto' },
        left: { style: BorderStyle.SINGLE, size: 8, color: '6B7280' },
        right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      },
    })
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 인용(blockquote) 빌더
// ────────────────────────────────────────────────────────────────────────────
function buildQuote(text: string): Paragraph {
  // > ⚠️ **참고**: ... 에서 >와 앞쪽 공백 제거
  const content = text.replace(/^>\s*/, '');
  return new Paragraph({
    children: parseInline(stripLinks(content), { size: 20 }),
    shading: { fill: COLOR.QUOTE_BG, type: ShadingType.CLEAR, color: 'auto' },
    spacing: { before: 80, after: 80 },
    indent: { left: convertInchesToTwip(0.2) },
    border: {
      left: { style: BorderStyle.THICK, size: 12, color: '2563EB' },
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 불릿 항목 빌더
// ────────────────────────────────────────────────────────────────────────────
function buildBullet(text: string, level: number): Paragraph {
  return new Paragraph({
    children: parseInline(stripLinks(text), { size: 21 }),
    bullet: { level },
    spacing: { before: 40, after: 40 },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 번호 항목 빌더 (ordered list)
// ────────────────────────────────────────────────────────────────────────────
function buildNumbered(text: string, _num: number): Paragraph {
  return new Paragraph({
    children: parseInline(stripLinks(text), { size: 21 }),
    numbering: { reference: 'my-numbering', level: 0 },
    spacing: { before: 40, after: 40 },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 수평선 빌더
// ────────────────────────────────────────────────────────────────────────────
function buildHRule(): Paragraph {
  return new Paragraph({
    children: [],
    spacing: { before: 120, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR.BORDER },
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 제목 빌더
// ────────────────────────────────────────────────────────────────────────────
function buildHeading(text: string, level: 1 | 2 | 3 | 4): Paragraph {
  const levelMap: Record<number, HeadingLevel> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
  };
  const colorMap: Record<number, string> = {
    1: COLOR.H1,
    2: COLOR.H2,
    3: COLOR.H3,
    4: COLOR.H4,
  };
  const sizeMap: Record<number, number> = {
    1: 36,
    2: 30,
    3: 26,
    4: 24,
  };
  const before = { 1: 320, 2: 240, 3: 180, 4: 160 };
  const after = { 1: 160, 2: 120, 3: 80, 4: 60 };

  return new Paragraph({
    heading: levelMap[level],
    children: parseInline(stripLinks(text), {
      size: sizeMap[level],
      color: colorMap[level],
    }),
    spacing: { before: before[level], after: after[level] },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 메인 파서: 마크다운 줄 배열 → DOCX 요소 배열
// ────────────────────────────────────────────────────────────────────────────
type DocElement = Paragraph | Table;

function parseMarkdown(markdown: string): DocElement[] {
  const lines = markdown.split('\n');
  const elements: DocElement[] = [];

  let i = 0;
  let inCodeBlock = false;
  const codeLines: string[] = [];
  let codeBlockOpen = false;
  const tableBuffer: string[][] = [];
  let orderedCount = 0; // for numbered list reset tracking (unused in docx numbering)

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    // 구분자 행(---|---|---) 제거
    const dataRows = tableBuffer.filter(
      (row) => !row.every((cell) => /^:?-+:?$/.test(cell.trim()))
    );
    if (dataRows.length > 0) {
      elements.push(buildTable(dataRows));
    }
    tableBuffer.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];

    // ── 코드블록 ──────────────────────────────────────────────────────────
    if (line.trimStart().startsWith('```')) {
      if (!codeBlockOpen) {
        // 테이블 버퍼 flush
        flushTable();
        codeBlockOpen = true;
        codeLines.length = 0;
      } else {
        // 코드블록 종료
        codeBlockOpen = false;
        const codeParas = buildCodeBlock(codeLines.length > 0 ? codeLines : [' ']);
        codeParas.forEach((p) => elements.push(p));
      }
      i++;
      continue;
    }

    if (codeBlockOpen) {
      codeLines.push(line);
      i++;
      continue;
    }

    // ── 테이블 행 ─────────────────────────────────────────────────────────
    if (line.trimStart().startsWith('|')) {
      // 셀 분리: 양 끝 | 제거 후 split
      const cells = line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|');
      tableBuffer.push(cells);
      i++;
      continue;
    } else {
      // 테이블이 끝났으면 flush
      flushTable();
    }

    // ── 수평선 ────────────────────────────────────────────────────────────
    if (/^---+\s*$/.test(line)) {
      elements.push(buildHRule());
      i++;
      continue;
    }

    // ── 제목 ──────────────────────────────────────────────────────────────
    const h4 = line.match(/^####\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h1 = line.match(/^#\s+(.+)/);

    if (h4) { elements.push(buildHeading(h4[1], 4)); i++; continue; }
    if (h3) { elements.push(buildHeading(h3[1], 3)); i++; continue; }
    if (h2) { elements.push(buildHeading(h2[1], 2)); i++; continue; }
    if (h1) { elements.push(buildHeading(h1[1], 1)); i++; continue; }

    // ── 인용 ──────────────────────────────────────────────────────────────
    if (line.startsWith('>')) {
      elements.push(buildQuote(line));
      i++;
      continue;
    }

    // ── 불릿 리스트 (-, *, +) ──────────────────────────────────────────────
    const bulletMatch = line.match(/^(\s*)([-*+])\s+(.+)/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length;
      const level = Math.min(Math.floor(indent / 2), 3);
      elements.push(buildBullet(bulletMatch[3], level));
      i++;
      continue;
    }

    // ── 번호 리스트 ───────────────────────────────────────────────────────
    const orderedMatch = line.match(/^\s*(\d+)\.\s+(.+)/);
    if (orderedMatch) {
      elements.push(buildNumbered(orderedMatch[2], parseInt(orderedMatch[1])));
      i++;
      continue;
    }

    // ── 빈 줄 ─────────────────────────────────────────────────────────────
    if (line.trim() === '') {
      // 빈 단락 (작은 간격)
      elements.push(new Paragraph({ children: [], spacing: { before: 60, after: 60 } }));
      i++;
      continue;
    }

    // ── 일반 텍스트 ───────────────────────────────────────────────────────
    elements.push(
      new Paragraph({
        children: parseInline(stripLinks(line), { size: 21 }),
        spacing: { before: 40, after: 40 },
      })
    );
    i++;
  }

  // 마지막 table flush
  flushTable();

  return elements;
}

// ────────────────────────────────────────────────────────────────────────────
// 메인 실행
// ────────────────────────────────────────────────────────────────────────────
async function main() {
  const rootDir = resolve(__dirname, '..');
  const mdPath = resolve(rootDir, 'USER_GUIDE.md');
  const docxPath = resolve(rootDir, 'USER_GUIDE.docx');

  console.log(`읽는 중: ${mdPath}`);
  const markdown = readFileSync(mdPath, 'utf-8');

  console.log('마크다운 파싱 중...');
  const elements = parseMarkdown(markdown);
  console.log(`파싱 완료: ${elements.length}개 요소`);

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'my-numbering',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.25) },
                },
              },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: {
            font: 'Malgun Gothic',
            size: 21,
          },
          paragraph: {
            spacing: { line: 360, lineRule: 'auto' },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(25),
              right: convertMillimetersToTwip(25),
            },
          },
        },
        children: elements,
      },
    ],
  });

  console.log('DOCX 생성 중...');
  const buffer = await Packer.toBuffer(doc);
  writeFileSync(docxPath, buffer);
  const sizeKB = Math.round(buffer.byteLength / 1024);
  console.log(`완료! USER_GUIDE.docx (${sizeKB} KB) → ${docxPath}`);
}

main().catch((err) => {
  console.error('오류 발생:', err);
  process.exit(1);
});
