import type { KvStore } from "@/server/kv";
import { PHI_KV } from "./const";

function credentialKey(kind: string, value: string | number) {
	return `${PHI_KV}:${kind}:${String(value)}`;
}

class CredentialStore {
	constructor(private kv: KvStore) {}

	getSessionToken(userId: string | number) {
		return this.kv.get(credentialKey("userToken", userId));
	}

	setSessionToken(userId: string | number, sessionToken: string) {
		return this.kv.set(credentialKey("userToken", userId), sessionToken);
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

	async isSessionTokenBanned(sessionToken?: string | null) {
		if (!sessionToken) return false;
		return Boolean(
			await this.kv.get(credentialKey("banSessionToken", sessionToken)),
		);
	}
}

export function initCredentials(kv: KvStore) {
	return new CredentialStore(kv);
}
