'use strict';

const hash = require('./hash-object');
const uuid = require('./uuid');
const parsers = require('./parsers');
const dynamo = require('./dynamo');

const DYNAMO_TABLE = process.env.WEBHOOKS_DYNAMO_TABLE;

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

    if (!data.headers) {
        data.headers = { "Content-type": "Application/json" };
    }

    const webhook = {
        hashkey: hashkey,
        status_hook: 'pending',
        success_response: 'NULL',
        error_response: 'NULL',
        target_url: data.url,
        licenca: data.licenca || 'NULL',
        method: data.method,
        payload: payload,
        headers: headers,
        payload_hash: payload_hash,
        retry: 0,
        hook_name: data.hook_name || 'NULL'
    };

    return await dynamo.save(webhook, DYNAMO_TABLE).then(success => webhook);

}

/**
 * Find a simple webhook
 * @param {*} hashkey 
 */
module.exports.detail =  hashkey => {

    return new Promise((resolve, reject) => {

        const options = {
            ConsistentRead: true,
            FilterExpression: "#hashkey = :h",
            ExpressionAttributeNames: {"#hashkey": "hashkey"},
            ExpressionAttributeValues: {":h": hashkey}
        };

        dynamo.scan(options, null, DYNAMO_TABLE)
            .then(success => {
                if (success.Count != 1) reject(success); 
                resolve(success.Items[0]);
            })
            .catch(err => reject(err));
    
    });

}