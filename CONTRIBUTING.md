# 贡献指南

本项目为七牛云 × XEngineer 暑期实训营参赛作品。

## 开发流程

1. 从 `main` 创建功能分支: `git checkout -b feat/xxx`
2. 开发并提交: 遵循 conventional commits
3. 推送并创建 PR
4. PR 通过后合并到 `main`

## Commit 规范

```
<type>(<scope>): <description>

# 示例
feat(auth): add user login functionality
fix(api): handle null response from server
refactor(utils): simplify date formatting logic
```

## PR 要求

- 每个 PR 只做一件事
- PR 描述必须包含：标题、功能描述、实现思路、测试方法
- 合并后主分支必须保持可运行

## 代码规范

详见 [CLAUDE.md](./CLAUDE.md)
