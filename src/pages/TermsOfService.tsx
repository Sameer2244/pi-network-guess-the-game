import React from 'react';

export const TermsOfService: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-300 p-8 overflow-y-auto">
            <div className="max-w-3xl mx-auto bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl">
                <button
                    onClick={onBack}
                    className="mb-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors flex items-center gap-2"
                >
                    ← Back to Game
                </button>

                <h1 className="text-3xl font-bold mb-6 text-white border-b border-gray-700 pb-4">Terms of Service for DrawPi</h1>
                <p className="mb-4 text-sm text-gray-500">Last Updated: January 17, 2026</p>

                <section className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">1. ACCEPTANCE OF TERMS</h2>
                        <p>By accessing or playing DrawPi ("the App"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the App.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">2. DESCRIPTION OF SERVICE</h2>
                        <p>DrawPi is a multiplayer drawing and guessing game integrated with the Pi Network.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">3. USER CONDUCT</h2>
                        <p>You agree to use the App responsibly. You are strictly prohibited from:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Drawing offensive, explicit, or illegal content.</li>
                            <li>Harassing, bullying, or using hate speech in the game chat.</li>
                            <li>Cheating, exploiting bugs, or using automation tools to gain an unfair advantage.</li>
                            <li>Attempting to reverse engineer the App or its APIs.</li>
                        </ul>
                        <p className="mt-2 text-red-400">Violation of these rules may result in a temporary or permanent ban from the App.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">4. VIRTUAL CURRENCY (GAME COINS)</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>The App may allow you to acquire virtual "Game Coins" using Pi cryptocurrency.</li>
                            <li>Game Coins are for entertainment purposes only and have no real-world monetary value.</li>
                            <li>Game Coins are non-transferable and non-refundable, except as required by law or Pi Network policies.</li>
                            <li>We reserve the right to modify the price or utility of Game Coins at any time.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">5. INTELLECTUAL PROPERTY</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>You retain rights to the original drawings you create in the game, but you grant us a worldwide, royalty-free license to display and use them within the App (e.g., in game replays or potential highlights).</li>
                            <li>The App's code, design, and assets are owned by the developers.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">6. DISCLAIMER OF WARRANTIES</h2>
                        <p>The App is provided "AS IS" without warranties of any kind. We do not guarantee that the App will be uninterrupted, error-free, or secure.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">7. LIMITATION OF LIABILITY</h2>
                        <p>To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App, including loss of data or Pi.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">8. GOVERNING LAW</h2>
                        <p>These Terms are governed by the laws applicable to the jurisdiction of the App developer, alongside the policies governing the Pi Network ecosystem.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">9. CHANGES TO TERMS</h2>
                        <p>We reserve the right to modify these Terms at any time. Continued use of the App constitutes acceptance of the modified Terms.</p>
                    </div>
                </section>
            </div>
        </div>
    );
};
