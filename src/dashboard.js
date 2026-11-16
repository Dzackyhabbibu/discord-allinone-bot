'use strict';

// Dashboard entry point - starts the web interface
const Dashboard = require('./server');

const dashboard = new Dashboard();
dashboard.start().catch(err => {
  console.error('Failed to start dashboard:', err);
  process.exit(1);
});