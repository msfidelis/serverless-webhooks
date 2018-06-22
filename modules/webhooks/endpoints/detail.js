'use strict';

const webhooks = require('../../../shared/lib/webhooks');

exports.handler = (event, context, callback) => {

    const hashkey = event.pathParameters.hashkey;

    console.log(hashkey);

    webhooks.detail(hashkey).then(success => {
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({
                webhook: success,
                hateoas : {
                    webhook_status: {
                        method: "GET",
                        endpoint: `/webhooks/${hashkey}`
                    },
                    webhook_cancel: {
                        method: "DELETE",
                        endpoint: `webhooks/${hashkey}`
                    },
                    webhook_force: {
                        method: "POST",
                        endpoint: `/webhooks/${hashkey}`
                    }
                }
            }) 
        });
        }).catch(err => {
            callback(null, {
                statusCode: 404,
                body: JSON.stringify({      
                    status: 404,
                    message: `Webhook ${hashkey} not found`
                })
            })
        });

}