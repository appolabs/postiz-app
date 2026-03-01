module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'node',
      args: '--experimental-require-module ./dist/apps/backend/src/main.js',
      cwd: './apps/backend',
      max_memory_restart: '512M',
      env: {
        PORT: 3000,
      },
    },
    {
      name: 'orchestrator',
      script: 'node',
      args: '--experimental-require-module ./dist/apps/orchestrator/src/main.js',
      cwd: './apps/orchestrator',
      max_memory_restart: '768M',
    },
    {
      name: 'frontend',
      script: 'node',
      args: '.next/standalone/apps/frontend/server.js',
      cwd: './apps/frontend',
      max_memory_restart: '512M',
      env: {
        PORT: 4200,
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};
