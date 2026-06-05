export interface Chapter {
  number: number;
  title: string;
  content: string;
}

// Chinese numeral to number mapping
const CN_DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  百: 100,
};

function chineseToNumber(cn: string): number {
  if (!cn) return 0;
  // Handle simple cases like 十, 十一, 二十, 二十一, etc.
  let result = 0;
  let current = 0;
  for (const char of cn) {
    const val = CN_DIGITS[char];
    if (val === undefined) continue;
    if (val === 10) {
      result += (current || 1) * 10;
      current = 0;
    } else if (val === 100) {
      result += (current || 1) * 100;
      current = 0;
    } else {
      current = val;
    }
  }
  result += current;
  return result || 0;
}

// Regex patterns for chapter detection
// Matches: 第一章, # 第一章, 第1章, 第十二章, Chapter 1, # Chapter 1, etc.
const CHAPTER_PATTERNS = [
  // Chinese: 第X章/节/回 (Chinese numerals), with optional markdown # prefix
  /^#{0,3}\s*第([一二三四五六七八九十百零〇]+)[章节回幕](?:\s+(.+))?$/m,
  // Chinese: 第X章/节/回 (Arabic numerals), with optional markdown # prefix
  /^#{0,3}\s*第(\d+)[章节回幕](?:\s+(.+))?$/m,
  // English: Chapter X / CHAPTER X, with optional markdown # prefix
  /^(#{0,3}\s*)(Chapter|CHAPTER)\s+(\d+)(?:\s+(.+))?$/m,
];

function findChapterMatches(text: string): { index: number; number: number; title: string }[] {
  const matches: { index: number; number: number; title: string }[] = [];
  const lines = text.split("\n");

  let charIndex = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      charIndex += line.length + 1;
      continue;
    }

    for (const pattern of CHAPTER_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        let chapterNum: number;
        let title: string;

        if (pattern === CHAPTER_PATTERNS[2]) {
          // English pattern: # Chapter X (group 1 = markdown prefix, group 2 = Chapter, group 3 = number)
          chapterNum = parseInt(match[3], 10);
          title = trimmed.replace(/^#{0,3}\s*/, "");
        } else if (pattern === CHAPTER_PATTERNS[0]) {
          // Chinese with Chinese numerals
          chapterNum = chineseToNumber(match[1]);
          title = trimmed.replace(/^#{0,3}\s*/, "");
        } else {
          // Chinese with Arabic numerals
          chapterNum = parseInt(match[1], 10);
          title = trimmed.replace(/^#{0,3}\s*/, "");
        }

        matches.push({ index: charIndex, number: chapterNum, title });
        break; // Only match first pattern per line
      }
    }

    charIndex += line.length + 1;
  }

  return matches;
}

export function splitChapters(text: string): Chapter[] {
  if (!text || !text.trim()) {
    return [];
  }

  const matches = findChapterMatches(text);

  if (matches.length === 0) {
    // No chapter markers found - treat entire text as one chapter
    const trimmed = text.trim();
    if (!trimmed) return [];
    return [{ number: 1, title: "Chapter 1", content: trimmed }];
  }

  const chapters: Chapter[] = [];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const rawContent = text.slice(start, end);

    // Remove the title line from content
    const lines = rawContent.split("\n");
    const contentLines = lines.slice(1); // Skip the first line (title)
    const content = contentLines.join("\n").trim();

    // Skip empty chapters
    if (!content) continue;

    chapters.push({
      number: matches[i].number,
      title: matches[i].title,
      content,
    });
  }

  return chapters;
}
