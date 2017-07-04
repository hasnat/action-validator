const {expect, assert} = require('chai');
const sinon = require('sinon');
const actionValidator = require('../index.js');
const loginActions = require('./validationConfigs/loginActions')

describe('actionValidator', function () {

    it('gets validation errors', function (done) {
        actionValidator(loginActions.login, {email: ''})
            .then(done)
            .catch((e) => {
                expect(e).to.deep.equal(
                    {
                        email: 'Email cannot be empty',
                        reCaptcha: 'Please solve reCaptcha',
                        password: 'Password cannot be empty'
                    }
                );
                done();
            }).catch(done)
    });

    it('validation errors are grouped', function (done) {
        actionValidator(loginActions.login, {email: 'asd@asd.cc', password: '@'})
            .then(done)
            .catch((e) => {
                expect(e).to.deep.equal(
                    {
                        reCaptcha: 'Please solve reCaptcha',
                        password: [
                            'Password must contain atleast one uppercase',
                            'Password must contain atleast one lowercase',
                            'Password must contain atleast one number'
                        ]
                    }
                );
                done();
            }).catch(done)
    });

    it('calls then on no validation', function (done) {
        actionValidator(loginActions.login, {email: 'asd@asd.cc', password: 'aA1', reCaptcha: 'XXX'})
            .then(done)
            .catch(done)
    });


    it('gets redirection links', function (done) {
        actionValidator(loginActions.login, {email: 'asd@asd.cc', password: 'FailForTest', reCaptcha: 'XXX'})
            .then(done)
            .catch((e) => {
                expect(e).to.deep.equal(
                    {
                        _error: {
                            _message: 'Given value FailForTest will cause fail',
                            _redirection: [
                                {
                                    'href': '/value/in/link/FailForTest',
                                    'title': 'Also in title "FailForTest"'
                                }
                            ]
                        },

                    }
                );
                done();
            }).catch(done)
    });

});
