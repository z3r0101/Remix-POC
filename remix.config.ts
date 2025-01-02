/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  future: {
    v2_routeConvention: true,
  },
  ignoredRouteFiles: ["**/.*"],
  // appDirectory: "app",
  //assetsBuildDirectory: "public/build",
  // publicPath: "/build/",
  publicPath: "/remix-poc/build/"
  serverBuildPath: "build/index.js",
};
