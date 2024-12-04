import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent } from "@dfinity/agent";

class AuthClientService {
  constructor() {
    this.authClient = null;
    this._identity = null;
    this._agent = null;
    console.log("[AuthClientService] Service instance created");
  }

  async init() {
    console.log("[AuthClientService.init] Starting initialization");
    if (!this.authClient) {
      try {
        const storage = {
          get: (key) => {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
          },
          set: (key, value) => window.localStorage.setItem(key, JSON.stringify(value)),
          remove: (key) => window.localStorage.removeItem(key)
        };
  
        this.authClient = await AuthClient.create({
          idleOptions: {
            idleTimeout: 1000 * 60 * 120, // 2 hours
            disableDefaultIdleCallback: true,
          },
          storage,
          keyType: "Ed25519",
          devMode: process.env.NODE_ENV !== "production",
          features: ['no-recovery-methods', 'no-device-registration', 'dev-mode']
        });
        
        console.log("[AuthClientService.init] Auth client created successfully");

        // 如果已经认证，恢复identity和agent
        if (await this.authClient.isAuthenticated()) {
          this._identity = this.authClient.getIdentity();
          await this._createAgent();
        }
      } catch (error) {
        console.error("[AuthClientService.init] Error:", error);
        throw error;
      }
    }
    return this.authClient;
  }

  async _createAgent() {
    if (!this._identity) {
      throw new Error('No identity available');
    }

    const agentOptions = {
      host: 'http://127.0.0.1:8000',
      identity: this._identity
    };

    
  // 开发环境配置
    agentOptions.verifyQuerySignatures = false;
    agentOptions.disableRootKeyValidation = true;
  

  this._agent = new HttpAgent(agentOptions);

    this._agent._isLocal = true;
    try {
      await this._agent.fetchRootKey();
    } catch (err) {
      console.warn("Unable to fetch root key:", err);
    }
  

    return this._agent;
  }
  getAgent() {
    if (!this._agent) {
      throw new Error('No agent available - please login first');
    }
    return this._agent;
  }
  async login() {
    try {
      const client = await this.init();
      const frontendCanisterId = "bd3sg-teaaa-aaaaa-qaaba-cai";
      const identityProviderUrl = "http://be2us-64aaa-aaaaa-qaabq-cai.localhost:8000#authorize";
      
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error("Login timeout")), 5 * 60 * 1000);

        client.login({
          identityProvider: identityProviderUrl,
          maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000),
          derivationOrigin: `http://${frontendCanisterId}.localhost:8000`,
          onSuccess: async () => {
            clearTimeout(timeoutId);
            try {
              this._identity = client.getIdentity();
              await this._createAgent();

              resolve({ 
                principal: this._identity.getPrincipal().toString(),
                identity: this._identity,
                agent: this._agent 
              });
            } catch (error) {
              reject(error);
            }
          },
          onError: error => {
            clearTimeout(timeoutId);
            reject(error);
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  
  async isAuthenticated() {
    try {
      const client = await this.init();
      return await client.isAuthenticated();
    } catch (error) {
      console.error("[AuthClientService.isAuthenticated] Error:", error);
      return false;
    }
  }

  async getIdentity() {
    try {
      const client = await this.init();
      if (this._identity) {
        return this._identity;
      }
      this._identity = client.getIdentity();
      console.log("[AuthClientService.getIdentity] Identity retrieved:", this._identity);
      return this._identity;
    } catch (error) {
      console.error("[AuthClientService.getIdentity] Failed to get identity:", error);
      throw error;
    }
  }

  async logout() {
    try {
      const client = await this.init();
      await client.logout();
      
      // 清理所有状态
      this._identity = null;
      this._agent = null;
      localStorage.clear(); // 清除所有本地存储
      
      console.log("[AuthClientService.logout] Logout successful");
    } catch (error) {
      console.error("[AuthClientService.logout] Logout failed:", error);
      throw error;
    }
  }
}

export const authClientService = new AuthClientService();