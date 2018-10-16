module.exports = () => ({
  transform: {
    '.ts': require.resolve('ts-jest/preprocessor.js')
  },
  testRegex: '\\.test\\.ts$',
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['ts', 'js', 'json']
})
