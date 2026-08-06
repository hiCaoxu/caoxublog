## 版本控制的重要性

Git 是现代软件开发中不可或缺的工具。良好的 Git 工作流能提升团队协作效率。

## 推荐工作流

### Git Flow

适合有计划发布周期的项目：

- `main`：生产环境代码
- `develop`：开发分支
- `feature/*`：功能分支
- `release/*`：发布分支
- `hotfix/*`：紧急修复分支

### 常用命令速查

```bash
# 创建并切换到新分支
git checkout -b feature/new-feature

# 交互式变基
git rebase -i HEAD~3

# 暂存工作区
git stash

# 查看提交历史
git log --oneline --graph --all
```

## 提交信息规范

推荐使用 Conventional Commits 规范：

```
feat: 添加用户登录功能
fix: 修复导航栏样式问题
docs: 更新 README 文档
refactor: 重构数据处理逻辑
```

## 总结

好的 Git 实践能显著提升开发效率和代码质量，值得花时间学习和养成习惯。
