const actionValidator = require('../index.js');
const loginActions = require('../test/validationConfigs/loginActions');

actionValidator(
    loginActions.login,
    {email: ''},
    console.log
)
    .then(() => console.log('validations passed'))
    .catch((e) => console.log('validation errors', e));

process.on('uncaughtException', (e) => console.log('uncaughtException', e));