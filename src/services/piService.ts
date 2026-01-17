import type { PiUser, PiPaymentDTO } from '../types';

interface PiSDK {
  init(config: { version: string; sandbox: boolean }): void;
  authenticate(scopes: string[], onIncompletePaymentFound: (payment: any) => void): Promise<{
    user: { uid: string; username: string };
    accessToken: string;
  }>;
  createPayment(
    data: { amount: number; memo: string; metadata: Record<string, unknown> },
    callbacks: {
      onReadyForServerApproval: (paymentId: string) => void;
      onReadyForServerCompletion: (paymentId: string, txid: string) => void;
      onCancel: (paymentId: string) => void;
      onError: (error: unknown, payment: unknown) => void;
    }
  ): Promise<unknown>;
  Ads?: {
    showAd(adId: string): Promise<{ result: string; adId: string }>;
    isAdReady(adId: string): Promise<{ ready: boolean }>;
    requestAd(adId: string): Promise<{ result: string }>;
  };
}

declare global {
  interface Window {
    Pi: PiSDK;
  }
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

class PiNetworkService {
  private isInitialized = false;
  private logListeners: ((msg: string) => void)[] = [];

  constructor() {
    this.init();
  }

  public async showAd(adType: "rewarded" | "interstitial"): Promise<string> {
    this.log(`Requesting Ad: ${adType}`);
    
    if (!this.isInitialized || !window.Pi) {
        // Mock Flow
        return new Promise((resolve) => {
            this.log("Simulating Mock Ad (Desktop)...");
            setTimeout(() => {
                this.log("Mock Ad Watched");
                resolve("mock-ad-id-" + Date.now());
            }, 1000);
        });
    }

    const Ads = window.Pi.Ads;
    if (!Ads) {
        throw new Error("Pi Ads SDK not available");
    }

    try {
        // 1. Check if Ad is ready
        const readyResponse = await Ads.isAdReady(adType);
        
        if (readyResponse.ready === false) {
             this.log("Ad not ready, requesting new one...");
             const requestResponse = await Ads.requestAd(adType);
             
             if (requestResponse.result !== "AD_LOADED") {
                 throw new Error(`Ad failed to load: ${requestResponse.result}`);
             }
             this.log("Ad Loaded successfully");
        }

        // 2. Show the Ad
        const showResponse = await Ads.showAd(adType);
        
        if (showResponse.result === "AD_REWARDED") {
            return showResponse.adId;
        } else if (showResponse.result === "AD_CLOSED") {
             // Interstitial closed or Rewarded closed without finishing?
             // Docs say: "AD_REWARDED" is for rewarded.
             // If closed without reward, we shouldn't grant coins.
             throw new Error("Ad closed without reward");
        } else {
            throw new Error(`Ad not fully watched: ${showResponse.result}`);
        }

    } catch (e: any) {
        this.error("Ad Flow Error", e);
        throw e;
    }
  }

  // ... (previous methods)




  // --- Logger Implementation ---
  public onLog(listener: (msg: string) => void) {
    this.logListeners.push(listener);
  }

  private log(message: string, data?: any) {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMsg = data ? `${message} | Data: ${JSON.stringify(data)}` : message;
    const fullLog = `[${timestamp}] ${formattedMsg}`;
    
    console.log(fullLog);
    this.logListeners.forEach(l => l(fullLog));
  }

  private error(message: string, err?: any) {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMsg = err ? `${message} | Error: ${err.message || JSON.stringify(err)}` : message;
    const fullLog = `[${timestamp}] ERROR: ${formattedMsg}`;
    
    console.error(fullLog);
    this.logListeners.forEach(l => l(fullLog));
  }
  // -----------------------------

  private init() {
    if (window.Pi) {
      try {
        window.Pi.init({ version: '2.0', sandbox: false });
        this.isInitialized = true;
        this.log("Pi SDK initialized successfully");
      } catch (e) {
        this.error("Pi SDK init failed", e);
      }
    } else {
      this.log("Pi SDK not found. Running in mock mode.");
    }
  }

  private onIncompletePaymentFound(payment: any) {
    this.log('Incomplete payment found', payment);
    this.log(`Attempting to resolve incomplete payment: ${payment.identifier}`);
    
    fetch(`${SERVER_URL}/payments/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: payment.identifier,
        txid: payment.transaction ? payment.transaction.txid : '',
        debug: 'cancel'
      })
    })
    .then(res => res.json())
    .then(data => this.log("Incomplete payment resolved response:", data))
    .catch(err => this.error("Error handling incomplete payment", err));
  };

  public async authenticate(): Promise<PiUser> {
    if (!this.isInitialized) this.init();
    //enable sandbox true for testing
    if (this.isInitialized && window.Pi) {
      try {
        window.Pi.init({ version: '2.0', sandbox: true });
        this.log("Starting Authentication...");
        const scopes = ['username', 'payments'];
        const authResult = await window.Pi.authenticate(scopes, this.onIncompletePaymentFound.bind(this));
        
        this.log("Authentication Successful!", { username: authResult.user.username });
        
        return {
          uid: authResult.user.uid,
          username: authResult.user.username,
          accessToken: authResult.accessToken
        };
      } catch (e: unknown) {
        this.error("Pi Auth failed", e);
        throw e;
      }
    } else {
      this.log("Simulating Mock Login...");
      return new Promise((resolve) => {
        setTimeout(() => {
          this.log("Mock Login Complete");
          resolve({
            uid: 'mock-pi-uid-' + Math.floor(Math.random() * 1000),
            username: 'PiPioneer_Test',
            accessToken: 'mock-token'
          });
        }, 1000);
      });
    }
  }

  public createPayment(paymentData: PiPaymentDTO): Promise<unknown> {
    this.log("Initiating Payment...", paymentData);

    if (this.isInitialized && window.Pi) {
      return new Promise((resolve, reject) => {
          window.Pi.createPayment({
            amount: paymentData.amount,
            memo: paymentData.memo,
            metadata: paymentData.metadata,
          }, {
            onReadyForServerApproval: (paymentId: string) => { 
                this.log(`[Callback] onReadyForServerApproval: ${paymentId}`);
                this.log(`Sending approval request to backend: /payments/approve`);
                
                fetch(`${SERVER_URL}/payments/approve`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paymentId })
                })
                .then(async (res) => {
                    const data = await res.json();
                    this.log(`Backend Approval Response: ${res.status}`, data);
                    if (!res.ok) throw new Error(data.error || 'Approval failed');
                })
                .catch(err => {
                    this.error("Error sending for approval", err);
                    reject(err);
                });
            },
            onReadyForServerCompletion: (paymentId: string, txid: string) => {
                this.log(`[Callback] onReadyForServerCompletion: ${paymentId}, TXID: ${txid}`);
                this.log(`Sending completion request to backend: /payments/complete`);

                fetch(`${SERVER_URL}/payments/complete`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paymentId, txid })
                })
                .then(async (res) => {
                    const data = await res.json();
                    this.log(`Backend Completion Response: ${res.status}`, data);
                    if (!res.ok) {
                        throw new Error(data.error || 'Completion failed');
                    } else {
                        // SUCCESS!
                        resolve({ paymentId, txid });
                    }
                })
                .catch(err => {
                    this.error("Error sending for completion", err);
                    reject(err);
                });
            },
            onCancel: (paymentId: string) => { 
                this.log(`[Callback] Payment Cancelled by User: ${paymentId}`);
                reject(new Error("User cancelled payment"));
            },
            onError: (error: unknown, payment: unknown) => { 
                this.error(`[Callback] Payment Error`, { error, payment }); 
                reject(error);
            },
          });
      });
    } else {
      return new Promise((resolve) => {
        this.log("Processing Mock Payment...");
        setTimeout(() => {
          this.log("Mock Payment Successful");
          alert(`Mock Payment of ${paymentData.amount} Pi successful!`);
          resolve({ id: 'mock-payment-id', status: 'COMPLETED' });
        }, 1500);
      });
    }
  }
}

export const piService = new PiNetworkService();