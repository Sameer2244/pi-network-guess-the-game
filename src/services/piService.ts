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
    showAd(adId: string): void;
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

  public showAd(adType: "rewarded" | "interstitial"): Promise<void> {
    this.log(`Requesting Ad: ${adType}`);
    
    if (this.isInitialized && window.Pi) {
        return new Promise((resolve, reject) => {
             // Mocking SDK Ad capability for now as specific syntax varies.
             // We assume Pi.Ads.showAd exists or will be injected.
             try {
                 const piAny = window.Pi as any;
                 if (piAny.Ads && piAny.Ads.showAd) {
                     piAny.Ads.showAd(adType);
                     // We simulate success after a delay since we lack the event callback spec
                     setTimeout(() => resolve(), 3000); 
                 } else {
                     // Fallback or Sandbox mock
                     this.log("Pi Ads SDK not found (Sandbox/Mock?)");
                     // We resolve anyway for testing flow
                     setTimeout(() => resolve(), 1000); 
                 }
             } catch (e) {
                 this.error("Ad Error", e);
                 reject(e);
             }
        });
    } else {
        return new Promise((resolve) => {
            this.log("Simulating Mock Ad (Desktop)...");
            setTimeout(() => {
                this.log("Mock Ad Watched");
                resolve();
            }, 1500);
        });
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

    if (this.isInitialized && window.Pi) {
      try {
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