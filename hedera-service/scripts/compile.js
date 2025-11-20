import solc from 'solc';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractPath = path.join(__dirname, '../contracts/ParkPulseCommunity.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'ParkPulseCommunity.sol': {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata'],
        '': ['ast'],
      },
    },
    optimizer: {
      enabled: true,
      runs: 200,
    },
    viaIR: true,
    metadata: {
      useLiteralContent: true,
    },
  },
};

console.log('Compiling ParkPulseCommunity.sol...\n');

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errors = output.errors.filter(error => error.severity === 'error');
  if (errors.length > 0) {
    console.error('Compilation errors:');
    errors.forEach(err => console.error(err.formattedMessage));
    process.exit(1);
  }

  const warnings = output.errors.filter(error => error.severity === 'warning');
  if (warnings.length > 0) {
    console.warn('Compilation warnings:');
    warnings.forEach(warn => console.warn(warn.formattedMessage));
  }
}

const contract = output.contracts['ParkPulseCommunity.sol']['ParkPulseCommunity'];
const artifactDir = path.join(__dirname, '../artifacts/contracts/ParkPulseCommunity.sol');
const artifactPath = path.join(artifactDir, 'ParkPulseCommunity.json');
const metadataPath = path.join(artifactDir, 'ParkPulseCommunity.dbg.json');

fs.mkdirSync(artifactDir, { recursive: true });

const artifact = {
  _format: 'hh-sol-artifact-1',
  contractName: 'ParkPulseCommunity',
  sourceName: 'contracts/ParkPulseCommunity.sol',
  abi: contract.abi,
  bytecode: '0x' + contract.evm.bytecode.object,
  deployedBytecode: contract.evm.deployedBytecode?.object ? '0x' + contract.evm.deployedBytecode.object : undefined,
  linkReferences: contract.evm.bytecode.linkReferences || {},
  deployedLinkReferences: contract.evm.deployedBytecode?.linkReferences || {},
};

fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

if (contract.metadata) {
  const metadata = JSON.parse(contract.metadata);
  const debugInfo = {
    _format: 'hh-sol-dbg-1',
    buildInfo: path.join('../build-info', `solc-${metadata.compiler.version}.json`),
  };
  fs.writeFileSync(metadataPath, JSON.stringify(debugInfo, null, 2));
}

const buildInfoDir = path.join(__dirname, '../artifacts/build-info');
fs.mkdirSync(buildInfoDir, { recursive: true });

const compilerVersion = output.contracts ? '0.8.20' : 'unknown';
const buildInfoPath = path.join(buildInfoDir, `solc-${compilerVersion}.json`);
const buildInfo = {
  _format: 'hh-sol-build-info-1',
  id: Date.now().toString(),
  solcVersion: compilerVersion,
  solcLongVersion: compilerVersion,
  input,
  output,
};

fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));

console.log('Compilation successful!');
console.log(`Artifact saved to: ${artifactPath}`);
console.log(`Metadata saved to: ${metadataPath}`);
console.log(`Build info saved to: ${buildInfoPath}`);
console.log(`Bytecode size: ${artifact.bytecode.length} bytes\n`);
