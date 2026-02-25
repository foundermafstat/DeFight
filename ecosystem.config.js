module.exports = {
	apps: [
		{
			name: 'defight-client',
			cwd: './apps/web',
			script: 'npm',
			args: 'start -- -p 5800',
			env: {
				NODE_ENV: 'production',
				NEXT_PUBLIC_API_URL: 'https://defight.aima.studio/api',
			},
		},
		{
			name: 'defight-server',
			cwd: './packages/gamemaster',
			script: 'npm',
			args: 'run start',
			env: {
				NODE_ENV: 'production',
				PORT: 5801,
				FRONTEND_ORIGIN: 'https://defight.aima.studio',
			},
		},
	],
};
