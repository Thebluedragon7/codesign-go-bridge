export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // CONTRIBUTING.md asks for a 72-character subject.
    'header-max-length': [2, 'always', 72],
  },
};
