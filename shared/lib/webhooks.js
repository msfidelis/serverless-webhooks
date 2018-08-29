'use strict';

const axios     = require('axios');

const hash      = require('./hash-object');
const parsers   = require('./parsers');
const dynamo    = require('./dynamo');
const uuid      = require('./uuid');
const sqs       = require('./sqs');
const lambda    = require('./lambda');

const DYNAMO_TABLE          = process.env.WEBHOOKS_DYNAMO_TABLE;
const SQS_QUEUE             = process.env.WEBHOOKS_SQS_QUEUE;
const MESSAGES_TO_CONSUME   = process.env.WEBHOOKS_MESSAGES_TO_CONSUME;
const CONSUMER_INTERVAL     = process.env.WEBHOOKS_CONSUME_INTERVAL;
const EXECUTION_FUNCTION    = process.env.WEBHOOKS_HOOKS_EXECUTOR;

/**
 * Register a new Webhook
 * @param {*} webhookData 
 */
module.exports.create = async data => {

    if (typeof data !== 'object') data = await parsers.parseStringToObject(data);

    const hashkey       = await uuid();
    const payload       = await parsers.parseObjectToString(data.payload);
    const headers       = await parsers.parseObjectToString(data.headers);
    const payload_hash  = await hash(data.payload, data.url, data.method);

    const actionsToSave = [ saveInDynamo, saveInSQS ];

    if (!data.headers) data.headers = { "Content-type": "Application/json" }

    const webhook = {
        hashkey: hashkey,
        status_hook: 'pending',
        success_response: 'NULL',
        error_response: 'NULL',
        target_url: data.target_url,
        client: data.client || 'NULL',
        method: data.method,
        payload: payload,
        headers: headers,
        payload_hash: payload_hash,
        retry: 0,
        hook_name: data.hook_name || 'NULL'
    };

    const operations = actionsToSave.map(action => action(webhook));

    return Promise.all(operations).then(success => webhook);
}

/**
 * Execution Handler
 */
module.exports.executionHandler = () => {
    setInterval(() => {
        consumeWebhooks().then(poll => {
            if (poll.Messages == undefined) return;
            const webhooks = poll.Messages.map(message => {
                message.Body = parsers.parseStringToObject(message.Body)
                return message;
            });
            return lambda.invoke(EXECUTION_FUNCTION, webhooks);
        });
    }, CONSUMER_INTERVAL)
};

/**
 * Execute HTTP Requests
 * @param {*} webhook 
 */
module.exports.run = (webhook, message) => {
    return new Promise((resolve, reject) => {
        canBeExecuted(webhook)
            .then(isOk => {
                send(webhook)
                    .then(success => successHandler(message, success))
                    .catch(err => failHandler(message, err));
            })
            .catch(err => {
                console.log(err);
                const errorHandlers = { locked: lockedHandler, invalid: invalidHandler };
                errorHandlers[err](message)
                reject(webhook);
            });
    });
};

/**
 * 
 * @param {*} webhook 
 */
module.exports.force = webhook => {

};

/**
 * Find a simple webhook
 * @param {*} hashkey 
 */
module.exports.detail =  hashkey => getWebhook(hashkey);

/**
 * Cancel a simple webhook
 * @param {*} hashkey 
 */
module.exports.cancel = hashkey => {

    return new Promise((resolve, reject) => {
        getWebhook(hashkey)
            .then(webhook => {

                if (webhook.status_hook == "locked")   reject({status: 400, webhook: webhook, message: `webhook ${hashkey} is locked`})
                if (webhook.status_hook == "canceled") reject({status: 400, webhook: webhook, message: `webhook ${hashkey} already canceled`})
                if (webhook.status_hook == "success")  reject({status: 400, webhook: webhook, message: `webhook ${hashkey} already finished with success`})
                
                cancelHandler(webhook)
                    .then(success => resolve(webhook))
                    .catch(err => reject(err))
                
            })
            .catch(err => {
                const response = {
                    status: 404, 
                    message: `webhook ${hashkey} not found`
                };
                reject(response);
            })
    });

};

/**
 * Verify if this Webhook can be executed
 * @param {*} webhook 
 */
const canBeExecuted = webhook => {
    return new Promise((resolve, reject) => {
        const actionsToValidate = [ limitHandler, statusHandler ];
        const validations = actionsToValidate.map(action => action(webhook));
    
        Promise.all(validations)
            .then(success => resolve(webhook))
            .catch(err => reject(err));
    });
}

/**
 * Verify limit handler
 * @param {*} num 
 */
const limitHandler = webhook => {
    return new Promise((resolve, reject) => {
        const isValid = webhook.retry <= 9;
        if (isValid) resolve(isValid);
        reject('locked')
    });
}

/**
 * Verify Hook Status
 * @param {*} status 
 */
const statusHandler = webhook => {
    return new Promise((resolve, reject) => {
        const validStatus = [ 'pending', 'error', 'forced' ]
        const status  = webhook.status_hook;
        const isValid = validStatus.includes(status);

        if (isValid) {
            if (webhook.status_hook == "canceled") reject('canceled');
            resolve(isValid)
        } else {
            reject('invalid');
        }

    });
};

/**
 * Error Message Handler
 */
const errorHandler = (webhook, error) => {
    return Promise.all([
        setErrorStatus(webhook, error)
    ]);
};

/**
 * Locked Message Handler
 * @param {*} webhook 
 */
const lockedHandler = webhook => {
    return Promise.all([
        removeFromSQS(webhook),
        setLockedStatus(webhook)
    ]);
};

/**
 * Invalid Message Handler
 * @param {*} webhook 
 */
const invalidHandler = webhook => {
    return Promise.all([
        removeFromSQS(webhook),
        setInvalidStatus(webhook.Body.hashkey)
    ]);
};

/**
 * Canceled Message Handler
 * @param {*} webhook 
 */
const cancelHandler = webhook => {
    return Promise.all([
        setCanceledStatus(webhook.hashkey)
    ]);
};

/**
 * Success Message Handler
 * @param {*} webhook 
 */
const successHandler = (webhook, response) => {
    return Promise.all([
        removeFromSQS(webhook),
        setSuccessStatus(webhook, response)
    ]);
}

/**
 * Fail Message Handler
 * @param {*} webhook 
 */
const failHandler = (webhook, response) => {
    console.log(response);
    return Promise.all([setErrorStatus(webhook, response)]);
};

/**
 * Set Lock Status on Webhook 
 * @param {*} hashkey 
 */
const setLockedStatus = webhook => {
    const hashkey   = webhook.Body.hashkey;
    const key = { hashkey: hashkey };
    const expression = "set status_hook = :l";
    const values = { ":l": "locked"};
    return dynamo.update(key, expression, values, DYNAMO_TABLE);
}

/**
 * Set Success Status on Webhook
 * @param {*} hashkey 
 */
const setSuccessStatus = (webhook, body = '') => {
    const hashkey   = webhook.Body.hashkey;
    const response  = parsers.parseObjectToString(body);
    const key = { hashkey: hashkey };
    const expression = "set status_hook = :s, success_response = :r, retry = retry + :val";
    const values = { ":s": "success", ":r": response, ":val": 1};
    return dynamo.update(key, expression, values, DYNAMO_TABLE);
};

/**
 * Set Error Status on Webhook
 * @param {*} hashkey 
 */
const setErrorStatus = (webhook, body = '') => {
    const hashkey   = webhook.Body.hashkey;
    const response  = parsers.parseObjectToString(body);
    const key = { hashkey: hashkey };
    const expression = "set status_hook = :s, error_response = :r, retry = retry + :val";
    const values = { ":s": "error", ":r": response, ":val": 1};
    return dynamo.update(key, expression, values, DYNAMO_TABLE);
};

/**
 * Set Invalid Status on Webhook
 * @param {*} hashkey 
 */
const setInvalidStatus = (webhook, body = '') => {
    const hashkey   = webhook.Body.hashkey;
    const key = { hashkey: hashkey };
    const expression = "set status_hook = :s";
    const values = { ":s": "invalid"};
    return dynamo.update(key, expression, values, DYNAMO_TABLE);
};

/**
 * Set Canceled Status on Webhook
 * @param {*} hashkey 
 */
const setCanceledStatus = hashkey => {
    const key = { hashkey: hashkey };
    const expression = "set status_hook = :s";
    const values = { ":s": "canceled"};
    return dynamo.update(key, expression, values, DYNAMO_TABLE);
};

/**
 * Find a Webhook on DynamoDB
 * @param {*} hashkey 
 */
const getWebhook = hashkey => {
    return new Promise((resolve, reject) => {

        const params = {
            ConsistentRead: true,
            FilterExpression: "#hashkey = :h",
            ExpressionAttributeNames: {"#hashkey": "hashkey"},
            ExpressionAttributeValues: {":h": hashkey}
        };

        dynamo.scan(params, null, DYNAMO_TABLE)
            .then(results => {
                if (results.Count != 1) reject(results); 
                resolve(results.Items[0]);
            })
            .catch(err => reject(err));

    });
};

/**
 * Send HTTP Requests
 * @param {*} webhook 
 */
const send =  webhook => {
    return new Promise((resolve, reject) => {

        const options = {
            url     : webhook.target_url,
            method  : webhook.method,
            data    : parsers.parseStringToObject(webhook.payload),
            headers : JSON.parse(webhook.headers)   
        };

        axios(options)
            .then(success => {
                const body = success.data;
                resolve(body);
            })
            .catch(error => {
                if (error.response) reject(error.response.data);
                if (error.message)  reject(error.message);
                if (error.request)  reject(error.request.data);
                reject(error);
            });

    });
};

/**
 * Consume SQS Queue
 */
const consumeWebhooks = () => sqs.consumeQueue(MESSAGES_TO_CONSUME, SQS_QUEUE)

/**
 * Save message on DynamoDB Table
 * @param {*} webhook 
 */
const saveInDynamo = webhook => dynamo.save(webhook, DYNAMO_TABLE);

/**
 * Save message on SQS Queue
 * @param {*} webhook 
 */
const saveInSQS = webhook => sqs.save(webhook, SQS_QUEUE);

/**
 * Remove message from Webhooks Queue
 * @param {*} message 
 */
const removeFromSQS = message => sqs.removeFromQueue(message, SQS_QUEUE);


