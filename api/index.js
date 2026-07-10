const serverless = require('serverless-http');
const app = require('../server');

// Export the AWS Lambda handler expected by Netlify Functions
module.exports.handler = serverless(app);
