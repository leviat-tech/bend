module.exports = {
  "extends": "airbnb-base",
  "rules": {
    "object-curly-newline": ["error", {
      "ObjectExpression": { "minProperties": 6, "multiline": true, "consistent": true },
      "ObjectPattern": { "minProperties": 6, "multiline": true, "consistent": true },
      "ImportDeclaration": { "minProperties": 6, "multiline": true, "consistent": true },
      "ExportDeclaration": { "minProperties": 6, "multiline": true, "consistent": true },
    }],
    "prefer-destructuring": "off",
    "import/newline-after-import": ["error", { "count": 2 }],
    "max-len": ["error", 120, 2, {
      "ignoreUrls": true,
      "ignoreComments": false,
      "ignoreRegExpLiterals": true,
      "ignoreStrings": true,
      "ignoreTemplateLiterals": true
    }],
    "padded-blocks": "off",
    "no-param-reassign": "off",
    "object-curly-newline": ["error", {
      ObjectExpression: { minProperties: 5, multiline: true, consistent: true },
      ObjectPattern: { minProperties: 5, multiline: true, consistent: true },
      ImportDeclaration: { minProperties: 5, multiline: true, consistent: true },
      ExportDeclaration: { minProperties: 5, multiline: true, consistent: true },
    }],
  },
  overrides: [
    {
      files: [
        '**/__tests__/*.{j,t}s?(x)',
        '**/test/**/*.spec.{j,t}s?(x)',
      ],
      env: {
        mocha: true,
      },
    },
  ],
};
