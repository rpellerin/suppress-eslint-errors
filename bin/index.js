#!/usr/bin/env node

const fs = require('fs');
const { createRequire } = require('module');
const path = require('path');
const spawn = require('cross-spawn');

const workingDirectoryRequire = createRequire(path.resolve(process.cwd(), 'index.js'));

try {
	workingDirectoryRequire('eslint');
} catch (x) {
	console.error('eslint was not found.');
	console.error('suppress-eslint-errors requires eslint to be installed in the working directory.');
	process.exit(1);
}

const jscodeshiftPath = require.resolve('jscodeshift/bin/jscodeshift');
const transformPath = require.resolve('../transforms/suppress-eslint-errors');

const gitignoreArguments = [];
const gitignorePath = path.resolve(process.cwd(), '.gitignore');
if (fs.existsSync(gitignorePath)) {
	if (
		fs
			.readFileSync(gitignorePath, { encoding: 'utf8' })
			.split('\n')
			.findIndex((line) => line.startsWith('!')) !== -1
	) {
		console.warn(
			'your .gitignore contains exclusions, which jscodeshift does not properly support.'
		);
		console.warn('skipping the ignore-config option.');
	} else {
		gitignoreArguments.push(`--ignore-config=.gitignore`);
	}
}

const result = spawn.sync(
	'node',
	[jscodeshiftPath, '--no-babel', '--parser=tsx', '-t', transformPath]
		.concat(gitignoreArguments)
		.concat(process.argv.slice(2)),
	{
		stdio: 'inherit',
	}
);

if (result.signal) {
	if (result.signal === 'SIGKILL') {
		console.error(
			'The script failed because the process exited too early. ' +
				'This probably means the system ran out of memory or someone called ' +
				'`kill -9` on the process.'
		);
	} else if (result.signal === 'SIGTERM') {
		console.error(
			'The script failed because the process exited too early. ' +
				'Someone might have called `kill` or `killall`, or the system could ' +
				'be shutting down.'
		);
	}
	process.exit(1);
}
