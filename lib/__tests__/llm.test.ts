import { describe, it, expect, vi, beforeEach } from "vitest";

// Create a shared mock function that all instances will use
const mockCreate = vi.fn();

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

import { convertChapterToScreenplay, type LLMConfig } from "../llm";

describe("convertChapterToScreenplay", () => {
  const mockConfig: LLMConfig = {
    apiKey: "test-key",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
  };

  const sampleChapter = {
    number: 1,
    title: "第一章 初入江湖",
    content: "张三走进了客栈。李四正在喝酒。\n\n张三说：\"老板，来一壶酒。\"\n\n李四抬头看了他一眼。",
  };

  const mockChapterResponse = JSON.stringify({
    chapter_number: 1,
    chapter_title: "第一章 初入江湖",
    scene_count: 1,
    scenes: [
      {
        scene_id: "CH1_SC1",
        scene_heading: "INT. 客栈 - 日",
        location: "客栈",
        time: "日",
        characters_present: ["张三", "李四"],
        action: "张三走进客栈，李四正在喝酒。",
        dialogues: [
          {
            index: 1,
            speaker: "张三",
            text: "老板，来一壶酒。",
          },
        ],
      },
    ],
  });

  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("converts a chapter to screenplay format", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: mockChapterResponse,
          },
        },
      ],
    });

    const result = await convertChapterToScreenplay(sampleChapter, mockConfig);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.chapter_number).toBe(1);
    expect(result.data!.scenes).toHaveLength(1);
    expect(result.data!.scenes[0].dialogues[0].text).toBe("老板，来一壶酒。");
  });

  it("returns error when LLM returns invalid JSON", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "not valid json",
          },
        },
      ],
    });

    const result = await convertChapterToScreenplay(sampleChapter, mockConfig);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid JSON");
  });

  it("returns error when LLM returns schema-invalid data", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ invalid: "schema" }),
          },
        },
      ],
    });

    const result = await convertChapterToScreenplay(sampleChapter, mockConfig);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns error when API call fails", async () => {
    mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

    const result = await convertChapterToScreenplay(sampleChapter, mockConfig);
    expect(result.success).toBe(false);
    expect(result.error).toContain("API rate limit exceeded");
  });

  it("handles existing characters for cross-chapter consistency", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: mockChapterResponse,
          },
        },
      ],
    });

    const existingChars = [
      {
        id: "CHAR_1",
        name: "张三",
        aliases: ["小三"],
        role: "主角",
        description: "年轻侠客",
        traits: ["勇敢"],
      },
    ];

    const result = await convertChapterToScreenplay(
      sampleChapter,
      mockConfig,
      existingChars
    );
    expect(result.success).toBe(true);

    // Verify that existing characters were passed to the prompt
    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[1].content;
    expect(userMessage).toContain("张三");
  });
});
