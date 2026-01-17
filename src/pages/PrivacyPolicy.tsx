import React from 'react';

import { useNavigate } from 'react-router-dom';

export const PrivacyPolicy: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-900 text-gray-300 p-8 overflow-y-auto">
            <div className="max-w-3xl mx-auto bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl">
                <button
                    onClick={() => navigate('/')}
                    className="mb-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors flex items-center gap-2"
                >
                    ← Back to Game
                </button>

                <h1 className="text-3xl font-bold mb-6 text-white border-b border-gray-700 pb-4">Privacy Policy for DrawPi</h1>
                <p className="mb-4 text-sm text-gray-500">Last Updated: January 17, 2026</p>

                <section className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">1. INTRODUCTION</h2>
                        <p>Welcome to DrawPi ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share information when you use our DrawPi application within the Pi Network ecosystem.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">2. INFORMATION WE COLLECT</h2>
                        <p className="mb-2">We collect the following information provided by the Pi Network SDK:</p>
                        <ul className="list-disc pl-5 space-y-1 mb-2">
                            <li><strong>Pi Network UID:</strong> A unique identifier tailored to our app to persist your game progress and account.</li>
                            <li><strong>Pi Network Username:</strong> Displayed to other players in lobbies and leaderboards.</li>
                            <li><strong>Access Token:</strong> Used temporarily to authenticate your session with our backend servers.</li>
                        </ul>
                        <p className="mb-2">We also generate and store:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Game Data:</strong> Drawings, guesses, scores, and match history.</li>
                            <li><strong>Virtual Currency Balance:</strong> The amount of "Game Coins" you possess.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">3. HOW WE USE YOUR INFORMATION</h2>
                        <p>We use your information to:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Facilitate multiplayer gameplay (connecting you with other players).</li>
                            <li>Process in-app payments for Game Coins.</li>
                            <li>Display leaderboards and rankings.</li>
                            <li>Maintain your user profile and stats.</li>
                            <li>Improve technical functionality and fix bugs.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">4. DATA SHARING</h2>
                        <p>We do not sell your personal data. We typically only share data in the following circumstances:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>With Pi Network:</strong> For authentication and payment processing purposes as required by the platform.</li>
                            <li><strong>With Other Players:</strong> Your username and in-game actions (drawings, guesses) are visible to players in your game room.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">5. DATA SECURITY</h2>
                        <p>We implement reasonable security measures to protect your information. However, no method of transmission over the Internet is 100% secure.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">6. USER RIGHTS</h2>
                        <p>You may request the deletion of your account data by contacting us. Note that since we rely on Pi Network for authentication, deleting your data will reset your progress and virtual currency balance.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">7. CHANGES TO THIS POLICY</h2>
                        <p>We may update this policy from time to time. Your continued use of the app signifies your acceptance of any changes.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">8. CONTACT US</h2>
                        <p>If you have questions about this Privacy Policy, please contact the developer via the Pi Network Developer Portal instructions or support channels.</p>
                    </div>
                </section>
            </div>
        </div>
    );
};
