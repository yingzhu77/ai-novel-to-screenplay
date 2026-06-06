import { describe, it, expect } from "vitest";
import { splitChapters } from "../splitter";

describe("splitChapters", () => {
  describe("Chinese chapter patterns", () => {
    it("splits by 第X章 pattern", () => {
      const text = `第一章 初入江湖
这是第一章的内容。
很长的一段文字。

第二章 风云再起
这是第二章的内容。
也很长。

第三章 终极对决
这是第三章的内容。`;

      const chapters = splitChapters(text);
      expect(chapters).toHaveLength(3);
      expect(chapters[0]).toEqual({
        number: 1,
        title: "第一章 初入江湖",
        content: "这是第一章的内容。\n很长的一段文字。",
      });
      expect(chapters[1]).toEqual({
        number: 2,
        title: "第二章 风云再起",
        content: "这是第二章的内容。\n也很长。",
      });
      expect(chapters[2]).toEqual({
        number: 3,
        title: "第三章 终极对决",
        content: "这是第三章的内容。",
      });
    });

    it("splits by 第X节 pattern", () => {
      const text = `第一节 开端
内容一。

第二节 发展
内容二。`;

      const chapters = splitChapters(text);
      expect(chapters).toHaveLength(2);
      expect(chapters[0].title).toBe("第一节 开端");
      expect(chapters[1].title).toBe("第二节 发展");
    });

    it("splits by 第X回 pattern", () => {
      const text = `第一回 混沌初开
内容。

第二回 天地分明
内容。`;

      const chapters = splitChapters(text);
      expect(chapters).toHaveLength(2);
      expect(chapters[0].title).toBe("第一回 混沌初开");
    });

    it("handles Chinese numerals (一二三四五六七八九十)", () => {
      const text = `第十二章 暗流涌动
内容十二。

第十三章 风暴前夕
内容十三。`;

      const chapters = splitChapters(text);
      expect(chapters).toHaveLength(2);
      expect(chapters[0].number).toBe(12);
      expect(chapters[1].number).toBe(13);
    });

    it("handles 第一章 without title (no space after)", () => {
      const text = `第一章
内容一。

第二章
内容二。`;

      const chapters = splitChapters(text);
      expect(chapters).toHaveLength(2);
      expect(chapters[0].title).toBe("第一章");
      expect(chapters[1].title).toBe("第二章");
    });
  });

  describe("English chapter patterns", () => {
    it("splits by Chapter X pattern", () => {
      const text = `Chapter 1 The Beginning
This is chapter one content.

Chapter 2 The Middle
This is chapter two content.

Chapter 3 The End
This is chapter three content.`;

      const chapters = splitChapters(text);
      expect(chapters).toHaveLength(3);
      expect(chapters[0]).toEqual({
        number: 1,
        title: "Chapter 1 The Beginning",
        content: "This is chapter one content.",
      });
    });

    it("splits by CHAPTER X (uppercase) pattern", () => {
      const text = `CHAPTER 1 BEGINNING
Content here.

CHAPTER 2 MIDDLE
Content here.`;

      const chapters = splitChapters(text);
      expect(chapters).toHaveLength(2);
    });
  });

  describe("edge cases", () => {
    it("returns single chapter when no chapter markers found", () => {
      const text = `这是一段没有章节标记的小说文本。
很长很长的内容。`;

      const chapters = splitChapters(text);
      expect(chapters).toHaveLength(1);
      expect(chapters[0]).toEqual({
        number: 1,
        title: "Chapter 1",
        content: text,
      });
    });

    it("returns empty array for empty input", () => {
      const chapters = splitChapters("");
      expect(chapters).toHaveLength(0);
    });

    it("trims whitespace from content", () => {
      const text = `第一章 测试

   内容带空格

第二章 测试二

   内容二   `;

      const chapters = splitChapters(text);
      expect(chapters).toHaveLength(2);
      expect(chapters[0].content).toBe("内容带空格");
      expect(chapters[1].content).toBe("内容二");
    });

    it("filters out empty chapters", () => {
      const text = `第一章 有内容
实际内容在这里。

第二章 空章节


第三章 也有内容
有内容。`;

      const chapters = splitChapters(text);
      expect(chapters).toHaveLength(2);
      expect(chapters[0].title).toBe("第一章 有内容");
      expect(chapters[1].title).toBe("第三章 也有内容");
    });

    it("handles text before first chapter marker", () => {
      const text = `这是一段前言文字。

第一章 正式开始
正文内容。`;

      const chapters = splitChapters(text);
      // The preamble should be ignored since it's before the first chapter
      expect(chapters).toHaveLength(1);
      expect(chapters[0].title).toBe("第一章 正式开始");
    });
  });
});
