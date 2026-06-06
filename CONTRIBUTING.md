# 贡献指南

本项目为七牛云 × XEngineer 暑期实训营参赛作品。

## 开发流程

1. 从 `main` 创建功能分支: `git checkout -b feat/xxx`
2. 开发并提交: 遵循 conventional commits
3. 推送并创建 PR: `git push -u origin feat/xxx` → `gh pr create`
4. PR 通过后合并到 `main`

## Commit 规范

```
<type>(<scope>): <description>

# 示例
feat(auth): add user login functionality
fix(api): handle null response from server
refactor(utils): simplify date formatting logic
```

## PR 提交规范（比赛要求）

### 核心原则

- **每个 PR 只做一件事**: 每个 PR 只实现或修改单一功能
- **鼓励小粒度 PR**: 尽可能小、粒度尽可能细；大功能应拆分为多个独立 PR 分步提交
- **持续交付**: 从议题发布之日起，开发周期内保持持续的 PR 记录和 commit 提交
- **严禁突击提交**: 仅在最后一天一次性导入所有代码的作品，将直接视为无效作品
- **时间戳合规**: 所有 commit 时间戳必须落在所选批次的开始与截止时间之内

### PR 描述必须包含

1. **标题**: 一句话说明本 PR 新增/修改了什么
2. **功能描述**: 说明该功能的作用与使用方式
3. **实现思路**: 简要说明技术选型或核心实现逻辑
4. **测试方式**: 如何验证该功能正常运行

### 合并后要求

- 主分支代码需保持可运行状态，评委在任意时间查看应能复现演示效果

### 其他无效情形（需避免）

- PR 描述空白或与实际代码变更严重不符
- 引用了第三方库或框架，没在 README 中列明依赖，且未说明原创功能部分
- 复用了自己过去的代码片段，没在 PR 描述中注明来源

## 代码规范

详见 [CLAUDE.md](./CLAUDE.md)
