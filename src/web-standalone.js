const { startDashboard } = require("./dashboard");

const browserClient = {
  users: {
    cache: new Map(),
    async fetch(userId) {
      return { id: userId, username: userId };
    },
  },
};

startDashboard(browserClient);
