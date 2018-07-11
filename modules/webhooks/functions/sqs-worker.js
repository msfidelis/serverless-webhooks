'use strict';

const webhooks  = require('../../../shared/lib/webhooks');

exports.worker = (event, context, callback) => webhooks.executionHandler();

