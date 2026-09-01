import type { KvStore } from "@/server/kv";
import { PHI_KV } from "./const";

function credentialKey(kind: string, value: string | number) {
	return `${PHI_KV}:${kind}:${String(value)}`;
}

export class CredentialStore {
	constructor(private kv: KvStore) {}

	getSessionToken(userId: string | number) {
		return this.kv.get(credentialKey("userToken", userId));
	}

	setSessionToken(userId: string | number, sessionToken: string) {
		return this.kv.set(credentialKey("userToken", userId), sessionToken);
	}

	deleteSessionToken(userId: string | number) {
		return this.kv.del(credentialKey("userToken", userId));
	}

	getApiId(userId: string | number) {
		return this.kv.get(credentialKey("userApiId", userId));
	}

	setApiId(userId: string | number, apiId: string | number) {
		return this.kv.set(credentialKey("userApiId", userId), String(apiId));
	}

	deleteApiId(userId: string | number) {
		return this.kv.del(credentialKey("userApiId", userId));
	}

	clearLocalCredentials(userId: string | number) {
		return this.kv.del(
			credentialKey("userToken", userId),
			credentialKey("userApiId", userId),
		);
	}

	async listSessionCredentials() {
		const result = new Map<string, string>();
		const prefix = `${PHI_KV}:userToken:`;
		const keys = await this.kv.keys(`${prefix}*`);
		const values = await Promise.all(keys.map((key) => this.kv.get(key)));
		keys.forEach((key, index) => {
			const value = values[index];
			if (value) result.set(key.slice(prefix.length), value);
		});
		return result;
	}

	async banSessionToken(sessionToken: string) {
		return this.kv.set(credentialKey("banSessionToken", sessionToken), 1);
	}

	allowSessionToken(sessionToken: string) {
		return this.kv.del(credentialKey("banSessionToken", sessionToken));
	}

	async isSessionTokenBanned(sessionToken?: string | null) {
		if (!sessionToken) return false;
		return Boolean(
			await this.kv.get(credentialKey("banSessionToken", sessionToken)),
		);
	}

	listBannedSessionTokenKeys() {
		return this.kv.keys(`${PHI_KV}:banSessionToken:*`);
	}
}

export let store: CredentialStore;

export function initCredentials(kv: KvStore) {
	store = new CredentialStore(kv);
	return store;
}
