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

module.exports = class ActionValidator {
    constructor(validations, data, showLog = false) {
        this.validations = validations;
        this.data = data;
        this.showLog = showLog;
        this.skipAllRest = false;
        this.skipAllForKey = false;
    }


    logValidationResult(validationObject, isValid)  {
        const {showLog} = this;
        if (!showLog) {
            return;
        }
        const validationName = np(validationObject, 'validation.name') || 'anonymous';
        const validationResultASCII = isValid ? '✗' : '✓';
        const logTag = pad('validation-result', PAD_LEN);
        showLog(`[${logTag}] -- [${validationResultASCII}] ${validationName}(...) = ${isValid}  // ${validationObject.message}`);
    }

    logInvalidValidation(validationObject, key)  {
        const {showLog} = this;
        if (!showLog) {
            return;
        }
        const logTag = pad('validation-invalid', PAD_LEN);
        if (!validationObject.validation) { // possibly a server side validation check
            showLog(`[${logTag}] -- \`${key}\` Invalid or server side validator. // ${validationObject.message}`);
        }
    }

    logSkippingValidation(validationObject, key, lastAll)  {
        const {showLog} = this;
        if (!showLog) {
            return;
        }
        const logTag = pad('validation-skipped', PAD_LEN);
        showLog(`[${logTag}] -- \`${key}\` Skipping as previous one was last or lastAll(${lastAll}). // ${validationObject.message}`);
    }

    logRunningValidation(validationObject, key, data) {
        const {showLog} = this;
        if (!showLog) {
            return;
        }
        const validationName = np(validationObject, 'validation.name') || 'anonymous';
        const logTag = pad('validation-start', PAD_LEN);
        showLog(`[${logTag}] -- [ ] ${validationName}(...${data}) // ${validationObject.message}`);
    }

    validateAndReturnResult(validationObject, _key) {
        const {skipAllRest, skipAllForKey, data} = this;
        if (skipAllRest || _key === skipAllForKey) {
            this.logSkippingValidation(validationObject, _key, skipAllRest)
            return Promise.resolve({})
        }
        let key = validationObject.key || _key;
        let inputArgs = [data[key] || '']
        if (validationObject.data) {       //request data siblings as extra argument
            inputArgs.push(data);
        }
        this.logRunningValidation(validationObject, key, inputArgs);
        return ensurePromise(validationObject.validation(...inputArgs))
            .then(validationResult => {
                let anyErrorMessage = false;
                try {
                    anyErrorMessage = this.prepareErrorString(key, validationResult, validationObject, data);
                } catch (e) {
                    const errorType = typeOf(e);
                    if (
                        errorType !== 'BreakCurrentFieldTestsException'.toLowerCase()
                        && errorType !== 'EndActionValidations'.toLowerCase()
                    ) {
                        throw e;
                    } else if (errorType === 'EndActionValidations'.toLowerCase()) {
                        this.skipAllRest = true;
                    } else if (errorType === 'BreakCurrentFieldTestsException'.toLowerCase()) {
                        this.skipAllForKey = e.key;
                    }

                    anyErrorMessage = e.errorMessage;
                }
                return Promise.resolve(anyErrorMessage || {});
            });
    }

    prepareErrorString(key, validationResult, validationObject) {
        const {data} = this;
        const expectedResult = validationObject.expect === undefined ? false : validationObject.expect;
        const isValid = isEqual(validationResult, expectedResult);
        this.logValidationResult(validationObject, validationResult);
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
                validationMessage = setDataInErrorString(validationMessage, data);
                redirection.push({
                    href: setDataInErrorString(validationObject.redirection[i].href, data),
                    title: setDataInErrorString(validationObject.redirection[i].title, data),
                })
            }
            errorMessage[errorKey] = {
                _message: validationMessage,
                _redirection: redirection
            };
        } else {
            errorMessage[errorKey] = validationMessage;
        }

        if (validationObject.lastAll) {
            throw new EndActionValidations(errorMessage);
        }

        if (validationObject.last) {
            throw new BreakCurrentFieldTestsException(errorMessage, key);
        }
        return errorMessage;
    }
    start() {
        const {validations, data} = this;
        const objectsArrayWithPromises = [];
        if (validations) {
            Object.keys(validations).forEach((key) => {
                ensureArray(validations[key])
                    .forEach((_validationObject) => {
                        const validationObject = prepareValidationObject(_validationObject);
                        this.logInvalidValidation(validationObject, key);
                        if (validationObject.validation) {
                            objectsArrayWithPromises.push({
                                promise: (data) => this.validateAndReturnResult(validationObject, key),
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

}