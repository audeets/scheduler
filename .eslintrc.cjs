module.exports = {
  root: true,
  env: {
    es2021: true
  },
  extends: ['eslint:recommended', 'plugin:import/recommended'],
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
      impliedStrict: true
    },
    ecmaVersion: 12,
    requireConfigFile: false
  },
  rules: {
    'no-undef': 'off',
    'no-param-reassign': 'off',
    'import/order': 1,
    'import/no-cycle': 'off',
    'no-console': 'off',
    'prefer-destructuring': 'off',
    'no-shadow': 'off',
    'import/no-named-as-default': 'off',
    'import/no-extraneous-dependencies': 'off',
    'no-unused-vars': [
      'error',
      {
        ignoreRestSiblings: false
      }
    ]
  }
};
