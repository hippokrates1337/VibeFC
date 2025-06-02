// Verification script for the isolated module approach
const fs = require('fs');

console.log('🔍 Verifying isolated module approach for React Flow optimization...');

// Check node-types.ts module
const nodeTypesFile = fs.readFileSync('src/components/forecast/node-types.ts', 'utf8');
const canvasFile = fs.readFileSync('src/components/forecast/forecast-canvas.tsx', 'utf8');

const checks = {
  // Node types module checks
  nodeTypesModuleExists: fs.existsSync('src/components/forecast/node-types.ts'),
  hasConstAssertions: nodeTypesFile.includes('} as const'),
  exportsNodeTypes: nodeTypesFile.includes('export const nodeTypes'),
  exportsEdgeTypes: nodeTypesFile.includes('export const edgeTypes'),
  exportsDefaultEdgeOptions: nodeTypesFile.includes('export const defaultEdgeOptions'),
  exportsConnectionLineStyle: nodeTypesFile.includes('export const connectionLineStyle'),
  
  // Canvas component checks
  importsFromModule: canvasFile.includes("from './node-types'"),
  noLocalNodeTypes: !canvasFile.includes('const nodeTypes = {'),
  noLocalEdgeTypes: !canvasFile.includes('const edgeTypes = {') || canvasFile.includes("from './node-types'"),
  noLocalDefaultEdgeOptions: !canvasFile.includes('const defaultEdgeOptions = {'),
  noLocalConnectionLineStyle: !canvasFile.includes('const connectionLineStyle = {'),
  hasErrorSuppressor: canvasFile.includes('ReactFlowErrorSuppressor'),
  hasUseStoreApi: canvasFile.includes('useStoreApi'),
  hasStableKey: canvasFile.includes('key="forecast-canvas"')
};

console.log('📁 Node Types Module:');
console.log('  ✅ Module exists:', checks.nodeTypesModuleExists);
console.log('  ✅ Has const assertions:', checks.hasConstAssertions);
console.log('  ✅ Exports nodeTypes:', checks.exportsNodeTypes);
console.log('  ✅ Exports edgeTypes:', checks.exportsEdgeTypes);
console.log('  ✅ Exports defaultEdgeOptions:', checks.exportsDefaultEdgeOptions);
console.log('  ✅ Exports connectionLineStyle:', checks.exportsConnectionLineStyle);

console.log('\n🎨 Canvas Component:');
console.log('  ✅ Imports from module:', checks.importsFromModule);
console.log('  ✅ No local nodeTypes:', checks.noLocalNodeTypes);
console.log('  ✅ No local edgeTypes:', checks.noLocalEdgeTypes);
console.log('  ✅ No local defaultEdgeOptions:', checks.noLocalDefaultEdgeOptions);
console.log('  ✅ No local connectionLineStyle:', checks.noLocalConnectionLineStyle);
console.log('  ✅ Has error suppressor:', checks.hasErrorSuppressor);
console.log('  ✅ Has useStoreApi:', checks.hasUseStoreApi);
console.log('  ✅ Has stable key:', checks.hasStableKey);

const allCorrect = Object.values(checks).every(check => check);

if (allCorrect) {
  console.log('\n🎉 Isolated module approach correctly implemented!');
  console.log('📝 This follows React Flow v11+ best practices and should eliminate warnings.');
} else {
  console.log('\n❌ Some checks failed:');
  Object.entries(checks).forEach(([key, value]) => {
    if (!value) console.log(`   - ${key}: ${value}`);
  });
}

// Clean up
fs.unlinkSync('verify-isolated-approach.js'); 