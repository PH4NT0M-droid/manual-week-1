import serverless from 'serverless-http';
import app from '../src/server/index.js';

export default serverless(app);
