const { exec } = require("child_process");

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
}

async function checkUpdates() {
  try {
    await run("git fetch");

    const remote = await run("git rev-parse origin/master");
    const local = await run("git rev-parse HEAD");

    if (remote !== local) {
      console.log("🔄 Update found! Updating bot...");

      await run("git pull");
      //await run("npm install");
      await run("npm run build");
      await run("pm2 restart trixie-bot");

      console.log("✅ Bot updated successfully!");
    }
  } catch (err) {
    console.error("❌ Update error:", err.message);
  }
}

setInterval(checkUpdates, 60000);