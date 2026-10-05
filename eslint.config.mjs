import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  
  globalIgnores([
    
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    
    ".next-e2e/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
      }],
      "react-hooks/incompatible-library": "warn",
      
      
      "no-restricted-syntax": ["error",
        {
          "selector": "JSXElement[openingElement.name.name='FormLabel'] > JSXText[value=/[*]\\s*$/]",
          "message": "Don't type the asterisk. Use <FormLabel required> instead.",
        },
        {
          "selector": "JSXElement[openingElement.name.name='FormLabel'] > JSXExpressionContainer > Literal[value=/[*]\\s*$/]",
          "message": "Don't type the asterisk. Use <FormLabel required> instead.",
        },
        {
          "selector": "JSXAttribute[name.name='label'] > Literal[value=/ [*]\\s*$/]",
          "message": "Don't type the asterisk. Pass `required` to the field instead.",
        },
      ],
    },
  },
]);

export default eslintConfig;
