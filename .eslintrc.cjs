module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier", // отключает правила, конфликтующие с prettier
  ],
  plugins: ["react", "@typescript-eslint"],
  rules: {
    "react/react-in-jsx-scope": "off", // не нужен React импорт в React 17+
    "@typescript-eslint/no-unused-vars": ["error"], // ошибки если переменная не используется
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
