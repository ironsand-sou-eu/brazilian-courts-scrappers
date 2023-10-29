import path from "path";

export const cache = false;
export const mode = "production";
export const entry = "./src/index.ts";
export const output = {
  filename: "bundle.js",
  path: path.resolve(__dirname, "dist"),
};
export const resolve = {
  extensions: [".js", ".ts"],
};

export const module = {
  rules: [
    {
      test: /\.[jt]s$/,
      include: [path.resolve(__dirname, "src")],
      use: {
        loader: "ts-loader",
      },
    },
  ],
};
