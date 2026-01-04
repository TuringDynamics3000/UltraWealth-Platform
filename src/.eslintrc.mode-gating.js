/**
 * ESLint Rules for Mode Gating Enforcement
 * 
 * AUTHORITATIVE: These rules enforce architectural boundaries.
 * Violations are errors, not warnings.
 * 
 * Include this in your main ESLint config:
 * extends: ['./.eslintrc.mode-gating.js']
 */

module.exports = {
  rules: {
    // Prevent imports across mode boundaries
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            // Retail cannot import from Group
            group: ['**/group/**'],
            message: 'Retail components cannot import from Group module. This is an architectural violation.',
          },
          {
            // Group cannot import from Retail
            group: ['**/retail/**'],
            message: 'Group components cannot import from Retail module. This is an architectural violation.',
          },
          {
            // No direct TuringCore imports
            group: ['**/turingcore/**', '@turingdynamics/core', '@turingdynamics/turingcore'],
            message: 'Direct TuringCore imports are forbidden. Access TuringCore through TuringOS only.',
          },
        ],
      },
    ],
  },
  overrides: [
    // Retail module restrictions
    {
      files: ['src/retail/**/*.ts', 'src/retail/**/*.tsx'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/group/**', '../group/**', '../../group/**'],
                message: 'ARCHITECTURAL VIOLATION: Retail components cannot import from Group module.',
              },
            ],
          },
        ],
      },
    },
    // Group module restrictions
    {
      files: ['src/group/**/*.ts', 'src/group/**/*.tsx'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/retail/**', '../retail/**', '../../retail/**'],
                message: 'ARCHITECTURAL VIOLATION: Group components cannot import from Retail module.',
              },
            ],
          },
        ],
      },
    },
  ],
};
