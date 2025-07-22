/* eslint-disable node/no-process-env */
module.exports = {
  apps: [{
    name: "api.oluwasetemi.dev",
    script: "src/index.ts",
    interpreter: "bun",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: 4444,
      PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`,
    },
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    log_file: "./logs/combined.log",
    time: true,
    max_memory_restart: "1G",
  }],
};
