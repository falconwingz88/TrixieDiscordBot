module.exports = {
  apps: [
    {
      name: "trixie-bot",
      script: "./dist/index.js"
    },
    {
      name: "updater",
      script: "./auto-update.js"
    }
  ]
};