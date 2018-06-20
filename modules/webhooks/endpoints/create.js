'use strict';

exports.handler = (event, context, callback) => {

    const hashkey = '123';

    const response = {
        statusCode : 201, 
        body: JSON.stringify({
            status: 201,
            hashkey : 'mocked hashkey',
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
    };

    callback(null, response);

}