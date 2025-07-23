/* eslint-disable @typescript-eslint/no-empty-object-type */
export interface Env {
	// App
	WALLET_PRIVATE_KEY?: string;
	RECIPIENT_PRIVATE_KEY?: string;
}

declare global {
	namespace NodeJS {
		interface ProcessEnv extends Env {}
	}
}
