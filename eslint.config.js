const expo = require('eslint-config-expo/flat')

module.exports = [
  ...expo,
  {
    ignores: ['dist', 'android', 'ios'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]
