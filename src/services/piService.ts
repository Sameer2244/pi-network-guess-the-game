import type { PiUser, PiPaymentDTO } from '../types';

// Mock the Pi global object if it doesn't exist (for development outside Pi Browser)
// Basic Pi SDK Interface
// Basic Pi SDK Interface
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
}

declare global {
  interface Window {
    Pi: PiSDK;
  }
}

class PiNetworkService {
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (window.Pi) {
      try {
        window.Pi.init({ version: '2.0', sandbox: true });
        this.isInitialized = true;
        console.log("Pi SDK initialized successfully");
      } catch (e) {
        console.error("Pi SDK init failed:", e);
      }
    } else {
      console.warn("Pi SDK not found. Running in mock mode.");
    }
  }

  // Handle incomplete payments found during authentication
  private onIncompletePaymentFound(payment: any) {
    console.log('Incomplete payment found', payment);
    // Send to backend to resolve
    fetch('/payments/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: payment.identifier,
        txid: payment.transaction ? payment.transaction.txid : '',
        debug: 'cancel' // Tutorial example suggests cancelling stuck payments initially
      })
    }).catch(err => console.error("Error handling incomplete payment:", err));
  };

  public async authenticate(): Promise<PiUser> {
    // Try to initialize again if not already initialized (handles race conditions where script loads late)
    if (!this.isInitialized) {
      this.init();
    }

    if (this.isInitialized && window.Pi) {
      try {
        const scopes = ['username', 'payments'];
        
        // Add timeout to prevent hanging forever
        const authPromise = window.Pi.authenticate(scopes, this.onIncompletePaymentFound.bind(this));
        
        // 15 second timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Pi Authentication timed out. Check your network or Pi Browser.")), 15000)
        );

        const authResult: any = await Promise.race([authPromise, timeoutPromise]);
        
        return {
          uid: authResult.user.uid,
          username: authResult.user.username,
          accessToken: authResult.accessToken
        };
      } catch (e: unknown) {
        console.error("Pi Auth failed", e);
        throw e;
      }
    } else {
      // Mock Login
      console.log("Using Mock Login (Pi SDK not active)");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            uid: 'mock-pi-uid-' + Math.floor(Math.random() * 1000),
            username: 'PiPioneer_Test',
            accessToken: 'mock-token'
          });
        }, 1000);
      });
    }
  }

  public async createPayment(paymentData: PiPaymentDTO): Promise<unknown> {
    if (this.isInitialized && window.Pi) {
      return window.Pi.createPayment({
        amount: paymentData.amount,
        memo: paymentData.memo,
        metadata: paymentData.metadata,
      }, {
        onReadyForServerApproval: (paymentId: string) => { 
            console.log('Ready for approval:', paymentId);
            // Send paymentId to backend for approval
            fetch('/payments/approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId })
            }).catch(err => console.error("Error sending for approval:", err));
        },
        onReadyForServerCompletion: (paymentId: string, txid: string) => {
            console.log('Ready for completion:', paymentId, txid);
            // Send paymentId and txid to backend for completion verification
            fetch('/payments/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId, txid })
            }).catch(err => console.error("Error sending for completion:", err));
        },
        onCancel: (paymentId: string) => { console.log('Cancelled:', paymentId); },
        onError: (error: unknown, payment: unknown) => { console.error('Payment Error:', error, payment); },
      });
    } else {
      // Mock Payment
      return new Promise((resolve) => {
        console.log("Processing Mock Payment...", paymentData);
        setTimeout(() => {
          alert(`Mock Payment of ${paymentData.amount} Pi successful!`);
          resolve({ id: 'mock-payment-id', status: 'COMPLETED' });
        }, 1500);
      });
    }
  }
}

export const piService = new PiNetworkService();