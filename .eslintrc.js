module.exports = {
  extends: 'airbnb-base',
  plugins: ['import'],
  parser: 'babel-eslint',
  rules: {
    'quotes': ['warn', 'single', { avoidEscape: true }],
    'no-console': 'off',
    'consistent-return': 'off',
    'max-len': ['warn', 150],
    'comma-dangle': ['error', 'never'],
    'no-plusplus': 'off'
  },
};
