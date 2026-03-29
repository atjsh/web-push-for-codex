#!/usr/bin/env node

import { clearSubscriptions, listActiveSubscriptions } from '../backend/src/store.js';

const before = listActiveSubscriptions().length;
clearSubscriptions();
console.log(`Cleared ${before} subscription(s). New registrations are now allowed.`);
