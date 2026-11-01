export const yamlTemplate = `# 修改配置后保存，终端会输出新的 snapshot
title: Loadlet
items:
  - overview
enabled: true

# 配置无效时可观察失败保留与恢复
`;

export const jsonTemplate = `{
  "title": "Loadlet",
  "items": ["overview"],
  "enabled": true
}
`;

export const iniTemplate = `title = Loadlet
items[] = overview
enabled = true
`;

export const textTemplate = `Loadlet
`;

export const jsTemplate = `export const config = {
  title: "Loadlet",
  items: ["overview"],
  enabled: true,
};
`;

export const tsTemplate = `export const config = {
  title: "Loadlet",
  items: ["overview"],
  enabled: true,
} satisfies Record<string, unknown>;
`;
