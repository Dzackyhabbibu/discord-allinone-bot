const { writeFileSync } = await import('fs');
const { ESLint } = await import('eslint');
writeFileSync(
  '.eslintrc.cjs',
  'module.exports = { env: { node: true }, extends: "eslint:recommended", rules: { "no-console": "off", "no-unused-vars": "off" } };'
);