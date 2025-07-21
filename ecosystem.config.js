module.exports = {
  apps: [{
    name: "api.oluwasetemi.dev",
    script: "./dist/src/index.js",
    interpreter: "bun",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    log_file: "./logs/combined.log",
    time: true,
    max_memory_restart: "1G",
    // Bun-specific optimizations
    node_args: "--smol",
  }],
};
