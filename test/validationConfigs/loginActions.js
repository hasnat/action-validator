const v = require('validator');
module.exports = {

    isLoggedIn: {
        // *this*
        _error: [
            {v: v.isEmpty, m: 'Token cannot be empty', k: 'token', lastAll: true},
            // {v: v.isInvalidToken, m: 'Token is not valid', k: 'token'},
        ],
        // *this* is same as
        // token: [
        //     {v: v.isEmpty, m: 'Token cannot be empty', causeGenericError: true, lastAll: true},
        //     {v: v.isInvalidToken, m: 'Token is not valid', causeGenericError: true},
        // ]
    },
    login: {
        email: [
            {v: v.isEmpty, m: 'Email cannot be empty', last: true},
            {v: v.isEmail, m: 'Email is not valid', ex: true, w: true, last: true}

        ],
        reCaptcha: [
            {v: v.isEmpty, m: 'Please solve reCaptcha', last: true},
            {v: v.isCaptchaInvalid, m: 'reCaptcha couldn\'t be verified, try again.', lastAll: true},
        ],
        // highlight cause main form error
        _error: [
            {v: v.noUserForGivenEmail, m: 'No such user found', k: 'email', lastAll: true, causeGenericError: true},
            {
                v: v => Promise.resolve(v !== 'FailForTest'),
                m: 'Given value :password: will cause fail',
                k: 'password',
                r: [
                    {h: '/value/in/link/:password:', t: 'Also in title ":password:"'}
                ],
                lastAll: true,
                causeGenericError: true,
                ex: true
            }
        ],
        password: [
            {v: v.isEmpty, m: 'Password cannot be empty', last: true},
            {v: v.isLowercase, m: 'Password must contain atleast one uppercase', ex: false, w: true},
            {v: v.isUppercase, m: 'Password must contain atleast one lowercase', ex: false},
            {v: v.isAlphanumeric, m: 'Password must contain atleast one number', ex: true},
            {
                v: v.isAccountLoginLocked,
                m: 'Your account is locked, as you have tried to login with invalid password too many times. Contact us to get your account enabled',
                r: [
                    {h: '/contact', t: 'Contact us'}
                ]
                ,
                lastAll: true,
                causeGenericError: true
            },
            {v: v.isPasswordNotMatch, m: 'Password is not valid', lastAll: true},
            {
                v: v.isAccountEmailNotVerified,
                m: 'Your account email is not verified, check your email',
                r: [
                    {h: '/resend-verification-email/:email:', t: 'Send Verification Email'},
                    {h: '/verify-account', t: 'Verify'}
                ]
                , causeGenericError: true, d: true
            },
            // {v: v.isAnyLoginRestriction, m: 'You account not yet verified, check your email', lastAll: true, causeGenericError: true},
        ]
    }
}