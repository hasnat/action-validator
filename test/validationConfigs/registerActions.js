const v = require('validator');
module.exports = {
    register: {
        firstName: [{v: v.isEmpty, m: 'First Name cannot be empty'}],
        lastName: [{v: v.isEmpty, m: 'Last Name cannot be empty'}],
        email: [
            {v: v.isEmpty, m: 'Email cannot be empty'},
            {v: v.isInvalidEmail, m: 'Email is not valid'},
            {v: v.isEmailAlreadyRegistered, m: 'Email is already registered, try login', r: '/login'},
        ],
        password: [
            {v: v.isEmpty, m: 'Password cannot be empty'},
            {v: v.isCorrectPasswordLength, m: 'Password should me min 6 chars and max 40 chars'},
        ],

    }
}