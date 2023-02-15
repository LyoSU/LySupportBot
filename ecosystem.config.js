module.exports = {
  apps: [{
    name: "LySupportBot",
    script: "./dist/index.js",
    watch: true,
    cron_restart: '0 */1 * * *', // Restart every hour
    restart_delay: 1000 * 3,
    env: {
      "NODE_ENV": "development",
    },
    env_production: {
      "NODE_ENV": "production",
    }
  }]
}
