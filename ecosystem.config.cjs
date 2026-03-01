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
      max_memory_restart: '512M',
    },
    {
      name: 'frontend',
      script: './node_modules/.bin/next',
      args: 'start -p 4200',
      cwd: './apps/frontend',
      max_memory_restart: '512M',
    },
  ],
};
