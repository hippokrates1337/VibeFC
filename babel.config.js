module.exports = api => {
  // Only use this babel config for Jest tests
  const isTest = api.env('test');
  
  // Return empty config if not in test environment (allows Next.js to use SWC)
  if (!isTest) {
    return {};
  }
  
  api.cache(true);
  
  return {
    presets: [
      [
        'next/babel',
        {
          'preset-env': {
            targets: {
              node: 'current'
            },
            modules: 'commonjs',
          },
          'class-properties': { loose: true },
          'private-methods': { loose: true },
          'private-property-in-object': { loose: true }
        },
      ],
    ],
  };
}; 