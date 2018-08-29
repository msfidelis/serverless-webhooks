'use strict';

const webhooks  = require('../../../shared/lib/webhooks');
const parsers   = require('../../../shared/lib/parsers');

const Joi       = require('joi');

/**
 * Create Webhooks
 * @param {*} event 
 * @param {*} context 
 * @param {*} callback 
 */
exports.handler = (event, context, callback) => {

    const body = parsers.parseEvent(event);

    validation(body)
        .then(success => {
            webhooks.create(body).then(webhook => {
                callback(null, {
                    statusCode: 201,
                    body: JSON.stringify({
                        status: 201,
                        webhook: webhook,
                        hateoas: {
                            webhook_status: {
                                method: "GET",
                                endpoint: `/webhooks/${webhook.hashkey}`
                            },
                            webhook_cancel: {
                                method: "DELETE",
                                endpoint: `webhooks/${webhook.hashkey}`
                            },
                            webhook_force: {
                                method: "POST",
                                endpoint: `/webhooks/${webhook.hashkey}`
                            }
                        }
                    })
                });
            });
        }).catch(err => {
            callback(null, {
                statusCode: 400,
                body: JSON.stringify(err.details)
            });
        })
}


/**
 * FIFO Webhooks 
 * @param {*} event 
 * @param {*} context 
 * @param {*} callback 
 */
exports.batch = (event, context, callback) => {

    const body  = parsers.parseEvent(event);
    const items = body.webhooks;

    const validations = items.map(item => validation(item));

    Promise.all(validations)
        .then(success => {

        })
        .catch(err => {
            callback(null, {
                statusCode: 400,
                body: JSON.stringify(err)
            });
        });
}

/**
 * POST Schema Validation
 * require fields
 * @param {*} body 
 */
const validation = async payload => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            target_url: Joi.string().min(10).required(),
            method: Joi.string().min(3).required(),
            headers: Joi.object(),
            datetime: Joi.string(),
            client: Joi.string(),
            hook_name: Joi.string(),
            payload: Joi.object()
        });

        Joi.validate(payload, schema, (err, value) => {
            if (err) reject(err);
            resolve(value);
        });
    });
};