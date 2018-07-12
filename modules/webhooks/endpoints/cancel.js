'use strict';

const webhooks  = require('../../../shared/lib/webhooks');

/**
 * Create Webhooks
 * @param {*} event 
 * @param {*} context 
 * @param {*} callback 
 */
exports.handler = (event, context, callback) => {

    const hashkey = event.pathParameters.hashkey;

    webhooks.cancel(hashkey)
        .then(webhook => {

            const response = {
                status: 200,
                message: `Webhook ${hashkey} canceled`,
                webhook: webhook,
                hateoas : {
                    webhook_status: {
                        method: "GET",
                        endpoint: `/webhooks/${hashkey}`
                    },
                    webhook_force: {
                        method: "POST",
                        endpoint: `/webhooks/${hashkey}/force`
                    }
                }
            };

            callback(null, {
                statusCode: 200,
                body: JSON.stringify(response)
            });

        })
        .catch(err => {

            const status    = err.status  || 500;
            const message   = err.message || err;
            const response  = { status: status, message: message, webhook: err.webhook };

            callback(null, {
                statusCode: status,
                body: JSON.stringify(response)
            });

        });
}

