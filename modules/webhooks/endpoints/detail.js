'use strict';

exports.handler = (event, context, callback) => {

    const hashkey = '123';

    const response = {
        statusCode : 201, 
        body: JSON.stringify({
            status: 201,
            webhook : {
                hashkey: hashkey,
                status_hook: 'pending',
                success_response: '{"status": 200}',
                error_response: 'NULL',
                target_url: 'http://hook.com.br/legal',
                client: 'Stephen Hawking',
                method: 'POST',
                payload: '{"data": 123123}'
            },
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