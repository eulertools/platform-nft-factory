"use strict";
const path = require("path");

module.exports = {
  options: {
    buildType: "serverless",
  },
  modifyPaths({ paths }) {
    paths.prodAppServerIndexJs = path.join(paths.appSrc, "index.prod");
    return paths;
  },
  modifyWebpackConfig({ env: { target, dev }, webpackConfig, paths }) {
    webpackConfig.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    });
    if (target === "node") {
      if (!dev) {
        webpackConfig.entry.server = [paths.prodAppServerIndexJs];
      }
    }
    return webpackConfig;
  },
};
