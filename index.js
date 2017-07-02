const typeOf = require('typeof');
const np = require('nested-property').get;
const isEqual = require('is-equal');
const pad = require('pad');
const PromisesRunner = require('promises-runner');

const PAD_LEN = 20;
const ensureArray = (arr) => arr === undefined ? [] : typeOf(arr) === 'array' ? arr : [arr];
const ensurePromise = (obj) => obj && typeOf(obj.then) === 'function' ? obj : Promise.resolve(obj);
const setDataInErrorString = (errorTemplateString, data) => errorTemplateString.replace(/:(\w+):/g, (_, k) => data[k] ? data[k] : _);

class BreakCurrentFieldTestsException {
    constructor(errorMessage, key) {
        this.errorMessage = errorMessage
        this.key = key
    }
}

class EndActionValidations {
    constructor(errorMessage) {
        this.errorMessage = errorMessage
    }
}

const prepareValidationObject = (_validationObject) => {
    const validationObject = {};
    validationObject.validation = _validationObject.validation || _validationObject.v;
    validationObject.lastAll = _validationObject.lastAll || _validationObject.la;
    validationObject.last = _validationObject.last || _validationObject.l;
    validationObject.expect = _validationObject.expect || _validationObject.ex;
    validationObject.causeGenericError = _validationObject.causeGenericError || _validationObject._e;
    validationObject.message = _validationObject.message || _validationObject.m;
    validationObject.key = _validationObject.key || _validationObject.k;
    validationObject.wait = _validationObject.wait || _validationObject.w;
    validationObject.data = _validationObject.data || _validationObject.d;

    validationObject.redirection = _validationObject.redirection || _validationObject.r;
    const typeOfRedirection = typeOf(validationObject.redirection);
    if (typeOfRedirection === 'object' || typeOfRedirection === 'array') {
        validationObject.redirection = ensureArray(validationObject.redirection);
        for (let i = 0; i < validationObject.redirection.length; i++) {
            validationObject.redirection[i].href = validationObject.redirection[i].href || validationObject.redirection[i].h;
            validationObject.redirection[i].title = validationObject.redirection[i].title || validationObject.redirection[i].t;
        }
    } else {
        delete validationObject.redirection;
    }

    return validationObject;
}

const logValidationResult = (validationObject, isValid) => {
    if (!VERBOSE_LOGGER) {
        return;
    }
    const validationName = np(validationObject, 'validation.name') || 'anonymous';
    const validationResultASCII = isValid ? '✗' : '✓';
    const logTag = pad('validation-result', PAD_LEN);
    VERBOSE_LOGGER(`[${logTag}] -- [${validationResultASCII}] ${validationName}(...) = ${isValid}  // ${validationObject.message}`);
}

const logInvalidValidation = (validationObject, key) => {
    if (!VERBOSE_LOGGER) {
        return;
    }
    const logTag = pad('validation-invalid', PAD_LEN);
    if (!validationObject.validation) { // possibly a server side validation check
        VERBOSE_LOGGER(`[${logTag}] -- \`${key}\` Invalid or server side validator. // ${validationObject.message}`);
    }
}

const logSkippingValidation = (validationObject, key) => {
    if (!VERBOSE_LOGGER) {
        return;
    }
    const logTag = pad('validation-skipped', PAD_LEN);
    VERBOSE_LOGGER(`[${logTag}] -- \`${key}\` Skipping as previous one was last or lastAll. // ${validationObject.message}`);
}

const logRunningValidation = (validationObject, key, data) => {
    if (!VERBOSE_LOGGER) {
        return;
    }
    const validationName = np(validationObject, 'validation.name') || 'anonymous';
    const logTag = pad('validation-start', PAD_LEN);
    VERBOSE_LOGGER(`[${logTag}] -- [ ] ${validationName}(...${data}) // ${validationObject.message}`);
}

let skipAllRest = false;
let skipAllForKey = false;
let VERBOSE_LOGGER = false;

const validateAndReturnResult = (validationObject, _key, data) => {
    if (skipAllRest || _key === skipAllForKey) {
        logSkippingValidation(validationObject, _key)
        return Promise.resolve({})
    }
    let key = validationObject.key || _key;
    let inputArgs = [data[key] || '']
    if (validationObject.data) {       //request data siblings as extra argument
        inputArgs.push(data);
    }
    logRunningValidation(validationObject, key, inputArgs);
    return ensurePromise(validationObject.validation(...inputArgs))
        .then(validationResult => {
            let anyErrorMessage = false;
            try {
                anyErrorMessage = prepareErrorString(key, validationResult, validationObject, data);
            } catch (e) {
                const errorType = typeOf(e);
                if (
                    errorType !== 'BreakCurrentFieldTestsException'.toLowerCase()
                    && errorType !== 'EndActionValidations'.toLowerCase()
                ) {
                    throw e;
                } else if (errorType === 'EndActionValidations'.toLowerCase()) {
                    skipAllRest = true;
                } else if (errorType === 'BreakCurrentFieldTestsException'.toLowerCase()) {
                    skipAllForKey = e.key;
                }

                anyErrorMessage = e.errorMessage;
            }
            return Promise.resolve(anyErrorMessage || {});
        });
}

const prepareErrorString = (key, validationResult, validationObject, data) => {
    const expectedResult = validationObject.expect === undefined ? false : validationObject.expect;
    const isValid = isEqual(validationResult, expectedResult);
    logValidationResult(validationObject, validationResult);
    if (isValid) {
        return;
    }

    let errorKey = key;
    if (validationObject.causeGenericError) {
        errorKey = '_error';
    }
    let validationMessage = validationObject.message;
    const errorMessage = {};
    if (validationObject.redirection) {

        const redirection = [];
        for (let i = 0; i < validationObject.redirection.length; i++) {
            validationMessage = setDataInErrorString(validationMessage, data)
            redirection.push({
                href: setDataInErrorString(validationObject.redirection[i].href, data),
                title: setDataInErrorString(validationObject.redirection[i].title, data),
            })
        }
        errorMessage['_redirection'] = redirection;
    }

    errorMessage[errorKey] = validationMessage;
    if (validationObject.lastAll) {
        throw new EndActionValidations(errorMessage);
    }

    if (validationObject.last) {
        throw new BreakCurrentFieldTestsException(errorMessage, key);
    }
    return errorMessage;
}
module.exports = (validations, data, showLog = false) => {
    VERBOSE_LOGGER = showLog;

    const objectsArrayWithPromises = [];
    if (validations) {
        Object.keys(validations).forEach((key) => {
            ensureArray(validations[key])
                .forEach((_validationObject) => {
                    const validationObject = prepareValidationObject(_validationObject);
                    logInvalidValidation(validationObject, key);
                    if (validationObject.validation) {
                        objectsArrayWithPromises.push({
                            promise: (data) => validateAndReturnResult(validationObject, key, data),
                            wait: validationObject.wait
                        });
                    }
                })
        });
    } else {
        return Promise.reject({_error: 'No validations setup, cannot continue.'})
    }


    return new PromisesRunner({
        objectsArrayWithPromises,
        inputData: data,
        // outputDataKey: 'errors',
        // mergePromiseOutputToNextPromiseInput: true,
        mergeSameKeyByConvertingToArray: true
    })
        .start()
        .then(v => isEqual(v, {}) ? Promise.resolve() : Promise.reject(v))


}

