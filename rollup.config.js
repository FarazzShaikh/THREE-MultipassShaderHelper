import typescript from "rollup-plugin-typescript2";
import dts from "rollup-plugin-dts";
import cleanup from "rollup-plugin-cleanup";

const tscOpts = {
  useTsconfigDeclarationDir: true,
};

export default [
  {
    input: "index.ts",
    output: {
      file: "build/MultipassShaderHelper.js",
      format: "es",
    },
    external: ["three"],
    plugins: [typescript(tscOpts), cleanup()],
  },
  {
    input: "index.ts",
    output: {
      file: "build/MultipassShaderHelper.browser.js",
      format: "iife",
      name: "MultipassShaderHelper",
      globals: {
        three: "THREE",
      },
    },
    external: ["three"],
    plugins: [typescript(tscOpts), cleanup()],
  },

  {
    input: "index.ts",
    output: {
      sourcemap: true,
      file: "build/MultipassShaderHelper.cdn.js",
      format: "es",
      paths: {
        three: "https://cdn.skypack.dev/three",
      },
    },
    external: ["three"],
    plugins: [typescript(tscOpts), cleanup()],
  },

  {
    input: "build/types/index.d.ts",
    output: [
      {
        file: "build/MultipassShaderHelper.d.ts",
        format: "es",
      },
    ],
    external: ["three"],
    plugins: [dts()],
  },
];
