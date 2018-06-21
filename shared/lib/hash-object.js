'use strict';

const crypto = require('take-my-hash');

/**
 * Generate a simple hash from object
 * @param {*} obj 
 * @param {*} salt 
 * @param {*} stringToEnforce 
 */
module.exports = (obj, salt = false, stringToEnforce = false) => {
    let stringObject = JSON.stringify(obj);
    
    if (salt) stringObject = `${stringObject}${salt}`;
    if (stringToEnforce) stringObject = `${stringObject}${stringToEnforce}`;
    return crypto.sha1(stringObject);
};