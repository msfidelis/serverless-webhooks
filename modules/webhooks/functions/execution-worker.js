'use strict';

const webhooks  = require('../../../shared/lib/webhooks');

/**
 * Execution Worker
 * @param {*} event 
 * @param {*} context 
 * @param {*} callback 
 */
module.exports.worker = (event, context, callback) => {
    event.map(message => {
        webhooks.detail(message.Body.hashkey)
            .then(webhook => webhooks.run(webhook, message))
            .catch(err => console.log(err));
    });
};